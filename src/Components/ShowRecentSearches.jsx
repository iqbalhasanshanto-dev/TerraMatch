import { useState, useContext, useRef, useEffect, useMemo, useCallback } from "react";
import { Clock3, Globe, MapPin, X, Check, RotateCcw } from "lucide-react";
import useSaved from "../Hooks/useSaved";
import { toast } from "react-toastify";
import useAuth from "../Hooks/useAuth";
import { API_BASE_URL } from "../utils/api";
import StateContext from "../States/StateContext";

/**
 * ============================================================================
 * ShowRecentSearches Component
 * ============================================================================
 * Displays the user's dynamic Recent Searches history inside the right drawer:
 * - Reads centralized `recentSearched`, `setRecentSearched`, `recordRecentSearch`,
 *   `deleteRecentSearch`, and `clearRecentSearches` from `StateContext` (which
 *   synchronizes both MongoDB and `localStorage` under `"terramatch_recent_searches"`).
 * - Displays an accurate live `"X Saved"` badge count from `useSaved()`.
 * - Makes the entire recent location card clickable to promote it to the top of
 *   Recent Searches, fly/zoom the map to its coordinates, open its marker popup,
 *   and auto-collapse the mobile drawer (`onSelectLocation`).
 * - Keeps `"Remove"` and `"Save"` buttons isolated with `e.stopPropagation()`.
 * - Preserves the 5-second optimistic deletion + dark Undo snackbar banner.
 */
