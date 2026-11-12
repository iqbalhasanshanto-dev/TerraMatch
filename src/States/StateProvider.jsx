import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import StateContext from "./StateContext";
import useAuth from "../Hooks/useAuth";
import { API_BASE_URL } from "../utils/api";
import {
    getAnalogCategory,
    getMineralogy,
    getRoversTested,
    getSurfaceTemperature,
    getTargetBodyInfo,
} from "../utils/analogSpec";

// ============================================================================
// 1. Constants & Strict User-Scoped LocalStorage Persistence Helpers
// ============================================================================

/**
 * Legacy un-scoped recent-searches key that previously leaked history across
 * user sign-outs on shared devices. Removed immediately on application startup.
 */
const LEGACY_RECENT_STORAGE_KEY = "terramatch_recent_searches";

/**
 * Legacy guest saved-locations key removed on startup so unauthenticated
 * sessions never store or expose persisted bookmarks.
 */
const LEGACY_GUEST_SAVED_STORAGE_KEY = "terramatch_saved_locations_guest";

/**
 * Maximum number of recent analog search records retained per signed-in user.
 */
const MAX_RECENT_SEARCHES = 25;

/**
 * Builds the strictly user-scoped localStorage key for recent searches.
 * Returns `null` when no authenticated user email is present so guests never
 * read from or write to localStorage.
 *
 * @param {string | null | undefined} email - Authenticated user email.
 * @returns {string | null} Scoped storage key or `null` when signed out.
 */
const getRecentStorageKey = (email) =>
    email ? `terramatch_recent_searches_${email}` : null;

/**
 * Builds the strictly user-scoped localStorage key for saved analog sites.
 * Returns `null` when no authenticated user email is present.
 *
 * @param {string | null | undefined} email - Authenticated user email.
 * @returns {string | null} Scoped storage key or `null` when signed out.
 */
const getSavedStorageKey = (email) =>
    email ? `terramatch_saved_locations_${email}` : null;

/**
 * Removes legacy un-scoped and guest localStorage entries on startup so any
 * leftover device history is wiped immediately.
 */
const cleanupLegacyUnscopedStorage = () => {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.removeItem(LEGACY_RECENT_STORAGE_KEY);
        window.localStorage.removeItem(LEGACY_GUEST_SAVED_STORAGE_KEY);
    } catch (error) {
        console.warn("Unable to remove legacy localStorage keys:", error);
    }
};

// Execute legacy cleanup immediately on module initialization
cleanupLegacyUnscopedStorage();

/**
 * Safely reads and parses user-scoped recent search entries from `localStorage`.
 * Immediately returns `[]` when `email` is absent, avoiding any guest storage access.
 *
 * @param {string | null | undefined} email - Authenticated user email.
 * @returns {Array<Object>} Parsed recent search records for this user.
 */
const readRecentFromStorage = (email) => {
    if (typeof window === "undefined") return [];
    const storageKey = getRecentStorageKey(email);
    if (!storageKey) return [];

    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((item) => item && typeof item.name === "string");
    } catch (error) {
        console.warn("Unable to read recent searches from localStorage:", error);
        return [];
    }
};

/**
 * Safely serializes and persists user-scoped recent search entries to `localStorage`.
 * Does nothing when `email` is absent (signed-out / guest mode).
 *
 * @param {string | null | undefined} email - Authenticated user email.
 * @param {Array<Object>} items - Recent search entries to store.
 */
const writeRecentToStorage = (email, items) => {
    if (typeof window === "undefined") return;
    const storageKey = getRecentStorageKey(email);
    if (!storageKey) return;

    try {
        window.localStorage.setItem(
            storageKey,
            JSON.stringify(Array.isArray(items) ? items : [])
        );
    } catch (error) {
        console.warn("Unable to write recent searches to localStorage:", error);
    }
};

