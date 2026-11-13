import { useState, useMemo, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
    ChevronDown,
    Compass,
    Mountain,
    Thermometer,
    Wind,
    Columns3,
    ArrowRight,
    Sparkles,
    Bot,
    Orbit,
} from "lucide-react";
import useSaved from "../Hooks/useSaved";
import Loader from "../Components/Loader";
import {
    formatSurfaceTemp,
    getAnalogCategory,
    getAnalogRecognitionStatus,
    getMineralogy,
    getRoversTested,
    getScientificFidelityAnalysis,
    getSurfaceTemperature,
    getTargetBodyInfo,
} from "../utils/analogSpec";

// Orbital telemetry baseline reference data from Lunar and Martian PDS archives
const PLANETARY_TARGET_BASELINES = [
    {
        id: "moon-pds",
        body: "Moon",
        title: "Lunar Surface Baseline",
        badgeClassName:
            "bg-[#83CAD8]/15 text-[#83CAD8] border border-[#83CAD8]/30",
        accentTextClass: "text-[#83CAD8]",
        datasets: ["LRO LOLA", "LRO Diviner", "Chandrayaan-1 M3"],
        metrics: [
            {
                label: "Surface Temp (LRO Diviner)",
                value: "-173°C to +127°C",
                detail: "PSRs down to -248°C (25 K)",
            },
            {
                label: "Topography (LRO LOLA)",
                value: "-9.1 to +10.8 km",
                detail: "19.9 km relief • 0°–35° polar slopes",
            },
            {
                label: "Mineralogy (Chandrayaan-1 M3)",
                value: "Anorthosite & Basalt",
                detail: "Polar OH / H₂O (2.8–3.0 µm)",
            },
            {
                label: "Solar / Atmosphere",
                value: "~1,361 W/m² • Vacuum",
                detail: "0% RH • Unfiltered UV flux",
            },
        ],
    },
    {
        id: "mars-pds",
        body: "Mars",
        title: "Martian Surface Baseline",
        badgeClassName:
            "bg-[#D67051]/15 text-[#D67051] border border-[#D67051]/30",
        accentTextClass: "text-[#D67051]",
        datasets: ["MGS MOLA", "Mars ODE"],
        metrics: [
            {
                label: "Mean Surface Temp (Mars ODE)",
                value: "-63°C Mean",
                detail: "-143°C polar winter to +20°C noon",
            },
            {
                label: "Elevation Datum (MGS MOLA)",
                value: "-8.2 to +21.2 km",
                detail: "Hellas Basin to Olympus Mons",
            },
            {
                label: "Regolith (Mars ODE Archives)",
                value: "Fe-Basalt & Sulfates",
                detail: "Phyllosilicates & perchlorates",
            },
            {
                label: "Solar / Atmosphere",
                value: "~590 W/m² • ~6 mbar CO₂",
                detail: "Hyper-arid trace water vapor",
            },
        ],
    },
];

// Resolves unique identifier key for saved locations
const getLocationKey = (loc) =>
    loc?._id || loc?.id || loc?.locationId || loc?.name || "";

