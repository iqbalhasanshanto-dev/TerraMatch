import { Funnel, Globe, Trash, CheckSquare, Square, ArrowRight } from "lucide-react";
import useSaved from "../Hooks/useSaved";
import { useState } from "react";
import Loader from "../Components/Loader";
import Swal from "sweetalert2";
import Container from "../Components/Container";
import { API_BASE_URL } from "../utils/api";
import { Link } from "react-router";

/**
 * SavedPage Component
 * Displays candidate planetary analog locations bookmarked by the authenticated user.
 * Supports filtering by target body (Moon/Mars), sorting by date, removing items, and comparison selection.
 */
const SavedPage = () => {
    const { savedLoc, setSavedLoc, loading } = useSaved();

    // Local filter and sorting states
    const [targetFilter, setTargetFilter] = useState("all"); // 'all' | 'moon' | 'mars'
    const [sortOrder, setSortOrder] = useState("newest");   // 'newest' | 'oldest'
    const [selectedForCompare, setSelectedForCompare] = useState([]);

    if (loading) return <Loader />;

    // ==========================================
    // 1. Filtering & Sorting Logic
    // ==========================================

    // Filter items based on active target body
    const filteredItems = (savedLoc || []).filter((saved) => {
        if (targetFilter === "moon") {
            return saved.analogType?.some(type => type.toLowerCase().includes("moon"));
        }
        if (targetFilter === "mars") {
            return saved.analogType?.some(type => type.toLowerCase().includes("mars"));
        }
        return true;
    });

    // Sort items by creation timestamp
    const sortedItems = [...filteredItems].sort((a, b) => {
        const timeA = new Date(a.created_at || 0).getTime();
        const timeB = new Date(b.created_at || 0).getTime();
        return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });

    // ==========================================
    // 2. Action Handlers
    // ==========================================

    // Delete a saved location
    const handleDelete = (theId) => {
        Swal.fire({
            title: "Are you sure?",
            text: "You won't be able to revert this!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, delete it!"
        }).then((result) => {
            if (result.isConfirmed) {
                fetch(`${API_BASE_URL}/savedLocs/${theId}`, {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            Swal.fire({
                                title: "Deleted!",
                                text: "Location removed from your saved list.",
                                icon: "success"
                            });
                            // Update savedLoc state directly in hook
                            setSavedLoc(prev => prev.filter(item => item._id !== theId));
                            setSelectedForCompare(prev => prev.filter(id => id !== theId));
                        }
                    })
                    .catch(err => {
                        console.error("Delete error:", err);
                        Swal.fire({
                            title: "Error!",
                            text: "Failed to delete location. Please try again.",
                            icon: "error"
                        });
                    });
            }
        });
    };

    // Toggle location selection for comparison
    const toggleCompare = (locId) => {
        setSelectedForCompare(prev =>
            prev.includes(locId)
                ? prev.filter(id => id !== locId)
                : [...prev, locId]
        );
    };

    return (
        <Container>
            <div className="py-6 px-4">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-base-300 pb-5">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Saved Locations</h1>
                        <p className="text-sm opacity-75 mt-1">
                            Manage candidate analog sites and compare targets side by side.
                        </p>
                    </div>

                    {/* Compare Quick Action */}
                    {selectedForCompare.length > 0 && (
                        <div className="flex items-center gap-3 bg-base-200 px-4 py-2 rounded-xl border border-primary/30">
                            <span className="text-xs font-semibold">
                                {selectedForCompare.length} selected for comparison
                            </span>
                            <Link
                                to={`/compare?ids=${selectedForCompare.join(",")}`}
                                className="btn btn-sm btn-primary flex items-center gap-1.5"
                            >
                                Compare Now <ArrowRight size={14} />
                            </Link>
                        </div>
                    )}
                </div>

                {/* Filter and Sort Toolbar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 my-6">
                    {/* Target Body Filter Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setTargetFilter("all")}
                            className={`btn btn-sm ${targetFilter === "all" ? "btn-primary" : "btn-outline"}`}
                        >
                            All Targets
                        </button>
                        <button
                            onClick={() => setTargetFilter("moon")}
                            className={`btn btn-sm ${targetFilter === "moon" ? "btn-primary" : "btn-outline"}`}
                        >
                            Moon
                        </button>
                        <button
                            onClick={() => setTargetFilter("mars")}
                            className={`btn btn-sm ${targetFilter === "mars" ? "btn-primary" : "btn-outline"}`}
                        >
                            Mars
                        </button>
                    </div>

                    {/* Sorting Select Menu */}
                    <div className="flex items-center gap-2">
                        <Funnel size={16} className="opacity-70" />
                        <label className="form-control w-full max-w-xs">
                            <select
                                className="select select-sm select-bordered"
                                value={sortOrder}
                                onChange={e => setSortOrder(e.target.value)}
                            >
                                <option value="newest">Recently Saved</option>
                                <option value="oldest">Oldest Saved</option>
                            </select>
                        </label>
                    </div>
                </div>

                {/* Locations Grid */}
                {sortedItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {sortedItems.map((saved) => {
                            const isSelected = selectedForCompare.includes(saved._id);
                            return (
                                <div
                                    key={saved._id}
                                    className={`w-full rounded-xl border p-4 shadow-sm transition-all bg-base-100 ${
                                        isSelected ? "border-primary ring-1 ring-primary" : "border-base-300"
                                    }`}
                                >
                                    {/* Main Card Content */}
                                    <div className="flex items-start gap-3">
                                        {/* Globe Icon */}
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-base-300 bg-base-200">
                                            <Globe size={22} className="opacity-75" />
                                        </div>

                                        {/* Site Details */}
                                        <div className="min-w-0 flex-1">
                                            <Link
                                                to={`/details/${saved._id}`}
                                                className="truncate text-base font-semibold hover:text-primary transition"
                                            >
                                                {saved.name}
                                            </Link>
                                            <p className="text-xs opacity-60 mt-0.5">{saved.country}</p>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {saved.analogType?.map((t) => (
                                                    <span key={t} className="badge badge-xs badge-outline capitalize">
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Similarity Score Pill */}
                                        <div className="text-right">
                                            <span className="badge badge-sm badge-neutral font-mono">
                                                {saved.similarityScore}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="my-3 border-t border-base-200" />

                                    {/* Actions Toolbar */}
                                    <div className="flex items-center justify-between gap-2 text-xs">
                                        <button
                                            onClick={() => handleDelete(saved._id)}
                                            className="flex items-center gap-1.5 text-error hover:opacity-80 transition"
                                        >
                                            <Trash size={14} />
                                            Remove
                                        </button>

                                        <button
                                            onClick={() => toggleCompare(saved._id)}
                                            className="flex items-center gap-1.5 cursor-pointer opacity-80 hover:opacity-100 transition"
                                        >
                                            {isSelected ? (
                                                <CheckSquare size={16} className="text-primary" />
                                            ) : (
                                                <Square size={16} />
                                            )}
                                            <span>Compare</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Empty State */
                    <div className="text-center py-16 border border-dashed border-base-300 rounded-2xl my-6">
                        <Globe size={36} className="mx-auto opacity-40 mb-3" />
                        <h3 className="text-lg font-semibold">No saved locations found</h3>
                        <p className="text-sm opacity-60 mt-1 max-w-sm mx-auto">
                            {targetFilter !== "all"
                                ? `No saved sites match the "${targetFilter}" filter.`
                                : "Explore candidate analog sites from the dashboard and click Save to bookmark them."}
                        </p>
                        <Link to="/" className="btn btn-sm btn-primary mt-4">
                            Explore Locations
                        </Link>
                    </div>
                )}
            </div>
        </Container>
    );
};

export default SavedPage;
