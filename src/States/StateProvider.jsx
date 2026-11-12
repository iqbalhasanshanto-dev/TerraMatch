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
// Constants & LocalStorage Persistence Helpers (Recent Searches & Saved Sites)
// ============================================================================

/**
 * LocalStorage key used to mirror recent searches so history works seamlessly
 * both offline / on static Netlify deployments and alongside MongoDB sync.
 */
const RECENT_SEARCHES_STORAGE_KEY = "terramatch_recent_searches";

/**
 * Maximum number of recent analog search records retained in local history.
 */
const MAX_RECENT_SEARCHES = 25;

/**
 * Builds the user-scoped localStorage key for saved analog locations.
 * Uses `"guest"` when no authenticated user email is present.
 */
const getSavedStorageKey = (email) =>
    `terramatch_saved_locations_${email || "guest"}`;

/**
 * Safely reads and parses cached recent search entries from `localStorage`.
 * Returns an empty array if storage is unavailable, empty, or malformed.
 */
const readRecentFromStorage = () => {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
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
 * Safely serializes and persists recent search entries to `localStorage`.
 */
const writeRecentToStorage = (items) => {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(
            RECENT_SEARCHES_STORAGE_KEY,
            JSON.stringify(Array.isArray(items) ? items : [])
        );
    } catch (error) {
        console.warn("Unable to write recent searches to localStorage:", error);
    }
};

/**
 * Safely reads and parses user-scoped saved locations from `localStorage`.
 * Returns an empty array if storage is unavailable, empty, or malformed.
 */
const readSavedFromStorage = (email) => {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(getSavedStorageKey(email));
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
 */
const writeSavedToStorage = (email, items) => {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(
            getSavedStorageKey(email),
            JSON.stringify(Array.isArray(items) ? items : [])
        );
    } catch (error) {
        console.warn("Unable to write saved locations to localStorage:", error);
    }
};

/**
 * Resolves a stable canonical identifier for deduplicating location records.
 */
const resolveLocationKey = (loc) =>
    loc?.locationId || loc?._id || loc?.id || loc?.name || "";

/**
 * Merges server-fetched saved locations with locally cached items without
 * creating duplicates, preserving server records first and offline items second.
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
 * and timestamps.
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
        created_by: userEmail || loc.created_by || "guest",
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
 *   Centralized Recent Searches state synced with MongoDB when authenticated
 *   and mirrored to `localStorage` under `"terramatch_recent_searches"`.
 * - `savedLoc` / `setSavedLoc` / `saveLocation` / `removeSavedLocation` / `refetchSaved`:
 *   Centralized Saved Locations state seeded from `localStorage`
 *   (`terramatch_saved_locations_${user?.email || 'guest'}`), merged with MongoDB
 *   when the backend is online, and updated optimistically so static Netlify
 *   deployments never fail with `"Failed to save location"`.
 */