/**
 * Safely reads and parses user-scoped saved locations from `localStorage`.
 * Immediately returns `[]` when `email` is absent, avoiding any guest storage access.
 *
 * @param {string | null | undefined} email - Authenticated user email.
 * @returns {Array<Object>} Parsed saved analog sites for this user.
 */
const readSavedFromStorage = (email) => {
    if (typeof window === "undefined") return [];
    const storageKey = getSavedStorageKey(email);
    if (!storageKey) return [];

    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((item) => item && typeof item.name === "string");
    } catch (error) {
        console.warn("Unable to read saved locations from localStorage:", error);
        return [];
    }
};

/**
 * Safely serializes and persists user-scoped saved locations to `localStorage`.
 * Does nothing when `email` is absent (signed-out / guest mode).
 *
 * @param {string | null | undefined} email - Authenticated user email.
 * @param {Array<Object>} items - Saved location entries to store.
 */
const writeSavedToStorage = (email, items) => {
    if (typeof window === "undefined") return;
    const storageKey = getSavedStorageKey(email);
    if (!storageKey) return;

    try {
        window.localStorage.setItem(
            storageKey,
            JSON.stringify(Array.isArray(items) ? items : [])
        );
    } catch (error) {
        console.warn("Unable to write saved locations to localStorage:", error);
    }
};

// ============================================================================
// 2. Record Normalization & Deduplication Helpers
// ============================================================================

/**
 * Resolves a stable canonical identifier for deduplicating location records.
 *
 * @param {Object} loc - Planetary analog location object.
 * @returns {string} Canonical identifier string.
 */
const resolveLocationKey = (loc) =>
    loc?.locationId || loc?._id || loc?.id || loc?.name || "";

/**
 * Merges server-fetched saved locations with locally cached items without
 * creating duplicates, preserving server records first and offline items second.
 *
 * @param {Array<Object>} serverItems - Records returned by MongoDB API.
 * @param {Array<Object>} localItems - Records cached in user-scoped localStorage.
 * @returns {Array<Object>} Deduplicated merged array.
 */
const mergeSavedLocations = (serverItems, localItems) => {
    const merged = [];
    const seenKeys = new Set();

    const addUnique = (item) => {
        if (!item || typeof item.name !== "string") return;
        const primaryKey = String(resolveLocationKey(item)).toLowerCase();
        const nameKey = item.name.toLowerCase();
        if (seenKeys.has(primaryKey) || seenKeys.has(nameKey)) return;
        if (primaryKey) seenKeys.add(primaryKey);
        seenKeys.add(nameKey);
        merged.push(item);
    };

    (Array.isArray(serverItems) ? serverItems : []).forEach(addUnique);
    (Array.isArray(localItems) ? localItems : []).forEach(addUnique);

    return merged;
};

/**
 * Normalizes a candidate analog location object into a consistent recent-search
 * or saved-location record with canonical `locationId`, real scientific fields,
 * and timestamps scoped to `userEmail`.
 *
 * @param {Object} loc - Raw catalog or live Earth telemetry location object.
 * @param {string} userEmail - Authenticated user email owning this record.
 * @returns {Object} Normalized location entry.
 */
const normalizeLocationEntry = (loc, userEmail) => {
    const canonicalLocationId = loc.locationId || loc._id || loc.id || loc.name;
    const nowIso = new Date().toISOString();
    const { specLabel } = getTargetBodyInfo(loc);

    return {
        ...loc,
        _id: loc._id || canonicalLocationId,
        id: loc.id || canonicalLocationId,
        locationId: canonicalLocationId,
        name: loc.name,
        country: loc.country,
        temperature: getSurfaceTemperature(loc),
        targetSpec: loc.targetSpec || specLabel,
        analogCategory: getAnalogCategory(loc),
        roversTested: getRoversTested(loc),
        mineralogy: getMineralogy(loc),
        coordinates: loc.coordinates,
        analogType: loc.analogType || ["mars"],
        environment: loc.environment,
        terrain: loc.terrain,
        description: loc.description,
        created_at: loc.created_at || nowIso,
        updated_at: nowIso,
        created_by: userEmail,
    };
};

