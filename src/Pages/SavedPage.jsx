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
 * Initial demo data matching the exact sites and timestamps shown in
 * the Save Location - 2.png mockup. Rendered as fallback when an
 * unauthenticated visitor visits the page or when the saved list is empty.
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
 * Formats a past ISO date string into a friendly relative label,
 * matching the mockup format (e.g., "Saved 1 day ago", "Saved 2 days ago").
 *
 * @param {string|Date} dateVal - Creation ISO timestamp
 * @returns {string} - Relative time string
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
 * Renders the saved candidate planetary analog sites in a dark space-themed
 * 3-column grid with target body filter pills, sorting options, optimistic site
 * removal with 5-second Dark Undo Snackbar, active comparison highlight borders,
 * and a floating bottom comparison action banner.
 */
const SavedPage = () => {
    // ------------------------------------------------------------------------
    // 1. Data Hooks & Backend Integration
    // ------------------------------------------------------------------------
    const { savedLoc, setSavedLoc, loading } = useSaved();

    // Local state for demo items fallback when visitor has no database items
    const [demoItems, setDemoItems] = useState(CANONICAL_SAVED_LOCATIONS);

    // ------------------------------------------------------------------------
    // 2. Filter & Sorting State Variables
    // ------------------------------------------------------------------------

    // Active planetary body target filter: 'all' | 'moon' | 'mars' (default: 'all')
    const [targetFilter, setTargetFilter] = useState("all");

    // Active sort order: 'newest' | 'oldest' | 'score' | 'name' (default: 'newest')
    const [sortOrder, setSortOrder] = useState("newest");

    // Array of selected location IDs for side-by-side comparison
    // Initialized with Devon Island and Mauna Kea to match Save Location - 2.png
    const [selectedForCompare, setSelectedForCompare] = useState([
        "demo-devon-island",
        "demo-mauna-kea",
    ]);

    // ------------------------------------------------------------------------
    // 3. Optimistic Deletion & 5-Second Undo State Management
    // ------------------------------------------------------------------------
    // Holds the currently pending deletion: { item, wasCompared, isRealDbItem }
    const [pendingDeletion, setPendingDeletion] = useState(null);

    // Ref to manage the 5-second countdown timer safely across renders
    const deletionTimerRef = useRef(null);

    // Clean up timer on component unmount
    useEffect(() => {
        return () => {
            if (deletionTimerRef.current) {
                clearTimeout(deletionTimerRef.current);
            }
        };
    }, []);

    // ------------------------------------------------------------------------
    // 4. Data Source Selection (API data vs. Canonical Mock Data)
    // ------------------------------------------------------------------------
    // If the authenticated user has real saved items from MongoDB, use those;
    // otherwise fallback to the canonical demo dataset matching the mockup.
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
        // Step A: Filter by target planetary body (All, Moon, Mars)
        const filtered = activeLocationsPool.filter((item) => {
            if (targetFilter === "moon") {
                return item.analogType?.some((t) => t.toLowerCase() === "moon");
            }
            if (targetFilter === "mars") {
                return item.analogType?.some((t) => t.toLowerCase() === "mars");
            }
            return true;
        });

        // Step B: Sort based on chosen criteria
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
    // 6. Comparison Selection Toggle Handlers
    // ------------------------------------------------------------------------
    /**
     * Toggles a location ID in or out of the comparison selection list
     *
     * @param {string} locId - Location identifier
     */
    const toggleCompare = (locId) => {
        setSelectedForCompare((prev) =>
            prev.includes(locId)
                ? prev.filter((id) => id !== locId)
                : [...prev, locId]
        );
    };

    /**
     * Clears all selected comparison items
     */
    const clearSelectedForCompare = () => {
        setSelectedForCompare([]);
    };

    // ------------------------------------------------------------------------
    // 7. Optimistic Deletion & Dark Undo Snackbar Actions
    // ------------------------------------------------------------------------
    /**
     * Executes the actual backend deletion after the 5-second grace window expires
     */
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

    /**
     * Optimistically removes a saved location and displays the dark Undo banner
     *
     * @param {string} theId - Location ID to remove
     * @param {string} locationName - Name of the location for notification
     */
    const handleDelete = (theId) => {
        // If a previous deletion is still pending, commit it immediately
        if (pendingDeletion) {
            if (deletionTimerRef.current) clearTimeout(deletionTimerRef.current);
            commitBackendDelete(pendingDeletion.item, pendingDeletion.isRealDbItem);
        }

        const isRealDbItem = Boolean(savedLoc && savedLoc.some((item) => item._id === theId));
        const itemToRemove = activeLocationsPool.find((item) => item._id === theId);
        if (!itemToRemove) return;

        const wasCompared = selectedForCompare.includes(theId);

        // Optimistically remove from state immediately
        if (isRealDbItem) {
            setSavedLoc((prev) => prev.filter((item) => item._id !== theId));
        } else {
            setDemoItems((prev) => prev.filter((item) => item._id !== theId));
        }
        setSelectedForCompare((prev) => prev.filter((id) => id !== theId));

        // Start 5-second countdown to permanently commit backend deletion
        const timerId = setTimeout(() => {
            commitBackendDelete(itemToRemove, isRealDbItem);
            setPendingDeletion(null);
        }, 5000);

        deletionTimerRef.current = timerId;

        // Display pending undo snackbar
        setPendingDeletion({
            item: itemToRemove,
            wasCompared,
            isRealDbItem,
        });
    };

    /**
     * Reverts the optimistic deletion, restores the location, and cancels the backend timer
     */
    const handleUndoDelete = () => {
        if (!pendingDeletion) return;

        // Cancel scheduled backend DELETE request
        if (deletionTimerRef.current) {
            clearTimeout(deletionTimerRef.current);
            deletionTimerRef.current = null;
        }

        const { item, wasCompared, isRealDbItem } = pendingDeletion;

        // Restore item back to respective pool
        if (isRealDbItem) {
            setSavedLoc((prev) => [item, ...prev]);
        } else {
            setDemoItems((prev) => [item, ...prev]);
        }

        // Restore compare selection if it was selected prior to deletion
        if (wasCompared) {
            setSelectedForCompare((prev) => [...prev, item._id]);
        }

        toast.info(`Restored "${item.name}" to saved locations.`);
        setPendingDeletion(null);
    };

    // Show loading spinner while initial data is being fetched
    if (loading) return <Loader />;

    // ------------------------------------------------------------------------
    // 8. Render
    // ------------------------------------------------------------------------
    return (
        <div className="w-full h-full overflow-y-auto bg-[#13161c] text-slate-200 select-none px-4 sm:px-6 lg:px-12 py-8 pb-32">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* ========================================================== */}
                {/* 1. Header Section: Title & Subtitle                        */}
                {/* ========================================================== */}
                <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                        Saved Locations
                    </h1>
                    <p className="text-xs text-slate-400">
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
                                    ? "bg-[#242c37] border border-slate-700 text-white shadow-sm"
                                    : "bg-[#1a212b] border border-[#273240] text-slate-400 hover:text-white"
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
                                    ? "bg-[#242c37] border border-slate-700 text-white shadow-sm"
                                    : "bg-[#1a212b] border border-[#273240] text-slate-400 hover:text-white"
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
                                    ? "bg-[#242c37] border border-slate-700 text-white shadow-sm"
                                    : "bg-[#1a212b] border border-[#273240] text-slate-400 hover:text-white"
                            }`}
                        >
                            Mars
                        </button>
                    </div>

                    {/* Right: Sort Dropdown Menu matching Search/Saved mockup */}
                    <div className="flex items-center gap-2">
                        <div className="relative flex items-center bg-[#1a212b] border border-[#273240] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-600 transition">
                            <ListFilter size={14} className="text-slate-400 mr-2 shrink-0" />
                            <span className="text-slate-400 mr-1.5">Sort:</span>
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer pr-2"
                            >
                                <option value="newest" className="bg-[#1a212b] text-white">
                                    Date Added (Newest)
                                </option>
                                <option value="oldest" className="bg-[#1a212b] text-white">
                                    Date Added (Oldest)
                                </option>
                                <option value="score" className="bg-[#1a212b] text-white">
                                    Similarity Score (Highest)
                                </option>
                                <option value="name" className="bg-[#1a212b] text-white">
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

                            // Determine primary analog body type (Moon or Mars)
                            const primaryType =
                                location.analogType && location.analogType.length > 0
                                    ? location.analogType[0]
                                    : "Moon";

                            return (
                                <div
                                    key={locId}
                                    className={`bg-[#1a212b] rounded-xl p-4 transition-all duration-150 shadow-md flex flex-col justify-between ${
                                        isChecked
                                            ? "border border-[#4e829e] shadow-[0_0_15px_rgba(78,130,158,0.15)]"
                                            : "border border-[#273240] hover:border-slate-600/80"
                                    }`}
                                >
                                    {/* Card Top Row: Icon, Information, Body Pill, Timestamp & Score */}
                                    <div>
                                        <div className="flex items-start justify-between gap-3">
                                            {/* Left Icon and Details */}
                                            <div className="flex items-start gap-3 min-w-0">
                                                {/* Dark Square Box with Globe Icon */}
                                                <div className="w-10 h-10 rounded-lg bg-[#222b37] border border-[#2c3746] flex items-center justify-center text-slate-400 shrink-0 mt-0.5">
                                                    <Globe size={18} />
                                                </div>

                                                {/* Name, Country, Target Body & Timestamp */}
                                                <div className="min-w-0">
                                                    <h3 className="text-sm font-semibold text-white truncate leading-tight">
                                                        {location.name}
                                                    </h3>
                                                    <p className="text-xs text-slate-400 truncate mt-0.5">
                                                        {location.country}
                                                    </p>

                                                    {/* Target Body Pill and Relative Timestamp */}
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#222b37] border border-[#2f3b4c] text-slate-300 capitalize">
                                                            {primaryType}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500">
                                                            {formatRelativeTime(location.created_at)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Monospace Similarity Score */}
                                            <span className="font-mono text-xs text-slate-300 shrink-0 font-medium">
                                                {location.similarityScore}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card Bottom Row: Compare Checkbox & Delete Trash Icon */}
                                    <div className="flex items-center justify-between border-t border-[#252f3d] pt-3 mt-4 text-xs">
                                        {/* Compare Selection Checkbox with Label */}
                                        <button
                                            type="button"
                                            onClick={() => toggleCompare(locId)}
                                            className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white transition select-none"
                                        >
                                            <div
                                                className={`w-4 h-4 rounded flex items-center justify-center transition border ${
                                                    isChecked
                                                        ? "bg-[#4e829e] border-[#4e829e] text-slate-900"
                                                        : "bg-[#182029] border-[#364455] text-transparent"
                                                }`}
                                            >
                                                <Check size={11} strokeWidth={3} className={isChecked ? "text-slate-950" : "opacity-0"} />
                                            </div>
                                            <span className="text-xs text-slate-300 font-medium">
                                                Compare
                                            </span>
                                        </button>

                                        {/* Remove / Trash Button (Optimistic with 5s Undo) */}
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(locId)}
                                            className="text-slate-500 hover:text-red-400 p-1 rounded transition cursor-pointer"
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
                    /* Empty State when no locations match the active target filter */
                    <div className="text-center py-16 px-4 rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs my-6">
                        <Globe size={32} className="mx-auto opacity-40 mb-2.5 text-slate-500" />
                        <p className="font-medium text-slate-400 text-sm">
                            No saved locations found for this filter.
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                            Switch filter to &quot;All Targets&quot; or search candidate sites to bookmark them.
                        </p>
                    </div>
                )}
            </div>

            {/* ========================================================== */}
            {/* 4. Bottom-Left Dark Undo Snackbar Banner                   */}
            {/* ========================================================== */}
            {pendingDeletion && (
                <div className="fixed bottom-6 left-6 z-50 bg-[#181f28]/95 backdrop-blur-md border border-slate-700 text-slate-200 rounded-xl px-4 py-3 shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-3 duration-150">
                    <span className="text-xs text-slate-300">
                        Removed <strong className="text-white font-medium">&quot;{pendingDeletion.item.name}&quot;</strong>
                    </span>
                    <button
                        type="button"
                        onClick={handleUndoDelete}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[#82a8bf] hover:text-[#97bad0] px-2.5 py-1 rounded bg-[#202936] border border-[#2f3d4e] transition cursor-pointer"
                    >
                        <RotateCcw size={12} />
                        <span>Undo</span>
                    </button>
                </div>
            )}

            {/* ========================================================== */}
            {/* 5. Floating Bottom Comparison Action Bar                   */}
            {/* ========================================================== */}
            {selectedForCompare.length >= 2 && (
                <aside
                    aria-label="Side-by-side comparison bar"
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-5xl z-40 bg-[#19202a]/95 backdrop-blur-md border border-[#2f3d4e] rounded-xl px-5 sm:px-6 py-3.5 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200"
                >
                    {/* Left Info: Selected Count and Ready Subtitle */}
                    <div>
                        <p className="text-xs sm:text-sm font-semibold text-white leading-tight">
                            {selectedForCompare.length} of {displayedItems.length} locations selected
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            Ready for side-by-side comparison.
                        </p>
                    </div>

                    {/* Right Actions: Clear Selection & Compare Selected Button */}
                    <div className="flex items-center justify-end gap-3.5">
                        {/* Clear Selection Trigger */}
                        <button
                            type="button"
                            onClick={clearSelectedForCompare}
                            className="text-xs text-slate-400 hover:text-white transition cursor-pointer px-1 py-1"
                        >
                            Clear
                        </button>

                        {/* Primary Compare Action Button with Arrow Icon */}
                        <Link
                            to={`/compare?ids=${selectedForCompare.join(",")}`}
                            className="bg-[#82a8bf] hover:bg-[#97bad0] text-slate-900 font-semibold px-4 py-2 rounded-lg text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
                        >
                            <span>Compare selected ({selectedForCompare.length})</span>
                            <ArrowRight size={14} className="text-slate-900 shrink-0" />
                        </Link>
                    </div>
                </aside>
            )}
        </div>
    );
};

export default SavedPage;