// Normalizes analog location telemetry into scientific profile and radar metrics
const getScientificProfile = (loc) => {
    if (!loc) {
        return {
            name: "Selecting Location...",
            country: "Candidate Analog",
            targetBody: "MARS",
            targetSpec: "Mars Analog",
            bodySummary: "Mars",
            temperature: 18,
            temperatureDisplay: "18 °C",
            temperatureCompact: "18°C",
            analogCategory: "Planetary Surface Analog",
            roversTested: "Planetary Analog Field Campaigns",
            mineralogy: "Basaltic & Silicate Regolith",
            slopeDisplay: "5 °",
            radiationDisplay: "5 /10",
            soilDisplay: "Regolith breccia",
            aridityDisplay: "50 /100",
            elevationDisplay: "500 m",
            climate: "Arid Desert",
            coordinates: { latitude: 0, longitude: 0 },
            metrics: {
                temperature: 50,
                slope: 50,
                radiation: 50,
                soil: 50,
                aridity: 50,
                elevation: 50,
            },
        };
    }

    const elevation = loc.environment?.elevationMeters ?? 1200;
    const climate = loc.environment?.climate || "Arid surface";
    const tempVal = getSurfaceTemperature(loc);
    const { bodySummary, specLabel, pillLabel, pillClassName } =
        getTargetBodyInfo(loc);
    const analogCategory = getAnalogCategory(loc);
    const roversTested = getRoversTested(loc);
    const mineralogy = getMineralogy(loc);
    const recognition = getAnalogRecognitionStatus(loc);
    const fidelity = getScientificFidelityAnalysis(loc);

    // 1. Thermal Extremity / Temperature Axis (Normalized 0-100; colder/extreme maps cleanly)
    const normTemp = Math.min(
        95,
        Math.max(25, Math.round(((tempVal + 40) / 85) * 100))
    );

    // 2. Topographic Slope Axis (derived from elevation relief tier)
    const slopeDeg =
        elevation > 3000 ? 16 : elevation > 1500 ? 11 : elevation > 500 ? 7 : 4;
    const normSlope = Math.min(95, Math.max(30, Math.round(slopeDeg * 5.5)));

    // 3. Cosmic / Solar UV Radiation Exposure Index (scales with elevation)
    const radIndex = Math.min(
        10,
        Math.max(3, Math.round(Math.max(0, elevation) / 450 + 2))
    );
    const normRadiation = Math.min(95, Math.max(30, Math.round(radIndex * 9.5)));

    // 4. Soil & Regolith Mineralogical Fidelity Axis (based on key planetary minerals)
    const primaryTerrain =
        Array.isArray(loc.terrain) && loc.terrain.length > 0
            ? loc.terrain[0]
            : "Regolith breccia";
    const soilDisplay =
        primaryTerrain.charAt(0).toUpperCase() + primaryTerrain.slice(1);
    const mineralLower = mineralogy.toLowerCase();
    let soilFidelity = 68;
    if (
        mineralLower.includes("basalt") ||
        mineralLower.includes("perchlorate") ||
        mineralLower.includes("jarosite") ||
        mineralLower.includes("permafrost")
    ) {
        soilFidelity = 90;
    } else if (
        mineralLower.includes("gypsum") ||
        mineralLower.includes("halite") ||
        mineralLower.includes("breccia") ||
        mineralLower.includes("smectite")
    ) {
        soilFidelity = 82;
    }

    // 5. Aridity Index (derived from climate dryness classification)
    let aridityVal;
    const climateStr = climate.toLowerCase();
    if (climateStr.includes("hyper-arid") || climateStr.includes("extremely dry")) {
        aridityVal = 92;
    } else if (
        climateStr.includes("dry") ||
        climateStr.includes("arid") ||
        climateStr.includes("desert")
    ) {
        aridityVal = 78;
    } else if (climateStr.includes("polar") || climateStr.includes("cold")) {
        aridityVal = 64;
    } else {
        aridityVal = 42;
    }
    const normAridity = Math.min(95, Math.max(30, aridityVal));

    // 6. Surface Elevation Axis
    const normElevation = Math.min(
        95,
        Math.max(25, Math.round((Math.max(0, elevation) / 4500) * 100))
    );

    return {
        ...loc,
        targetBody: pillLabel,
        pillClassName,
        targetSpec: specLabel,
        bodySummary,
        temperature: tempVal,
        temperatureDisplay: `${tempVal} °C`,
        temperatureCompact: formatSurfaceTemp(loc),
        analogCategory,
        roversTested,
        mineralogy,
        climate,
        coordinates: loc.coordinates || { latitude: 0, longitude: 0 },
        slopeDisplay: `${slopeDeg} °`,
        radiationDisplay: `${radIndex} /10`,
        soilDisplay,
        aridityDisplay: `${aridityVal} /100`,
        elevationDisplay: `${elevation.toLocaleString()} m`,
        recognition,
        fidelity,
        metrics: {
            temperature: normTemp,
            slope: normSlope,
            radiation: normRadiation,
            soil: soilFidelity,
            aridity: normAridity,
            elevation: normElevation,
        },
    };
};

