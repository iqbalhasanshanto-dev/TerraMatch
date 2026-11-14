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

// LocalStorage persistence helpers for user and guest sessions
const LEGACY_RECENT_STORAGE_KEY = "terramatch_recent_searches";
const MAX_RECENT_SEARCHES = 25;

// Builds scoped storage key for recent searches.
const getRecentStorageKey = (email) =>
    `terramatch_recent_searches_${email || "guest"}`;

// Builds scoped storage key for saved locations.
const getSavedStorageKey = (email) =>
    `terramatch_saved_locations_${email || "guest"}`;

// Removes legacy un-scoped localStorage keys on startup.
const cleanupLegacyUnscopedStorage = () => {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.removeItem(LEGACY_RECENT_STORAGE_KEY);
    } catch (error) {
        console.warn("Unable to remove legacy localStorage keys:", error);
    }
};

// Execute legacy cleanup immediately on module initialization
cleanupLegacyUnscopedStorage();

// Reads scoped recent searches from localStorage.
const readRecentFromStorage = (email) => {
    if (typeof window === "undefined") return [];
    const storageKey = getRecentStorageKey(email);

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

// Writes scoped recent searches to localStorage.
const writeRecentToStorage = (email, items) => {
    if (typeof window === "undefined") return;
    const storageKey = getRecentStorageKey(email);

    try {
        window.localStorage.setItem(
            storageKey,
            JSON.stringify(Array.isArray(items) ? items : [])
        );
    } catch (error) {
        console.warn("Unable to write recent searches to localStorage:", error);
    }
};

// Reads scoped saved locations from localStorage.
const readSavedFromStorage = (email) => {
    if (typeof window === "undefined") return [];
    const storageKey = getSavedStorageKey(email);

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

// Writes scoped saved locations to localStorage.
const writeSavedToStorage = (email, items) => {
    if (typeof window === "undefined") return;
    const storageKey = getSavedStorageKey(email);

    try {
        window.localStorage.setItem(
            storageKey,
            JSON.stringify(Array.isArray(items) ? items : [])
        );
    } catch (error) {
        console.warn("Unable to write saved locations to localStorage:", error);
    }
};

// Resolves stable identifier for deduplicating location records.
const resolveLocationKey = (loc) =>
    loc?.locationId || loc?._id || loc?.id || loc?.name || "";

// Merges server-fetched and local saved locations without duplicates.
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

// Normalizes location object with canonical fields and timestamps.
const normalizeLocationEntry = (loc, ownerKey) => {
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
        created_by: ownerKey,
    };
};

// Global state provider for navigation, search history, and saved locations.
const StateProvider = ({ children }) => {
    // Current Firebase authentication context
    const { user } = useAuth();
    const userEmail = user?.email || null;

    // Navigation, filter, and map camera state
    const [isSearch, setIsSearch] = useState(false);
    const [filteredLoc, setFilteredLoc] = useState(null);
    const [mapTarget, setMapTarget] = useState(null);

    // User-scoped and guest recent searches state
    const [recentState, setRecentState] = useState(() => {
        const initialOwner = userEmail || "guest";
        return {
            owner: initialOwner,
            items: readRecentFromStorage(userEmail),
        };
    });

    const [recentLoading, setRecentLoading] = useState(false);

    // Derived recent searches array scoped by session
    const recentSearched = useMemo(() => {
        const ownerKey = userEmail || "guest";
        if (recentState.owner === ownerKey) {
            return recentState.items;
        }
        return readRecentFromStorage(userEmail);
    }, [recentState, userEmail]);

    // Updates recent searches state and persists to scoped storage
    const setRecentSearched = useCallback(
        (updaterOrArray) => {
            const ownerKey = userEmail || "guest";
            setRecentState((prev) => {
                const currentItems =
                    prev.owner === ownerKey
                        ? prev.items
                        : readRecentFromStorage(userEmail);
                const nextItems =
                    typeof updaterOrArray === "function"
                        ? updaterOrArray(currentItems)
                        : updaterOrArray;
                const safeItems = Array.isArray(nextItems) ? nextItems : [];
                writeRecentToStorage(userEmail, safeItems);
                return {
                    owner: ownerKey,
                    items: safeItems,
                };
            });
        },
        [userEmail]
    );

    // User-scoped and guest saved locations state
    const [savedState, setSavedState] = useState(() => {
        const initialOwner = userEmail || "guest";
        return {
            owner: initialOwner,
            items: readSavedFromStorage(userEmail),
        };
    });

    const [savedLoading, setSavedLoading] = useState(false);
    const [savedError, setSavedError] = useState(null);

    // Derived saved locations array scoped by session
    const savedLoc = useMemo(() => {
        const ownerKey = userEmail || "guest";
        if (savedState.owner === ownerKey) {
            return savedState.items;
        }
        return readSavedFromStorage(userEmail);
    }, [savedState, userEmail]);

    // Updates saved locations state and persists to scoped storage
    const setSavedLoc = useCallback(
        (updaterOrArray) => {
            const ownerKey = userEmail || "guest";
            setSavedState((prev) => {
                const currentItems =
                    prev.owner === ownerKey
                        ? prev.items
                        : readSavedFromStorage(userEmail);
                const nextItems =
                    typeof updaterOrArray === "function"
                        ? updaterOrArray(currentItems)
                        : updaterOrArray;
                const safeItems = Array.isArray(nextItems) ? nextItems : [];
                writeSavedToStorage(userEmail, safeItems);
                return {
                    owner: ownerKey,
                    items: safeItems,
                };
            });
        },
        [userEmail]
    );

    // Fetches and merges saved locations from backend and local storage
    const refetchSaved = useCallback(async () => {
        const localCached = readSavedFromStorage(userEmail);
        if (!userEmail || !API_BASE_URL) {
            setSavedState({ owner: userEmail || "guest", items: localCached });
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
            console.debug("Backend savedLocs fetch skipped/unavailable:", error.message);
            setSavedError(error);
            setSavedState({ owner: userEmail, items: localCached });
            return localCached;
        } finally {
            setSavedLoading(false);
        }
    }, [userEmail]);

    // Synchronize saved locations from user-scoped / guest localStorage + MongoDB on auth change
    useEffect(() => {
        const localCached = readSavedFromStorage(userEmail);

        if (!userEmail || !API_BASE_URL) {
            // Guest mode or static host: update savedState to local storage cleanly on microtask queue
            queueMicrotask(() => {
                setSavedState({ owner: userEmail || "guest", items: localCached });
                setSavedError(null);
            });
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

    // Persists location to saved collection with backend synchronization
    const saveLocation = useCallback(
        (loc) => {
            if (!loc || !loc.name) return;

            const ownerKey = userEmail || "guest";
            const entry = normalizeLocationEntry(loc, ownerKey);
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

            // Sync with backend if authenticated and API_BASE_URL is configured
            if (userEmail && API_BASE_URL) {
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

    // Removes saved location from state and backend
    const removeSavedLocation = useCallback(
        (idToRemove) => {
            if (!idToRemove) return;

            setSavedLoc((prev) =>
                prev.filter(
                    (item) =>
                        item._id !== idToRemove &&
                        item.id !== idToRemove &&
                        item.locationId !== idToRemove &&
                        item.name !== idToRemove
                )
            );

            if (userEmail && API_BASE_URL) {
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

    // Fetches and syncs recent searches from backend and localStorage
    const refetchRecent = useCallback(async () => {
        const localCached = readRecentFromStorage(userEmail);
        if (!userEmail || !API_BASE_URL) {
            setRecentState({ owner: userEmail || "guest", items: localCached });
            return localCached;
        }

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

    // Synchronize recent searches on auth change
    useEffect(() => {
        const localCached = readRecentFromStorage(userEmail);

        if (!userEmail || !API_BASE_URL) {
            queueMicrotask(() => {
                setRecentState({ owner: userEmail || "guest", items: localCached });
            });
            return;
        }

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

    // Prepends candidate site to recent searches with backend synchronization
    const recordRecentSearch = useCallback(
        async (loc) => {
            if (!loc || !loc.name) return;

            const ownerKey = userEmail || "guest";
            const entry = normalizeLocationEntry(loc, ownerKey);

            // Optimistically update scoped state & localStorage immediately
            setRecentSearched((prev) => {
                const targetLocId = entry.locationId;
                const deduplicated = prev.filter((item) => {
                    const existingLocId = item.locationId || item.id || item._id;
                    return existingLocId !== targetLocId && item.name !== entry.name;
                });
                return [entry, ...deduplicated].slice(0, MAX_RECENT_SEARCHES);
            });

            // If authenticated and API_BASE_URL is configured, sync with MongoDB backend
            if (userEmail && API_BASE_URL) {
                try {
                    // Omit internal `_id` to prevent immutable field errors
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
        [userEmail, setRecentSearched]
    );

    // Deletes single recent search record from backend
    const deleteRecentSearch = useCallback(
        async (idToDelete) => {
            if (!userEmail || !idToDelete || !API_BASE_URL) return;

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

    // Clears all recent searches for user in backend
    const clearRecentSearches = useCallback(async () => {
        if (!userEmail || !API_BASE_URL) return;

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

    // Memoized context value
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
