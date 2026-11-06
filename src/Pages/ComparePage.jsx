import { useSearchParams, Link } from "react-router";
import useLocations from "../Hooks/useLocations";
import useSaved from "../Hooks/useSaved";
import Loader from "../Components/Loader";
import Container from "../Components/Container";
import { ArrowLeft, Columns3, Globe, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

/**
 * ComparePage Component
 * Compares 2 or more candidate planetary analog sites side by side across key metrics:
 * similarity scores, environmental conditions (climate, humidity, vegetation, elevation),
 * terrain attributes, and planetary target bodies.
 */
const ComparePage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { locData, loading: locLoading } = useLocations();
    const { savedLoc } = useSaved();

    // Selected location IDs for comparison
    const [selectedIds, setSelectedIds] = useState([]);

    // Initialize selected IDs from URL query params or fallback to first 2 saved/all locations
    useEffect(() => {
        const idsParam = searchParams.get("ids");
        if (idsParam) {
            setSelectedIds(idsParam.split(",").filter(Boolean));
        } else if (savedLoc && savedLoc.length >= 2) {
            setSelectedIds([savedLoc[0]._id, savedLoc[1]._id]);
        }
    }, [searchParams, savedLoc]);

    if (locLoading) return <Loader />;

    // Combined location pool (prioritizing locData)
    const allAvailable = locData && locData.length > 0 ? locData : savedLoc || [];

    // Filter candidate locations currently selected for comparison
    const comparedLocations = allAvailable.filter(loc => selectedIds.includes(loc._id));

    // Handle adding a location to the comparison matrix
    const handleAddLocation = (e) => {
        const idToAdd = e.target.value;
        if (!idToAdd || selectedIds.includes(idToAdd)) return;

        const updated = [...selectedIds, idToAdd];
        setSelectedIds(updated);
        setSearchParams({ ids: updated.join(",") });
    };

    // Remove a location from comparison
    const handleRemove = (idToRemove) => {
        const updated = selectedIds.filter(id => id !== idToRemove);
        setSelectedIds(updated);
        setSearchParams({ ids: updated.join(",") });
    };

    return (
        <Container>
            <div className="py-8 px-4 space-y-6">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-base-300 pb-5">
                    <div>
                        <Link to="/saved" className="inline-flex items-center gap-1.5 text-xs opacity-70 hover:opacity-100 mb-2">
                            <ArrowLeft size={14} /> Back to Saved Locations
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <Columns3 size={28} className="text-primary" />
                            Target Comparison Matrix
                        </h1>
                        <p className="text-sm opacity-70 mt-1">
                            Analyze and contrast candidate planetary analog sites side by side.
                        </p>
                    </div>

                    {/* Add Location Dropdown */}
                    <div className="flex items-center gap-2">
                        <select
                            className="select select-sm select-bordered max-w-xs"
                            onChange={handleAddLocation}
                            value=""
                        >
                            <option value="" disabled>+ Add Site to Compare</option>
                            {allAvailable
                                .filter(loc => !selectedIds.includes(loc._id))
                                .map(loc => (
                                    <option key={loc._id} value={loc._id}>
                                        {loc.name} ({loc.country})
                                    </option>
                                ))}
                        </select>
                    </div>
                </div>

                {/* Comparison Table / Matrix */}
                {comparedLocations.length > 0 ? (
                    <div className="overflow-x-auto border border-base-300 rounded-2xl bg-base-100 shadow-sm">
                        <table className="table w-full">
                            {/* Table Header: Location Names & Actions */}
                            <thead>
                                <tr className="bg-base-200/50">
                                    <th className="w-1/5 text-xs font-bold uppercase tracking-wider opacity-60">Metric</th>
                                    {comparedLocations.map(loc => (
                                        <th key={loc._id} className="min-w-60 text-left">
                                            <div className="flex items-center justify-between gap-2">
                                                <div>
                                                    <span className="font-bold text-base block text-base-content">{loc.name}</span>
                                                    <span className="text-xs opacity-60 font-normal">{loc.country}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleRemove(loc._id)}
                                                    className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                                                    title="Remove from comparison"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-base-200 text-sm">
                                {/* Similarity Score */}
                                <tr>
                                    <td className="font-semibold opacity-75">Similarity Score</td>
                                    {comparedLocations.map(loc => (
                                        <td key={loc._id}>
                                            <span className="badge badge-primary font-mono text-xs font-semibold">
                                                {loc.similarityScore}% Match
                                            </span>
                                        </td>
                                    ))}
                                </tr>

                                {/* Planetary Analog Type */}
                                <tr>
                                    <td className="font-semibold opacity-75">Target Body</td>
                                    {comparedLocations.map(loc => (
                                        <td key={loc._id}>
                                            <div className="flex flex-wrap gap-1">
                                                {loc.analogType?.map(type => (
                                                    <span key={type} className="badge badge-sm badge-outline uppercase">
                                                        {type}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    ))}
                                </tr>

                                {/* Climate */}
                                <tr>
                                    <td className="font-semibold opacity-75">Climate</td>
                                    {comparedLocations.map(loc => (
                                        <td key={loc._id} className="capitalize">
                                            {loc.environment?.climate || "N/A"}
                                        </td>
                                    ))}
                                </tr>

                                {/* Humidity */}
                                <tr>
                                    <td className="font-semibold opacity-75">Humidity</td>
                                    {comparedLocations.map(loc => (
                                        <td key={loc._id} className="capitalize">
                                            {loc.environment?.humidity || "N/A"}
                                        </td>
                                    ))}
                                </tr>

                                {/* Vegetation */}
                                <tr>
                                    <td className="font-semibold opacity-75">Vegetation</td>
                                    {comparedLocations.map(loc => (
                                        <td key={loc._id} className="capitalize">
                                            {loc.environment?.vegetation || "N/A"}
                                        </td>
                                    ))}
                                </tr>

                                {/* Elevation */}
                                <tr>
                                    <td className="font-semibold opacity-75">Elevation</td>
                                    {comparedLocations.map(loc => (
                                        <td key={loc._id}>
                                            {loc.environment?.elevationMeters?.toLocaleString() || "0"} meters
                                        </td>
                                    ))}
                                </tr>

                                {/* Terrain Characteristics */}
                                <tr>
                                    <td className="font-semibold opacity-75">Terrain Features</td>
                                    {comparedLocations.map(loc => (
                                        <td key={loc._id}>
                                            <div className="flex flex-wrap gap-1">
                                                {loc.terrain?.map(item => (
                                                    <span key={item} className="badge badge-xs badge-neutral">
                                                        {item}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    ))}
                                </tr>

                                {/* Coordinates */}
                                <tr>
                                    <td className="font-semibold opacity-75">Coordinates</td>
                                    {comparedLocations.map(loc => (
                                        <td key={loc._id} className="font-mono text-xs opacity-80">
                                            {loc.coordinates?.latitude}° N, {loc.coordinates?.longitude}° E
                                        </td>
                                    ))}
                                </tr>

                                {/* Action: View Full Details */}
                                <tr>
                                    <td className="font-semibold opacity-75">Full Details</td>
                                    {comparedLocations.map(loc => (
                                        <td key={loc._id}>
                                            <Link
                                                to={`/details/${loc._id}`}
                                                className="btn btn-xs btn-outline btn-primary"
                                            >
                                                Inspect Details
                                            </Link>
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* Empty Selection State */
                    <div className="text-center py-16 border border-dashed border-base-300 rounded-2xl bg-base-100">
                        <Globe size={40} className="mx-auto opacity-30 mb-3" />
                        <h3 className="text-lg font-semibold">No locations selected for comparison</h3>
                        <p className="text-sm opacity-60 mt-1 max-w-sm mx-auto">
                            Select sites from the dropdown above or check "Compare" on the Saved Locations page.
                        </p>
                        <Link to="/saved" className="btn btn-sm btn-primary mt-4">
                            Go to Saved Locations
                        </Link>
                    </div>
                )}
            </div>
        </Container>
    );
};

export default ComparePage;
