import { Check, Clock3, Globe, MapPin, X } from "lucide-react";
import useRecent from "../Hooks/useRecent";
import { toast } from "react-toastify";
import useAuth from "../Hooks/useAuth";
import Swal from "sweetalert2";
import { API_BASE_URL } from "../utils/api";
import { useContext } from "react";
import StateContext from "../States/StateContext";

/**
 * ShowRecentSearches Component
 * Displays the list of sites searched by the user with options to view on map,
 * save to favorites, or clear history.
 */
const ShowRecentSearches = () => {
    const { recentSearched, setRecentSearched } = useRecent();
    const { user } = useAuth();
    const { setMapTarget } = useContext(StateContext);

    // Save a location from recent search history to saved list
    const handleSave = (theId) => {
        if (!user?.email) {
            toast.warn("Please sign in to save locations!");
            return;
        }

        const locationToSave = recentSearched.find(recent => recent._id === theId);
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
                    toast.success("Location Saved Successfully!");
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
            title: "Are you sure?",
            text: "Remove this item from your recent searches?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, delete it!"
        }).then((result) => {
            if (result.isConfirmed) {
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
            }
        });
    };

    // Clear all recent searches for the logged-in user
    const handleDeleteAll = () => {
        if (!user?.email) {
            toast.warn("No user session found.");
            return;
        }

        Swal.fire({
            title: "Clear all searches?",
            text: "This will remove your entire recent search history.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, clear all!"
        }).then((result) => {
            if (result.isConfirmed) {
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
            }
        });
    };

    // Pan map to location coordinates
    const handleViewOnMap = (loc) => {
        if (loc?.coordinates?.latitude && loc?.coordinates?.longitude) {
            setMapTarget({
                latitude: loc.coordinates.latitude,
                longitude: loc.coordinates.longitude,
                zoom: 11
            });
        }
    };

    return (
        <div className="w-full text-base-content p-2">
            {/* Header Toolbar */}
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                    <Clock3 size={18} className="opacity-75" />
                    <h2 className="font-semibold text-sm">Recent Searches</h2>
                </div>
                <div className="flex items-center gap-2">
                    {recentSearched.length > 0 && (
                        <button
                            onClick={handleDeleteAll}
                            className="btn btn-xs btn-ghost text-error"
                        >
                            Clear All
                        </button>
                    )}
                    <span className="badge badge-sm badge-neutral">
                        {recentSearched.length}
                    </span>
                </div>
            </div>

            <div className="border-b border-base-300 w-full mb-3" />

            {/* List of Recent Searches */}
            <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-180px)] pr-1">
                {recentSearched.length > 0 ? (
                    recentSearched.map((recent) => (
                        <div
                            key={recent._id}
                            className="w-full rounded-xl border border-base-300 p-3 bg-base-100 shadow-sm"
                        >
                            {/* Main Content */}
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-base-300 bg-base-200">
                                    <Globe size={18} className="opacity-70" />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <h3 className="truncate text-xs font-semibold">
                                        {recent.name}
                                    </h3>
                                    <p className="text-[11px] opacity-60 truncate">
                                        {recent.country}
                                    </p>
                                </div>

                                <span className="badge badge-sm badge-outline font-mono text-[10px]">
                                    {recent.similarityScore}%
                                </span>
                            </div>

                            {/* Divider */}
                            <div className="my-2 border-t border-base-200" />

                            {/* Action Buttons */}
                            <div className="flex items-center justify-between gap-2 text-xs">
                                <button
                                    onClick={() => handleViewOnMap(recent)}
                                    className="flex items-center gap-1 opacity-70 hover:opacity-100 hover:text-primary transition"
                                >
                                    <MapPin size={13} />
                                    <span>View on map</span>
                                </button>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleDelete(recent._id)}
                                        className="flex items-center gap-1 text-error hover:opacity-80 transition"
                                    >
                                        <X size={13} />
                                        Remove
                                    </button>

                                    <button
                                        onClick={() => handleSave(recent._id)}
                                        className="flex items-center gap-1 text-primary hover:opacity-80 transition"
                                    >
                                        <Check size={13} />
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 opacity-50 text-xs">
                        No recent searches yet. Search for analog sites to see them here.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShowRecentSearches;
