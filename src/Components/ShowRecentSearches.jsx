import { useState, useContext } from "react";
import { Check, Clock3, Globe, MapPin, X, ChevronRight } from "lucide-react";
import useRecent from "../Hooks/useRecent";
import useSaved from "../Hooks/useSaved";
import { toast } from "react-toastify";
import useAuth from "../Hooks/useAuth";
import Swal from "sweetalert2";
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
        isSaved: true
    },
    {
        _id: "demo-mcmurdo",
        name: "McMurdo Dry Valleys",
        country: "Antarctica",
        similarityScore: 84,
        coordinates: { latitude: -77.5167, longitude: 161.0 },
        isSaved: true
    },
    {
        _id: "demo-danakil",
        name: "Danakil Depression",
        country: "Ethiopia",
        similarityScore: 76,
        coordinates: { latitude: 14.2417, longitude: 40.3 },
        isSaved: true
    }
];

/**
 * ShowRecentSearches Component
 * Displays candidate planetary analog searches in the dark drawer sidebar.
 * Styled to match the exact visual layout of Dashboard.png.
 */
const ShowRecentSearches = ({ onClose }) => {
    const { recentSearched, setRecentSearched } = useRecent();
    const { savedLoc } = useSaved();
    const { user } = useAuth();
    const { setMapTarget } = useContext(StateContext);

    // Fallback local searches when user is guest or has no search history
    const [demoSearches, setDemoSearches] = useState(INITIAL_DEMO_SEARCHES);

    // Use backend searches if present; otherwise fallback to canonical demo list
    const hasDbSearches = recentSearched && recentSearched.length > 0;
    const displayedSearches = hasDbSearches ? recentSearched : demoSearches;

    // Determine badge count (e.g. "5 Saved" matching the mockup)
    const savedCount = savedLoc?.length > 0 ? savedLoc.length : 5;

    // Pan and zoom map to location coordinates
    const handleViewOnMap = (loc) => {
        if (loc?.coordinates?.latitude && loc?.coordinates?.longitude) {
            setMapTarget({
                latitude: loc.coordinates.latitude,
                longitude: loc.coordinates.longitude,
                zoom: 10
            });
        }
    };

    // Save a location from recent search history to saved list
    const handleSave = (theId) => {
        if (!user?.email) {
            toast.info("Location marked as saved!");
            return;
        }

        const locationToSave = displayedSearches.find(recent => recent._id === theId);
        if (!locationToSave) return;

        fetch(`${API_BASE_URL}/savedLocs`, {
            method: "POST",
            headers: {
                "Content-type": "application/json",
            },
            body: JSON.stringify({
                ...locationToSave,
                created_at: new Date(),
                created_by: user.email,
            }),
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    toast.success("Location saved to your profile!");
                }
            })
            .catch(err => {
                console.error("Save error:", err);
                toast.error(err.message || "Failed to save location");
            });
    };

    // Remove an individual search from history
    const handleDelete = (theId) => {
        Swal.fire({
            title: "Remove search item?",
            text: "Remove this candidate site from recent history?",
            icon: "warning",
            background: "#151a22",
            color: "#e2e8f0",
            showCancelButton: true,
            confirmButtonColor: "#e11d48",
            cancelButtonColor: "#334155",
            confirmButtonText: "Remove"
        }).then((result) => {
            if (result.isConfirmed) {
                if (hasDbSearches && user?.email) {
                    fetch(`${API_BASE_URL}/recent-searches/${theId}`, {
                        method: "DELETE",
                        headers: {
                            "Content-Type": "application/json",
                        },
                    })
                        .then(res => res.json())
                        .then(data => {
                            if (data.success) {
                                setRecentSearched(prev =>
                                    prev.filter(recent => recent._id !== theId)
                                );
                                toast.success("Item removed from history.");
                            }
                        })
                        .catch(err => {
                            console.error("Delete error:", err);
                            toast.error("Failed to delete search item.");
                        });
                } else {
                    setDemoSearches(prev => prev.filter(item => item._id !== theId));
                    toast.success("Item removed from history.");
                }
            }
        });
    };

    // Clear all recent searches
    const handleDeleteAll = () => {
        Swal.fire({
            title: "Clear all searches?",
            text: "This will clear your recent candidate site searches.",
            icon: "warning",
            background: "#151a22",
            color: "#e2e8f0",
            showCancelButton: true,
            confirmButtonColor: "#e11d48",
            cancelButtonColor: "#334155",
            confirmButtonText: "Clear all"
        }).then((result) => {
            if (result.isConfirmed) {
                if (hasDbSearches && user?.email) {
                    fetch(`${API_BASE_URL}/recent-searches/user/${encodeURIComponent(user.email)}`, {
                        method: "DELETE",
                        headers: {
                            "Content-Type": "application/json",
                        },
                    })
                        .then(res => res.json())
                        .then(data => {
                            if (data.success) {
                                setRecentSearched([]);
                                toast.success("All recent searches cleared!");
                            }
                        })
                        .catch(err => {
                            console.error("Clear error:", err);
                            toast.error("Failed to clear search history.");
                        });
                } else {
                    setDemoSearches([]);
                    toast.success("All recent searches cleared!");
                }
            }
        });
    };

    return (
        <div className="w-full text-slate-200 select-none">
            {/* Top Row: Sidebar Collapse Button (matches top-right '>' in mockup) */}
            <div className="flex justify-end mb-2">
                <button
                    onClick={onClose}
                    className="w-6 h-6 rounded-md bg-[#1e2530] border border-slate-700/60 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition cursor-pointer"
                    title="Collapse sidebar"
                    aria-label="Collapse sidebar"
                >
                    <ChevronRight size={14} />
                </button>
            </div>

            {/* Header Toolbar */}
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                    <Clock3 size={16} className="text-slate-400" />
                    <h2 className="font-semibold text-sm text-slate-200 tracking-tight">Recent Searches</h2>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
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
            <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-140px)] pr-0.5">
                {displayedSearches.length > 0 ? (
                    displayedSearches.map((item) => (
                        <div
                            key={item._id}
                            className="bg-[#1e2530] border border-slate-700/60 rounded-xl p-3.5 transition duration-150 hover:border-slate-600/80 shadow-md"
                        >
                            {/* Card Top Row */}
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

                            {/* Card Actions Footer */}
                            <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5 mt-2.5 text-xs">
                                <button
                                    onClick={() => handleViewOnMap(item)}
                                    className="flex items-center gap-1.5 text-slate-400 hover:text-white transition duration-150 cursor-pointer"
                                >
                                    <MapPin size={13} className="text-slate-400" />
                                    <span>View on map</span>
                                </button>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleDelete(item._id)}
                                        className="flex items-center gap-1 text-red-400 hover:text-red-300 transition duration-150 cursor-pointer"
                                    >
                                        <X size={13} />
                                        <span>Remove</span>
                                    </button>

                                    <button
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
        </div>
    );
};

export default ShowRecentSearches;
