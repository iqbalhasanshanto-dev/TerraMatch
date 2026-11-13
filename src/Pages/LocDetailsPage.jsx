import { useMemo } from "react";
import { useParams, Link } from "react-router";
import useLocations from "../Hooks/useLocations";
import useSaved from "../Hooks/useSaved";
import Loader from "../Components/Loader";
import Container from "../Components/Container";
import {
    ArrowLeft,
    Bookmark,
    Check,
    Globe,
    MapPin,
    AlertTriangle,
    CheckCircle2,
    Layers,
    Compass,
    Thermometer,
    Droplets,
    Scale,
    Wind,
    ShieldAlert,
    ExternalLink,
    Database,
} from "lucide-react";
import {
    formatSurfaceTemp,
    getAgencyDatasetProvenance,
    getAnalogCategory,
    getAnalogRecognitionStatus,
    getMineralogy,
    getNasaWorldviewUrl,
    getRoversTested,
    getScientificFidelityAnalysis,
    getTargetBodyInfo,
} from "../utils/analogSpec";

// Planetary analog candidate details and multi-dimensional fidelity analysis.
const LocDetailsPage = () => {
    // Route parameters, analog dataset, and saved sites hooks
    const { _id } = useParams();
    const { locData, loading } = useLocations();
    const { savedLoc, saveLocation } = useSaved();

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

    // Icon mapping for 4 fidelity dimensions
    const dimensionIcons = {
        geology: Layers,
        topography: Compass,
        thermal: Thermometer,
        water_isru: Droplets,
    };

    if (loading) return <Loader />;

    // Not-found guard fallback
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

    // Derived scientific specifications, recognition status, and fidelity metrics
    const { longSpecLabel, pillLabel, pillClassName } =
        getTargetBodyInfo(neededLocation);
    const surfaceTemp = formatSurfaceTemp(neededLocation);
    const analogCategory = getAnalogCategory(neededLocation);
    const roversTested = getRoversTested(neededLocation);
    const mineralogy = getMineralogy(neededLocation);
    const recognition = getAnalogRecognitionStatus(neededLocation);
    const fidelity = getScientificFidelityAnalysis(neededLocation);
    const agencyDatasets = getAgencyDatasetProvenance(neededLocation);

    // Persists location to saved collection
    const handleSave = () => {
        saveLocation?.(neededLocation);
    };

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

                    {/* Hero header card */}
                    <div className="border border-[#21242C] rounded-2xl p-6 bg-[#0B0E13] shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex flex-wrap items-center gap-2.5">
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F1EEE9] tracking-tight">
                                    {neededLocation.name}
                                </h1>
                                {/* Recognition Status Badge (Emerging in gold #CEB882 vs Established) */}
                                <span
                                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wider ${recognition.badgeClass}`}
                                >
                                    {recognition.label}
                                </span>
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
                                <span>
                                    {neededLocation.country} • {neededLocation.environment?.elevationMeters?.toLocaleString()} m elevation • {recognition.description}
                                </span>
                            </p>
                        </div>

                        {/* Action Buttons: Open in NASA Worldview & Save / Bookmark CTA */}
                        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                            <a
                                href={getNasaWorldviewUrl(
                                    neededLocation.coordinates?.latitude,
                                    neededLocation.coordinates?.longitude
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-[#181A21] border border-[#272C34] hover:border-[#83CAD8] text-[#8891A0] hover:text-[#83CAD8] font-semibold px-3.5 py-2 rounded-lg text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
                            >
                                <span>Open in NASA Worldview</span>
                                <ExternalLink size={14} aria-hidden="true" />
                            </a>

                            <button
                                type="button"
                                onClick={handleSave}
                                className="bg-[#83CAD8] hover:opacity-90 text-[#090D15] font-semibold px-4 py-2 rounded-lg text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
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
                    </div>

                    {/* Analog Target Body Badges */}
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

                    {/* Overview Narrative */}
                    <div className="border border-[#21242C] rounded-xl p-5 bg-[#0B0E13]">
                        <h2 className="text-sm font-semibold text-[#F1EEE9] mb-2">
                            Scientific Overview &amp; Planetary Relevance
                        </h2>
                        <p className="text-xs leading-relaxed text-[#8891A0]">
                            {neededLocation.description}
                        </p>
                    </div>

                    {/* Multi-dimensional fidelity breakdown */}
                    <div className="border border-[#21242C] rounded-xl p-6 bg-[#0B0E13] space-y-4 shadow-md">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#21242C] pb-3">
                            <div>
                                <h2 className="text-sm font-bold text-[#F1EEE9] tracking-tight">
                                    Multi-Dimensional Scientific Fidelity Analysis
                                </h2>
                                <p className="text-xs text-[#8891A0] mt-0.5">
                                    Quantitative breakdown across 4 environmental dimensions for {fidelity.targetBodyName} mission planning.
                                </p>
                            </div>
                            <span className="text-xs font-mono font-bold text-[#83CAD8] bg-[#181A21] border border-[#21242C] px-2.5 py-1 rounded-md self-start sm:self-auto">
                                {fidelity.overallFidelityScore}% Overall Scientific Match
                            </span>
                        </div>

                        {/* 4 Dimension Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                            {fidelity.dimensions.map((dim) => {
                                const IconComponent =
                                    dimensionIcons[dim.id] || Layers;
                                return (
                                    <div
                                        key={dim.id}
                                        className="bg-[#181A21] border border-[#21242C] rounded-xl p-4 space-y-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-[#F1EEE9] font-semibold text-xs">
                                                <IconComponent
                                                    size={15}
                                                    className="text-[#83CAD8]"
                                                />
                                                <span>{dim.title}</span>
                                            </div>
                                            <span className="text-xs font-bold text-[#83CAD8]">
                                                {dim.score} ({dim.percent}%)
                                            </span>
                                        </div>

                                        <div className="w-full h-1.5 bg-[#21242C] rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-[#83CAD8] rounded-full"
                                                style={{ width: `${dim.percent}%` }}
                                            />
                                        </div>

                                        <p className="text-xs text-[#8891A0] leading-relaxed pt-1">
                                            {dim.reason}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Why It Is a Strong Analog (What Matches) */}
                        <div className="mt-4 pt-4 border-t border-[#21242C] space-y-2.5">
                            <h3 className="text-xs font-semibold text-[#F1EEE9] flex items-center gap-1.5">
                                <CheckCircle2 size={14} className="text-[#83CAD8]" />
                                <span>Why It Is a Strong Analog (What Matches)</span>
                            </h3>
                            <ul className="space-y-1.5 text-xs text-[#8891A0]">
                                {fidelity.whatMatches.map((bullet, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                        <span className="text-[#83CAD8] font-bold mt-0.5">•</span>
                                        <span className="leading-relaxed">{bullet}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Terrestrial boundary conditions and limits */}
                    <div className="border border-[#D67051]/30 rounded-xl p-6 bg-[#100D0B] space-y-4 shadow-md">
                        <div className="border-b border-[#D67051]/20 pb-3">
                            <div className="flex items-center gap-2 text-sm font-bold text-[#D67051]">
                                <AlertTriangle size={16} className="text-[#D67051]" />
                                <h2>Where the Analogy Breaks Down (Earth&apos;s Limits &amp; Differences)</h2>
                            </div>
                            <p className="text-xs text-[#8891A0] mt-1 leading-relaxed">
                                Core 2026 NASA Space Apps Challenge Criterion: An analog does not have to match everything. Scientists must rigorously account for Earth&apos;s boundary conditions when translating terrestrial tests to Moon and Mars architectures.
                            </p>
                        </div>

                        {/* Limits Grid: Gravity, Atmosphere, Radiation, Site-Specific */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {fidelity.whereAnalogyBreaksDown.map((limit) => (
                                <div
                                    key={limit.id}
                                    className="bg-[#0B0E13] border border-[#21242C] rounded-xl p-4 space-y-2"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F1EEE9]">
                                            {limit.id === "gravity" ? (
                                                <Scale size={14} className="text-[#D67051]" />
                                            ) : limit.id === "atmosphere" ? (
                                                <Wind size={14} className="text-[#D67051]" />
                                            ) : limit.id === "radiation" ? (
                                                <ShieldAlert size={14} className="text-[#D67051]" />
                                            ) : (
                                                <AlertTriangle size={14} className="text-[#D67051]" />
                                            )}
                                            <span>{limit.factor}</span>
                                        </div>
                                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#181A21] border border-[#21242C] text-[#D67051] shrink-0">
                                            {limit.targetValue}
                                        </span>
                                    </div>
                                    <p className="text-xs text-[#8891A0] leading-relaxed">
                                        {limit.explanation}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Planetary analog specs and rover test history */}
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

                    {/* Official multi-agency science provenance */}
                    <div className="border border-[#21242C] rounded-xl p-6 bg-[#0B0E13] space-y-4 shadow-md">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#21242C] pb-3">
                            <div className="flex items-center gap-2.5">
                                <Database size={17} className="text-[#83CAD8]" />
                                <div>
                                    <h2 className="text-sm font-bold text-[#F1EEE9] tracking-tight">
                                        Official Multi-Agency Planetary Science Provenance
                                    </h2>
                                    <p className="text-xs text-[#8891A0] mt-0.5">
                                        Authoritative datasets and satellite archives (NASA, CSA, ESA, JAXA) used to characterize this analog.
                                    </p>
                                </div>
                            </div>
                            <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded bg-[#181A21] border border-[#21242C] text-[#8891A0] self-start sm:self-auto">
                                2026 Space Apps Archive
                            </span>
                        </div>

                        {/* Agency Datasets Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                            {agencyDatasets.map((ds, idx) => (
                                <div
                                    key={idx}
                                    className="bg-[#181A21] border border-[#21242C] rounded-xl p-4 flex flex-col justify-between gap-3"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <span
                                                className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border ${ds.badgeClass}`}
                                            >
                                                {ds.agency}
                                            </span>
                                            <span className="text-[10px] text-[#8891A0] font-mono">
                                                {ds.resolution}
                                            </span>
                                        </div>

                                        <h3 className="text-xs font-semibold text-[#F1EEE9] leading-snug">
                                            {ds.name}
                                        </h3>
                                        <p className="text-[11px] text-[#83CAD8] mt-1 font-medium">
                                            {ds.parameter}
                                        </p>
                                        <p className="text-xs text-[#8891A0] mt-1.5 leading-relaxed">
                                            {ds.description}
                                        </p>
                                    </div>

                                    <div className="pt-2 border-t border-[#21242C] flex items-center justify-between">
                                        <span className="text-[10px] text-[#8891A0] truncate max-w-[200px]">
                                            {ds.agencyFullName}
                                        </span>
                                        <a
                                            href={ds.portalUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs font-medium text-[#83CAD8] hover:underline"
                                        >
                                            <span>Open Archive</span>
                                            <ExternalLink size={12} aria-hidden="true" />
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Environmental conditions and terrain features */}
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