const ShowRecentSearches = ({ onSelectLocation }) => {
    // ------------------------------------------------------------------------
    // 1. Context Subscriptions & Data Hooks
    // ------------------------------------------------------------------------
    // Centralized Recent Searches state & backend/localStorage actions + Map target setter
    const {
        recentSearched,
        setRecentSearched,
        recordRecentSearch,
        deleteRecentSearch,
        clearRecentSearches,
        setMapTarget,
    } = useContext(StateContext);

    // User's saved bookmarks hook for badge count and Saved indicators
    const { savedLoc, setSavedLoc, refetchSaved } = useSaved();

    // Current Firebase user session for database writes
    const { user } = useAuth();

    // ------------------------------------------------------------------------
    // 2. Optimistic Delete & 5-Second Undo Timer State Variables
    // ------------------------------------------------------------------------
    // Holds pending single-item or clear-all deletion state while undo banner is active
    const [pendingDeletion, setPendingDeletion] = useState(null);

    // Optimistic set of bookmarked keys for instant "Saved" UI feedback
    const [optimisticSavedIds, setOptimisticSavedIds] = useState(() => new Set());

    // Reference to active timeout committing the deletion to MongoDB after 5 seconds
    const deletionTimerRef = useRef(null);

    // Clear active timeout cleanly on unmount to prevent stale timer callbacks
    useEffect(() => {
        return () => {
            if (deletionTimerRef.current) {
                clearTimeout(deletionTimerRef.current);
            }
        };
    }, []);

    // ------------------------------------------------------------------------
    // 3. Derived Lists, Identifiers & Saved Lookup Set
    // ------------------------------------------------------------------------
    // Safe fallback array of recent searches from centralized StateProvider
    const displayedSearches = recentSearched || [];

    // Live total count of saved locations from MongoDB
    const savedCount = savedLoc?.length || 0;

    // Fast lookup set of saved IDs / names so saved recent items display "Saved"
    const savedLocationIds = useMemo(() => {
        const set = new Set(optimisticSavedIds);
        if (savedLoc && savedLoc.length > 0) {
            savedLoc.forEach((item) => {
                const keys = [item._id, item.locationId, item.id, item.name].filter(Boolean);
                keys.forEach((key) => set.add(key));
            });
        }
        return set;
    }, [savedLoc, optimisticSavedIds]);

    /**
     * Resolves a stable unique key for matching items in local/MongoDB history.
     */
    const getRecentItemKey = (item) =>
        item?._id || item?.locationId || item?.id || item?.name;

    // ------------------------------------------------------------------------
    // 4. Card / Map Selection Handler
    // ------------------------------------------------------------------------
    /**
     * Triggered when clicking anywhere on a recent search card or "View on map":
     * 1. Promotes the clicked site to the top of Recent Searches.
     * 2. Pans/zooms Leaflet map smoothly to the site's coordinates and opens its popup.
     * 3. Auto-collapses the sidebar drawer on mobile viewports (< 1024px).
     */
    const handleViewOnMap = useCallback(
        (loc) => {
            if (!loc) return;

            // Re-record selection so it moves to the top of Recent Searches
            recordRecentSearch?.(loc);

            // Fly map camera to target coordinates with timestamp for repeatable clicks
            if (
                typeof loc?.coordinates?.latitude === "number" &&
                typeof loc?.coordinates?.longitude === "number"
            ) {
                setMapTarget({
                    latitude: loc.coordinates.latitude,
                    longitude: loc.coordinates.longitude,
                    zoom: 11,
                    locationId: loc.locationId || loc.id || loc._id,
                    name: loc.name,
                    timestamp: Date.now(),
                });
            }

            // Collapse mobile drawer immediately so user sees the animated zoom & popup
            onSelectLocation?.(loc);
        },
        [recordRecentSearch, setMapTarget, onSelectLocation]
    );

    // ------------------------------------------------------------------------
    // 5. Bookmark / Save Location Handler
    // ------------------------------------------------------------------------
    /**
     * Saves a recent search location to the user's MongoDB Saved collection.
     */
    const handleSave = (locationToSave) => {
        if (!locationToSave) return;

        const locationId =
            locationToSave.locationId ||
            locationToSave.id ||
            locationToSave._id ||
            locationToSave.name;

        setOptimisticSavedIds((prev) => {
            const next = new Set(prev);
            next.add(locationId);
            return next;
        });

        if (!user?.email) {
            toast.info("Please sign in to save locations to your account.");
            return;
        }

        if (setSavedLoc) {
            setSavedLoc((prev) => {
                if (
                    prev.some(
                        (s) => (s._id || s.locationId || s.id || s.name) === locationId
                    )
                ) {
                    return prev;
                }
                return [
                    {
                        ...locationToSave,
                        locationId,
                        created_at: new Date(),
                        created_by: user.email,
                    },
                    ...prev,
                ];
            });
        }

        fetch(`${API_BASE_URL}/savedLocs`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                ...locationToSave,
                locationId,
                created_at: new Date(),
                created_by: user.email,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    toast.success("Location saved to your profile!");
                    refetchSaved?.();
                }
            })
            .catch((err) => {
                console.error("Save error:", err);
                toast.error("Failed to save location");
            });
    };

    // ------------------------------------------------------------------------
    // 6. Backend Deletion Commit Helpers (Delegated to StateProvider)
    // ------------------------------------------------------------------------
    /**
     * Commits permanent deletion of a single item to MongoDB via StateProvider.
     */
    const commitBackendDelete = (itemToDelete) => {
        const idToDelete =
            itemToDelete?._id || itemToDelete?.locationId || itemToDelete?.id;
        if (idToDelete) {
            deleteRecentSearch?.(idToDelete);
        }
    };

    /**
     * Commits permanent clear-all wipe for the signed-in user via StateProvider.
     */
    const commitBackendClearAll = () => {
        clearRecentSearches?.();
    };

    // ------------------------------------------------------------------------
    // 7. Optimistic Removal & 5-Second Undo Snackbar Handlers
    // ------------------------------------------------------------------------
    /**
     * Optimistically removes a single recent search item and starts a 5s undo timer.
     */
    const handleDelete = (itemKey) => {
        // Flush any earlier pending deletion before starting a new undo countdown
        if (pendingDeletion) {
            if (deletionTimerRef.current) clearTimeout(deletionTimerRef.current);
            if (pendingDeletion.isBatch) {
                commitBackendClearAll();
            } else {
                commitBackendDelete(pendingDeletion.item);
            }
        }

        const itemToDelete = displayedSearches.find(
            (item) => getRecentItemKey(item) === itemKey
        );
        if (!itemToDelete) return;

        // Immediately remove from centralized state (and localStorage via StateProvider)
        setRecentSearched((prev) =>
            prev.filter((item) => getRecentItemKey(item) !== itemKey)
        );

        // Schedule MongoDB DELETE call after the 5-second undo window expires
        deletionTimerRef.current = setTimeout(() => {
            commitBackendDelete(itemToDelete);
            setPendingDeletion(null);
        }, 5000);

        setPendingDeletion({
            item: itemToDelete,
            isBatch: false,
        });
    };

    /**
     * Optimistically clears all recent searches and opens the 5s undo banner.
     */
    const handleDeleteAll = () => {
        if (displayedSearches.length === 0) return;

        // Flush any earlier pending deletion first
        if (pendingDeletion) {
            if (deletionTimerRef.current) clearTimeout(deletionTimerRef.current);
            if (pendingDeletion.isBatch) {
                commitBackendClearAll();
            } else {
                commitBackendDelete(pendingDeletion.item);
            }
        }

        const backupItems = [...displayedSearches];

        // Clear centralized state (automatically mirrored to localStorage)
        setRecentSearched([]);

        // Schedule MongoDB bulk wipe after 5 seconds
        deletionTimerRef.current = setTimeout(() => {
            commitBackendClearAll();
            setPendingDeletion(null);
        }, 5000);

        setPendingDeletion({
            itemsList: backupItems,
            isBatch: true,
        });
    };

    /**
     * Cancels the pending backend delete and restores removed item(s) immediately.
     */
    const handleUndo = () => {
        if (!pendingDeletion) return;

        if (deletionTimerRef.current) {
            clearTimeout(deletionTimerRef.current);
            deletionTimerRef.current = null;
        }

        if (pendingDeletion.isBatch) {
            setRecentSearched(pendingDeletion.itemsList);
            toast.info("Search history restored.");
        } else {
            setRecentSearched((prev) => [pendingDeletion.item, ...prev]);
            toast.info(`Restored "${pendingDeletion.item.name}".`);
        }

        setPendingDeletion(null);
    };

    // ------------------------------------------------------------------------
    // 8. Component Render Block
    // ------------------------------------------------------------------------
    return (
        <div className="w-full h-full flex flex-col text-[#F1EEE9] select-none relative">
            {/* Header Toolbar: Title, Clear All Action, and Live Saved Counter */}
            <div className="flex justify-between items-center mb-3 pr-10">
                <div className="flex items-center gap-2">
                    <Clock3 size={16} aria-hidden="true" className="text-[#8891A0]" />
                    <h2 className="font-semibold text-sm text-[#F1EEE9] tracking-tight">
                        Recent Searches
                    </h2>
                </div>

                <div className="flex items-center gap-2.5">
                    {displayedSearches.length > 0 && (
                        <button
                            type="button"
                            onClick={handleDeleteAll}
                            className="text-xs text-[#8891A0] hover:text-[#F1EEE9] transition cursor-pointer"
                        >
                            Clear all
                        </button>
                    )}

                    {/* Live Saved Sites Count Badge */}
                    <span className="text-[11px] font-medium text-[#8891A0] bg-[#181A21] border border-[#21242C] px-2 py-0.5 rounded-md">
                        {savedCount} Saved
                    </span>
                </div>
            </div>

            {/* Scrollable Recent Searches Card List or Clean Empty State */}
            <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                {displayedSearches.length > 0 ? (
                    displayedSearches.map((item) => {
                        const itemKey = getRecentItemKey(item);
                        const isSaved =
                            savedLocationIds.has(item._id) ||
                            savedLocationIds.has(item.locationId) ||
                            savedLocationIds.has(item.id) ||
                            savedLocationIds.has(item.name);

                        return (
                            /* Clickable Recent Location Card (Clicking anywhere focuses map) */
                            <article
                                key={itemKey}
                                onClick={() => handleViewOnMap(item)}
                                className="relative bg-[#181A21] border border-[#21242C] rounded-xl p-3.5 transition duration-150 hover:border-[#83CAD8]/50 has-[.card-primary-action:focus-visible]:outline-2 has-[.card-primary-action:focus-visible]:outline-[#83CAD8] shadow-md cursor-pointer"
                            >
                                {/* Card Header Row: Icon, Location Name, Country & Score */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-[#1A1D23] border border-[#21242C] flex items-center justify-center text-[#8891A0] shrink-0">
                                            <Globe size={16} aria-hidden="true" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-xs sm:text-sm font-semibold text-[#F1EEE9] truncate leading-tight">
                                                {item.name}
                                            </h3>
                                            <p className="text-[11px] text-[#8891A0] truncate mt-0.5">
                                                {item.country}
                                            </p>
                                        </div>
                                    </div>

                                    <span className="font-mono text-xs text-[#83CAD8] shrink-0 font-medium">
                                        {item.similarityScore}%
                                    </span>
                                </div>

                                {/* Card Actions Footer: View on Map (stretched), Remove, Save */}
                                <div className="flex items-center justify-between border-t border-[#21242C] pt-2.5 mt-2.5 text-xs">
                                    {/* Primary Action stretched over card via ::after pseudo-element */}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleViewOnMap(item);
                                        }}
                                        aria-label={`View on map: ${item.name}`}
                                        className="card-primary-action flex items-center gap-1.5 text-[#8891A0] hover:text-[#F1EEE9] focus-visible:outline-none transition duration-150 cursor-pointer after:content-[''] after:absolute after:inset-0 after:rounded-xl"
                                    >
                                        <MapPin
                                            size={13}
                                            aria-hidden="true"
                                            className="text-[#8891A0]"
                                        />
                                        <span>View on map</span>
                                    </button>

                                    {/* Isolated Remove & Save Controls (Elevated above card overlay) */}
                                    <div className="relative z-10 flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(itemKey);
                                            }}
                                            aria-label={`Remove ${item.name}`}
                                            className="flex items-center gap-1 text-[#D04D39] hover:text-[#D04D39]/80 transition duration-150 cursor-pointer py-0.5 px-1 rounded"
                                        >
                                            <X size={13} aria-hidden="true" />
                                            <span>Remove</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSave(item);
                                            }}
                                            aria-label={
                                                isSaved
                                                    ? `Saved ${item.name}`
                                                    : `Save ${item.name}`
                                            }
                                            className="flex items-center gap-1 text-[#8891A0] hover:text-[#83CAD8] transition duration-150 cursor-pointer py-0.5 px-1 rounded"
                                        >
                                            <Check
                                                size={13}
                                                aria-hidden="true"
                                                className="text-[#83CAD8]"
                                            />
                                            <span
                                                className={
                                                    isSaved ? "text-[#83CAD8] font-medium" : ""
                                                }
                                            >
                                                {isSaved ? "Saved" : "Save"}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </article>
                        );
                    })
                ) : (
                    /* Clean Empty State when Recent Searches list is empty */
                    <div className="text-center py-12 px-4 rounded-xl border border-dashed border-[#21242C] text-[#8891A0] text-xs">
                        <Clock3
                            size={24}
                            aria-hidden="true"
                            className="mx-auto opacity-40 mb-2 text-[#8891A0]"
                        />
                        <p className="font-medium text-[#F1EEE9]">
                            No recent searches yet.
                        </p>
                        <p className="text-[11px] text-[#8891A0] mt-1">
                            Explore candidate planetary analog sites in the Search tab or
                            click a location on the map.
                        </p>
                    </div>
                )}
            </div>

            {/* 5-Second Dark Undo Snackbar Banner */}
            {pendingDeletion && (
                <div
                    role="status"
                    aria-live="polite"
                    className="mt-3 bg-[#090B10] border border-[#21242C] text-[#F1EEE9] rounded-xl px-3.5 py-2.5 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150 shrink-0"
                >
                    <span className="text-xs text-[#8891A0] truncate">
                        {pendingDeletion.isBatch
                            ? "Cleared all recent searches"
                            : `Removed "${pendingDeletion.item.name}"`}
                    </span>
                    <button
                        type="button"
                        onClick={handleUndo}
                        className="flex items-center gap-1 text-xs font-semibold text-[#83CAD8] hover:text-[#83CAD8]/80 px-2 py-1 rounded bg-[#1A1D23] border border-[#21242C] transition cursor-pointer shrink-0"
                    >
                        <RotateCcw size={12} aria-hidden="true" />
                        <span>Undo</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default ShowRecentSearches;
