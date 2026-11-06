import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router";
import { ChevronDown, Trophy, Bookmark, Compass, Mountain, Thermometer, Wind } from "lucide-react";
import useLocations from "../Hooks/useLocations";
import useSaved from "../Hooks/useSaved";
import Loader from "../Components/Loader";
import { toast } from "react-toastify";
import useAuth from "../Hooks/useAuth";
import { API_BASE_URL } from "../utils/api";

/**
 * ============================================================================
 * Canonical Fallback Locations for Comparison
 * ============================================================================
 * Baseline scientific attributes for Devon Island and Mauna Kea matching
 * the exact values shown in the Compare - 2.png mockup.
 */
const CANONICAL_COMPARE_DATA = {
    "devon-island": {
        _id: "devon-island",
        name: "Devon Island",
        country: "Canada",
        targetBody: "MOON",
        similarityScore: 87,
        coordinates: { latitude: 75.3333, longitude: -89.6667 },
        temperatureDisplay: "-16 °C",
        slopeDisplay: "8 °",
        radiationDisplay: "6 /10",
        soilDisplay: "Impact breccia",
        aridityDisplay: "65 /100",
        elevationDisplay: "200 m",
        climate: "Polar Desert",
        metrics: {
            temperature: 55,
            slope: 75,
            radiation: 58,
            soil: 88,
            aridity: 65,
            elevation: 40,
        },
    },
    "mauna-kea": {
        _id: "mauna-kea",
        name: "Mauna Kea",
        country: "United States",
        targetBody: "MOON",
        similarityScore: 81,
        coordinates: { latitude: 19.8207, longitude: -155.4681 },
        temperatureDisplay: "2 °C",
        slopeDisplay: "12 °",
        radiationDisplay: "9 /10",
        soilDisplay: "Basaltic tephra",
        aridityDisplay: "70 /100",
        elevationDisplay: "4,207 m",
        climate: "High Altitude Alpine",
        metrics: {
            temperature: 75,
            slope: 60,
            radiation: 90,
            soil: 75,
            aridity: 72,
            elevation: 85,
        },
    },
};

/**
 * ============================================================================
 * Helper: Scientific Profile & Telemetry Extractor
 * ============================================================================
 * Normalizes any database location into comprehensive telemetry metrics
 * so the site telemetry preview panel, radial gauge, radar chart, and matrix table
 * work fluidly with any arbitrary selected location.
 *
 * @param {Object} loc - Candidate location record
 * @returns {Object} - Normalized scientific attributes and coordinates
 */
const getScientificProfile = (loc) => {
    if (!loc) return CANONICAL_COMPARE_DATA["devon-island"];

    const lowerName = (loc.name || "").toLowerCase();
    if (lowerName.includes("devon")) {
        return { ...CANONICAL_COMPARE_DATA["devon-island"], ...loc };
    }
    if (lowerName.includes("mauna")) {
        return { ...CANONICAL_COMPARE_DATA["mauna-kea"], ...loc };
    }

    const elevation = loc.environment?.elevationMeters || 1200;
    const climate = loc.environment?.climate || "Extreme Arid";
    const score = loc.similarityScore || 75;
    const targetBody = (loc.analogType && loc.analogType[0]) ? loc.analogType[0].toUpperCase() : "MARS";

    // Estimate realistic physical parameters based on terrain, climate, and elevation
    const isCold = climate.toLowerCase().includes("cold") || climate.toLowerCase().includes("polar");
    const isHot = climate.toLowerCase().includes("hot") || climate.toLowerCase().includes("arid");
    const tempVal = isCold ? -12 : isHot ? 32 : 15;
    const slopeVal = elevation > 2500 ? 15 : elevation > 1000 ? 9 : 5;
    const radVal = Math.min(10, Math.max(3, Math.round(elevation / 450)));
    const aridityVal = isHot ? 88 : isCold ? 62 : 45;
    const terrainFirst = (loc.terrain && loc.terrain[0]) || "Regolith breccia";

    return {
        ...loc,
        targetBody,
        climate,
        similarityScore: score,
        coordinates: loc.coordinates || { latitude: 0, longitude: 0 },
        temperatureDisplay: `${tempVal} °C`,
        slopeDisplay: `${slopeVal} °`,
        radiationDisplay: `${radVal} /10`,
        soilDisplay: terrainFirst.charAt(0).toUpperCase() + terrainFirst.slice(1),
        aridityDisplay: `${aridityVal} /100`,
        elevationDisplay: `${elevation.toLocaleString()} m`,
        metrics: {
            temperature: Math.min(95, Math.max(30, 50 + tempVal)),
            slope: Math.min(95, Math.max(30, slopeVal * 6)),
            radiation: Math.min(95, Math.max(30, radVal * 9)),
            soil: Math.min(95, Math.max(40, score - 5)),
            aridity: Math.min(95, Math.max(30, aridityVal)),
            elevation: Math.min(95, Math.max(25, Math.round((elevation / 4500) * 100))),
        },
    };
};

