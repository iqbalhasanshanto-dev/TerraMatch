import { useState, useMemo, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
    ChevronDown,
    Trophy,
    Bookmark,
    Compass,
    Mountain,
    Thermometer,
    Wind,
    Columns3,
    ArrowRight,
} from "lucide-react";
import useSaved from "../Hooks/useSaved";
import Loader from "../Components/Loader";
import useAuth from "../Hooks/useAuth";
import { showSignInPromptToast } from "../utils/authToast";

/**
 * ============================================================================
 * Helper: Canonical Saved Location Key Resolver
 * ============================================================================
 * Extracts a consistent identifier from any saved location document regardless
 * of whether it originated from MongoDB (`_id`), JSON (`id`), or localStorage.
 */
const getLocationKey = (loc) =>
    loc?._id || loc?.id || loc?.locationId || loc?.name || "";

/**
 * ============================================================================
 * Helper: Scientific Profile & Dynamic Telemetry Extractor
 * ============================================================================
 * Transforms any saved planetary analog location document into normalized
 * scientific metrics for the SVG Radar Chart, radial gauges, and comparison matrix.
 */
const getScientificProfile = (loc) => {
    // Graceful fallback profile if a record is temporarily undefined
    if (!loc) {
        return {
            name: "Selecting Location...",
            country: "Candidate Analog",
            targetBody: "MARS",
            similarityScore: 80,
            coordinates: { latitude: 0, longitude: 0 },
            temperatureDisplay: "0 °C",
            slopeDisplay: "5 °",
            radiationDisplay: "5 /10",
            soilDisplay: "Regolith breccia",
            aridityDisplay: "50 /100",
            elevationDisplay: "500 m",
            climate: "Arid Desert",
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

    const elevation = loc.environment?.elevationMeters || 1200;
    const climate = loc.environment?.climate || "Arid surface";
    const score = loc.similarityScore || 75;
    const targetBody =
        loc.analogType && loc.analogType[0]
            ? loc.analogType[0].toUpperCase()
            : "MARS";

    // 1. Dynamic Temperature Extraction
    let tempVal;
    if (typeof loc.temperature === "number") {
        tempVal = loc.temperature;
    } else {
        const climateLower = climate.toLowerCase();
        const lat = Math.abs(loc.coordinates?.latitude || 0);
        if (
            climateLower.includes("polar") ||
            climateLower.includes("extremely cold") ||
            lat > 70
        ) {
            tempVal = -22;
        } else if (
            climateLower.includes("cold") ||
            climateLower.includes("subarctic") ||
            lat > 55
        ) {
            tempVal = -8;
        } else if (
            climateLower.includes("temperate") ||
            climateLower.includes("mediterranean") ||
            climateLower.includes("cool")
        ) {
            tempVal = 14;
        } else if (
            climateLower.includes("hot") ||
            climateLower.includes("hyper-arid") ||
            climateLower.includes("extremely hot")
        ) {
            tempVal = 34;
        } else {
            tempVal = 18;
        }
    }
    // Normalized 0-100 scale for radar chart
    const normTemp = Math.min(
        95,
        Math.max(25, Math.round(((tempVal + 40) / 85) * 100))
    );

    // 2. Dynamic Topographic Slope Extraction
    const slopeDeg =
        elevation > 3000 ? 16 : elevation > 1500 ? 11 : elevation > 500 ? 7 : 4;
    const normSlope = Math.min(95, Math.max(30, Math.round(slopeDeg * 5.5)));

    // 3. Dynamic Cosmic/UV Radiation Index
    const radIndex = Math.min(10, Math.max(3, Math.round(elevation / 450 + 2)));
    const normRadiation = Math.min(95, Math.max(30, Math.round(radIndex * 9.5)));

    // 4. Dynamic Soil & Regolith Composition
    const primaryTerrain =
        Array.isArray(loc.terrain) && loc.terrain.length > 0
            ? loc.terrain[0]
            : "Regolith breccia";
    const soilDisplay =
        primaryTerrain.charAt(0).toUpperCase() + primaryTerrain.slice(1);
    const normSoil = Math.min(95, Math.max(35, Math.round(score * 0.95)));

    // 5. Dynamic Aridity Index
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

    // 6. Dynamic Surface Elevation
    const normElevation = Math.min(
        95,
        Math.max(25, Math.round((elevation / 4500) * 100))
    );

    return {
        ...loc,
        targetBody,
        climate,
        similarityScore: score,
        coordinates: loc.coordinates || { latitude: 0, longitude: 0 },
        temperatureDisplay: `${tempVal} °C`,
        slopeDisplay: `${slopeDeg} °`,
        radiationDisplay: `${radIndex} /10`,
        soilDisplay,
        aridityDisplay: `${aridityVal} /100`,
        elevationDisplay: `${elevation.toLocaleString()} m`,
        metrics: {
            temperature: normTemp,
            slope: normSlope,
            radiation: normRadiation,
            soil: normSoil,
            aridity: normAridity,
            elevation: normElevation,
        },
    };
};

/**
 * ============================================================================
 * ComparePage Component
 * ============================================================================
 * Provides a side-by-side scientific comparison strictly across the user's
 * saved analog locations (`savedLoc` from centralized `useSaved()`):
 * - 0 Saved Locations: Renders a clean, centered empty state card guiding the
 *   user to `/search` (never pre-fills unrelated catalog sites).
 * - 1 Saved Location: Prompts the user to save at least 1 more site to compare
 *   against their currently bookmarked location.
 * - >= 2 Saved Locations: Populates Location A, Location B, the 6-axis SVG Radar
 *   Chart, and the parameter comparison matrix strictly from `savedLoc` (or `?ids=`).
 * - Deep-space color tokens: Cyan (`#83CAD8`) for Location A, Terracotta (`#D67051`) for Location B.
 */
const ComparePage = () => {
    // ------------------------------------------------------------------------
    // 1. Hooks, Router & Global Subscriptions
    // ------------------------------------------------------------------------
    const navigate = useNavigate();
    // URL search parameters for loading pre-selected comparison pairs (`?ids=id1,id2`)
    const [searchParams, setSearchParams] = useSearchParams();
    // Centralized saved locations hook (localStorage + MongoDB)
    const { savedLoc, saveLocation, loading: savedLoading } = useSaved();
    // Current Firebase authentication state
    const { user } = useAuth();

    // ------------------------------------------------------------------------
    // 2. Saved-Only Candidate Locations Pool
    // ------------------------------------------------------------------------
    // Strictly deduplicates and exposes only the user's saved locations
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

    // ------------------------------------------------------------------------
    // 3. Selection State Management & URL Parameter Synchronization
    // ------------------------------------------------------------------------
    const urlIds = useMemo(() => {
        const ids = searchParams.get("ids");
        return ids ? ids.split(",").filter(Boolean) : [];
    }, [searchParams]);

    // Track user-chosen dropdown selection IDs for Location A and Location B
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

    /**
     * Updates Location A selection and syncs URL query parameter `?ids=`.
     */
    const handleChangeA = (e) => {
        const newId = e.target.value;
        setSelectedIdA(newId);
        setSearchParams({ ids: `${newId},${activeIdB || ""}` });
    };

    /**
     * Updates Location B selection and syncs URL query parameter `?ids=`.
     */
    const handleChangeB = (e) => {
        const newId = e.target.value;
        setSelectedIdB(newId);
        setSearchParams({ ids: `${activeIdA || ""},${newId}` });
    };

    // ------------------------------------------------------------------------
    // 4. Radar Chart Geometry & Polar-to-Cartesian Coordinate Helpers
    // ------------------------------------------------------------------------
    const radarCx = 180;
    const radarCy = 135;
    const radarRadius = 85;

    // 6-axis polar coordinate dimensions for the correlation radar chart
    const axes = useMemo(
        () => [
            { key: "temperature", label: "Temperature", angle: -Math.PI / 2 },
            { key: "slope", label: "Slope", angle: -Math.PI / 2 + Math.PI / 3 },
            {
                key: "radiation",
                label: "Radiation",
                angle: -Math.PI / 2 + (2 * Math.PI) / 3,
            },
            { key: "soil", label: "Soil", angle: Math.PI / 2 },
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

    /**
     * Converts a normalized metric score (0-100) into SVG Cartesian coordinates.
     */
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

    // Location A: Solid Cyan Polygon (#83CAD8)
    const polygonPointsA = useMemo(() => {
        return axes
            .map((axis, i) => {
                const val = locationA.metrics[axis.key] || 50;
                const pt = getCoordinates(i, val);
                return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
            })
            .join(" ");
    }, [axes, locationA, getCoordinates]);

    // Location B: Dashed Terracotta Polygon (#D67051)
    const polygonPointsB = useMemo(() => {
        return axes
            .map((axis, i) => {
                const val = locationB.metrics[axis.key] || 50;
                const pt = getCoordinates(i, val);
                return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
            })
            .join(" ");
    }, [axes, locationB, getCoordinates]);

    // ------------------------------------------------------------------------
    // 5. Best Overall Match Determination & Save Winner Handler
    // ------------------------------------------------------------------------
    const winnerLocation = useMemo(() => {
        return locationA.similarityScore >= locationB.similarityScore
            ? locationA
            : locationB;
    }, [locationA, locationB]);

    /**
     * Saves the winning comparison candidate using centralized `saveLocation`,
     * or prompts unauthenticated guests with the interactive `"Sign in →"` toast.
     */
    const handleSaveWinner = () => {
        if (!user?.email) {
            showSignInPromptToast(navigate);
            return;
        }
        saveLocation?.(winnerLocation);
    };

    if (savedLoading) return <Loader />;

    const arcCircumference = Math.PI * 55;

    // ------------------------------------------------------------------------
    // 6. Component Render Block (Empty States for 0 or 1 Saved Sites + Comparison)
    // ------------------------------------------------------------------------
    return (
        <div className="w-full h-full overflow-y-auto bg-[#07090E] text-[#F1EEE9] select-none px-4 sm:px-6 lg:px-12 py-8 pb-20">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* ========================================================== */}
                {/* 1. Header Section: Title & Subtitle                        */}
                {/* ========================================================== */}
                <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-bold text-[#F1EEE9] tracking-tight">
                        Compare Locations
                    </h1>
                    <p className="text-xs text-[#8891A0]">
                        Side-by-side scientific evaluation of your saved candidate analog sites.
                    </p>
                </div>

                {/* ========================================================== */}
                {/* 2. Empty States (0 Saved Sites or 1 Saved Site)            */}
                {/* ========================================================== */}
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
                        {/* ================================================== */}
                        {/* 3. Top Split View: Saved Selectors vs. Radar Chart */}
                        {/* ================================================== */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                            {/* ---------------------------------------------- */}
                            {/* Left Column: Location A & Location B Cards     */}
                            {/* ---------------------------------------------- */}
                            <div className="lg:col-span-5 flex flex-col gap-4">
                                {/* Location A Card (Chart 1 - Cyan #83CAD8) */}
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
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-[#181A21] border border-[#21242C] text-[#83CAD8]">
                                                    {locationA.targetBody || "ANALOG"}
                                                </span>
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
                                                    <span className="truncate">
                                                        {locationA.temperatureDisplay}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 bg-[#0B0E13] border border-[#21242C] rounded px-2 py-1 text-[#F1EEE9]">
                                                    <Wind
                                                        size={11}
                                                        aria-hidden="true"
                                                        className="text-[#83CAD8] shrink-0"
                                                    />
                                                    <span className="truncate">
                                                        {locationA.climate}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 bg-[#0B0E13] border border-[#21242C] rounded px-2 py-1 text-[#F1EEE9]">
                                                    <span className="text-[#8891A0] font-mono">
                                                        Alt:
                                                    </span>
                                                    <span className="truncate">
                                                        {locationA.elevationDisplay}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Radial Gauge Meter: Location A with #83CAD8 Arc */}
                                    <div className="flex flex-col items-center justify-center relative pt-1">
                                        <svg
                                            width="150"
                                            height="80"
                                            viewBox="0 0 150 80"
                                            className="overflow-visible"
                                        >
                                            <path
                                                d="M 20 75 A 55 55 0 0 1 130 75"
                                                fill="none"
                                                stroke="#181A21"
                                                strokeWidth="9"
                                                strokeLinecap="round"
                                            />
                                            <path
                                                d="M 20 75 A 55 55 0 0 1 130 75"
                                                fill="none"
                                                stroke="#83CAD8"
                                                strokeWidth="9"
                                                strokeLinecap="round"
                                                strokeDasharray={arcCircumference}
                                                strokeDashoffset={
                                                    arcCircumference *
                                                    (1 -
                                                        Math.min(
                                                            100,
                                                            Math.max(0, locationA.similarityScore)
                                                        ) /
                                                            100)
                                                }
                                                className="transition-all duration-700 ease-out"
                                            />
                                        </svg>
                                        <div className="absolute bottom-1 text-center flex flex-col items-center">
                                            <span className="text-lg font-bold font-mono text-[#F1EEE9] leading-tight">
                                                {locationA.similarityScore}%
                                            </span>
                                            <span className="text-[9px] font-semibold tracking-wider text-[#8891A0] mt-0.5">
                                                MATCH
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Location B Card (Chart 2 - Terracotta #D67051) */}
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
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-[#181A21] border border-[#21242C] text-[#D67051]">
                                                    {locationB.targetBody || "ANALOG"}
                                                </span>
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
                                                    <span className="truncate">
                                                        {locationB.temperatureDisplay}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 bg-[#0B0E13] border border-[#21242C] rounded px-2 py-1 text-[#F1EEE9]">
                                                    <Wind
                                                        size={11}
                                                        aria-hidden="true"
                                                        className="text-[#D67051] shrink-0"
                                                    />
                                                    <span className="truncate">
                                                        {locationB.climate}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 bg-[#0B0E13] border border-[#21242C] rounded px-2 py-1 text-[#F1EEE9]">
                                                    <span className="text-[#8891A0] font-mono">
                                                        Alt:
                                                    </span>
                                                    <span className="truncate">
                                                        {locationB.elevationDisplay}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Radial Gauge Meter: Location B with #D67051 Arc */}
                                    <div className="flex flex-col items-center justify-center relative pt-1">
                                        <svg
                                            width="150"
                                            height="80"
                                            viewBox="0 0 150 80"
                                            className="overflow-visible"
                                        >
                                            <path
                                                d="M 20 75 A 55 55 0 0 1 130 75"
                                                fill="none"
                                                stroke="#181A21"
                                                strokeWidth="9"
                                                strokeLinecap="round"
                                            />
                                            <path
                                                d="M 20 75 A 55 55 0 0 1 130 75"
                                                fill="none"
                                                stroke="#D67051"
                                                strokeWidth="9"
                                                strokeLinecap="round"
                                                strokeDasharray={arcCircumference}
                                                strokeDashoffset={
                                                    arcCircumference *
                                                    (1 -
                                                        Math.min(
                                                            100,
                                                            Math.max(0, locationB.similarityScore)
                                                        ) /
                                                            100)
                                                }
                                                className="transition-all duration-700 ease-out"
                                            />
                                        </svg>
                                        <div className="absolute bottom-1 text-center flex flex-col items-center">
                                            <span className="text-lg font-bold font-mono text-[#F1EEE9] leading-tight">
                                                {locationB.similarityScore}%
                                            </span>
                                            <span className="text-[9px] font-semibold tracking-wider text-[#8891A0] mt-0.5">
                                                MATCH
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ---------------------------------------------- */}
                            {/* Right Column: Analog Profile Correlation Chart */}
                            {/* ---------------------------------------------- */}
                            <div className="lg:col-span-7 bg-[#0B0E13] border border-[#21242C] rounded-xl p-5 flex flex-col justify-between">
                                {/* Header: Title and Scale Information */}
                                <div className="flex items-center justify-between pb-3 border-b border-[#21242C]">
                                    <h2 className="text-sm font-semibold text-[#F1EEE9] tracking-tight">
                                        Analog Profile Correlation
                                    </h2>
                                    <span className="text-[10px] text-[#8891A0] font-mono">
                                        Normalized scale (0-100)
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

                        {/* ================================================== */}
                        {/* 4. Parameter Comparison Matrix Table               */}
                        {/* ================================================== */}
                        <div className="bg-[#0B0E13] border border-[#21242C] rounded-xl overflow-hidden shadow-md">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-[#181A21] border-b border-[#21242C] text-[#8891A0] font-semibold uppercase text-[11px] tracking-wider">
                                        <th className="py-3 px-5 w-2/5">Parameter</th>
                                        <th className="py-3 px-5 w-[30%]">{locationA.name}</th>
                                        <th className="py-3 px-5 w-[30%]">{locationB.name}</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-[#21242C]">
                                    {/* Row 1: Average Temperature */}
                                    <tr className="hover:bg-[#181A21]/40 transition">
                                        <td className="py-3 px-5 text-[#8891A0] font-medium">
                                            Average Temperature
                                        </td>
                                        <td className="py-3 px-5 font-mono text-[#F1EEE9]">
                                            {locationA.metrics.temperature >=
                                                locationB.metrics.temperature && (
                                                <span className="text-[#83CAD8] mr-1.5 font-bold font-mono">
                                                    ✓
                                                </span>
                                            )}
                                            {locationA.temperatureDisplay}
                                        </td>
                                        <td className="py-3 px-5 font-mono text-[#F1EEE9]">
                                            {locationB.metrics.temperature >
                                                locationA.metrics.temperature && (
                                                <span className="text-[#83CAD8] mr-1.5 font-bold font-mono">
                                                    ✓
                                                </span>
                                            )}
                                            {locationB.temperatureDisplay}
                                        </td>
                                    </tr>

                                    {/* Row 2: Topographic Slope */}
                                    <tr className="hover:bg-[#181A21]/40 transition">
                                        <td className="py-3 px-5 text-[#8891A0] font-medium">
                                            Topographic Slope
                                        </td>
                                        <td className="py-3 px-5 font-mono text-[#F1EEE9]">
                                            {locationA.metrics.slope >= locationB.metrics.slope && (
                                                <span className="text-[#83CAD8] mr-1.5 font-bold font-mono">
                                                    ✓
                                                </span>
                                            )}
                                            {locationA.slopeDisplay}
                                        </td>
                                        <td className="py-3 px-5 font-mono text-[#F1EEE9]">
                                            {locationB.metrics.slope > locationA.metrics.slope && (
                                                <span className="text-[#83CAD8] mr-1.5 font-bold font-mono">
                                                    ✓
                                                </span>
                                            )}
                                            {locationB.slopeDisplay}
                                        </td>
                                    </tr>

                                    {/* Row 3: Radiation Index */}
                                    <tr className="hover:bg-[#181A21]/40 transition">
                                        <td className="py-3 px-5 text-[#8891A0] font-medium">
                                            Radiation Index
                                        </td>
                                        <td className="py-3 px-5 font-mono text-[#F1EEE9]">
                                            {locationA.metrics.radiation >=
                                                locationB.metrics.radiation && (
                                                <span className="text-[#83CAD8] mr-1.5 font-bold font-mono">
                                                    ✓
                                                </span>
                                            )}
                                            {locationA.radiationDisplay}
                                        </td>
                                        <td className="py-3 px-5 font-mono text-[#F1EEE9]">
                                            {locationB.metrics.radiation >
                                                locationA.metrics.radiation && (
                                                <span className="text-[#83CAD8] mr-1.5 font-bold font-mono">
                                                    ✓
                                                </span>
                                            )}
                                            {locationB.radiationDisplay}
                                        </td>
                                    </tr>

                                    {/* Row 4: Soil & Regolith Composition */}
                                    <tr className="hover:bg-[#181A21]/40 transition">
                                        <td className="py-3 px-5 text-[#8891A0] font-medium">
                                            Soil &amp; Regolith Composition
                                        </td>
                                        <td className="py-3 px-5 font-mono text-[#F1EEE9]">
                                            {locationA.metrics.soil >= locationB.metrics.soil && (
                                                <span className="text-[#83CAD8] mr-1.5 font-bold font-mono">
                                                    ✓
                                                </span>
                                            )}
                                            {locationA.soilDisplay}
                                        </td>
                                        <td className="py-3 px-5 font-mono text-[#F1EEE9]">
                                            {locationB.metrics.soil > locationA.metrics.soil && (
                                                <span className="text-[#83CAD8] mr-1.5 font-bold font-mono">
                                                    ✓
                                                </span>
                                            )}
                                            {locationB.soilDisplay}
                                        </td>
                                    </tr>

                                    {/* Row 5: Aridity Index */}
                                    <tr className="hover:bg-[#181A21]/40 transition">
                                        <td className="py-3 px-5 text-[#8891A0] font-medium">
                                            Aridity Index
                                        </td>
                                        <td className="py-3 px-5 font-mono text-[#F1EEE9]">
                                            {locationA.metrics.aridity >=
                                                locationB.metrics.aridity && (
                                                <span className="text-[#83CAD8] mr-1.5 font-bold font-mono">
                                                    ✓
                                                </span>
                                            )}
                                            {locationA.aridityDisplay}
                                        </td>
                                        <td className="py-3 px-5 font-mono text-[#F1EEE9]">
                                            {locationB.metrics.aridity >
                                                locationA.metrics.aridity && (
                                                <span className="text-[#83CAD8] mr-1.5 font-bold font-mono">
                                                    ✓
                                                </span>
                                            )}
                                            {locationB.aridityDisplay}
                                        </td>
                                    </tr>

                                    {/* Row 6: Surface Elevation */}
                                    <tr className="hover:bg-[#181A21]/40 transition">
                                        <td className="py-3 px-5 text-[#8891A0] font-medium">
                                            Surface Elevation
                                        </td>
                                        <td className="py-3 px-5 font-mono text-[#F1EEE9]">
                                            {locationA.metrics.elevation >=
                                                locationB.metrics.elevation && (
                                                <span className="text-[#83CAD8] mr-1.5 font-bold font-mono">
                                                    ✓
                                                </span>
                                            )}
                                            {locationA.elevationDisplay}
                                        </td>
                                        <td className="py-3 px-5 font-mono text-[#F1EEE9]">
                                            {locationB.metrics.elevation >
                                                locationA.metrics.elevation && (
                                                <span className="text-[#83CAD8] mr-1.5 font-bold font-mono">
                                                    ✓
                                                </span>
                                            )}
                                            {locationB.elevationDisplay}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* ================================================== */}
                        {/* 5. Bottom Best Overall Match Banner                */}
                        {/* ================================================== */}
                        <div className="bg-[#0B0E13] border border-[#21242C] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
                            {/* Left: Trophy Icon and Match Narrative */}
                            <div className="flex items-center gap-3.5">
                                <div className="w-9 h-9 rounded-full bg-[#1A1D23] text-[#83CAD8] border border-[#21242C] flex items-center justify-center shrink-0">
                                    <Trophy size={18} aria-hidden="true" />
                                </div>
                                <div>
                                    <h3 className="text-xs sm:text-sm font-semibold text-[#F1EEE9] leading-tight">
                                        Best overall match: {winnerLocation.name} (
                                        {winnerLocation.similarityScore}%)
                                    </h3>
                                    <p className="text-[11px] text-[#8891A0] mt-0.5 leading-relaxed">
                                        {winnerLocation.name} demonstrates a superior planetary analog correlation ({winnerLocation.similarityScore}%), exhibiting closer regolith composition and aridity characteristics.
                                    </p>
                                </div>
                            </div>

                            {/* Right: Save Winner Action Button */}
                            <div className="shrink-0 flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleSaveWinner}
                                    className="bg-[#1A1D23] border border-[#21242C] hover:bg-[#1E2129] text-[#F1EEE9] hover:text-[#83CAD8] px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                                >
                                    <Bookmark
                                        size={13}
                                        aria-hidden="true"
                                        className="text-[#83CAD8]"
                                    />
                                    <span>Save winner</span>
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