const StateProvider = ({ children }) => {
    // ------------------------------------------------------------------------
    // 1. Authentication Context Subscription
    // ------------------------------------------------------------------------
    const { user } = useAuth();
    const userEmail = user?.email || null;
    const activeOwnerKey = userEmail || "guest";

    // ------------------------------------------------------------------------
    // 2. Global Navigation, Filter & Map Camera State Variables
    // ------------------------------------------------------------------------
    // Controls whether the Search & Filter panel ("Tweaks") is displayed in the sidebar
    const [isSearch, setIsSearch] = useState(false);

    // Filtered list of candidate analog sites synchronized between Tweaks and Map
    const [filteredLoc, setFilteredLoc] = useState([]);

    // Target viewport coordinates & marker metadata for animated Leaflet flyTo + popup open
    const [mapTarget, setMapTarget] = useState(null);

    // ------------------------------------------------------------------------
    // 3. Centralized Recent Searches State (Initialized from localStorage)
    // ------------------------------------------------------------------------
    // Holds ordered recent search history (latest first), seeded immediately from localStorage
    const [recentSearched, setRecentSearched] = useState(() => readRecentFromStorage());

    // Indicates whether a background MongoDB recent-searches sync request is running
    const [recentLoading, setRecentLoading] = useState(false);

    // ------------------------------------------------------------------------
    // 4. Centralized Saved Locations State (Owner-Scoped + LocalStorage Sync)
    // ------------------------------------------------------------------------
    // Tracks saved items tagged with the owner key so account switches read cleanly
    const [savedState, setSavedState] = useState(() => ({
        owner: activeOwnerKey,
        items: readSavedFromStorage(userEmail),
    }));

    // Indicates whether a MongoDB saved-locations sync request is in progress
    const [savedLoading, setSavedLoading] = useState(false);

    // Holds the most recent saved-locations fetch error if any
    const [savedError, setSavedError] = useState(null);

    // Derived saved locations list guaranteed to match the currently signed-in account
    const savedLoc = useMemo(() => {
        if (savedState.owner === activeOwnerKey) {
            return savedState.items;
        }
        return readSavedFromStorage(userEmail);
    }, [savedState, activeOwnerKey, userEmail]);

    /**
     * React-style state setter for `savedLoc` that automatically persists the
     * updated collection to user-scoped `localStorage`.
     */
    const setSavedLoc = useCallback(
        (updaterOrArray) => {
            setSavedState((prev) => {
                const currentItems =
                    prev.owner === activeOwnerKey
                        ? prev.items
                        : readSavedFromStorage(userEmail);
                const nextItems =
                    typeof updaterOrArray === "function"
                        ? updaterOrArray(currentItems)
                        : updaterOrArray;
                const safeItems = Array.isArray(nextItems) ? nextItems : [];
                writeSavedToStorage(userEmail, safeItems);
                return {
                    owner: activeOwnerKey,
                    items: safeItems,
                };
            });
        },
        [activeOwnerKey, userEmail]
    );

    // ------------------------------------------------------------------------
    // 5. Saved Locations MongoDB Merge & Background Refetch
    // ------------------------------------------------------------------------
    /**
     * Fetches the authenticated user's saved locations from MongoDB and merges
     * them with the user's `localStorage` cache. Quietly preserves localStorage
     * data when the backend is offline (such as static Netlify deployments).
     */
    const refetchSaved = useCallback(async () => {
        const localCached = readSavedFromStorage(userEmail);

        if (!userEmail) {
            setSavedState({ owner: "guest", items: localCached });
            return localCached;
        }

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
            // Preserve localStorage-backed saved locations when backend is offline
            console.debug("Backend savedLocs fetch skipped/unavailable:", error.message);
            setSavedError(error);
            setSavedState({ owner: userEmail, items: localCached });
            return localCached;
        } finally {
            setSavedLoading(false);
        }
    }, [userEmail]);

    // Synchronize saved locations from localStorage + MongoDB whenever user changes
    useEffect(() => {
        const localCached = readSavedFromStorage(userEmail);

        if (!userEmail) {
            return;
        }

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
    // 6. Shared Actions: Save & Remove Saved Locations (Local-First + Quiet Sync)
    // ------------------------------------------------------------------------
    /**
     * Immediately persists a location to global `savedLoc` state and `localStorage`,
     * displays a confirmation toast, and quietly syncs with `POST /savedLocs` in
     * the background so Netlify deployments never show `"Failed to save location"`.
     */
    const saveLocation = useCallback(
        (loc) => {
            if (!loc || !loc.name) return;

            const entry = normalizeLocationEntry(loc, userEmail);
            const targetId = entry.locationId;

            // 1. Save immediately to state and localStorage first
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

            // 2. Immediately notify user with success feedback
            toast.success("Location saved to your profile!");

            // 3. Quietly sync to MongoDB in the background when signed in
            if (userEmail) {
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
            }
        },
        [userEmail, setSavedLoc]
    );

    /**
     * Immediately removes a saved location by ID or name from state and
     * `localStorage`, and quietly dispatches `DELETE /savedLocs/:id` in background.
     */
    const removeSavedLocation = useCallback(
        (idToRemove) => {
            if (!idToRemove) return;

            // 1. Remove immediately from React state and localStorage
            setSavedLoc((prev) =>
                prev.filter(
                    (item) =>
                        item._id !== idToRemove &&
                        item.id !== idToRemove &&
                        item.locationId !== idToRemove &&
                        item.name !== idToRemove
                )
            );

            // 2. Quietly sync deletion to MongoDB when signed in
            if (userEmail) {
                fetch(`${API_BASE_URL}/savedLocs/${encodeURIComponent(idToRemove)}`, {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }).catch(() => {});
            }
        },
        [userEmail, setSavedLoc]
    );

    // ------------------------------------------------------------------------
    // 7. Recent Searches LocalStorage Mirror & MongoDB Sync
    // ------------------------------------------------------------------------
    // Keeps `"terramatch_recent_searches"` synchronized across all additions, deletions, and undos
    useEffect(() => {
        writeRecentToStorage(recentSearched);
    }, [recentSearched]);

    /**
     * Fetches the authenticated user's persisted recent searches from MongoDB.
     * On static deployments where the backend is offline, preserves localStorage state.
     */
    const refetchRecent = useCallback(async () => {
        if (!userEmail) return;

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
                setRecentSearched(data);
            }
        } catch (error) {
            // Preserve localStorage-backed recent searches when backend API is unavailable
            console.debug("Backend recent-searches fetch skipped/unavailable:", error.message);
        } finally {
            setRecentLoading(false);
        }
    }, [userEmail]);

    // Automatically synchronize recent searches from MongoDB whenever user changes
    useEffect(() => {
        if (!userEmail) return;

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
                    setRecentSearched(data);
                }
            })
            .catch((error) => {
                if (error.name !== "AbortError") {
                    console.debug("Using localStorage recent searches:", error.message);
                }
            });

        return () => {
            controller.abort();
        };
    }, [userEmail]);

    /**
     * Records a clicked or searched planetary analog site at the top of Recent Searches:
     * 1. Deduplicates by `locationId` or `name` and prepends immediately in React state.
     * 2. Automatically mirrors to `localStorage` (`"terramatch_recent_searches"`).
     * 3. Syncs with `POST ${API_BASE_URL}/recent-searches` when user is signed in.
     */
    const recordRecentSearch = useCallback(
        async (loc) => {
            if (!loc || !loc.name) return;

            const entry = normalizeLocationEntry(loc, userEmail);

            // Optimistically update centralized state so the item appears at the top immediately
            setRecentSearched((prev) => {
                const targetLocId = entry.locationId;
                const deduplicated = prev.filter((item) => {
                    const existingLocId = item.locationId || item.id || item._id;
                    return existingLocId !== targetLocId && item.name !== entry.name;
                });
                return [entry, ...deduplicated].slice(0, MAX_RECENT_SEARCHES);
            });

            // Persist to MongoDB when authenticated (gracefully skipped on offline/static hosts)
            if (userEmail) {
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
            }
        },
        [userEmail]
    );

    /**
     * Deletes a single recent search record from MongoDB by ID or `locationId`
     * when authenticated. Local state & localStorage remain synchronized automatically.
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