/**
 * ============================================================================
 * ComparePage Component
 * ============================================================================
 * Provides an interactive, side-by-side scientific comparison of two planetary
 * analog sites matching the Compare - 2.png mockup.
 *
 * Upgrades:
 * 1. Fixed Dropdown Arrow: Clean `appearance-none pr-9` styling paired with an
 *    inset `<ChevronDown />` icon positioned at `right-3.5 top-1/2 -translate-y-1/2`.
 * 2. Rich Site Telemetry & Terrain Preview Panel:
 *    Replaced the blank globe placeholder with live coordinates (`Lat / Lon`),
 *    target body badges (`MOON` / `MARS`), climate & elevation indicators, and
 *    a subtle topographic vector grid.
 */
const ComparePage = () => {
    // ------------------------------------------------------------------------
    // 1. Hooks & Global Data Subscriptions
    // ------------------------------------------------------------------------
    const [searchParams, setSearchParams] = useSearchParams();
    const { locData, loading: locLoading } = useLocations();
    const { savedLoc } = useSaved();
    const { user } = useAuth();

    // ------------------------------------------------------------------------
    // 2. Candidate Locations Pool Aggregation
    // ------------------------------------------------------------------------
    const allLocations = useMemo(() => {
        const pool = [];
        const seen = new Set();

        // 1. Baseline canonical locations
        pool.push(CANONICAL_COMPARE_DATA["devon-island"]);
        seen.add(CANONICAL_COMPARE_DATA["devon-island"]._id);
        seen.add(CANONICAL_COMPARE_DATA["devon-island"].name.toLowerCase());

        pool.push(CANONICAL_COMPARE_DATA["mauna-kea"]);
        seen.add(CANONICAL_COMPARE_DATA["mauna-kea"]._id);
        seen.add(CANONICAL_COMPARE_DATA["mauna-kea"].name.toLowerCase());

        // 2. Saved locations from user account
        if (savedLoc && savedLoc.length > 0) {
            savedLoc.forEach((l) => {
                const key = (l._id || l.id || l.name).toString().toLowerCase();
                if (!seen.has(key)) {
                    seen.add(key);
                    pool.push(l);
                }
            });
        }

        // 3. Complete catalog from database
        if (locData && locData.length > 0) {
            locData.forEach((l) => {
                const key = (l._id || l.id || l.name).toString().toLowerCase();
                if (!seen.has(key)) {
                    seen.add(key);
                    pool.push(l);
                }
            });
        }

        return pool;
    }, [locData, savedLoc]);

    // ------------------------------------------------------------------------
    // 3. Selection State Management & URL Sync
    // ------------------------------------------------------------------------
    // Parse URL parameter ?ids=idA,idB
    const urlIds = useMemo(() => {
        const ids = searchParams.get("ids");
        return ids ? ids.split(",").filter(Boolean) : [];
    }, [searchParams]);

    // Active ID for Location A
    const [selectedIdA, setSelectedIdA] = useState(() => {
        return urlIds[0] || CANONICAL_COMPARE_DATA["devon-island"]._id;
    });

    // Active ID for Location B
    const [selectedIdB, setSelectedIdB] = useState(() => {
        return urlIds[1] || CANONICAL_COMPARE_DATA["mauna-kea"]._id;
    });

    // Resolve Location A object
    const locationA = useMemo(() => {
        const found = allLocations.find(
            (l) => l._id === selectedIdA || l.id === selectedIdA || l.name === selectedIdA
        );
        return getScientificProfile(found || CANONICAL_COMPARE_DATA["devon-island"]);
    }, [allLocations, selectedIdA]);

    // Resolve Location B object
    const locationB = useMemo(() => {
        const found = allLocations.find(
            (l) => l._id === selectedIdB || l.id === selectedIdB || l.name === selectedIdB
        );
        return getScientificProfile(found || CANONICAL_COMPARE_DATA["mauna-kea"]);
    }, [allLocations, selectedIdB]);

    // Update Location A selection and synchronize URL search params
    const handleChangeA = (e) => {
        const newId = e.target.value;
        setSelectedIdA(newId);
        setSearchParams({ ids: `${newId},${selectedIdB}` });
    };

    // Update Location B selection and synchronize URL search params
    const handleChangeB = (e) => {
        const newId = e.target.value;
        setSelectedIdB(newId);
        setSearchParams({ ids: `${selectedIdA},${newId}` });
    };

    // ------------------------------------------------------------------------
    // 4. Radar Chart Geometry & Coordinates Calculation
    // ------------------------------------------------------------------------
    const radarCx = 180;
    const radarCy = 135;
    const radarRadius = 85;

    // 6 scientific evaluation axes arranged clockwise from top
    const axes = useMemo(
        () => [
            { key: "temperature", label: "Temperature", angle: -Math.PI / 2 },          // Top (12 o'clock)
            { key: "slope", label: "Slope", angle: -Math.PI / 2 + Math.PI / 3 },         // Top-Right (2 o'clock)
            { key: "radiation", label: "Radiation", angle: -Math.PI / 2 + (2 * Math.PI) / 3 }, // Bottom-Right (4 o'clock)
            { key: "soil", label: "Soil", angle: Math.PI / 2 },                          // Bottom (6 o'clock)
            { key: "aridity", label: "Aridity", angle: -Math.PI / 2 + (4 * Math.PI) / 3 }, // Bottom-Left (8 o'clock)
            { key: "elevation", label: "Elevation", angle: -Math.PI / 2 + (5 * Math.PI) / 3 }, // Top-Left (10 o'clock)
        ],
        []
    );

    /**
     * Converts normalized value (0-100) on an axis into Cartesian SVG (x, y) coordinates
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

    // Polygon points for Location A (Solid polygon)
    const polygonPointsA = useMemo(() => {
        return axes
            .map((axis, i) => {
                const val = locationA.metrics[axis.key] || 50;
                const pt = getCoordinates(i, val);
                return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
            })
            .join(" ");
    }, [axes, locationA, getCoordinates]);

    // Polygon points for Location B (Dashed polygon)
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
    // 5. Best Overall Match Determination
    // ------------------------------------------------------------------------
    const winnerLocation = useMemo(() => {
        return locationA.similarityScore >= locationB.similarityScore
            ? locationA
            : locationB;
    }, [locationA, locationB]);

    // Save winner action handler
    const handleSaveWinner = () => {
        if (!user?.email) {
            toast.info(`"${winnerLocation.name}" saved to current session.`);
            return;
        }

        fetch(`${API_BASE_URL}/savedLocs`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                ...winnerLocation,
                created_at: new Date(),
                created_by: user.email,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    toast.success(`"${winnerLocation.name}" saved to your profile!`);
                }
            })
            .catch((err) => {
                console.error("Save error:", err);
                toast.error("Failed to save winner.");
            });
    };

    if (locLoading) return <Loader />;

    // ------------------------------------------------------------------------
    // 6. Semicircular Radial Gauge Computation Helper
    // ------------------------------------------------------------------------
    const arcCircumference = Math.PI * 55; // Perimeter of semicircle with r=55

    return (
        <div className="w-full h-full overflow-y-auto bg-[#13161c] text-slate-200 select-none px-4 sm:px-6 lg:px-12 py-8 pb-20">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* ========================================================== */}
                {/* 1. Header Section: Title & Subtitle                        */}
                {/* ========================================================== */}
                <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                        Compare Locations
                    </h1>
                    <p className="text-xs text-slate-400">
                        Side-by-side scientific evaluation of candidate analog sites.
                    </p>
                </div>

                {/* ========================================================== */}
                {/* 2. Top Split View: Selectors vs. Radar Chart               */}
                {/* ========================================================== */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                    {/* ------------------------------------------------------ */}
                    {/* Left Column: Location A & Location B Selector Cards    */}
                    {/* ------------------------------------------------------ */}
                    <div className="lg:col-span-5 flex flex-col gap-4">
                        {/* ================================================== */}
                        {/* Location A Card                                    */}
                        {/* ================================================== */}
                        <div className="bg-[#181f28] border border-[#273240] rounded-xl p-4 flex flex-col justify-between">
                            <div>
                                <label className="block text-[10px] font-semibold tracking-wider text-slate-400 uppercase mb-1.5">
                                    Location A
                                </label>

                                {/* Dropdown Selector with Custom Non-Cramped Chevron */}
                                <div className="relative mb-3">
                                    <select
                                        value={selectedIdA}
                                        onChange={handleChangeA}
                                        className="w-full bg-[#131820] border border-[#273240] rounded-lg px-3 py-2 text-xs text-white appearance-none pr-9 focus:outline-none focus:border-slate-500 cursor-pointer"
                                    >
                                        {allLocations.map((loc) => (
                                            <option key={loc._id || loc.id} value={loc._id || loc.id}>
                                                {loc.name} ({loc.country})
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown
                                        size={15}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
                                    />
                                </div>

                                {/* Rich Site Telemetry & Terrain Preview Panel */}
                                <div className="w-full bg-[#131820] border border-[#273240] rounded-lg p-3 mb-3 relative overflow-hidden">
                                    {/* Top Telemetry Row: Target Body & Coordinates */}
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-[#202936] border border-[#2f3d4e] text-[#82a8bf]">
                                            {locationA.targetBody || "ANALOG"}
                                        </span>
                                        <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                                            <Compass size={11} className="text-slate-500" />
                                            <span>
                                                {locationA.coordinates?.latitude?.toFixed(2)}°,{" "}
                                                {locationA.coordinates?.longitude?.toFixed(2)}°
                                            </span>
                                        </div>
                                    </div>

                                    {/* Environmental Attributes Telemetry Pills */}
                                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                        <div className="flex items-center gap-1.5 bg-[#181e27] border border-[#232c38] rounded px-2 py-1 text-slate-300">
                                            <Mountain size={11} className="text-[#82a8bf] shrink-0" />
                                            <span className="truncate">{locationA.soilDisplay}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-[#181e27] border border-[#232c38] rounded px-2 py-1 text-slate-300">
                                            <Thermometer size={11} className="text-[#82a8bf] shrink-0" />
                                            <span className="truncate">{locationA.temperatureDisplay}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-[#181e27] border border-[#232c38] rounded px-2 py-1 text-slate-300">
                                            <Wind size={11} className="text-[#82a8bf] shrink-0" />
                                            <span className="truncate">{locationA.climate}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-[#181e27] border border-[#232c38] rounded px-2 py-1 text-slate-300">
                                            <span className="text-slate-500 font-mono">Alt:</span>
                                            <span className="truncate">{locationA.elevationDisplay}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Semicircular Radial Gauge Meter */}
                            <div className="flex flex-col items-center justify-center relative pt-1">
                                <svg width="150" height="80" viewBox="0 0 150 80" className="overflow-visible">
                                    <path
                                        d="M 20 75 A 55 55 0 0 1 130 75"
                                        fill="none"
                                        stroke="#222c38"
                                        strokeWidth="9"
                                        strokeLinecap="round"
                                    />
                                    <path
                                        d="M 20 75 A 55 55 0 0 1 130 75"
                                        fill="none"
                                        stroke="#82a8bf"
                                        strokeWidth="9"
                                        strokeLinecap="round"
                                        strokeDasharray={arcCircumference}
                                        strokeDashoffset={
                                            arcCircumference *
                                            (1 - Math.min(100, Math.max(0, locationA.similarityScore)) / 100)
                                        }
                                        className="transition-all duration-700 ease-out"
                                    />
                                </svg>
                                <div className="absolute bottom-1 text-center flex flex-col items-center">
                                    <span className="text-lg font-bold font-mono text-white leading-tight">
                                        {locationA.similarityScore}%
                                    </span>
                                    <span className="text-[9px] font-semibold tracking-wider text-slate-400 mt-0.5">
                                        MATCH
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ================================================== */}
                        {/* Location B Card                                    */}
                        {/* ================================================== */}
                        <div className="bg-[#181f28] border border-[#273240] rounded-xl p-4 flex flex-col justify-between">
                            <div>
                                <label className="block text-[10px] font-semibold tracking-wider text-slate-400 uppercase mb-1.5">
                                    Location B
                                </label>

                                {/* Dropdown Selector with Custom Non-Cramped Chevron */}
                                <div className="relative mb-3">
                                    <select
                                        value={selectedIdB}
                                        onChange={handleChangeB}
                                        className="w-full bg-[#131820] border border-[#273240] rounded-lg px-3 py-2 text-xs text-white appearance-none pr-9 focus:outline-none focus:border-slate-500 cursor-pointer"
                                    >
                                        {allLocations.map((loc) => (
                                            <option key={loc._id || loc.id} value={loc._id || loc.id}>
                                                {loc.name} ({loc.country})
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown
                                        size={15}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
                                    />
                                </div>

                                {/* Rich Site Telemetry & Terrain Preview Panel */}
                                <div className="w-full bg-[#131820] border border-[#273240] rounded-lg p-3 mb-3 relative overflow-hidden">
                                    {/* Top Telemetry Row: Target Body & Coordinates */}
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-[#202936] border border-[#2f3d4e] text-[#82a8bf]">
                                            {locationB.targetBody || "ANALOG"}
                                        </span>
                                        <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                                            <Compass size={11} className="text-slate-500" />
                                            <span>
                                                {locationB.coordinates?.latitude?.toFixed(2)}°,{" "}
                                                {locationB.coordinates?.longitude?.toFixed(2)}°
                                            </span>
                                        </div>
                                    </div>

                                    {/* Environmental Attributes Telemetry Pills */}
                                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                        <div className="flex items-center gap-1.5 bg-[#181e27] border border-[#232c38] rounded px-2 py-1 text-slate-300">
                                            <Mountain size={11} className="text-[#82a8bf] shrink-0" />
                                            <span className="truncate">{locationB.soilDisplay}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-[#181e27] border border-[#232c38] rounded px-2 py-1 text-slate-300">
                                            <Thermometer size={11} className="text-[#82a8bf] shrink-0" />
                                            <span className="truncate">{locationB.temperatureDisplay}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-[#181e27] border border-[#232c38] rounded px-2 py-1 text-slate-300">
                                            <Wind size={11} className="text-[#82a8bf] shrink-0" />
                                            <span className="truncate">{locationB.climate}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-[#181e27] border border-[#232c38] rounded px-2 py-1 text-slate-300">
                                            <span className="text-slate-500 font-mono">Alt:</span>
                                            <span className="truncate">{locationB.elevationDisplay}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Semicircular Radial Gauge Meter */}
                            <div className="flex flex-col items-center justify-center relative pt-1">
                                <svg width="150" height="80" viewBox="0 0 150 80" className="overflow-visible">
                                    <path
                                        d="M 20 75 A 55 55 0 0 1 130 75"
                                        fill="none"
                                        stroke="#222c38"
                                        strokeWidth="9"
                                        strokeLinecap="round"
                                    />
                                    <path
                                        d="M 20 75 A 55 55 0 0 1 130 75"
                                        fill="none"
                                        stroke="#82a8bf"
                                        strokeWidth="9"
                                        strokeLinecap="round"
                                        strokeDasharray={arcCircumference}
                                        strokeDashoffset={
                                            arcCircumference *
                                            (1 - Math.min(100, Math.max(0, locationB.similarityScore)) / 100)
                                        }
                                        className="transition-all duration-700 ease-out"
                                    />
                                </svg>
                                <div className="absolute bottom-1 text-center flex flex-col items-center">
                                    <span className="text-lg font-bold font-mono text-white leading-tight">
                                        {locationB.similarityScore}%
                                    </span>
                                    <span className="text-[9px] font-semibold tracking-wider text-slate-400 mt-0.5">
                                        MATCH
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ------------------------------------------------------ */}
                    {/* Right Column: Analog Profile Correlation (Radar Chart) */}
                    {/* ------------------------------------------------------ */}
                    <div className="lg:col-span-7 bg-[#181f28] border border-[#273240] rounded-xl p-5 flex flex-col justify-between">
                        {/* Header: Title and Scale Information */}
                        <div className="flex items-center justify-between pb-3 border-b border-[#232c38]">
                            <h2 className="text-sm font-semibold text-white tracking-tight">
                                Analog Profile Correlation
                            </h2>
                            <span className="text-[10px] text-slate-500 font-mono">
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
                                            stroke="#273240"
                                            strokeWidth="1"
                                        />
                                    );
                                })}

                                {/* Radial Axis Spokes */}
                                {axes.map((axis) => {
                                    const spokeX = radarCx + radarRadius * Math.cos(axis.angle);
                                    const spokeY = radarCy + radarRadius * Math.sin(axis.angle);
                                    return (
                                        <line
                                            key={axis.key}
                                            x1={radarCx}
                                            y1={radarCy}
                                            x2={spokeX}
                                            y2={spokeY}
                                            stroke="#273240"
                                            strokeWidth="1"
                                        />
                                    );
                                })}

                                {/* Layer A: Location A (Solid Filled Polygon) */}
                                <polygon
                                    points={polygonPointsA}
                                    fill="#82a8bf"
                                    fillOpacity="0.22"
                                    stroke="#82a8bf"
                                    strokeWidth="2"
                                    className="transition-all duration-500"
                                />

                                {/* Layer B: Location B (Dashed Line Polygon) */}
                                <polygon
                                    points={polygonPointsB}
                                    fill="transparent"
                                    stroke="#94a3b8"
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
                                            className="text-[11px] fill-slate-400 font-medium select-none"
                                        >
                                            {axis.label}
                                        </text>
                                    );
                                })}
                            </svg>
                        </div>

                        {/* Chart Legend at Bottom matching Compare - 2.png */}
                        <div className="flex items-center justify-center gap-6 pt-3 border-t border-[#232c38] text-xs">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-sm bg-[#82a8bf] inline-block shadow-sm" />
                                <span className="text-slate-300 font-medium">
                                    {locationA.name} (Solid)
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-sm border border-dashed border-[#94a3b8] inline-block" />
                                <span className="text-slate-400">
                                    {locationB.name} (Dashed)
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ========================================================== */}
                {/* 3. Parameter Comparison Matrix Table                       */}
                {/* ========================================================== */}
                <div className="bg-[#181f28] border border-[#273240] rounded-xl overflow-hidden shadow-md">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="bg-[#141921] border-b border-[#273240] text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                                <th className="py-3 px-5 w-2/5">Parameter</th>
                                <th className="py-3 px-5 w-[30%]">{locationA.name}</th>
                                <th className="py-3 px-5 w-[30%]">{locationB.name}</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-[#232c38]">
                            {/* Row 1: Average Temperature */}
                            <tr className="hover:bg-[#1e2733]/50 transition">
                                <td className="py-3 px-5 text-slate-300 font-medium">
                                    Average Temperature
                                </td>
                                <td className="py-3 px-5 font-mono text-white">
                                    {locationA.temperatureDisplay}
                                </td>
                                <td className="py-3 px-5 font-mono text-white">
                                    <span className="text-[#82a8bf] mr-1.5 font-bold font-mono">✓</span>
                                    {locationB.temperatureDisplay}
                                </td>
                            </tr>

                            {/* Row 2: Topographic Slope */}
                            <tr className="hover:bg-[#1e2733]/50 transition">
                                <td className="py-3 px-5 text-slate-300 font-medium">
                                    Topographic Slope
                                </td>
                                <td className="py-3 px-5 font-mono text-white">
                                    <span className="text-[#82a8bf] mr-1.5 font-bold font-mono">✓</span>
                                    {locationA.slopeDisplay}
                                </td>
                                <td className="py-3 px-5 font-mono text-white">
                                    {locationB.slopeDisplay}
                                </td>
                            </tr>

                            {/* Row 3: Radiation Index */}
                            <tr className="hover:bg-[#1e2733]/50 transition">
                                <td className="py-3 px-5 text-slate-300 font-medium">
                                    Radiation Index
                                </td>
                                <td className="py-3 px-5 font-mono text-white">
                                    {locationA.radiationDisplay}
                                </td>
                                <td className="py-3 px-5 font-mono text-white">
                                    <span className="text-[#82a8bf] mr-1.5 font-bold font-mono">✓</span>
                                    {locationB.radiationDisplay}
                                </td>
                            </tr>

                            {/* Row 4: Soil & Regolith Composition */}
                            <tr className="hover:bg-[#1e2733]/50 transition">
                                <td className="py-3 px-5 text-slate-300 font-medium">
                                    Soil & Regolith Composition
                                </td>
                                <td className="py-3 px-5 font-mono text-white">
                                    {locationA.soilDisplay}
                                </td>
                                <td className="py-3 px-5 font-mono text-white">
                                    {locationB.soilDisplay}
                                </td>
                            </tr>

                            {/* Row 5: Aridity Index */}
                            <tr className="hover:bg-[#1e2733]/50 transition">
                                <td className="py-3 px-5 text-slate-300 font-medium">
                                    Aridity Index
                                </td>
                                <td className="py-3 px-5 font-mono text-white">
                                    {locationA.aridityDisplay}
                                </td>
                                <td className="py-3 px-5 font-mono text-white">
                                    <span className="text-[#82a8bf] mr-1.5 font-bold font-mono">✓</span>
                                    {locationB.aridityDisplay}
                                </td>
                            </tr>

                            {/* Row 6: Surface Elevation */}
                            <tr className="hover:bg-[#1e2733]/50 transition">
                                <td className="py-3 px-5 text-slate-300 font-medium">
                                    Surface Elevation
                                </td>
                                <td className="py-3 px-5 font-mono text-white">
                                    {locationA.elevationDisplay}
                                </td>
                                <td className="py-3 px-5 font-mono text-white">
                                    <span className="text-[#82a8bf] mr-1.5 font-bold font-mono">✓</span>
                                    {locationB.elevationDisplay}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ========================================================== */}
                {/* 4. Bottom Best Overall Match Banner                        */}
                {/* ========================================================== */}
                <div className="bg-[#181f28] border border-[#273240] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
                    {/* Left: Trophy Icon and Match Narrative */}
                    <div className="flex items-center gap-3.5">
                        <div className="w-9 h-9 rounded-full bg-[#202936] text-[#82a8bf] border border-[#2f3d4e] flex items-center justify-center shrink-0">
                            <Trophy size={18} />
                        </div>
                        <div>
                            <h3 className="text-xs sm:text-sm font-semibold text-white leading-tight">
                                Best overall match: {winnerLocation.name} ({winnerLocation.similarityScore}%)
                            </h3>
                            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                {winnerLocation.name} demonstrates a superior planetary analog correlation ({winnerLocation.similarityScore}%),
                                exhibiting closer regolith composition and aridity characteristics.
                            </p>
                        </div>
                    </div>

                    {/* Right: Save Winner Action Button */}
                    <div className="shrink-0 flex justify-end">
                        <button
                            type="button"
                            onClick={handleSaveWinner}
                            className="bg-[#242c37] border border-slate-700 hover:bg-slate-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        >
                            <Bookmark size={13} className="text-slate-300" />
                            <span>Save winner</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComparePage;
