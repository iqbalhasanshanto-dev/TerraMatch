import { useState, useContext, useRef, useEffect } from "react";
import { Clock3, Globe, MapPin, X, Check, RotateCcw } from "lucide-react";
import useRecent from "../Hooks/useRecent";
import useSaved from "../Hooks/useSaved";
import { toast } from "react-toastify";
import useAuth from "../Hooks/useAuth";
import { API_BASE_URL } from "../utils/api";
import StateContext from "../States/StateContext";

/**
 * ============================================================================
 * ShowRecentSearches Component
 * ============================================================================
 * Displays dynamic recent candidate planetary analog searches from MongoDB in
 * the drawer sidebar. Starting with a clean slate (0 searches, 0 saved):
 * - Live data derived strictly from useRecent() and useSaved()
 * - Exact badge count reflects user's actual saved bookmarks (0 Saved initially)
 * - Clean empty state when no recent searches are logged
 * - 5-Second optimistic deletion with Dark Undo snackbar banner
 * - Panning triggers map viewport centering via StateContext
 */
const ShowRecentSearches = () => {
    // ------------------------------------------------------------------------
    // 1. Data Hooks & Global Context Subscriptions
    // ------------------------------------------------------------------------
    // Fetches real recent search entries for the authenticated user from MongoDB
    const { recentSearched, setRecentSearched } = useRecent();
    // Fetches real saved bookmarks for the authenticated user from MongoDB
    const { savedLoc, refetchSaved } = useSaved();
    // Current authenticated user session credentials
    const { user } = useAuth();
    // State context for controlling map camera target position and zoom level
    const { setMapTarget } = useContext(StateContext);

    // ------------------------------------------------------------------------
    // 2. Optimistic Delete & Undo State Management
    // ------------------------------------------------------------------------
    // Tracks active item or list scheduled for backend deletion during 5s undo window
    const [pendingDeletion, setPendingDeletion] = useState(null);
    // Reference to active timeout instance for committing removal to MongoDB
    const deletionTimerRef = useRef(null);

    // Cleanup deletion timer when component unmounts to prevent memory leaks
    useEffect(() => {
        return () => {
            if (deletionTimerRef.current) {
                clearTimeout(deletionTimerRef.current);
            }
        };
    }, []);

    // ------------------------------------------------------------------------
    // 3. Dynamic Searches & Saved Count Derivation
    // ------------------------------------------------------------------------
    // 100% real dynamic searches from MongoDB (clean slate default if empty)
    const displayedSearches = recentSearched || [];
    // Dynamic saved count accurately matching user's actual MongoDB bookmarks (0 when empty)
    const savedCount = savedLoc?.length || 0;

    // ------------------------------------------------------------------------
    // 4. Map Viewport Panning Handler
    // ------------------------------------------------------------------------
    // Re-centers map camera over the selected analog site coordinates
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
    // Persists the analog candidate site to the user's MongoDB Saved collection
    const handleSave = (theId) => {
        if (!user?.email) {
            toast.info("Please sign in to save locations to your account.");
            return;
        }

        const locationToSave = displayedSearches.find(
            (recent) => (recent._id || recent.id) === theId
        );
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
                    // Refresh saved locations to update badge count instantly
                    refetchSaved?.();
                }
            })
            .catch((err) => {
                console.error("Save error:", err);
                toast.error("Failed to save location");
            });
    };

    // ------------------------------------------------------------------------
    // 6. Backend Deletion Commit Routines
    // ------------------------------------------------------------------------
    // Finalizes permanent removal of a single recent search document from MongoDB
    const commitBackendDelete = (itemToDelete) => {
        const idToDelete = itemToDelete?._id || itemToDelete?.id;
        if (user?.email && idToDelete) {
            fetch(`${API_BASE_URL}/recent-searches/${idToDelete}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
            }).catch((err) => console.error("Async delete error:", err));
        }
    };

    // Finalizes permanent deletion of all recent searches for the user in MongoDB
    const commitBackendClearAll = () => {
        if (user?.email) {
            fetch(`${API_BASE_URL}/recent-searches/user/${encodeURIComponent(user.email)}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
            }).catch((err) => console.error("Async clear error:", err));
        }
    };

    // ------------------------------------------------------------------------
    // 7. Optimistic Removal Handlers with 5-Second Undo Window
    // ------------------------------------------------------------------------
    // Removes single item immediately from UI and stages MongoDB deletion
    const handleDelete = (theId) => {
        // If an earlier deletion was pending, commit it immediately before queueing next
        if (pendingDeletion) {
            if (deletionTimerRef.current) clearTimeout(deletionTimerRef.current);
            if (pendingDeletion.isBatch) {
                commitBackendClearAll();
            } else {
                commitBackendDelete(pendingDeletion.item);
            }
        }

        const itemToDelete = displayedSearches.find(
            (item) => (item._id || item.id) === theId
        );
        if (!itemToDelete) return;

        // Optimistically filter item out of local state
        setRecentSearched((prev) =>
            prev.filter((item) => (item._id || item.id) !== theId)
        );

        // Schedule backend deletion commit after 5 seconds
        const timerId = setTimeout(() => {
            commitBackendDelete(itemToDelete);
            setPendingDeletion(null);
        }, 5000);

        deletionTimerRef.current = timerId;

        // Stage pending deletion state for undo bar
        setPendingDeletion({
            item: itemToDelete,
            isBatch: false,
        });
    };

    // Clears all items immediately from UI and stages MongoDB collection wipe
    const handleDeleteAll = () => {
        if (displayedSearches.length === 0) return;

        // Commit any currently pending deletion first
        if (pendingDeletion) {
            if (deletionTimerRef.current) clearTimeout(deletionTimerRef.current);
            if (pendingDeletion.isBatch) {
                commitBackendClearAll();
            } else {
                commitBackendDelete(pendingDeletion.item);
            }
        }

        const backupItems = [...displayedSearches];

        // Optimistically clear local state
        setRecentSearched([]);

        // Schedule backend wipe after 5 seconds
        const timerId = setTimeout(() => {
            commitBackendClearAll();
            setPendingDeletion(null);
        }, 5000);

        deletionTimerRef.current = timerId;

        // Stage pending batch deletion for undo bar
        setPendingDeletion({
            itemsList: backupItems,
            isBatch: true,
        });
    };

    // Restores queued items if clicked within the 5-second window
    const handleUndo = () => {
        if (!pendingDeletion) return;

        // Cancel scheduled backend deletion timer
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
    // 8. Render
    // ------------------------------------------------------------------------
    return (
        <div className="w-full h-full flex flex-col text-[#F1EEE9] select-none relative">
            {/* Header Toolbar: Title, Clear All, and Live Saved Badge Count */}
            <div className="flex justify-between items-center mb-3 pr-9">
                <div className="flex items-center gap-2">
                    <Clock3 size={16} className="text-[#8891A0]" />
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
                    {/* Live accurate count of bookmarked locations from MongoDB */}
                    <span className="text-[11px] font-medium text-[#8891A0] bg-[#181A21] border border-[#21242C] px-2 py-0.5 rounded-md">
                        {savedCount} Saved
                    </span>
                </div>
            </div>

            {/* List of Recent Search Cards or Clean Empty State */}
            <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                {displayedSearches.length > 0 ? (
                    displayedSearches.map((item) => {
                        const itemId = item._id || item.id;
                        return (
                            <div
                                key={itemId}
                                className="bg-[#181A21] border border-[#21242C] rounded-xl p-3.5 transition duration-150 hover:border-[#83CAD8]/50 shadow-md"
                            >
                                {/* Card Top Row: Globe Icon, Name, Country & Similarity Score */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-[#1A1D23] border border-[#21242C] flex items-center justify-center text-[#8891A0] shrink-0">
                                            <Globe size={16} />
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

                                {/* Card Actions Footer: View on Map, Remove, Bookmark */}
                                <div className="flex items-center justify-between border-t border-[#21242C] pt-2.5 mt-2.5 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => handleViewOnMap(item)}
                                        className="flex items-center gap-1.5 text-[#8891A0] hover:text-[#F1EEE9] transition duration-150 cursor-pointer"
                                    >
                                        <MapPin size={13} className="text-[#8891A0]" />
                                        <span>View on map</span>
                                    </button>

                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(itemId)}
                                            className="flex items-center gap-1 text-[#D04D39] hover:text-[#D04D39]/80 transition duration-150 cursor-pointer"
                                        >
                                            <X size={13} />
                                            <span>Remove</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleSave(itemId)}
                                            className="flex items-center gap-1 text-[#8891A0] hover:text-[#83CAD8] transition duration-150 cursor-pointer"
                                        >
                                            <Check size={13} className="text-[#83CAD8]" />
                                            <span>Save</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    /* Clean Empty State when user has no recent searches */
                    <div className="text-center py-12 px-4 rounded-xl border border-dashed border-[#21242C] text-[#8891A0] text-xs">
                        <Clock3 size={24} className="mx-auto opacity-40 mb-2 text-[#8891A0]" />
                        <p className="font-medium text-[#F1EEE9]">No recent searches yet.</p>
                        <p className="text-[11px] text-[#8891A0] mt-1">
                            Explore candidate planetary analog sites in the Search tab or click a location on the map.
                        </p>
                    </div>
                )}
            </div>

            {/* 5-Second Dark Undo Snackbar Banner */}
            {pendingDeletion && (
                <div className="mt-3 bg-[#090B10] border border-[#21242C] text-[#F1EEE9] rounded-xl px-3.5 py-2.5 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150 shrink-0">
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
                        <RotateCcw size={12} />
                        <span>Undo</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default ShowRecentSearches;
