import { useState, useContext, useRef, useEffect } from "react";
import { Clock3, Globe, MapPin, X, Check, RotateCcw } from "lucide-react";
import useRecent from "../Hooks/useRecent";
import useSaved from "../Hooks/useSaved";
import { toast } from "react-toastify";
import useAuth from "../Hooks/useAuth";
import { API_BASE_URL } from "../utils/api";
import StateContext from "../States/StateContext";

// Canonical initial searches matching Dashboard.png design mockup
const INITIAL_DEMO_SEARCHES = [
    {
        _id: "demo-atacama",
        name: "Atacama Desert",
        country: "Chile",
        similarityScore: 89,
        coordinates: { latitude: -23.8634, longitude: -69.1328 },
        isSaved: true,
    },
    {
        _id: "demo-mcmurdo",
        name: "McMurdo Dry Valleys",
        country: "Antarctica",
        similarityScore: 84,
        coordinates: { latitude: -77.5167, longitude: 161.0 },
        isSaved: true,
    },
    {
        _id: "demo-danakil",
        name: "Danakil Depression",
        country: "Ethiopia",
        similarityScore: 76,
        coordinates: { latitude: 14.2417, longitude: 40.3 },
        isSaved: true,
    },
];

/**
 * ============================================================================
 * ShowRecentSearches Component
 * ============================================================================
 * Displays recent candidate planetary analog searches in the dark drawer sidebar.
 * Styled to match the exact visual layout of Dashboard.png.
 *
 * Upgrades & Features:
 * 1. Non-Intrusive Optimistic Deletions with Dark Undo Snackbar:
 *    Replaced SweetAlert modal confirmation popups with immediate optimistic
 *    removal and a 5-second Dark Undo Snackbar (`bg-[#181f28] border border-slate-700`).
 * 2. Seamless Backend Sync:
 *    Executes the persistent DELETE request only after the 5-second countdown expires.
 * 3. Unified Layout Alignment:
 *    Header toolbar includes padding to accommodate the standardized top-right
 *    sidebar toggle button without overlap.
 */
