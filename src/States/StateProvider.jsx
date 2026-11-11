import { useState, useEffect, useCallback, useMemo } from "react";
import StateContext from "./StateContext";
import useAuth from "../Hooks/useAuth";
import { API_BASE_URL } from "../utils/api";

// ============================================================================
// Constants & LocalStorage Persistence Helpers
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
 * Normalizes a candidate analog location object into a consistent recent-search
 * record with canonical `locationId` and timestamps.
 */
const normalizeRecentEntry = (loc, userEmail) => {
    const canonicalLocationId = loc.locationId || loc._id || loc.id || loc.name;
    const nowIso = new Date().toISOString();

    return {
        ...loc,
        _id: loc._id || canonicalLocationId,
        id: loc.id || canonicalLocationId,
        locationId: canonicalLocationId,
        name: loc.name,
        country: loc.country,
        similarityScore: loc.similarityScore ?? 85,
        coordinates: loc.coordinates,
        analogType: loc.analogType || ["mars"],
        environment: loc.environment,
        terrain: loc.terrain,
        description: loc.description,
        created_at: loc.created_at || nowIso,
        updated_at: nowIso,
        ...(userEmail ? { created_by: userEmail } : {}),
    };
};

/**
 * ============================================================================
 * StateProvider Component
 * ============================================================================
 * Centralizes global application UI & search history state via `StateContext`:
 * - `isSearch` / `setIsSearch`: Controls active mode (Recent Searches vs. Search Filters).
 * - `filteredLoc` / `setFilteredLoc`: Active filtered planetary analog candidates.
 * - `mapTarget` / `setMapTarget`: Active coordinate target triggering smooth Leaflet flyTo + popup.
 * - `recentSearched` / `setRecentSearched` / `recordRecentSearch`:
 *   Centralized Recent Searches state synced with MongoDB (`GET / POST / DELETE
 *   ${API_BASE_URL}/recent-searches`) when authenticated AND mirrored to `localStorage`
 *   under `"terramatch_recent_searches"` for instant UI updates and static deployments.
 */
const StateProvider = ({ children }) => {
    // ------------------------------------------------------------------------
    // 1. Authentication Context Subscription
    // ------------------------------------------------------------------------
    const { user } = useAuth();
    const userEmail = user?.email || null;

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
    // 4. Mirror State Changes to localStorage
    // ------------------------------------------------------------------------
    // Keeps `"terramatch_recent_searches"` synchronized across all additions, deletions, and undos
    useEffect(() => {
        writeRecentToStorage(recentSearched);
    }, [recentSearched]);

    // ------------------------------------------------------------------------
    // 5. MongoDB GET Sync on Login / Account Switch
    // ------------------------------------------------------------------------
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

    // Automatically synchronize from MongoDB whenever the authenticated user changes
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

    // ------------------------------------------------------------------------
    // 6. Shared Action: Record a Recent Search (POST + Optimistic + LocalStorage)
    // ------------------------------------------------------------------------
    /**
     * Records a clicked or searched planetary analog site at the top of Recent Searches:
     * 1. Deduplicates by `locationId` or `name` and prepends immediately in React state.
     * 2. Automatically mirrors to `localStorage` (`"terramatch_recent_searches"`).
     * 3. Syncs with `POST ${API_BASE_URL}/recent-searches` when user is signed in.
     */
    const recordRecentSearch = useCallback(
        async (loc) => {
            if (!loc || !loc.name) return;

            const entry = normalizeRecentEntry(loc, userEmail);

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

    // ------------------------------------------------------------------------
    // 7. Shared Actions: Delete Single & Clear All Recent Searches (DELETE)
    // ------------------------------------------------------------------------
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
        ]
    );

    return <StateContext value={stateInfo}>{children}</StateContext>;
};

export default StateProvider;
