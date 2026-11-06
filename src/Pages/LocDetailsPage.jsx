import { useParams, Link } from "react-router";
import useLocations from "../Hooks/useLocations";
import Loader from "../Components/Loader";
import useAuth from "../Hooks/useAuth";
import { toast } from "react-toastify";
import { API_BASE_URL } from "../utils/api";
import Container from "../Components/Container";
import { ArrowLeft, Bookmark, Globe, MapPin } from "lucide-react";

/**
 * ============================================================================
 * LocDetailsPage Component
 * ============================================================================
 * Displays comprehensive planetary analog metrics, terrain features, environmental data,
 * and geographic coordinates for an individual candidate location.
 * Styled with the deep-space color tokens:
 * - Surfaces: `#07090E` (Page) & `#0B0E13` (Cards) with border `#21242C`
 * - Accents: `#83CAD8` (Primary cyan) & `#1A1D23` (Secondary)
 * - Typography: High-contrast `#F1EEE9` and descriptions `#8891A0`
 */
const LocDetailsPage = () => {
    // ------------------------------------------------------------------------
    // 1. Route Parameters & Data Hooks
    // ------------------------------------------------------------------------
    const { _id } = useParams();
    const { locData, loading } = useLocations();
    const { user } = useAuth();

    if (loading) return <Loader />;

    // Find the requested location by ID
    const neededLocation = (locData || []).find((loc) => loc._id === _id);

    // Guard if the location doesn't exist
    if (!neededLocation) {
        return (
            <div className="min-h-screen bg-[#07090E] text-[#F1EEE9]">
                <Container>
                    <div className="py-20 text-center">
                        <Globe size={44} className="mx-auto text-[#8891A0] opacity-40 mb-3" />
                        <h2 className="text-2xl font-bold text-[#F1EEE9]">Location Not Found</h2>
                        <p className="text-sm text-[#8891A0] mt-1 max-w-sm mx-auto">
                            We could not find candidate analog details for ID &quot;{_id}&quot;.
                        </p>
                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-lg bg-[#83CAD8] text-[#090D15] text-xs font-semibold hover:opacity-90 transition"
                        >
                            <ArrowLeft size={16} />
                            <span>Back to Map</span>
                        </Link>
                    </div>
                </Container>
            </div>
        );
    }

    // ------------------------------------------------------------------------
    // 2. Bookmark Location Handler
    // ------------------------------------------------------------------------
    const handleSave = () => {
        if (!user?.email) {
            toast.warn("Please log in to save this candidate site.");
            return;
        }

        fetch(`${API_BASE_URL}/savedLocs`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                ...neededLocation,
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
                toast.error(err.message || "Failed to save location");
            });
    };

    // ------------------------------------------------------------------------
    // 3. Render
    // ------------------------------------------------------------------------
    return (
        <div className="min-h-screen bg-[#07090E] text-[#F1EEE9] select-none">
            <Container>
                <div className="py-8 px-4 max-w-4xl mx-auto space-y-6">
                    {/* Navigation Back Link */}
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-xs text-[#8891A0] hover:text-[#83CAD8] transition"
                    >
                        <ArrowLeft size={15} />
                        <span>Back to Map</span>
                    </Link>

                    {/* Hero Header Card */}
                    <div className="border border-[#21242C] rounded-2xl p-6 bg-[#0B0E13] shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F1EEE9] tracking-tight">
                                    {neededLocation.name}
                                </h1>
                                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-[#181A21] border border-[#21242C] text-[#83CAD8]">
                                    {neededLocation.similarityScore}% Match
                                </span>
                            </div>
                            <p className="text-xs text-[#8891A0] flex items-center gap-1.5 mt-1.5">
                                <MapPin size={14} className="text-[#8891A0]" />
                                <span>{neededLocation.country}</span>
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleSave}
                            className="bg-[#83CAD8] hover:opacity-90 text-[#090D15] font-semibold px-4 py-2 rounded-lg text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
                        >
                            <Bookmark size={15} className="text-[#090D15]" />
                            <span>Save this Location</span>
                        </button>
                    </div>

                    {/* Analog Classifications */}
                    <div className="flex flex-wrap gap-2">
                        {neededLocation.analogType?.map((type) => (
                            <span
                                key={type}
                                className="px-3 py-1 rounded-lg text-xs font-semibold bg-[#181A21] border border-[#21242C] text-[#83CAD8] uppercase"
                            >
                                {type} Analog Target
                            </span>
                        ))}
                    </div>

                    {/* Overview Description */}
                    <div className="border border-[#21242C] rounded-xl p-5 bg-[#0B0E13]">
                        <h2 className="text-sm font-semibold text-[#F1EEE9] mb-2">
                            Scientific Description
                        </h2>
                        <p className="text-xs leading-relaxed text-[#8891A0]">
                            {neededLocation.description}
                        </p>
                    </div>

                    {/* Environmental & Terrain Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Environment Metrics */}
                        <div className="border border-[#21242C] rounded-xl p-5 bg-[#0B0E13] space-y-3">
                            <h2 className="text-sm font-semibold text-[#F1EEE9] border-b border-[#21242C] pb-2">
                                Environmental Conditions
                            </h2>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <span className="text-[#8891A0] text-[10px] block">Climate</span>
                                    <span className="font-medium text-[#F1EEE9] capitalize">
                                        {neededLocation.environment?.climate || "N/A"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[#8891A0] text-[10px] block">Humidity</span>
                                    <span className="font-medium text-[#F1EEE9] capitalize">
                                        {neededLocation.environment?.humidity || "N/A"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[#8891A0] text-[10px] block">Vegetation</span>
                                    <span className="font-medium text-[#F1EEE9] capitalize">
                                        {neededLocation.environment?.vegetation || "N/A"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[#8891A0] text-[10px] block">Elevation</span>
                                    <span className="font-medium text-[#F1EEE9]">
                                        {neededLocation.environment?.elevationMeters?.toLocaleString()} meters
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Terrain Characteristics */}
                        <div className="border border-[#21242C] rounded-xl p-5 bg-[#0B0E13] space-y-3">
                            <h2 className="text-sm font-semibold text-[#F1EEE9] border-b border-[#21242C] pb-2">
                                Terrain Features
                            </h2>
                            <div className="flex flex-wrap gap-2 pt-1">
                                {neededLocation.terrain?.map((item) => (
                                    <span
                                        key={item}
                                        className="px-2 py-0.5 rounded text-[11px] bg-[#1A1D23] border border-[#21242C] text-[#8891A0]"
                                    >
                                        {item}
                                    </span>
                                ))}
                            </div>
                            <div className="pt-3 border-t border-[#21242C] text-[11px] text-[#8891A0]">
                                <strong className="text-[#F1EEE9]">Coordinates:</strong>{" "}
                                {neededLocation.coordinates?.latitude}° N, {neededLocation.coordinates?.longitude}° E
                            </div>
                        </div>
                    </div>
                </div>
            </Container>
        </div>
    );
};

export default LocDetailsPage;