const ShowRecentSearches = () => {
    // ------------------------------------------------------------------------
    // 1. Data Hooks & Global Contexts
    // ------------------------------------------------------------------------
    const { recentSearched, setRecentSearched } = useRecent();
    const { savedLoc } = useSaved();
    const { user } = useAuth();
    const { setMapTarget } = useContext(StateContext);

    // Fallback local searches when user is guest or has no backend search history
    const [demoSearches, setDemoSearches] = useState(INITIAL_DEMO_SEARCHES);

    // ------------------------------------------------------------------------
    // 2. Optimistic Delete & Undo State Management
    // ------------------------------------------------------------------------
    // Holds currently queued deletion: { item, itemsList, isBatch, timeoutId }
    const [pendingDeletion, setPendingDeletion] = useState(null);

    // Ref tracking the pending deletion timer to ensure clean unmounting
    const deletionTimerRef = useRef(null);

    // Clean up any lingering deletion timeouts on unmount
    useEffect(() => {
        return () => {
            if (deletionTimerRef.current) {
                clearTimeout(deletionTimerRef.current);
            }
        };
    }, []);

    // ------------------------------------------------------------------------
    // 3. Dataset Resolution
    // ------------------------------------------------------------------------
    const hasDbSearches = recentSearched && recentSearched.length > 0;
    const displayedSearches = hasDbSearches ? recentSearched : demoSearches;

    // Determine badge count (e.g. "5 Saved" matching Dashboard.png)
    const savedCount = savedLoc?.length > 0 ? savedLoc.length : 5;

    // ------------------------------------------------------------------------
    // 4. Map Panning Handler
    // ------------------------------------------------------------------------
    /**
     * Centers and zooms the satellite map smoothly onto the selected candidate location
     */
    const handleViewOnMap = (loc) => {
        if (loc?.coordinates?.latitude && loc?.coordinates?.longitude) {
            setMapTarget({
                latitude: loc.coordinates.latitude,
                longitude: loc.coordinates.longitude,
                zoom: 10,
            });
        }
    };

    // ------------------------------------------------------------------------
    // 5. Bookmark / Save Location Handler
    // ------------------------------------------------------------------------
    /**
     * Saves a candidate site from search history to the user's permanent profile
     */
    const handleSave = (theId) => {
        if (!user?.email) {
            toast.info("Location saved to current session!");
            return;
        }

        const locationToSave = displayedSearches.find((recent) => recent._id === theId);
        if (!locationToSave) return;

        fetch(`${API_BASE_URL}/savedLocs`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                ...locationToSave,
                created_at: new Date(),
                created_by: user.email,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    toast.success("Location saved to your profile!");
                }
            })
            .catch((err) => {
                console.error("Save error:", err);
                toast.error("Failed to save location");
            });
    };

    // ------------------------------------------------------------------------
    // 6. Optimistic Removal with 5-Second Undo
    // ------------------------------------------------------------------------
    /**
     * Executes backend deletion after 5 seconds if not undone
     */
    const commitBackendDelete = (itemToDelete) => {
        if (hasDbSearches && user?.email && itemToDelete?._id) {
            fetch(`${API_BASE_URL}/recent-searches/${itemToDelete._id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
            }).catch((err) => console.error("Async delete error:", err));
        }
    };

    /**
     * Executes backend bulk clear after 5 seconds if not undone
     */
    const commitBackendClearAll = () => {
        if (hasDbSearches && user?.email) {
            fetch(`${API_BASE_URL}/recent-searches/user/${encodeURIComponent(user.email)}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
            }).catch((err) => console.error("Async clear error:", err));
        }
    };

    /**
     * Optimistically removes a single search item and shows the dark Undo Snackbar
     */
    const handleDelete = (theId) => {
        // If there was a previous uncommitted deletion, commit it now
        if (pendingDeletion) {
            if (deletionTimerRef.current) clearTimeout(deletionTimerRef.current);
            if (pendingDeletion.isBatch) {
                commitBackendClearAll();
            } else {
                commitBackendDelete(pendingDeletion.item);
            }
        }

        const itemToDelete = displayedSearches.find((item) => item._id === theId);
        if (!itemToDelete) return;

        // Optimistically remove from state immediately
        if (hasDbSearches) {
            setRecentSearched((prev) => prev.filter((item) => item._id !== theId));
        } else {
            setDemoSearches((prev) => prev.filter((item) => item._id !== theId));
        }

        // Schedule backend deletion in 5 seconds
        const timerId = setTimeout(() => {
            commitBackendDelete(itemToDelete);
            setPendingDeletion(null);
        }, 5000);

        deletionTimerRef.current = timerId;

        setPendingDeletion({
            item: itemToDelete,
            isBatch: false,
        });
    };

    /**
     * Optimistically clears all search items and shows the dark Undo Snackbar
     */
    const handleDeleteAll = () => {
        if (displayedSearches.length === 0) return;

        // Commit any previous pending deletion
        if (pendingDeletion) {
            if (deletionTimerRef.current) clearTimeout(deletionTimerRef.current);
            if (pendingDeletion.isBatch) {
                commitBackendClearAll();
            } else {
                commitBackendDelete(pendingDeletion.item);
            }
        }

        const backupItems = [...displayedSearches];

        // Optimistically clear all items immediately
        if (hasDbSearches) {
            setRecentSearched([]);
        } else {
            setDemoSearches([]);
        }

        // Schedule backend clear in 5 seconds
        const timerId = setTimeout(() => {
            commitBackendClearAll();
            setPendingDeletion(null);
        }, 5000);

        deletionTimerRef.current = timerId;

        setPendingDeletion({
            itemsList: backupItems,
            isBatch: true,
        });
    };

    /**
     * Undoes the pending deletion, restores items immediately, and cancels timer
     */
    const handleUndo = () => {
        if (!pendingDeletion) return;

        // Cancel scheduled backend request
        if (deletionTimerRef.current) {
            clearTimeout(deletionTimerRef.current);
            deletionTimerRef.current = null;
        }

        if (pendingDeletion.isBatch) {
            // Restore entire cleared list
            if (hasDbSearches) {
                setRecentSearched(pendingDeletion.itemsList);
            } else {
                setDemoSearches(pendingDeletion.itemsList);
            }
            toast.info("Search history restored.");
        } else {
            // Restore single item
            if (hasDbSearches) {
                setRecentSearched((prev) => [pendingDeletion.item, ...prev]);
            } else {
                setDemoSearches((prev) => [pendingDeletion.item, ...prev]);
            }
            toast.info(`Restored "${pendingDeletion.item.name}".`);
        }

        setPendingDeletion(null);
    };

    // ------------------------------------------------------------------------
    // 7. Render
    // ------------------------------------------------------------------------
    return (
        <div className="w-full h-full flex flex-col text-slate-200 select-none relative">
            {/* Header Toolbar (Leaves pr-8 for top-3.5 right-4 collapse toggle) */}
            <div className="flex justify-between items-center mb-3 pr-9">
                <div className="flex items-center gap-2">
                    <Clock3 size={16} className="text-slate-400" />
                    <h2 className="font-semibold text-sm text-slate-200 tracking-tight">
                        Recent Searches
                    </h2>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={handleDeleteAll}
                        className="text-xs text-slate-400 hover:text-white transition cursor-pointer"
                    >
                        Clear all
                    </button>
                    <span className="text-[11px] font-medium text-slate-300 bg-[#1e2530] border border-slate-700/60 px-2 py-0.5 rounded-md">
                        {savedCount} Saved
                    </span>
                </div>
            </div>

            {/* List of Recent Search Cards */}
            <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                {displayedSearches.length > 0 ? (
                    displayedSearches.map((item) => (
                        <div
                            key={item._id}
                            className="bg-[#1e2530] border border-slate-700/60 rounded-xl p-3.5 transition duration-150 hover:border-slate-600/80 shadow-md"
                        >
                            {/* Card Top Row: Icon, Title, Country & Score */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-[#27313f] border border-slate-700/60 flex items-center justify-center text-slate-400 shrink-0">
                                        <Globe size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-xs sm:text-sm font-semibold text-white truncate leading-tight">
                                            {item.name}
                                        </h3>
                                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                            {item.country}
                                        </p>
                                    </div>
                                </div>

                                <span className="font-mono text-xs text-slate-300 shrink-0 font-medium">
                                    {item.similarityScore}%
                                </span>
                            </div>

                            {/* Card Actions Footer: View on Map, Remove, Saved */}
                            <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5 mt-2.5 text-xs">
                                <button
                                    type="button"
                                    onClick={() => handleViewOnMap(item)}
                                    className="flex items-center gap-1.5 text-slate-400 hover:text-white transition duration-150 cursor-pointer"
                                >
                                    <MapPin size={13} className="text-slate-400" />
                                    <span>View on map</span>
                                </button>

                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(item._id)}
                                        className="flex items-center gap-1 text-red-400 hover:text-red-300 transition duration-150 cursor-pointer"
                                    >
                                        <X size={13} />
                                        <span>Remove</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleSave(item._id)}
                                        className="flex items-center gap-1 text-slate-300 hover:text-white transition duration-150 cursor-pointer"
                                    >
                                        <Check size={13} className="text-slate-300" />
                                        <span>Saved</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs">
                        No recent searches found. Use the Search tab to explore planetary analog sites.
                    </div>
                )}
            </div>

            {/* ============================================================== */}
            {/* 5-Second Dark Undo Snackbar Banner                             */}
            {/* ============================================================== */}
            {pendingDeletion && (
                <div className="mt-3 bg-[#181f28] border border-slate-700/80 text-slate-200 rounded-xl px-3.5 py-2.5 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150 shrink-0">
                    <span className="text-xs text-slate-300 truncate">
                        {pendingDeletion.isBatch
                            ? "Cleared all recent searches"
                            : `Removed "${pendingDeletion.item.name}"`}
                    </span>
                    <button
                        type="button"
                        onClick={handleUndo}
                        className="flex items-center gap-1 text-xs font-semibold text-[#82a8bf] hover:text-[#97bad0] px-2 py-1 rounded bg-[#202936] border border-[#2f3d4e] transition cursor-pointer shrink-0"
                    >
                        <RotateCcw size={12} />
                        <span>Undo</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default ShowRecentSearches;