// Side-by-side scientific comparison of saved planetary analog sites
const ComparePage = () => {
    // Navigation, query parameters, and saved bookmarks
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { savedLoc, loading: savedLoading } = useSaved();

    // Deduplicates user saved locations pool
    const savedLocationsPool = useMemo(() => {
        if (!Array.isArray(savedLoc) || savedLoc.length === 0) return [];
        const pool = [];
        const seen = new Set();

        savedLoc.forEach((loc) => {
            if (!loc || !loc.name) return;
            const key = String(getLocationKey(loc)).toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                pool.push(loc);
            }
        });

        return pool;
    }, [savedLoc]);

    // Pre-selected site IDs from URL search params
    const urlIds = useMemo(() => {
        const ids = searchParams.get("ids");
        return ids ? ids.split(",").filter(Boolean) : [];
    }, [searchParams]);

    const [selectedIdA, setSelectedIdA] = useState(() => urlIds[0] || "");
    const [selectedIdB, setSelectedIdB] = useState(() => urlIds[1] || "");

    // Helper verifying whether a candidate ID matches any site in `savedLocationsPool`
    const hasSavedMatch = useCallback(
        (candidateId) => {
            if (!candidateId) return false;
            return savedLocationsPool.some(
                (loc) =>
                    loc._id === candidateId ||
                    loc.id === candidateId ||
                    loc.locationId === candidateId ||
                    loc.name === candidateId
            );
        },
        [savedLocationsPool]
    );

    // Resolve active ID for Location A strictly from `savedLocationsPool`
    const activeIdA = useMemo(() => {
        if (savedLocationsPool.length === 0) return "";
        if (hasSavedMatch(selectedIdA)) return selectedIdA;
        if (hasSavedMatch(urlIds[0])) return urlIds[0];
        return getLocationKey(savedLocationsPool[0]);
    }, [savedLocationsPool, selectedIdA, urlIds, hasSavedMatch]);

    // Resolve active ID for Location B strictly from `savedLocationsPool`
    const activeIdB = useMemo(() => {
        if (savedLocationsPool.length < 2) return "";
        if (hasSavedMatch(selectedIdB)) return selectedIdB;
        if (hasSavedMatch(urlIds[1])) return urlIds[1];

        const secondSaved = savedLocationsPool.find(
            (loc) => getLocationKey(loc) !== activeIdA
        );
        return getLocationKey(secondSaved || savedLocationsPool[1]);
    }, [savedLocationsPool, selectedIdB, urlIds, activeIdA, hasSavedMatch]);

    // Resolve Location A scientific telemetry profile
    const locationA = useMemo(() => {
        if (savedLocationsPool.length === 0) return getScientificProfile(null);
        const found = savedLocationsPool.find(
            (loc) =>
                loc._id === activeIdA ||
                loc.id === activeIdA ||
                loc.locationId === activeIdA ||
                loc.name === activeIdA
        );
        return getScientificProfile(found || savedLocationsPool[0]);
    }, [savedLocationsPool, activeIdA]);

    // Resolve Location B scientific telemetry profile
    const locationB = useMemo(() => {
        if (savedLocationsPool.length < 2) return getScientificProfile(null);
        const found = savedLocationsPool.find(
            (loc) =>
                loc._id === activeIdB ||
                loc.id === activeIdB ||
                loc.locationId === activeIdB ||
                loc.name === activeIdB
        );
        return getScientificProfile(found || savedLocationsPool[1]);
    }, [savedLocationsPool, activeIdB]);

    // Updates Location A selection and syncs URL query parameter.
    const handleChangeA = (e) => {
        const newId = e.target.value;
        setSelectedIdA(newId);
        setSearchParams({ ids: `${newId},${activeIdB || ""}` });
    };

    // Updates Location B selection and syncs URL query parameter.
    const handleChangeB = (e) => {
        const newId = e.target.value;
        setSelectedIdB(newId);
        setSearchParams({ ids: `${activeIdA || ""},${newId}` });
    };

    // Radar chart dimensions and polar axes
    const radarCx = 180;
    const radarCy = 135;
    const radarRadius = 85;

    const axes = useMemo(
        () => [
            { key: "temperature", label: "Thermal", angle: -Math.PI / 2 },
            { key: "slope", label: "Slope", angle: -Math.PI / 2 + Math.PI / 3 },
            {
                key: "radiation",
                label: "Radiation",
                angle: -Math.PI / 2 + (2 * Math.PI) / 3,
            },
            { key: "soil", label: "Mineralogy", angle: Math.PI / 2 },
            {
                key: "aridity",
                label: "Aridity",
                angle: -Math.PI / 2 + (4 * Math.PI) / 3,
            },
            {
                key: "elevation",
                label: "Elevation",
                angle: -Math.PI / 2 + (5 * Math.PI) / 3,
            },
        ],
        []
    );

    // Converts normalized metric score to Cartesian SVG coordinates
    const getCoordinates = useCallback(
        (axisIndex, normalizedVal) => {
            const angle = axes[axisIndex].angle;
            const r = (radarRadius * Math.min(100, Math.max(0, normalizedVal))) / 100;
            return {
                x: radarCx + r * Math.cos(angle),
                y: radarCy + r * Math.sin(angle),
            };
        },
        [axes]
    );

    // Location A polygon points
    const polygonPointsA = useMemo(() => {
        return axes
            .map((axis, i) => {
                const val = locationA.metrics[axis.key] || 50;
                const pt = getCoordinates(i, val);
                return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
            })
            .join(" ");
    }, [axes, locationA, getCoordinates]);

    // Location B polygon points
    const polygonPointsB = useMemo(() => {
        return axes
            .map((axis, i) => {
                const val = locationB.metrics[axis.key] || 50;
                const pt = getCoordinates(i, val);
                return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
            })
            .join(" ");
    }, [axes, locationB, getCoordinates]);

    // Determines colder location between selected pair
    const colderSite = useMemo(() => {
        return locationA.temperature <= locationB.temperature
            ? locationA
            : locationB;
    }, [locationA, locationB]);

    if (savedLoading) return <Loader />;

    return (
        <div className="w-full h-full overflow-y-auto bg-[#07090E] text-[#F1EEE9] select-none px-4 sm:px-6 lg:px-12 py-8 pb-20">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header title and description */}
                <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-bold text-[#F1EEE9] tracking-tight">
                        Compare Locations
                    </h1>
                    <p className="text-xs text-[#8891A0]">
                        Side-by-side scientific evaluation of your saved candidate analog sites.
                    </p>
                </div>

                {/* Empty states or comparison content */}
                {savedLocationsPool.length === 0 ? (
                    /* Empty State: 0 Saved Locations */
                    <div className="text-center py-20 px-4 rounded-xl border border-dashed border-[#21242C] bg-[#0B0E13]/40 text-[#8891A0] text-xs my-8 max-w-md mx-auto space-y-4">
                        <Columns3
                            size={36}
                            aria-hidden="true"
                            className="mx-auto opacity-45 text-[#83CAD8]"
                        />
                        <div className="space-y-1.5">
                            <h2 className="font-semibold text-[#F1EEE9] text-base">
                                No Saved Locations to Compare
                            </h2>
                            <p className="text-xs text-[#8891A0] leading-relaxed">
                                Save at least two candidate analog sites from the Search page to evaluate and compare their scientific profiles side by side.
                            </p>
                        </div>
                        <div className="pt-2">
                            <Link
                                to="/search"
                                className="inline-flex items-center gap-2 bg-[#83CAD8] hover:opacity-90 text-[#090D15] font-semibold px-4 py-2 rounded-lg text-xs transition cursor-pointer shadow-sm"
                            >
                                <span>Explore &amp; Save Locations</span>
                                <ArrowRight size={14} aria-hidden="true" />
                            </Link>
                        </div>
                    </div>
                ) : savedLocationsPool.length === 1 ? (
                    /* Prompt State: Only 1 Saved Location */
                    <div className="text-center py-20 px-4 rounded-xl border border-dashed border-[#21242C] bg-[#0B0E13]/40 text-[#8891A0] text-xs my-8 max-w-md mx-auto space-y-4">
                        <Columns3
                            size={36}
                            aria-hidden="true"
                            className="mx-auto opacity-45 text-[#83CAD8]"
                        />
                        <div className="space-y-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#181A21] border border-[#21242C] text-[11px] font-medium text-[#83CAD8]">
                                1 Saved: {savedLocationsPool[0].name}
                            </span>
                            <h2 className="font-semibold text-[#F1EEE9] text-base">
                                Save One More Location to Compare
                            </h2>
                            <p className="text-xs text-[#8891A0] leading-relaxed">
                                Save at least 1 more candidate analog site to compare its scientific profile against{" "}
                                <strong className="text-[#F1EEE9] font-medium">
                                    {savedLocationsPool[0].name}
                                </strong>
                                .
                            </p>
                        </div>
                        <div className="pt-2">
                            <Link
                                to="/search"
                                className="inline-flex items-center gap-2 bg-[#83CAD8] hover:opacity-90 text-[#090D15] font-semibold px-4 py-2 rounded-lg text-xs transition cursor-pointer shadow-sm"
                            >
                                <span>Explore &amp; Save Locations</span>
                                <ArrowRight size={14} aria-hidden="true" />
                            </Link>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Location selectors and correlation radar chart */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                            {/* Location A and Location B cards */}
                            <div className="lg:col-span-5 flex flex-col gap-4">
                                {/* Location A Card (Cyan #83CAD8) */}
                                <div className="bg-[#0B0E13] border border-[#21242C] rounded-xl p-4 flex flex-col justify-between">
                                    <div>
                                        <label
                                            htmlFor="compare-select-a"
                                            className="block text-[10px] font-semibold tracking-wider text-[#8891A0] uppercase mb-1.5"
                                        >
                                            Location A
                                        </label>

                                        <div className="relative mb-3">
                                            <select
                                                id="compare-select-a"
                                                value={activeIdA}
                                                onChange={handleChangeA}
                                                className="w-full bg-[#181A21] border border-[#272C34] rounded-lg px-3 py-2 text-xs text-[#F1EEE9] appearance-none pr-9 focus:outline-none focus:border-[#83CAD8] cursor-pointer"
                                            >
                                                {savedLocationsPool.map((loc) => {
                                                    const key = getLocationKey(loc);
                                                    return (
                                                        <option
                                                            key={`saved-a-${key}`}
                                                            value={key}
                                                            className="bg-[#181A21]"
                                                        >
                                                            {loc.name} ({loc.country})
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            <ChevronDown
                                                size={15}
                                                aria-hidden="true"
                                                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#8891A0]"
                                            />
                                        </div>

                                        {/* Site Telemetry & Terrain Preview Panel */}
                                        <div className="w-full bg-[#07090E] border border-[#21242C] rounded-lg p-3 mb-3 relative overflow-hidden">
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span
                                                        className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${locationA.pillClassName}`}
                                                    >
                                                        {locationA.targetSpec}
                                                    </span>
                                                    {locationA.recognition?.isEmerging && (
                                                        <span
                                                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${locationA.recognition.badgeClass}`}
                                                        >
                                                            {locationA.recognition.label}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] font-mono text-[#8891A0]">
                                                    <Compass
                                                        size={11}
                                                        aria-hidden="true"
                                                        className="text-[#8891A0]"
                                                    />
                                                    <span>
                                                        {locationA.coordinates?.latitude?.toFixed(2)}°,{" "}
                                                        {locationA.coordinates?.longitude?.toFixed(2)}°
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                                <div className="flex items-center gap-1.5 bg-[#0B0E13] border border-[#21242C] rounded px-2 py-1 text-[#F1EEE9]">
                                                    <Mountain
                                                        size={11}
                                                        aria-hidden="true"
                                                        className="text-[#83CAD8] shrink-0"
                                                    />
                                                    <span className="truncate">
                                                        {locationA.soilDisplay}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 bg-[#0B0E13] border border-[#21242C] rounded px-2 py-1 text-[#F1EEE9]">
                                                    <Thermometer
                                                        size={11}
                                                        aria-hidden="true"
                                                        className="text-[#83CAD8] shrink-0"
                                                    />
                                                    <span className="truncate font-mono">
                                                        {locationA.temperatureDisplay}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 bg-[#0B0E13] border border-[#21242C] rounded px-2 py-1 text-[#F1EEE9]">
                                                    <Wind
                                                        size={11}
                                                        aria-hidden="true"
                                                        className="text-[#83CAD8] shrink-0"
                                                    />
                                                    <span className="truncate capitalize">
                                                        {locationA.climate}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 bg-[#0B0E13] border border-[#21242C] rounded px-2 py-1 text-[#F1EEE9]">
                                                    <span className="text-[#8891A0] font-mono">
                                                        Alt:
                                                    </span>
                                                    <span className="truncate font-mono">
                                                        {locationA.elevationDisplay}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Real Scientific Analog Fidelity Summary (Replaces Fake % Gauge) */}
                                    <div className="bg-[#181A21]/70 border border-[#21242C] rounded-lg px-3 py-2.5 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <span className="text-[9px] font-semibold tracking-wider text-[#8891A0] uppercase block">
                                                Primary Analog Fidelity
                                            </span>
                                            <p className="text-xs font-semibold text-[#F1EEE9] truncate mt-0.5">
                                                {locationA.analogCategory}{" "}
                                                <span className="text-[#83CAD8] font-mono text-[11px]">
                                                    ({locationA.fidelity?.overallFidelityScore}% Match)
                                                </span>
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="text-[9px] font-semibold tracking-wider text-[#8891A0] uppercase block">
                                                Mean Temp
                                            </span>
                                            <span className="text-sm font-bold font-mono text-[#83CAD8]">
                                                {locationA.temperatureCompact}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Location B Card (Terracotta #D67051) */}
                                <div className="bg-[#0B0E13] border border-[#21242C] rounded-xl p-4 flex flex-col justify-between">
                                    <div>
                                        <label
                                            htmlFor="compare-select-b"
                                            className="block text-[10px] font-semibold tracking-wider text-[#8891A0] uppercase mb-1.5"
                                        >
                                            Location B
                                        </label>

                                        <div className="relative mb-3">
                                            <select
                                                id="compare-select-b"
                                                value={activeIdB}
                                                onChange={handleChangeB}
                                                className="w-full bg-[#181A21] border border-[#272C34] rounded-lg px-3 py-2 text-xs text-[#F1EEE9] appearance-none pr-9 focus:outline-none focus:border-[#D67051] cursor-pointer"
                                            >
                                                {savedLocationsPool.map((loc) => {
                                                    const key = getLocationKey(loc);
                                                    return (
                                                        <option
                                                            key={`saved-b-${key}`}
                                                            value={key}
                                                            className="bg-[#181A21]"
                                                        >
                                                            {loc.name} ({loc.country})
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            <ChevronDown
                                                size={15}
                                                aria-hidden="true"
                                                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#8891A0]"
                                            />
                                        </div>

                                        {/* Site Telemetry & Terrain Preview Panel */}
                                        <div className="w-full bg-[#07090E] border border-[#21242C] rounded-lg p-3 mb-3 relative overflow-hidden">
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span
                                                        className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${locationB.pillClassName}`}
                                                    >
                                                        {locationB.targetSpec}
                                                    </span>
                                                    {locationB.recognition?.isEmerging && (
                                                        <span
                                                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${locationB.recognition.badgeClass}`}
                                                        >
                                                            {locationB.recognition.label}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] font-mono text-[#8891A0]">
                                                    <Compass
                                                        size={11}
                                                        aria-hidden="true"
                                                        className="text-[#8891A0]"
                                                    />
                                                    <span>
                                                        {locationB.coordinates?.latitude?.toFixed(2)}°,{" "}
                                                        {locationB.coordinates?.longitude?.toFixed(2)}°
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                                <div className="flex items-center gap-1.5 bg-[#0B0E13] border border-[#21242C] rounded px-2 py-1 text-[#F1EEE9]">
                                                    <Mountain
                                                        size={11}
                                                        aria-hidden="true"
                                                        className="text-[#D67051] shrink-0"
                                                    />
                                                    <span className="truncate">
                                                        {locationB.soilDisplay}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 bg-[#0B0E13] border border-[#21242C] rounded px-2 py-1 text-[#F1EEE9]">
                                                    <Thermometer
                                                        size={11}
                                                        aria-hidden="true"
                                                        className="text-[#D67051] shrink-0"
                                                    />
                                                    <span className="truncate font-mono">
                                                        {locationB.temperatureDisplay}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 bg-[#0B0E13] border border-[#21242C] rounded px-2 py-1 text-[#F1EEE9]">
                                                    <Wind
                                                        size={11}
                                                        aria-hidden="true"
                                                        className="text-[#D67051] shrink-0"
                                                    />
                                                    <span className="truncate capitalize">
                                                        {locationB.climate}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 bg-[#0B0E13] border border-[#21242C] rounded px-2 py-1 text-[#F1EEE9]">
                                                    <span className="text-[#8891A0] font-mono">
                                                        Alt:
                                                    </span>
                                                    <span className="truncate font-mono">
                                                        {locationB.elevationDisplay}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Real Scientific Analog Fidelity Summary (Replaces Fake % Gauge) */}
                                    <div className="bg-[#181A21]/70 border border-[#21242C] rounded-lg px-3 py-2.5 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <span className="text-[9px] font-semibold tracking-wider text-[#8891A0] uppercase block">
                                                Primary Analog Fidelity
                                            </span>
                                            <p className="text-xs font-semibold text-[#F1EEE9] truncate mt-0.5">
                                                {locationB.analogCategory}{" "}
                                                <span className="text-[#D67051] font-mono text-[11px]">
                                                    ({locationB.fidelity?.overallFidelityScore}% Match)
                                                </span>
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="text-[9px] font-semibold tracking-wider text-[#8891A0] uppercase block">
                                                Mean Temp
                                            </span>
                                            <span className="text-sm font-bold font-mono text-[#D67051]">
                                                {locationB.temperatureCompact}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Analog profile correlation chart */}
                            <div className="lg:col-span-7 bg-[#0B0E13] border border-[#21242C] rounded-xl p-5 flex flex-col justify-between">
                                {/* Header: Title and Scale Information */}
                                <div className="flex items-center justify-between pb-3 border-b border-[#21242C]">
                                    <h2 className="text-sm font-semibold text-[#F1EEE9] tracking-tight">
                                        Analog Profile Correlation
                                    </h2>
                                    <span className="text-[10px] text-[#8891A0] font-mono">
                                        Normalized environmental indices (0-100)
                                    </span>
                                </div>

                                {/* Interactive Pure SVG Radar Chart */}
                                <div className="w-full flex-1 flex items-center justify-center py-4">
                                    <svg
                                        width="360"
                                        height="270"
                                        viewBox="0 0 360 270"
                                        className="overflow-visible max-w-full"
                                    >
                                        {/* Concentric Background Grid Rings */}
                                        {[0.25, 0.5, 0.75, 1.0].map((level) => {
                                            const gridRingPoints = axes
                                                .map((axis) => {
                                                    const r = radarRadius * level;
                                                    const x = radarCx + r * Math.cos(axis.angle);
                                                    const y = radarCy + r * Math.sin(axis.angle);
                                                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                                                })
                                                .join(" ");

                                            return (
                                                <polygon
                                                    key={level}
                                                    points={gridRingPoints}
                                                    fill="transparent"
                                                    stroke="#21242C"
                                                    strokeWidth="1"
                                                />
                                            );
                                        })}

                                        {/* Radial Axis Spokes */}
                                        {axes.map((axis) => {
                                            const spokeX =
                                                radarCx + radarRadius * Math.cos(axis.angle);
                                            const spokeY =
                                                radarCy + radarRadius * Math.sin(axis.angle);
                                            return (
                                                <line
                                                    key={axis.key}
                                                    x1={radarCx}
                                                    y1={radarCy}
                                                    x2={spokeX}
                                                    y2={spokeY}
                                                    stroke="#21242C"
                                                    strokeWidth="1"
                                                />
                                            );
                                        })}

                                        {/* Layer A: Location A (Solid Cyan Polygon - #83CAD8) */}
                                        <polygon
                                            points={polygonPointsA}
                                            fill="#83CAD8"
                                            fillOpacity="0.22"
                                            stroke="#83CAD8"
                                            strokeWidth="2"
                                            className="transition-all duration-500"
                                        />

                                        {/* Layer B: Location B (Dashed Terracotta Polygon - #D67051) */}
                                        <polygon
                                            points={polygonPointsB}
                                            fill="transparent"
                                            stroke="#D67051"
                                            strokeWidth="2"
                                            strokeDasharray="5 4"
                                            className="transition-all duration-500"
                                        />

                                        {/* Axis Labels Positioned Outside Chart Perimeter */}
                                        {axes.map((axis) => {
                                            const labelDist = radarRadius + 22;
                                            const lx = radarCx + labelDist * Math.cos(axis.angle);
                                            const ly = radarCy + labelDist * Math.sin(axis.angle);

                                            const anchor =
                                                Math.abs(Math.cos(axis.angle)) < 0.2
                                                    ? "middle"
                                                    : Math.cos(axis.angle) > 0
                                                    ? "start"
                                                    : "end";

                                            return (
                                                <text
                                                    key={axis.key}
                                                    x={lx}
                                                    y={ly + 3}
                                                    textAnchor={anchor}
                                                    className="text-[11px] fill-[#8891A0] font-medium select-none"
                                                >
                                                    {axis.label}
                                                </text>
                                            );
                                        })}
                                    </svg>
                                </div>

                                {/* Chart Legend at Bottom */}
                                <div className="flex items-center justify-center gap-6 pt-3 border-t border-[#21242C] text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-sm bg-[#83CAD8] inline-block shadow-sm" />
                                        <span className="text-[#F1EEE9] font-medium">
                                            {locationA.name} (Solid)
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-sm border border-dashed border-[#D67051] inline-block" />
                                        <span className="text-[#D67051]">
                                            {locationB.name} (Dashed)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Planetary target reference baselines */}
                        <section
                            aria-label="Planetary Target Reference Baselines from PDS Archives"
                            className="bg-[#0B0E13] border border-[#21242C] rounded-xl p-4 shadow-md space-y-3"
                        >
                            {/* Strip Header: Title & Data Sources Link */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#21242C] pb-2.5">
                                <div className="flex items-center gap-2">
                                    <Orbit
                                        size={15}
                                        aria-hidden="true"
                                        className="text-[#83CAD8] shrink-0"
                                    />
                                    <div>
                                        <h2 className="text-xs sm:text-sm font-semibold text-[#F1EEE9] tracking-tight">
                                            Planetary Target Reference Baselines (PDS Archives)
                                        </h2>
                                        <p className="text-[11px] text-[#8891A0]">
                                            Orbital telemetry benchmarks from official Lunar &amp; Martian PDS datasets for cross-planetary analog calibration.
                                        </p>
                                    </div>
                                </div>

                                <Link
                                    to="/data-sources"
                                    className="text-[11px] font-medium text-[#83CAD8] hover:underline shrink-0"
                                >
                                    View PDS Archives →
                                </Link>
                            </div>

                            {/* Two-Column Baseline Grid: Moon PDS vs. Mars PDS */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                {PLANETARY_TARGET_BASELINES.map((baseline) => (
                                    <div
                                        key={baseline.id}
                                        className="bg-[#07090E] border border-[#21242C] rounded-lg p-3 space-y-2.5"
                                    >
                                        {/* Planetary Body Title & Official Dataset Pills */}
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${baseline.badgeClassName}`}
                                                >
                                                    {baseline.body}
                                                </span>
                                                <span className="text-xs font-semibold text-[#F1EEE9]">
                                                    {baseline.title}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-1">
                                                {baseline.datasets.map((ds) => (
                                                    <span
                                                        key={ds}
                                                        className="px-1.5 py-0.5 rounded bg-[#181A21] border border-[#21242C] text-[10px] font-mono text-[#8891A0]"
                                                    >
                                                        {ds}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Compact 4-Metric Orbital Reference Strip */}
                                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                                            {baseline.metrics.map((metric) => (
                                                <div
                                                    key={metric.label}
                                                    className="bg-[#0B0E13] border border-[#21242C] rounded px-2.5 py-1.5"
                                                >
                                                    <span className="block text-[9px] font-medium uppercase tracking-wider text-[#8891A0] truncate">
                                                        {metric.label}
                                                    </span>
                                                    <span
                                                        className={`block font-mono font-semibold text-[11px] mt-0.5 truncate ${baseline.accentTextClass}`}
                                                    >
                                                        {metric.value}
                                                    </span>
                                                    <span className="block text-[10px] text-[#8891A0] truncate">
                                                        {metric.detail}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Scientific parameter comparison matrix table */}
                        <div className="bg-[#0B0E13] border border-[#21242C] rounded-xl overflow-hidden shadow-md">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-[#181A21] border-b border-[#21242C] text-[#8891A0] font-semibold uppercase text-[11px] tracking-wider">
                                        <th className="py-3 px-5 w-1/3">Parameter</th>
                                        <th className="py-3 px-5 w-1/3 text-[#83CAD8]">
                                            {locationA.name}
                                        </th>
                                        <th className="py-3 px-5 w-1/3 text-[#D67051]">
                                            {locationB.name}
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-[#21242C]">
                                    {/* Row 1: Target Planetary Body */}
                                    <tr className="hover:bg-[#181A21]/40 transition">
                                        <td className="py-3 px-5 text-[#8891A0] font-medium">
                                            Target Planetary Body
                                        </td>
                                        <td className="py-3 px-5 font-semibold text-[#F1EEE9]">
                                            {locationA.bodySummary}
                                        </td>
                                        <td className="py-3 px-5 font-semibold text-[#F1EEE9]">
                                            {locationB.bodySummary}
                                        </td>
                                    </tr>

                                    {/* Row 2: Analog Recognition Status */}
                                    <tr className="hover:bg-[#181A21]/40 transition">
                                        <td className="py-3 px-5 text-[#8891A0] font-medium">
                                            Analog Recognition Status
                                        </td>
                                        <td className="py-3 px-5 font-semibold text-[#F1EEE9]">
                                            <span
                                                className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider inline-flex items-center gap-1 ${locationA.recognition?.badgeClass}`}
                                            >
                                                {locationA.recognition?.label}
                                            </span>
                                        </td>
                                        <td className="py-3 px-5 font-semibold text-[#F1EEE9]">
                                            <span
                                                className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider inline-flex items-center gap-1 ${locationB.recognition?.badgeClass}`}
                                            >
                                                {locationB.recognition?.label}
                                            </span>
                                        </td>
                                    </tr>

                                    {/* Row 3: Scientific Fidelity Match */}
                                    <tr className="hover:bg-[#181A21]/40 transition">
                                        <td className="py-3 px-5 text-[#8891A0] font-medium">
                                            Scientific Fidelity Match
                                        </td>
                                        <td className="py-3 px-5 font-mono text-[#83CAD8] font-bold">
                                            {locationA.fidelity?.overallFidelityScore}% Overall Match
                                        </td>
                                        <td className="py-3 px-5 font-mono text-[#D67051] font-bold">
                                            {locationB.fidelity?.overallFidelityScore}% Overall Match
                                        </td>
                                    </tr>

                                    {/* Row 4: Mean Surface Temperature */}
                                    <tr className="hover:bg-[#181A21]/40 transition">
                                        <td className="py-3 px-5 text-[#8891A0] font-medium">
                                            Mean Surface Temperature
                                        </td>
                                        <td className="py-3 px-5 font-mono text-[#F1EEE9]">
                                            {locationA.temperatureDisplay}
                                        </td>
                                        <td className="py-3 px-5 font-mono text-[#F1EEE9]">
                                            {locationB.temperatureDisplay}
                                        </td>
                                    </tr>

                                    {/* Row 5: Climate & Aridity Regime */}
                                    <tr className="hover:bg-[#181A21]/40 transition">
                                        <td className="py-3 px-5 text-[#8891A0] font-medium">
                                            Climate &amp; Aridity Regime
                                        </td>
                                        <td className="py-3 px-5 text-[#F1EEE9] capitalize">
                                            {locationA.climate}
                                        </td>
                                        <td className="py-3 px-5 text-[#F1EEE9] capitalize">
                                            {locationB.climate}
                                        </td>
                                    </tr>

                                    {/* Row 6: Soil & Regolith Mineralogy */}
                                    <tr className="hover:bg-[#181A21]/40 transition">
                                        <td className="py-3 px-5 text-[#8891A0] font-medium">
                                            Soil &amp; Regolith Mineralogy
                                        </td>
                                        <td className="py-3 px-5 text-[#F1EEE9] leading-relaxed">
                                            {locationA.mineralogy || locationA.soilDisplay}
                                        </td>
                                        <td className="py-3 px-5 text-[#F1EEE9] leading-relaxed">
                                            {locationB.mineralogy || locationB.soilDisplay}
                                        </td>
                                    </tr>

                                    {/* Row 7: Surface Elevation */}
                                    <tr className="hover:bg-[#181A21]/40 transition">
                                        <td className="py-3 px-5 text-[#8891A0] font-medium">
                                            Surface Elevation
                                        </td>
                                        <td className="py-3 px-5 font-mono text-[#F1EEE9]">
                                            {locationA.elevationDisplay}
                                        </td>
                                        <td className="py-3 px-5 font-mono text-[#F1EEE9]">
                                            {locationB.elevationDisplay}
                                        </td>
                                    </tr>

                                    {/* Row 8: Historical Rovers / Missions Tested */}
                                    <tr className="hover:bg-[#181A21]/40 transition">
                                        <td className="py-3 px-5 text-[#8891A0] font-medium">
                                            Historical Rovers / Missions Tested
                                        </td>
                                        <td className="py-3 px-5 text-[#F1EEE9]/90 leading-relaxed">
                                            {locationA.roversTested}
                                        </td>
                                        <td className="py-3 px-5 text-[#F1EEE9]/90 leading-relaxed">
                                            {locationB.roversTested}
                                        </td>
                                    </tr>

                                    {/* Row 9: Analogy Limitations & Earth Boundary Conditions */}
                                    <tr className="hover:bg-[#181A21]/40 transition bg-[#140D09]/30">
                                        <td className="py-3.5 px-5 text-[#D67051] font-semibold align-top">
                                            Analogy Limitations &amp; Earth Boundary Conditions
                                        </td>
                                        <td className="py-3.5 px-5 text-xs text-[#8891A0] leading-relaxed align-top space-y-2">
                                            <div>
                                                <span className="text-[#F1EEE9] font-medium block">
                                                    Gravity:
                                                </span>
                                                <p className="text-[11px] text-[#8891A0] mt-0.5">
                                                    {locationA.fidelity?.whereAnalogyBreaksDown?.[0]?.explanation}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-[#F1EEE9] font-medium block">
                                                    Atmosphere &amp; Radiation:
                                                </span>
                                                <p className="text-[11px] text-[#8891A0] mt-0.5">
                                                    {locationA.fidelity?.whereAnalogyBreaksDown?.[1]?.targetValue} • {locationA.fidelity?.whereAnalogyBreaksDown?.[2]?.earthValue}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-[#D67051] font-medium block">
                                                    Site Boundary Limit:
                                                </span>
                                                <p className="text-[11px] text-[#8891A0] mt-0.5">
                                                    {locationA.fidelity?.whereAnalogyBreaksDown?.[3]?.explanation}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-5 text-xs text-[#8891A0] leading-relaxed align-top space-y-2">
                                            <div>
                                                <span className="text-[#F1EEE9] font-medium block">
                                                    Gravity:
                                                </span>
                                                <p className="text-[11px] text-[#8891A0] mt-0.5">
                                                    {locationB.fidelity?.whereAnalogyBreaksDown?.[0]?.explanation}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-[#F1EEE9] font-medium block">
                                                    Atmosphere &amp; Radiation:
                                                </span>
                                                <p className="text-[11px] text-[#8891A0] mt-0.5">
                                                    {locationB.fidelity?.whereAnalogyBreaksDown?.[1]?.targetValue} • {locationB.fidelity?.whereAnalogyBreaksDown?.[2]?.earthValue}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-[#D67051] font-medium block">
                                                    Site Boundary Limit:
                                                </span>
                                                <p className="text-[11px] text-[#8891A0] mt-0.5">
                                                    {locationB.fidelity?.whereAnalogyBreaksDown?.[3]?.explanation}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Scientific comparison summary highlight */}
                        <div className="bg-[#0B0E13] border border-[#21242C] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
                            {/* Left: Scientific Highlight Narrative */}
                            <div className="flex items-center gap-3.5">
                                <div className="w-9 h-9 rounded-full bg-[#1A1D23] text-[#83CAD8] border border-[#21242C] flex items-center justify-center shrink-0">
                                    <Sparkles size={17} aria-hidden="true" />
                                </div>
                                <div>
                                    <h3 className="text-xs sm:text-sm font-semibold text-[#F1EEE9] leading-tight">
                                        Thermal &amp; Mission Highlight: {colderSite.name} ({colderSite.temperatureCompact})
                                    </h3>
                                    <p className="text-[11px] text-[#8891A0] mt-0.5 leading-relaxed">
                                        {colderSite.name} offers the colder thermal regime ({colderSite.temperatureDisplay}) focused on{" "}
                                        <span className="text-[#F1EEE9] font-medium">
                                            {colderSite.analogCategory}
                                        </span>
                                        .
                                    </p>
                                </div>
                            </div>

                            {/* Right: Inspect Site Details CTA */}
                            <div className="shrink-0 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() =>
                                        navigate(`/details/${getLocationKey(colderSite)}`)
                                    }
                                    className="bg-[#1A1D23] border border-[#21242C] hover:bg-[#1E2129] text-[#F1EEE9] hover:text-[#83CAD8] px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                                >
                                    <Bot
                                        size={14}
                                        aria-hidden="true"
                                        className="text-[#83CAD8]"
                                    />
                                    <span>Inspect Site Specs</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ComparePage;
