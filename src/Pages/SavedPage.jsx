import { useState, useMemo, useRef, useEffect } from "react";
import { Globe, Trash2, ArrowRight, ListFilter, Check, RotateCcw } from "lucide-react";
import useSaved from "../Hooks/useSaved";
import Loader from "../Components/Loader";
import { API_BASE_URL } from "../utils/api";
import { Link } from "react-router";
import { toast } from "react-toastify";

/**
 * ============================================================================
 * Canonical Demo Saved Locations
 * ============================================================================
 * Initial demo data matching candidate analog sites and relative timestamps.
 * Rendered when a visitor explores the page without database bookmarks.
 */
const CANONICAL_SAVED_LOCATIONS = [
    {
        _id: "demo-devon-island",
        name: "Devon Island",
        country: "Canada",
        analogType: ["moon"],
        similarityScore: 87,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Saved 1 day ago
        coordinates: { latitude: 75.3333, longitude: -89.6667 },
    },
    {
        _id: "demo-atacama-desert",
        name: "Atacama Desert",
        country: "Chile",
        analogType: ["mars"],
        similarityScore: 89,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // Saved 2 days ago
        coordinates: { latitude: -23.8634, longitude: -69.1328 },
    },
    {
        _id: "demo-mauna-kea",
        name: "Mauna Kea",
        country: "United States",
        analogType: ["moon"],
        similarityScore: 81,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // Saved 3 days ago
        coordinates: { latitude: 19.8207, longitude: -155.4681 },
    },
    {
        _id: "demo-mcmurdo-valleys",
        name: "McMurdo Dry Valleys",
        country: "Antarctica",
        analogType: ["mars"],
        similarityScore: 84,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // Saved 5 days ago
        coordinates: { latitude: -77.5167, longitude: 161.0 },
    },
];

/**
 * ============================================================================
 * Relative Timestamp Formatter Helper
 * ============================================================================
 */
const formatRelativeTime = (dateVal) => {
    if (!dateVal) return "Saved recently";
    const then = new Date(dateVal).getTime();
    const now = Date.now();
    const diffMs = Math.max(0, now - then);
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return "Saved today";
    if (diffDays === 1) return "Saved 1 day ago";
    return `Saved ${diffDays} days ago`;
};

/**
 * ============================================================================
 * SavedPage Component
 * ============================================================================
 * Displays bookmarked candidate planetary analog sites in a dark space-themed
 * 3-column grid with target body filter pills, sorting options, optimistic site
 * removal with 5-second Dark Undo Snackbar, active comparison highlight borders,
 * and a floating bottom comparison action banner:
 * - Background: `#07090E` with `#F1EEE9` typography
 * - Cards: `#0B0E13` with border `#21242C` and comparison highlight `#83CAD8`
 * - Controls: `#1A1D23` (Active) & `#0B0E13` (Inactive) with `#8891A0`
 * - Primary Action: `#83CAD8` with dark text `#090D15`
 * - Undo Banner: `#090B10` with `#21242C` border and `#83CAD8` action
 */
