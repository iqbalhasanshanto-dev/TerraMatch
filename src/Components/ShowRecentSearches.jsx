import { useState, useContext, useRef, useEffect, useMemo, useCallback } from "react";
import {
    Clock3,
    Globe,
    MapPin,
    X,
    Check,
    RotateCcw,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import useLocations from "../Hooks/useLocations";
import useSaved from "../Hooks/useSaved";
import { toast } from "react-toastify";
import StateContext from "../States/StateContext";
import {
    formatSurfaceTemp,
    getAnalogCategory,
    getAnalogRecognitionStatus,
    getTargetBodyInfo,
} from "../utils/analogSpec";

// Recent searches history drawer with pinned planetary catalog and undo support
const ShowRecentSearches = ({ onSelectLocation }) => {
    // Context subscriptions, saved locations, and catalog data
    const {
        recentSearched,
        setRecentSearched,
        recordRecentSearch,
        deleteRecentSearch,
        clearRecentSearches,
        setMapTarget,
    } = useContext(StateContext);

    const { savedLoc, saveLocation } = useSaved();
    const { locData = [] } = useLocations();

    // Pinned catalog filter and collapse states
    const [pinnedFilter, setPinnedFilter] = useState("all");
    const [isCatalogOpen, setIsCatalogOpen] = useState(true);

    // Optimistic deletion and undo timer refs
    const [pendingDeletion, setPendingDeletion] = useState(null);
    const deletionTimerRef = useRef(null);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (deletionTimerRef.current) {
                clearTimeout(deletionTimerRef.current);
            }
        };
    }, []);

    // Derived search history and saved count
    const displayedSearches = recentSearched || [];
    const savedCount = savedLoc?.length || 0;

    // Filters pinned analog sites by selected planetary body
    const filteredPinnedSites = useMemo(() => {
        if (!Array.isArray(locData)) return [];
        if (pinnedFilter === "all") return locData;
        return locData.filter((loc) => {
            const { hasMoon, hasMars } = getTargetBodyInfo(loc);
            if (pinnedFilter === "moon") return hasMoon;
            if (pinnedFilter === "mars") return hasMars;
            return true;
        });
    }, [locData, pinnedFilter]);

    // Fast lookup set of saved location keys
    const savedLocationIds = useMemo(() => {
        const set = new Set();
        if (savedLoc && savedLoc.length > 0) {
            savedLoc.forEach((item) => {
                const keys = [item._id, item.locationId, item.id, item.name].filter(
                    Boolean
                );
                keys.forEach((key) => set.add(key));
            });
        }
        return set;
    }, [savedLoc]);

    // Resolves unique identifier key for recent search items
    const getRecentItemKey = (item) =>
        item?._id || item?.locationId || item?.id || item?.name;

    // Focuses map on selected site and closes mobile drawer
    const handleViewOnMap = useCallback(
        (loc) => {
            if (!loc) return;

            recordRecentSearch?.(loc);

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

            onSelectLocation?.(loc);
        },
        [recordRecentSearch, setMapTarget, onSelectLocation]
    );

    // Saves location bookmark
    const handleSave = (locationToSave) => {
        if (!locationToSave) return;
        saveLocation?.(locationToSave);
    };

    // Commits deletion of a single item
    const commitBackendDelete = (itemToDelete) => {
        const idToDelete =
            itemToDelete?._id || itemToDelete?.locationId || itemToDelete?.id;
        if (idToDelete) {
            deleteRecentSearch?.(idToDelete);
        }
    };

    // Commits clear-all action
    const commitBackendClearAll = () => {
        clearRecentSearches?.();
    };

    // Optimistically deletes a single item with 5-second undo window
    const handleDelete = (itemKey) => {
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

        setRecentSearched((prev) =>
            prev.filter((item) => getRecentItemKey(item) !== itemKey)
        );

        deletionTimerRef.current = setTimeout(() => {
            commitBackendDelete(itemToDelete);
            setPendingDeletion(null);
        }, 5000);

        setPendingDeletion({
            item: itemToDelete,
            isBatch: false,
        });
    };

    // Optimistically clears all searches with 5-second undo window
    const handleDeleteAll = () => {
        if (displayedSearches.length === 0) return;

        if (pendingDeletion) {
            if (deletionTimerRef.current) clearTimeout(deletionTimerRef.current);
            if (pendingDeletion.isBatch) {
                commitBackendClearAll();
            } else {
                commitBackendDelete(pendingDeletion.item);
            }
        }

        const backupItems = [...displayedSearches];
        setRecentSearched([]);

        deletionTimerRef.current = setTimeout(() => {
            commitBackendClearAll();
            setPendingDeletion(null);
        }, 5000);

        setPendingDeletion({
            itemsList: backupItems,
            isBatch: true,
        });
    };

    // Restores pending deleted item(s)
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

    return (
        <div className="w-full h-full flex flex-col text-[#F1EEE9] select-none relative">
            {/* Recent searches history section */}
            <div
                className={`flex flex-col min-h-0 mb-3 ${
                    isCatalogOpen ? "flex-1" : "flex-1"
                }`}
            >
                {/* Header Toolbar: Title, Clear All Action, and Live Saved Counter */}
                <div className="flex justify-between items-center mb-2.5 pr-10 shrink-0">
                    <div className="flex items-center gap-2">
                        <Clock3 size={15} aria-hidden="true" className="text-[#8891A0]" />
                        <h2 className="font-semibold text-xs sm:text-sm text-[#F1EEE9] tracking-tight">
                            Recent Searches
                        </h2>
                    </div>

                    <div className="flex items-center gap-2">
                        {displayedSearches.length > 0 && (
                            <button
                                type="button"
                                onClick={handleDeleteAll}
                                className="text-[11px] text-[#8891A0] hover:text-[#F1EEE9] transition cursor-pointer"
                            >
                                Clear all
                            </button>
                        )}

                        {/* Live Saved Sites Count Badge */}
                        <span className="text-[10px] font-medium text-[#8891A0] bg-[#181A21] border border-[#21242C] px-2 py-0.5 rounded-md">
                            {savedCount} Saved
                        </span>
                    </div>
                </div>

                {/* Recent Searches List or Compact Empty Message */}
                {displayedSearches.length > 0 ? (
                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                        {displayedSearches.map((item) => {
                            const itemKey = getRecentItemKey(item);
                            const isSaved =
                                savedLocationIds.has(item._id) ||
                                savedLocationIds.has(item.locationId) ||
                                savedLocationIds.has(item.id) ||
                                savedLocationIds.has(item.name);
                            const { pillLabel, pillClassName } = getTargetBodyInfo(item);
                            const surfaceTemp = formatSurfaceTemp(item);
                            const analogCategory = getAnalogCategory(item);

                            return (
                                /* Clickable Recent Location Card (Clicking anywhere focuses map) */
                                <article
                                    key={itemKey}
                                    onClick={() => handleViewOnMap(item)}
                                    className="relative bg-[#181A21] border border-[#21242C] rounded-xl p-3 transition duration-150 hover:border-[#83CAD8]/50 has-[.card-primary-action:focus-visible]:outline-2 has-[.card-primary-action:focus-visible]:outline-[#83CAD8] shadow-md cursor-pointer"
                                >
                                    {/* Card Header Row: Icon, Location Name, Country, Target Body & Temp */}
                                    <div className="flex items-start justify-between gap-2.5">
                                        <div className="flex items-start gap-2.5 min-w-0">
                                            <div className="w-7 h-7 rounded-lg bg-[#1A1D23] border border-[#21242C] flex items-center justify-center text-[#8891A0] shrink-0 mt-0.5">
                                                <Globe size={14} aria-hidden="true" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-xs font-semibold text-[#F1EEE9] truncate leading-tight">
                                                    {item.name}
                                                </h3>
                                                <p className="text-[10px] text-[#8891A0] truncate mt-0.5">
                                                    {item.country}
                                                </p>
                                                <p className="text-[10px] text-[#8891A0]/85 truncate mt-0.5">
                                                    {analogCategory}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Target Body Pill & Real Mean Surface Temperature */}
                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                            <span
                                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${pillClassName}`}
                                            >
                                                {pillLabel}
                                            </span>
                                            <span className="font-mono text-[11px] text-[#83CAD8] font-medium">
                                                {surfaceTemp}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card Actions Footer: View on Map (stretched), Remove, Save */}
                                    <div className="flex items-center justify-between border-t border-[#21242C] pt-2 mt-2 text-[11px]">
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
                                                size={12}
                                                aria-hidden="true"
                                                className="text-[#8891A0]"
                                            />
                                            <span>View on map</span>
                                        </button>

                                        {/* Isolated Remove & Save Controls */}
                                        <div className="relative z-10 flex items-center gap-2.5">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(itemKey);
                                                }}
                                                aria-label={`Remove ${item.name}`}
                                                className="flex items-center gap-1 text-[#D04D39] hover:text-[#D04D39]/80 transition duration-150 cursor-pointer py-0.5 px-1 rounded"
                                            >
                                                <X size={12} aria-hidden="true" />
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
                                                    size={12}
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
                        })}
                    </div>
                ) : (
                    /* Compact Empty Message When No Recent Searches */
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-[#21242C] text-[#8891A0] text-xs">
                        <p className="font-medium text-[#F1EEE9]">No recent searches yet.</p>
                        <p className="text-[11px] text-[#8891A0] mt-1 max-w-xs">
                            Click any pinned analog site below to view live telemetry on the map.
                        </p>
                    </div>
                )}
            </div>

            {/* Pinned analog sites directory */}
            <div
                className={`flex flex-col min-h-0 border-t border-[#21242C] pt-3 transition-all duration-200 ${
                    isCatalogOpen ? "flex-1" : "shrink-0"
                }`}
            >
                {/* 
                  Non-truncated sidebar header layout:
                  The title row ("Pinned Analog Sites (count)") and the planetary filter pills (All / Moon / Mars)
                  are stacked on separate dedicated flex rows with whitespace-nowrap and shrink-0.
                  This ensures that even when the sidebar is narrow or resized, the title "Pinned Analog Sites (51)"
                  is never clipped or truncated with ellipsis (...).
                */}
                <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
                    <div className="flex items-center gap-1.5 shrink-0">
                        <MapPin size={14} aria-hidden="true" className="text-[#83CAD8] shrink-0" />
                        <h3 className="font-semibold text-xs text-[#F1EEE9] whitespace-nowrap shrink-0">
                            Pinned Analog Sites ({locData.length})
                        </h3>
                    </div>

                    {/* Expand / Collapse Toggle Button */}
                    <button
                        type="button"
                        onClick={() => setIsCatalogOpen((prev) => !prev)}
                        aria-expanded={isCatalogOpen}
                        aria-label={
                            isCatalogOpen
                                ? "Collapse pinned analog sites catalog"
                                : "Expand pinned analog sites catalog"
                        }
                        title={
                            isCatalogOpen
                                ? "Collapse catalog to give Recent Searches full height"
                                : "Expand pinned analog sites catalog"
                        }
                        className="p-1 rounded-md bg-[#181A21] border border-[#21242C] text-[#8891A0] hover:text-[#83CAD8] hover:border-[#83CAD8]/60 transition cursor-pointer shrink-0"
                    >
                        {isCatalogOpen ? (
                            <ChevronDown size={14} aria-hidden="true" />
                        ) : (
                            <ChevronUp size={14} aria-hidden="true" />
                        )}
                    </button>
                </div>

                {/* Dedicated Planetary Filter Pills Row (Visible when isCatalogOpen === true) */}
                {isCatalogOpen && (
                    <div className="flex items-center gap-1 bg-[#181A21] border border-[#21242C] p-0.5 rounded-lg mb-2 shrink-0 self-start">
                        {[
                            { id: "all", label: "All" },
                            { id: "moon", label: "Moon" },
                            { id: "mars", label: "Mars" },
                        ].map((filter) => {
                            const isSelected = pinnedFilter === filter.id;
                            return (
                                <button
                                    key={filter.id}
                                    type="button"
                                    onClick={() => setPinnedFilter(filter.id)}
                                    className={`px-2.5 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
                                        isSelected
                                            ? filter.id === "mars"
                                                ? "bg-[#D67051] text-[#090D15] font-semibold"
                                                : "bg-[#83CAD8] text-[#090D15] font-semibold"
                                            : "text-[#8891A0] hover:text-[#F1EEE9]"
                                    }`}
                                >
                                    {filter.label}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Scrollable List of Pinned Analog Sites (Visible when isCatalogOpen === true) */}
                {isCatalogOpen && (
                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                        {filteredPinnedSites.map((location) => {
                            const locKey = location._id || location.id || location.name;
                            const { pillLabel, pillClassName } = getTargetBodyInfo(location);
                            const recognition = getAnalogRecognitionStatus(location);
                            const surfaceTemp = formatSurfaceTemp(location);

                            return (
                                <button
                                    key={locKey}
                                    type="button"
                                    onClick={() => handleViewOnMap(location)}
                                    className="w-full text-left bg-[#181A21] border border-[#21242C] hover:border-[#83CAD8]/60 rounded-xl p-2.5 flex items-center justify-between gap-2 cursor-pointer transition group shadow-sm"
                                >
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-[#F1EEE9] group-hover:text-[#83CAD8] truncate transition">
                                            {location.name}
                                        </p>
                                        <p className="text-[10px] text-[#8891A0] truncate mt-0.5">
                                            {location.country}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${recognition.badgeClass}`}
                                        >
                                            {recognition.label}
                                        </span>
                                        <span
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${pillClassName}`}
                                        >
                                            {pillLabel}
                                        </span>
                                        <span className="font-mono text-[10px] text-[#83CAD8] font-medium">
                                            {surfaceTemp}
                                        </span>
                                        <MapPin
                                            size={12}
                                            aria-hidden="true"
                                            className="text-[#8891A0] group-hover:text-[#83CAD8] transition"
                                        />
                                    </div>
                                </button>
                            );
                        })}
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