/**
 * ============================================================================
 * StateProvider Component
 * ============================================================================
 * Centralizes global application UI, search history, and saved location state:
 * - `isSearch` / `setIsSearch`: Controls active mode (Recent Searches vs. Search Filters).
 * - `filteredLoc` / `setFilteredLoc`: Active filtered planetary analog candidates.
 * - `mapTarget` / `setMapTarget`: Active coordinate target triggering smooth Leaflet flyTo + popup.
 * - `recentSearched` / `setRecentSearched` / `recordRecentSearch`:
 *   Strictly user-scoped Recent Searches (`terramatch_recent_searches_${userEmail}`
 *   + MongoDB sync). Always evaluates to `[]` when signed out (`userEmail === null`).
 * - `savedLoc` / `setSavedLoc` / `saveLocation` / `removeSavedLocation` / `refetchSaved`:
 *   Strictly user-scoped Saved Locations (`terramatch_saved_locations_${userEmail}`
 *   + MongoDB sync). Always evaluates to `[]` when signed out (`userEmail === null`).
 */
const StateProvider = ({ children }) => {
    // ------------------------------------------------------------------------
    // 1. Authentication Context Subscription
    // ------------------------------------------------------------------------
    /** Current Firebase user object (`null` when signed out). */
    const { user } = useAuth();

    /** Authenticated user's email address, or `null` when browsing as a guest. */
    const userEmail = user?.email || null;

    // ------------------------------------------------------------------------
    // 2. Global Navigation, Filter & Map Camera State Variables
    // ------------------------------------------------------------------------
    /** Controls whether the Search & Filter panel ("Tweaks") is displayed in the sidebar. */
    const [isSearch, setIsSearch] = useState(false);

    /** Filtered list of candidate analog sites synchronized between Tweaks and Map. */
    const [filteredLoc, setFilteredLoc] = useState([]);

    /** Target viewport coordinates & marker metadata for animated Leaflet flyTo + popup open. */
    const [mapTarget, setMapTarget] = useState(null);

    // ------------------------------------------------------------------------
    // 3. Strictly User-Scoped Recent Searches State
    // ------------------------------------------------------------------------
    /**
     * Owner-tagged recent searches container `{ owner, items }`.
     * Tagging state with `owner` guarantees immediate isolation on sign-out or
     * account switching without stale cross-user history flashes.
     */
    const [recentState, setRecentState] = useState(() => ({
        owner: userEmail,
        items: userEmail ? readRecentFromStorage(userEmail) : [],
    }));

    /** Indicates whether a background MongoDB recent-searches sync request is running. */
    const [recentLoading, setRecentLoading] = useState(false);

    /**
     * Derived recent searches array:
     * - Strictly `[]` whenever `userEmail` is `null` (signed out).
     * - Scoped to `terramatch_recent_searches_${userEmail}` when signed in.
     */
    const recentSearched = useMemo(() => {
        if (!userEmail) return [];
        if (recentState.owner === userEmail) {
            return recentState.items;
        }
        return readRecentFromStorage(userEmail);
    }, [recentState, userEmail]);

    /**
     * React-style state setter for `recentSearched` that persists updates strictly
     * under `terramatch_recent_searches_${userEmail}` and no-ops when signed out.
     */
    const setRecentSearched = useCallback(
        (updaterOrArray) => {
            if (!userEmail) {
                setRecentState({ owner: null, items: [] });
                return;
            }

            setRecentState((prev) => {
                const currentItems =
                    prev.owner === userEmail
                        ? prev.items
                        : readRecentFromStorage(userEmail);
                const nextItems =
                    typeof updaterOrArray === "function"
                        ? updaterOrArray(currentItems)
                        : updaterOrArray;
                const safeItems = Array.isArray(nextItems) ? nextItems : [];
                writeRecentToStorage(userEmail, safeItems);
                return {
                    owner: userEmail,
                    items: safeItems,
                };
            });
        },
        [userEmail]
    );

    // ------------------------------------------------------------------------
    // 4. Strictly User-Scoped Saved Locations State
    // ------------------------------------------------------------------------
    /**
     * Owner-tagged saved locations container `{ owner, items }`.
     * Evaluates to `[]` whenever `userEmail` is `null`.
     */
    const [savedState, setSavedState] = useState(() => ({
        owner: userEmail,
        items: userEmail ? readSavedFromStorage(userEmail) : [],
    }));

    /** Indicates whether a MongoDB saved-locations sync request is in progress. */
    const [savedLoading, setSavedLoading] = useState(false);

    /** Holds the most recent saved-locations fetch error if any. */
    const [savedError, setSavedError] = useState(null);

    /**
     * Derived saved locations array:
     * - Strictly `[]` whenever `userEmail` is `null` (signed out).
     * - Scoped to `terramatch_saved_locations_${userEmail}` when signed in.
     */
    const savedLoc = useMemo(() => {
        if (!userEmail) return [];
        if (savedState.owner === userEmail) {
            return savedState.items;
        }
        return readSavedFromStorage(userEmail);
    }, [savedState, userEmail]);

    /**
     * React-style state setter for `savedLoc` that persists updates strictly
     * under `terramatch_saved_locations_${userEmail}` and no-ops when signed out.
     */
    const setSavedLoc = useCallback(
        (updaterOrArray) => {
            if (!userEmail) {
                setSavedState({ owner: null, items: [] });
                return;
            }

            setSavedState((prev) => {
                const currentItems =
                    prev.owner === userEmail
                        ? prev.items
                        : readSavedFromStorage(userEmail);
                const nextItems =
                    typeof updaterOrArray === "function"
                        ? updaterOrArray(currentItems)
                        : updaterOrArray;
                const safeItems = Array.isArray(nextItems) ? nextItems : [];
                writeSavedToStorage(userEmail, safeItems);
                return {
                    owner: userEmail,
                    items: safeItems,
                };
            });
        },
        [userEmail]
    );

    // ------------------------------------------------------------------------
    // 5. Saved Locations MongoDB Merge & Background Sync
    // ------------------------------------------------------------------------
    /**
     * Fetches the authenticated user's saved locations from MongoDB and merges
     * them with the user's scoped `localStorage` cache. Returns `[]` when signed out.
     */
    const refetchSaved = useCallback(async () => {
        if (!userEmail) {
            setSavedState({ owner: null, items: [] });
            return [];
        }

        const localCached = readSavedFromStorage(userEmail);
        setSavedLoading(true);
        setSavedError(null);

        try {
            const response = await fetch(
                `${API_BASE_URL}/savedLocs/${encodeURIComponent(userEmail)}`
            );
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const serverData = await response.json();
            const merged = mergeSavedLocations(serverData, localCached);
            writeSavedToStorage(userEmail, merged);
            setSavedState({ owner: userEmail, items: merged });
            return merged;
        } catch (error) {
            console.debug("Backend savedLocs fetch skipped/unavailable:", error.message);
            setSavedError(error);
            setSavedState({ owner: userEmail, items: localCached });
            return localCached;
        } finally {
            setSavedLoading(false);
        }
    }, [userEmail]);

    // Synchronize saved locations from user-scoped localStorage + MongoDB on sign-in
    useEffect(() => {
        if (!userEmail) {
            return;
        }

        const localCached = readSavedFromStorage(userEmail);
        const controller = new AbortController();

        fetch(`${API_BASE_URL}/savedLocs/${encodeURIComponent(userEmail)}`, {
            signal: controller.signal,
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                return response.json();
            })
            .then((serverData) => {
                const merged = mergeSavedLocations(serverData, localCached);
                writeSavedToStorage(userEmail, merged);
                setSavedState({ owner: userEmail, items: merged });
                setSavedError(null);
            })
            .catch((error) => {
                if (error.name !== "AbortError") {
                    console.debug("Using localStorage saved locations:", error.message);
                    setSavedState({ owner: userEmail, items: localCached });
                }
            });

        return () => {
            controller.abort();
        };
    }, [userEmail]);

    // ------------------------------------------------------------------------
    // 6. Shared Actions: Save & Remove Saved Locations (Signed-In Only)
    // ------------------------------------------------------------------------
    /**
     * Persists a location to the authenticated user's `savedLoc` state and
     * scoped `localStorage`, displays a confirmation toast, and quietly syncs
     * with `POST /savedLocs`. Ignores calls when `userEmail` is null.
     */
    const saveLocation = useCallback(
        (loc) => {
            if (!userEmail || !loc || !loc.name) return;

            const entry = normalizeLocationEntry(loc, userEmail);
            const targetId = entry.locationId;

            setSavedLoc((prev) => {
                const alreadyExists = prev.some(
                    (item) =>
                        resolveLocationKey(item) === targetId ||
                        item.name === entry.name
                );
                if (alreadyExists) {
                    return prev;
                }
                return [entry, ...prev];
            });

            toast.success("Location saved to your profile!");

            const { _id, ...cleanPayload } = entry;
            void _id;

            fetch(`${API_BASE_URL}/savedLocs`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...cleanPayload,
                    locationId: targetId,
                    created_at: entry.created_at,
                    created_by: userEmail,
                }),
            }).catch(() => {});
        },
        [userEmail, setSavedLoc]
    );

    /**
     * Removes a saved location by ID or name from the authenticated user's
     * state and scoped `localStorage`, and dispatches `DELETE /savedLocs/:id`.
     */
    const removeSavedLocation = useCallback(
        (idToRemove) => {
            if (!userEmail || !idToRemove) return;

            setSavedLoc((prev) =>
                prev.filter(
                    (item) =>
                        item._id !== idToRemove &&
                        item.id !== idToRemove &&
                        item.locationId !== idToRemove &&
                        item.name !== idToRemove
                )
            );

            fetch(`${API_BASE_URL}/savedLocs/${encodeURIComponent(idToRemove)}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
            }).catch(() => {});
        },
        [userEmail, setSavedLoc]
    );

    // ------------------------------------------------------------------------
    // 7. Recent Searches Scoped LocalStorage & MongoDB Sync
    // ------------------------------------------------------------------------
    /**
     * Fetches the authenticated user's persisted recent searches from MongoDB
     * and mirrors them to `terramatch_recent_searches_${userEmail}`.
     * Returns `[]` immediately when signed out.
     */
    const refetchRecent = useCallback(async () => {
        if (!userEmail) {
            setRecentState({ owner: null, items: [] });
            return [];
        }

        const localCached = readRecentFromStorage(userEmail);
        setRecentLoading(true);

        try {
            const response = await fetch(
                `${API_BASE_URL}/recent-searches/${encodeURIComponent(userEmail)}`
            );
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            if (Array.isArray(data)) {
                writeRecentToStorage(userEmail, data);
                setRecentState({ owner: userEmail, items: data });
                return data;
            }
            return localCached;
        } catch (error) {
            console.debug("Backend recent-searches fetch skipped/unavailable:", error.message);
            setRecentState({ owner: userEmail, items: localCached });
            return localCached;
        } finally {
            setRecentLoading(false);
        }
    }, [userEmail]);

    // Synchronize recent searches from user-scoped localStorage + MongoDB on sign-in
    useEffect(() => {
        if (!userEmail) {
            return;
        }

        const localCached = readRecentFromStorage(userEmail);
        const controller = new AbortController();

        fetch(`${API_BASE_URL}/recent-searches/${encodeURIComponent(userEmail)}`, {
            signal: controller.signal,
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                if (Array.isArray(data)) {
                    writeRecentToStorage(userEmail, data);
                    setRecentState({ owner: userEmail, items: data });
                }
            })
            .catch((error) => {
                if (error.name !== "AbortError") {
                    console.debug("Using user-scoped localStorage recent searches:", error.message);
                    setRecentState({ owner: userEmail, items: localCached });
                }
            });

        return () => {
            controller.abort();
        };
    }, [userEmail]);

    /**
     * Records a clicked or searched planetary analog site at the top of Recent Searches.
     * Strictly no-ops when `userEmail` is null so guests leave no device footprint:
     * 1. Deduplicates by `locationId` or `name` and prepends in React state.
     * 2. Mirrors to `terramatch_recent_searches_${userEmail}` in `localStorage`.
     * 3. Syncs with `POST ${API_BASE_URL}/recent-searches`.
     */
    const recordRecentSearch = useCallback(
        async (loc) => {
            if (!userEmail || !loc || !loc.name) return;

            const entry = normalizeLocationEntry(loc, userEmail);

            // Optimistically update user-scoped state & localStorage immediately
            setRecentSearched((prev) => {
                const targetLocId = entry.locationId;
                const deduplicated = prev.filter((item) => {
                    const existingLocId = item.locationId || item.id || item._id;
                    return existingLocId !== targetLocId && item.name !== entry.name;
                });
                return [entry, ...deduplicated].slice(0, MAX_RECENT_SEARCHES);
            });

            try {
                // Omit internal `_id` so MongoDB upsert never throws immutable-field errors
                const { _id, ...cleanPayload } = entry;
                void _id;

                await fetch(`${API_BASE_URL}/recent-searches`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        ...cleanPayload,
                        locationId: entry.locationId,
                        created_at: new Date().toISOString(),
                        created_by: userEmail,
                    }),
                });
            } catch (error) {
                console.debug("Recent search POST sync skipped:", error.message);
            }
        },
        [userEmail, setRecentSearched]
    );

    /**
     * Deletes a single recent search record from MongoDB by ID or `locationId`
     * when authenticated. Local state & scoped localStorage stay synchronized.
     */
    const deleteRecentSearch = useCallback(
        async (idToDelete) => {
            if (!userEmail || !idToDelete) return;

            try {
                await fetch(
                    `${API_BASE_URL}/recent-searches/${encodeURIComponent(idToDelete)}`,
                    {
                        method: "DELETE",
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );
            } catch (error) {
                console.debug("Recent search DELETE sync skipped:", error.message);
            }
        },
        [userEmail]
    );

    /**
     * Clears all persisted recent search documents for the authenticated user
     * in MongoDB via `DELETE /recent-searches/user/:email`.
     */
    const clearRecentSearches = useCallback(async () => {
        if (!userEmail) return;

        try {
            await fetch(
                `${API_BASE_URL}/recent-searches/user/${encodeURIComponent(userEmail)}`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
        } catch (error) {
            console.debug("Recent search clear-all sync skipped:", error.message);
        }
    }, [userEmail]);

    // ------------------------------------------------------------------------
    // 8. Memoized Context Value & Provider Render Block
    // ------------------------------------------------------------------------
    const stateInfo = useMemo(
        () => ({
            isSearch,
            setIsSearch,
            filteredLoc,
            setFilteredLoc,
            mapTarget,
            setMapTarget,
            recentSearched,
            setRecentSearched,
            recordRecentSearch,
            deleteRecentSearch,
            clearRecentSearches,
            refetchRecent,
            recentLoading,
            savedLoc,
            setSavedLoc,
            saveLocation,
            removeSavedLocation,
            refetchSaved,
            savedLoading,
            savedError,
        }),
        [
            isSearch,
            filteredLoc,
            mapTarget,
            recentSearched,
            setRecentSearched,
            recordRecentSearch,
            deleteRecentSearch,
            clearRecentSearches,
            refetchRecent,
            recentLoading,
            savedLoc,
            setSavedLoc,
            saveLocation,
            removeSavedLocation,
            refetchSaved,
            savedLoading,
            savedError,
        ]
    );

    return <StateContext value={stateInfo}>{children}</StateContext>;
};

export default StateProvider;