const SavedPage = () => {
    // ------------------------------------------------------------------------
    // 1. Data Hooks & Backend Integration
    // ------------------------------------------------------------------------
    const { savedLoc, setSavedLoc, loading } = useSaved();
    const [demoItems, setDemoItems] = useState(CANONICAL_SAVED_LOCATIONS);

    // ------------------------------------------------------------------------
    // 2. Filter & Sorting State Variables
    // ------------------------------------------------------------------------
    const [targetFilter, setTargetFilter] = useState("all");
    const [sortOrder, setSortOrder] = useState("newest");
    const [selectedForCompare, setSelectedForCompare] = useState([
        "demo-devon-island",
        "demo-mauna-kea",
    ]);

    // ------------------------------------------------------------------------
    // 3. Optimistic Deletion & 5-Second Undo State Management
    // ------------------------------------------------------------------------
    const [pendingDeletion, setPendingDeletion] = useState(null);
    const deletionTimerRef = useRef(null);

    useEffect(() => {
        return () => {
            if (deletionTimerRef.current) {
                clearTimeout(deletionTimerRef.current);
            }
        };
    }, []);

    // ------------------------------------------------------------------------
    // 4. Data Source Selection
    // ------------------------------------------------------------------------
    const activeLocationsPool = useMemo(() => {
        if (savedLoc && savedLoc.length > 0) {
            return savedLoc;
        }
        return demoItems;
    }, [savedLoc, demoItems]);

    // ------------------------------------------------------------------------
    // 5. Filtering and Sorting Calculation
    // ------------------------------------------------------------------------
    const displayedItems = useMemo(() => {
        const filtered = activeLocationsPool.filter((item) => {
            if (targetFilter === "moon") {
                return item.analogType?.some((t) => t.toLowerCase() === "moon");
            }
            if (targetFilter === "mars") {
                return item.analogType?.some((t) => t.toLowerCase() === "mars");
            }
            return true;
        });

        return [...filtered].sort((a, b) => {
            if (sortOrder === "newest") {
                const timeA = new Date(a.created_at || 0).getTime();
                const timeB = new Date(b.created_at || 0).getTime();
                return timeB - timeA;
            }
            if (sortOrder === "oldest") {
                const timeA = new Date(a.created_at || 0).getTime();
                const timeB = new Date(b.created_at || 0).getTime();
                return timeA - timeB;
            }
            if (sortOrder === "score") {
                return (b.similarityScore || 0) - (a.similarityScore || 0);
            }
            if (sortOrder === "name") {
                return (a.name || "").localeCompare(b.name || "");
            }
            return 0;
        });
    }, [activeLocationsPool, targetFilter, sortOrder]);

    // ------------------------------------------------------------------------
    // 6. Comparison Selection Handlers
    // ------------------------------------------------------------------------
    const toggleCompare = (locId) => {
        setSelectedForCompare((prev) =>
            prev.includes(locId)
                ? prev.filter((id) => id !== locId)
                : [...prev, locId]
        );
    };

    const clearSelectedForCompare = () => {
        setSelectedForCompare([]);
    };

    // ------------------------------------------------------------------------
    // 7. Optimistic Deletion & Undo Actions
    // ------------------------------------------------------------------------
    const commitBackendDelete = (itemToDelete, isRealDb) => {
        if (isRealDb && itemToDelete?._id) {
            fetch(`${API_BASE_URL}/savedLocs/${itemToDelete._id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
            }).catch((err) => console.error("Async delete error:", err));
        }
    };

    const handleDelete = (theId) => {
        if (pendingDeletion) {
            if (deletionTimerRef.current) clearTimeout(deletionTimerRef.current);
            commitBackendDelete(pendingDeletion.item, pendingDeletion.isRealDbItem);
        }

        const isRealDbItem = Boolean(savedLoc && savedLoc.some((item) => item._id === theId));
        const itemToRemove = activeLocationsPool.find((item) => item._id === theId);
        if (!itemToRemove) return;

        const wasCompared = selectedForCompare.includes(theId);

        if (isRealDbItem) {
            setSavedLoc((prev) => prev.filter((item) => item._id !== theId));
        } else {
            setDemoItems((prev) => prev.filter((item) => item._id !== theId));
        }
        setSelectedForCompare((prev) => prev.filter((id) => id !== theId));

        const timerId = setTimeout(() => {
            commitBackendDelete(itemToRemove, isRealDbItem);
            setPendingDeletion(null);
        }, 5000);

        deletionTimerRef.current = timerId;

        setPendingDeletion({
            item: itemToRemove,
            wasCompared,
            isRealDbItem,
        });
    };

    const handleUndoDelete = () => {
        if (!pendingDeletion) return;

        if (deletionTimerRef.current) {
            clearTimeout(deletionTimerRef.current);
            deletionTimerRef.current = null;
        }

        const { item, wasCompared, isRealDbItem } = pendingDeletion;

        if (isRealDbItem) {
            setSavedLoc((prev) => [item, ...prev]);
        } else {
            setDemoItems((prev) => [item, ...prev]);
        }

        if (wasCompared) {
            setSelectedForCompare((prev) => [...prev, item._id]);
        }

        toast.info(`Restored "${item.name}" to saved locations.`);
        setPendingDeletion(null);
    };

    if (loading) return <Loader />;

    // ------------------------------------------------------------------------
    // 8. Render
    // ------------------------------------------------------------------------
    return (
        <div className="w-full h-full overflow-y-auto bg-[#07090E] text-[#F1EEE9] select-none px-4 sm:px-6 lg:px-12 py-8 pb-32">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* ========================================================== */}
                {/* 1. Header Section: Title & Subtitle                        */}
                {/* ========================================================== */}
                <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-bold text-[#F1EEE9] tracking-tight">
                        Saved Locations
                    </h1>
                    <p className="text-xs text-[#8891A0]">
                        Manage candidate analog sites and compare targets side by side.
                    </p>
                </div>

                {/* ========================================================== */}
                {/* 2. Controls Toolbar: Target Filter Pills & Sort Dropdown   */}
                {/* ========================================================== */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                    {/* Left: Planetary Body Filter Pills (All Targets, Moon, Mars) */}
                    <div className="flex items-center gap-2">
                        {/* All Targets Pill */}
                        <button
                            type="button"
                            onClick={() => setTargetFilter("all")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                                targetFilter === "all"
                                    ? "bg-[#1A1D23] border border-[#21242C] text-[#F1EEE9] shadow-sm"
                                    : "bg-[#0B0E13] border border-[#21242C] text-[#8891A0] hover:text-[#F1EEE9]"
                            }`}
                        >
                            All Targets
                        </button>

                        {/* Moon Target Pill */}
                        <button
                            type="button"
                            onClick={() => setTargetFilter("moon")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                                targetFilter === "moon"
                                    ? "bg-[#1A1D23] border border-[#21242C] text-[#F1EEE9] shadow-sm"
                                    : "bg-[#0B0E13] border border-[#21242C] text-[#8891A0] hover:text-[#F1EEE9]"
                            }`}
                        >
                            Moon
                        </button>

                        {/* Mars Target Pill */}
                        <button
                            type="button"
                            onClick={() => setTargetFilter("mars")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                                targetFilter === "mars"
                                    ? "bg-[#1A1D23] border border-[#21242C] text-[#F1EEE9] shadow-sm"
                                    : "bg-[#0B0E13] border border-[#21242C] text-[#8891A0] hover:text-[#F1EEE9]"
                            }`}
                        >
                            Mars
                        </button>
                    </div>

                    {/* Right: Sort Dropdown Menu */}
                    <div className="flex items-center gap-2">
                        <div className="relative flex items-center bg-[#0B0E13] border border-[#21242C] rounded-lg px-2.5 py-1.5 text-xs text-[#F1EEE9] hover:border-[#272C34] transition">
                            <ListFilter size={14} className="text-[#8891A0] mr-2 shrink-0" />
                            <span className="text-[#8891A0] mr-1.5">Sort:</span>
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                                className="bg-transparent text-[#F1EEE9] text-xs focus:outline-none cursor-pointer pr-2"
                            >
                                <option value="newest" className="bg-[#0B0E13] text-[#F1EEE9]">
                                    Date Added (Newest)
                                </option>
                                <option value="oldest" className="bg-[#0B0E13] text-[#F1EEE9]">
                                    Date Added (Oldest)
                                </option>
                                <option value="score" className="bg-[#0B0E13] text-[#F1EEE9]">
                                    Similarity Score (Highest)
                                </option>
                                <option value="name" className="bg-[#0B0E13] text-[#F1EEE9]">
                                    Location Name (A-Z)
                                </option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* ========================================================== */}
                {/* 3. Location Cards Grid (3 Columns)                         */}
                {/* ========================================================== */}
                {displayedItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5 pt-2">
                        {displayedItems.map((location) => {
                            const locId = location._id || location.id || location.name;
                            const isChecked = selectedForCompare.includes(locId);

                            const primaryType =
                                location.analogType && location.analogType.length > 0
                                    ? location.analogType[0]
                                    : "Moon";

                            return (
                                <div
                                    key={locId}
                                    className={`bg-[#0B0E13] rounded-xl p-4 transition-all duration-150 shadow-md flex flex-col justify-between ${
                                        isChecked
                                            ? "border border-[#83CAD8] shadow-[0_0_15px_rgba(131,202,216,0.12)]"
                                            : "border border-[#21242C] hover:border-[#272C34]"
                                    }`}
                                >
                                    {/* Card Top Row: Icon, Information, Body Pill, Timestamp & Score */}
                                    <div>
                                        <div className="flex items-start justify-between gap-3">
                                            {/* Left Icon and Details */}
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div className="w-10 h-10 rounded-lg bg-[#1A1D23] border border-[#21242C] flex items-center justify-center text-[#8891A0] shrink-0 mt-0.5">
                                                    <Globe size={18} />
                                                </div>

                                                <div className="min-w-0">
                                                    <h3 className="text-sm font-semibold text-[#F1EEE9] truncate leading-tight">
                                                        {location.name}
                                                    </h3>
                                                    <p className="text-xs text-[#8891A0] truncate mt-0.5">
                                                        {location.country}
                                                    </p>

                                                    {/* Target Body Pill and Relative Timestamp */}
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#181A21] border border-[#21242C] text-[#8891A0] capitalize">
                                                            {primaryType}
                                                        </span>
                                                        <span className="text-[10px] text-[#8891A0]">
                                                            {formatRelativeTime(location.created_at)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Monospace Similarity Score */}
                                            <span className="font-mono text-xs text-[#83CAD8] shrink-0 font-medium">
                                                {location.similarityScore}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card Bottom Row: Compare Checkbox & Delete Trash Icon */}
                                    <div className="flex items-center justify-between border-t border-[#21242C] pt-3 mt-4 text-xs">
                                        {/* Compare Selection Checkbox with Label */}
                                        <button
                                            type="button"
                                            onClick={() => toggleCompare(locId)}
                                            className="flex items-center gap-2 cursor-pointer text-[#F1EEE9] transition select-none"
                                        >
                                            <div
                                                className={`w-4 h-4 rounded flex items-center justify-center transition border ${
                                                    isChecked
                                                        ? "bg-[#83CAD8] border-[#83CAD8] text-[#090D15]"
                                                        : "bg-[#181A21] border-[#272C34] text-transparent"
                                                }`}
                                            >
                                                <Check size={11} strokeWidth={3} className={isChecked ? "text-[#090D15]" : "opacity-0"} />
                                            </div>
                                            <span className="text-xs text-[#F1EEE9] font-medium">
                                                Compare
                                            </span>
                                        </button>

                                        {/* Remove / Trash Button */}
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(locId)}
                                            className="text-[#8891A0] hover:text-[#D04D39] p-1 rounded transition cursor-pointer"
                                            title="Remove location"
                                            aria-label="Remove location"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-16 px-4 rounded-xl border border-dashed border-[#21242C] text-[#8891A0] text-xs my-6">
                        <Globe size={32} className="mx-auto opacity-40 mb-2.5 text-[#8891A0]" />
                        <p className="font-medium text-[#F1EEE9] text-sm">
                            No saved locations found for this filter.
                        </p>
                        <p className="text-[11px] text-[#8891A0] mt-1">
                            Switch filter to &quot;All Targets&quot; or search candidate sites to bookmark them.
                        </p>
                    </div>
                )}
            </div>

            {/* ========================================================== */}
            {/* 4. Bottom-Left Dark Undo Snackbar Banner (bg-[#090B10])    */}
            {/* ========================================================== */}
            {pendingDeletion && (
                <div className="fixed bottom-6 left-6 z-50 bg-[#090B10]/95 backdrop-blur-md border border-[#21242C] text-[#F1EEE9] rounded-xl px-4 py-3 shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-3 duration-150">
                    <span className="text-xs text-[#8891A0]">
                        Removed <strong className="text-[#F1EEE9] font-medium">&quot;{pendingDeletion.item.name}&quot;</strong>
                    </span>
                    <button
                        type="button"
                        onClick={handleUndoDelete}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[#83CAD8] hover:opacity-90 px-2.5 py-1 rounded bg-[#1A1D23] border border-[#21242C] transition cursor-pointer"
                    >
                        <RotateCcw size={12} />
                        <span>Undo</span>
                    </button>
                </div>
            )}

            {/* ========================================================== */}
            {/* 5. Floating Bottom Comparison Action Bar (bg-[#090B10])    */}
            {/* ========================================================== */}
            {selectedForCompare.length >= 2 && (
                <aside
                    aria-label="Side-by-side comparison bar"
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-5xl z-40 bg-[#090B10]/95 backdrop-blur-md border border-[#21242C] rounded-xl px-5 sm:px-6 py-3.5 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200"
                >
                    <div>
                        <p className="text-xs sm:text-sm font-semibold text-[#F1EEE9] leading-tight">
                            {selectedForCompare.length} of {displayedItems.length} locations selected
                        </p>
                        <p className="text-[11px] text-[#8891A0] mt-0.5">
                            Ready for side-by-side comparison.
                        </p>
                    </div>

                    <div className="flex items-center justify-end gap-3.5">
                        <button
                            type="button"
                            onClick={clearSelectedForCompare}
                            className="text-xs text-[#8891A0] hover:text-[#F1EEE9] transition cursor-pointer px-1 py-1"
                        >
                            Clear
                        </button>

                        <Link
                            to={`/compare?ids=${selectedForCompare.join(",")}`}
                            className="bg-[#83CAD8] hover:opacity-90 text-[#090D15] font-semibold px-4 py-2 rounded-lg text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
                        >
                            <span>Compare selected ({selectedForCompare.length})</span>
                            <ArrowRight size={14} className="text-[#090D15] shrink-0" />
                        </Link>
                    </div>
                </aside>
            )}
        </div>
    );
};

export default SavedPage;
