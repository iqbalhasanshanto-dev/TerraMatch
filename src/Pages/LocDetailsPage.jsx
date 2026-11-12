import { useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router";
import useLocations from "../Hooks/useLocations";
import useSaved from "../Hooks/useSaved";
import Loader from "../Components/Loader";
import useAuth from "../Hooks/useAuth";
import Container from "../Components/Container";
import { ArrowLeft, Bookmark, Check, Globe, MapPin } from "lucide-react";
import { showSignInPromptToast } from "../utils/authToast";
import {
    formatSurfaceTemp,
    getAnalogCategory,
    getMineralogy,
    getRoversTested,
    getTargetBodyInfo,
} from "../utils/analogSpec";

/**
 * ============================================================================
 * LocDetailsPage Component
 * ============================================================================
 * Displays comprehensive planetary analog specifications, real mean surface
 * temperature (°C), mineralogy, historical rover/mission test campaigns,
 * terrain features, and geographic coordinates for an individual site.
 * Styled with the deep-space color tokens:
 * - Surfaces: `#07090E` (Page) & `#0B0E13` (Cards) with border `#21242C`
 * - Accents: `#83CAD8` (Primary cyan), `#D67051` (Mars), & `#1A1D23` (Secondary)
 * - Typography: High-contrast `#F1EEE9` and descriptions `#8891A0`
 */
const LocDetailsPage = () => {
    // ------------------------------------------------------------------------
    // 1. Route Parameters, Navigation & Data Hooks
    // ------------------------------------------------------------------------
    const { _id } = useParams();
    const navigate = useNavigate();
    const { locData, loading } = useLocations();
    const { savedLoc, saveLocation } = useSaved();
    const { user } = useAuth();

    // Locate the matching analog candidate by MongoDB `_id` or JSON `id`
    const neededLocation = useMemo(() => {
        return (locData || []).find(
            (loc) => loc._id === _id || loc.id === _id
        );
    }, [locData, _id]);

    // Check whether this candidate site is already bookmarked in saved locations
    const isAlreadySaved = useMemo(() => {
        if (!neededLocation || !Array.isArray(savedLoc)) return false;
        const targetId =
            neededLocation._id || neededLocation.id || neededLocation.name;
        return savedLoc.some(
            (item) =>
                item._id === targetId ||
                item.id === targetId ||
                item.locationId === targetId ||
                item.name === neededLocation.name
        );
    }, [neededLocation, savedLoc]);

    if (loading) return <Loader />;

    // ------------------------------------------------------------------------
    // 2. Not-Found Guard Fallback
    // ------------------------------------------------------------------------
    if (!neededLocation) {
        return (
            <div className="min-h-screen bg-[#07090E] text-[#F1EEE9]">
                <Container>
                    <div className="py-20 text-center">
                        <Globe
                            size={44}
                            aria-hidden="true"
                            className="mx-auto text-[#8891A0] opacity-40 mb-3"
                        />
                        <h2 className="text-2xl font-bold text-[#F1EEE9]">
                            Location Not Found
                        </h2>
                        <p className="text-sm text-[#8891A0] mt-1 max-w-sm mx-auto">
                            We could not find candidate analog details for ID &quot;{_id}&quot;.
                        </p>
                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-lg bg-[#83CAD8] text-[#090D15] text-xs font-semibold hover:opacity-90 transition"
                        >
                            <ArrowLeft size={16} aria-hidden="true" />
                            <span>Back to Map</span>
                        </Link>
                    </div>
                </Container>
            </div>
        );
    }

    // ------------------------------------------------------------------------
    // 3. Derived Scientific Specifications & Bookmark Handler
    // ------------------------------------------------------------------------
    const { longSpecLabel, pillLabel, pillClassName } =
        getTargetBodyInfo(neededLocation);
    const surfaceTemp = formatSurfaceTemp(neededLocation);
    const analogCategory = getAnalogCategory(neededLocation);
    const roversTested = getRoversTested(neededLocation);
    const mineralogy = getMineralogy(neededLocation);

    /**
     * Persists this location via `StateProvider.saveLocation` when authenticated,
     * or displays the interactive `"Sign in →"` toast prompt for guests.
     */
    const handleSave = () => {
        if (!user?.email) {
            showSignInPromptToast(navigate);
            return;
        }
        saveLocation?.(neededLocation);
    };

    // ------------------------------------------------------------------------
    // 4. Component Render Block
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
                        <ArrowLeft size={15} aria-hidden="true" />
                        <span>Back to Map</span>
                    </Link>

                    {/* Hero Header Card */}
                    <div className="border border-[#21242C] rounded-2xl p-6 bg-[#0B0E13] shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex flex-wrap items-center gap-2.5">
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F1EEE9] tracking-tight">
                                    {neededLocation.name}
                                </h1>
                                <span
                                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wider ${pillClassName}`}
                                >
                                    {pillLabel}
                                </span>
                                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-[#181A21] border border-[#21242C] text-[#83CAD8]">
                                    {surfaceTemp}
                                </span>
                            </div>
                            <p className="text-xs text-[#8891A0] flex items-center gap-1.5 mt-1.5">
                                <MapPin
                                    size={14}
                                    aria-hidden="true"
                                    className="text-[#8891A0]"
                                />
                                <span>{neededLocation.country}</span>
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleSave}
                            className="bg-[#83CAD8] hover:opacity-90 text-[#090D15] font-semibold px-4 py-2 rounded-lg text-xs flex items-center gap-2 shadow-sm transition cursor-pointer shrink-0"
                        >
                            {isAlreadySaved ? (
                                <Check
                                    size={15}
                                    aria-hidden="true"
                                    className="text-[#090D15]"
                                />
                            ) : (
                                <Bookmark
                                    size={15}
                                    aria-hidden="true"
                                    className="text-[#090D15]"
                                />
                            )}
                            <span>
                                {isAlreadySaved ? "Saved to Profile" : "Save this Location"}
                            </span>
                        </button>
                    </div>

                    {/* Analog Classifications */}
                    <div className="flex flex-wrap gap-2">
                        {neededLocation.analogType?.map((type) => (
                            <span
                                key={type}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold bg-[#181A21] border border-[#21242C] uppercase ${
                                    type.toLowerCase() === "mars"
                                        ? "text-[#D67051]"
                                        : "text-[#83CAD8]"
                                }`}
                            >
                                {type} Analog Target
                            </span>
                        ))}
                    </div>

                    {/* Planetary Analog Specification & Rover Test History Card */}
                    <div className="border border-[#21242C] rounded-xl p-5 bg-[#0B0E13] space-y-4">
                        <h2 className="text-sm font-semibold text-[#F1EEE9] border-b border-[#21242C] pb-2.5">
                            Planetary Analog Specification &amp; Rover Test History
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div>
                                <span className="text-[#8891A0] text-[10px] uppercase font-semibold block mb-0.5">
                                    Target Body Specification
                                </span>
                                <span className="font-semibold text-[#F1EEE9]">
                                    {longSpecLabel}
                                </span>
                            </div>

                            <div>
                                <span className="text-[#8891A0] text-[10px] uppercase font-semibold block mb-0.5">
                                    Mean Surface Temperature
                                </span>
                                <span className="font-mono font-bold text-[#83CAD8]">
                                    {surfaceTemp}
                                </span>
                            </div>

                            <div className="sm:col-span-2">
                                <span className="text-[#8891A0] text-[10px] uppercase font-semibold block mb-0.5">
                                    Scientific Fidelity Focus
                                </span>
                                <span className="font-medium text-[#F1EEE9]">
                                    {analogCategory}
                                </span>
                            </div>

                            <div className="sm:col-span-2">
                                <span className="text-[#8891A0] text-[10px] uppercase font-semibold block mb-0.5">
                                    Historical Rover &amp; Mission Campaigns
                                </span>
                                <span className="text-[#F1EEE9]/90 leading-relaxed">
                                    {roversTested}
                                </span>
                            </div>

                            <div className="sm:col-span-2">
                                <span className="text-[#8891A0] text-[10px] uppercase font-semibold block mb-0.5">
                                    Mineralogy &amp; Regolith
                                </span>
                                <span className="text-[#F1EEE9]/90 leading-relaxed">
                                    {mineralogy}
                                </span>
                            </div>
                        </div>
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
                                    <span className="text-[#8891A0] text-[10px] block">
                                        Climate
                                    </span>
                                    <span className="font-medium text-[#F1EEE9] capitalize">
                                        {neededLocation.environment?.climate || "N/A"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[#8891A0] text-[10px] block">
                                        Humidity
                                    </span>
                                    <span className="font-medium text-[#F1EEE9] capitalize">
                                        {neededLocation.environment?.humidity || "N/A"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[#8891A0] text-[10px] block">
                                        Vegetation
                                    </span>
                                    <span className="font-medium text-[#F1EEE9] capitalize">
                                        {neededLocation.environment?.vegetation || "N/A"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[#8891A0] text-[10px] block">
                                        Elevation
                                    </span>
                                    <span className="font-medium text-[#F1EEE9]">
                                        {neededLocation.environment?.elevationMeters?.toLocaleString()}{" "}
                                        meters
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
                                {neededLocation.coordinates?.latitude}° N,{" "}
                                {neededLocation.coordinates?.longitude}° E
                            </div>
                        </div>
                    </div>
                </div>
            </Container>
        </div>
    );
};

export default LocDetailsPage;
