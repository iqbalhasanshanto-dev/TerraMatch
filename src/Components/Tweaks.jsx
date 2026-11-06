import { useState, useEffect, useContext, useMemo, useCallback } from "react";
import { Search, Globe, MapPin, Check } from "lucide-react";
import useLocations from "../Hooks/useLocations";
import useSaved from "../Hooks/useSaved";
import StateContext from "../States/StateContext";
import useAuth from "../Hooks/useAuth";
import { toast } from "react-toastify";
import { API_BASE_URL } from "../utils/api";

/**
 * ============================================================================
 * Tweaks Component ("Find a Match" Planetary Analog Filter Panel)
 * ============================================================================
 * Refactored to match the exact visual style and dark space theme of Search.png.
 *
 * Provides multi-variable geospatial filtering for terrestrial planetary analogs:
 * 1. Location text search (name or country)
 * 2. Target celestial body toggle (Moon vs. Mars)
 * 3. Surface terrain classifications (Rocky, Sandy, Icy, Volcanic, etc.)
 * 4. Environmental humidity regimes (Earth site conditions)
 * 5. Temperature categories & dual-range min/max sliders (-50°C to 40°C)
 * 6. Live sync with the Leaflet satellite map & candidate results list
 */
const Tweaks = () => {

    // ------------------------------------------------------------------------
    // 1. Contexts, Custom Hooks & Authentication
    // ------------------------------------------------------------------------

    // Complete list of planetary analog locations loaded from API or local fallback
    const { locData } = useLocations();

    // Global state for shared map filtering and smooth panning coordinates
    const { filteredLoc, setFilteredLoc, setMapTarget } = useContext(StateContext);

    // Current user session for bookmarking authorization
    const { user } = useAuth();

    // User's saved sites to determine bookmarking indicators
    const { savedLoc } = useSaved();

    // ------------------------------------------------------------------------
    // 2. Filter State Variables
    // ------------------------------------------------------------------------

    // Real-time location search query (matches location name or country)
    const [searchQuery, setSearchQuery] = useState("");

    // Target celestial body selector ("mars" or "moon") - default: "mars"
    const [targetBody, setTargetBody] = useState("mars");

    // Terrain keyword filter ("Any", "Rocky", "Sandy", "Icy", "Volcanic")
    const [terrain, setTerrain] = useState("Any");

    // Earth analog environmental humidity ("Any", "Very dry", "Dry", "Moderate", "Humid")
    const [humidity, setHumidity] = useState("Any");

    // Temperature qualitative category ("Any", "Freezing", "Cold", "Mild", "Hot")
    const [temperature, setTemperature] = useState("Any");

    // Temperature lower range limit slider (default: -50°C)
    const [tempMin, setTempMin] = useState(-50);

    // Temperature upper range limit slider (default: 40°C)
    const [tempMax, setTempMax] = useState(40);

    // Optimistic local set of newly saved location IDs for instant feedback
    const [optimisticSavedIds, setOptimisticSavedIds] = useState(() => new Set());

    // Merged set of saved IDs derived from backend data and optimistic additions
    const savedLocationIds = useMemo(() => {
        const set = new Set(optimisticSavedIds);
        if (savedLoc && savedLoc.length > 0) {
            savedLoc.forEach((item) => set.add(item._id || item.id || item.name));
        }
        return set;
    }, [savedLoc, optimisticSavedIds]);

    // ------------------------------------------------------------------------
    // 3. Helper Calculation: Estimated Site Temperature
    // ------------------------------------------------------------------------
    /**
     * Estimates an average temperature in °C for an analog site based on climate strings
     * and latitude, enabling the numeric temperature range slider to filter real data.
     *
     * @param {Object} location - Candidate planetary analog location
     * @returns {number} - Estimated temperature in Celsius
     */
    const getEstimatedTemperature = useCallback((location) => {
        if (typeof location.temperature === "number") {
            return location.temperature;
        }

        const climate = (location.environment?.climate || "").toLowerCase();
        const lat = Math.abs(location.coordinates?.latitude || 0);

        // Polar and extremely cold environments (e.g. McMurdo Dry Valleys, Antarctica)
        if (climate.includes("polar") || climate.includes("extremely cold") || lat > 70) {
            return -35;
        }
        // Cold and subarctic regions (e.g. Icelandic Highlands)
        if (climate.includes("cold") || climate.includes("subarctic") || lat > 55) {
            return -5;
        }
        // Mild / Temperate / Mediterranean climates
        if (climate.includes("temperate") || climate.includes("mediterranean") || climate.includes("cool")) {
            return 16;
        }
        // Hot and hyper-arid desert regions (e.g. Atacama Desert, Danakil Depression)
        if (climate.includes("hot") || climate.includes("hyper-arid") || climate.includes("extremely hot")) {
            return 32;
        }
        // Moderate default
        return 20;
    }, []);

    // ------------------------------------------------------------------------
    // 4. Multi-Variable Filtering Logic
    // ------------------------------------------------------------------------
    /**
     * Applies all active criteria to candidate locations:
     * - Name or Country substring match
     * - Target celestial body (Moon / Mars)
     * - Terrain classification keywords
     * - Humidity conditions
     * - Qualitative temperature category
     * - Numeric temperature range boundaries
     */
    const computeFilteredLocations = useCallback(() => {
        if (!locData || locData.length === 0) return [];

        return locData.filter((location) => {
            // 1. Text Search Filter (name or country)
            if (searchQuery.trim()) {
                const query = searchQuery.trim().toLowerCase();
                const nameMatch = location.name?.toLowerCase().includes(query);
                const countryMatch = location.country?.toLowerCase().includes(query);
                if (!nameMatch && !countryMatch) {
                    return false;
                }
            }

            // 2. Target Planetary Body Filter ("mars" vs "moon")
            if (targetBody !== "Any") {
                const hasAnalogMatch = location.analogType?.some(
                    (type) => type.toLowerCase() === targetBody.toLowerCase()
                );
                if (!hasAnalogMatch) {
                    return false;
                }
            }

            // 3. Terrain Type Classification Filter
            if (terrain !== "Any") {
                const terrainKeywordMap = {
                    Rocky: ["rocky", "rock", "boulder", "stone", "regolith"],
                    Sandy: ["sandy", "sand", "desert", "dune"],
                    Icy: ["icy", "ice", "frozen", "glacier", "polar", "permafrost"],
                    Volcanic: ["volcanic", "volcano", "lava", "basalt", "caldera"],
                };

                const keywords = terrainKeywordMap[terrain] || [terrain.toLowerCase()];
                const terrainItems = location.terrain || [];
                const hasTerrainMatch = terrainItems.some((item) =>
                    keywords.some((kw) => item.toLowerCase().includes(kw))
                );
                if (!hasTerrainMatch) {
                    return false;
                }
            }

            // 4. Humidity Regime Filter (Describes Earth Site)
            if (humidity !== "Any") {
                const climateText = (location.environment?.climate || "").toLowerCase();
                const humidityText = (location.environment?.humidity || "").toLowerCase();
                const combined = `${climateText} ${humidityText}`;

                const humidityKeywordMap = {
                    "Very dry": ["extremely dry", "hyper-arid", "very dry"],
                    Dry: ["dry", "arid", "semi-arid"],
                    Moderate: ["moderate", "temperate", "mediterranean"],
                    Humid: ["humid", "tropical", "maritime"],
                };

                const keywords = humidityKeywordMap[humidity] || [humidity.toLowerCase()];
                const hasHumidityMatch = keywords.some((kw) => combined.includes(kw));
                if (!hasHumidityMatch) {
                    return false;
                }
            }

            // 5. Temperature Qualitative Category Filter
            if (temperature !== "Any") {
                const climateText = (location.environment?.climate || "").toLowerCase();
                const tempCategoryMap = {
                    Freezing: ["polar", "extremely cold", "freezing", "ice"],
                    Cold: ["cold", "subarctic", "cool"],
                    Mild: ["mild", "temperate", "mediterranean", "moderate"],
                    Hot: ["hot", "hyper-arid", "extremely hot", "tropical"],
                };

                const keywords = tempCategoryMap[temperature] || [temperature.toLowerCase()];
                const hasTempCategoryMatch = keywords.some((kw) => climateText.includes(kw));
                if (!hasTempCategoryMatch) {
                    return false;
                }
            }

            // 6. Numeric Temperature Range Limit Filter (-60°C to 50°C)
            const siteTemp = getEstimatedTemperature(location);
            if (siteTemp < tempMin || siteTemp > tempMax) {
                return false;
            }

            return true;
        });
    }, [
        locData,
        searchQuery,
        targetBody,
        terrain,
        humidity,
        temperature,
        tempMin,
        tempMax,
        getEstimatedTemperature,
    ]);

    // ------------------------------------------------------------------------
    // 5. Synchronization Effects
    // ------------------------------------------------------------------------

    // Synchronize filtered locations with the global context on initial load
    useEffect(() => {
        if (locData && locData.length > 0) {
            const initialResults = computeFilteredLocations();
            setFilteredLoc(initialResults);
        }
    }, [locData, computeFilteredLocations, setFilteredLoc]);

    // ------------------------------------------------------------------------
    // 6. User Action Handlers
    // ------------------------------------------------------------------------

    /**
     * Executes filtering explicitly on Search button click or query change
     */
    const handleApplyFilters = () => {
        const results = computeFilteredLocations();
        setFilteredLoc(results);
    };

    /**
     * Resets all filter controls back to default Mars/Any parameters
     */
    const handleReset = () => {
        setSearchQuery("");
        setTargetBody("mars");
        setTerrain("Any");
        setHumidity("Any");
        setTemperature("Any");
        setTempMin(-50);
        setTempMax(40);

        // Restore candidate list with default Mars locations
        if (locData) {
            const defaultMarsList = locData.filter((loc) =>
                loc.analogType?.some((t) => t.toLowerCase() === "mars")
            );
            setFilteredLoc(defaultMarsList);
        }
        toast.info("Filters reset to default.");
    };

    /**
     * Pans and zooms the satellite map smoothly to the selected candidate site
     *
     * @param {Object} loc - Candidate location object with coordinates
     */
    const handleViewOnMap = (loc) => {
        if (loc?.coordinates?.latitude && loc?.coordinates?.longitude) {
            setMapTarget({
                latitude: loc.coordinates.latitude,
                longitude: loc.coordinates.longitude,
                zoom: 10,
            });
        }
    };

    /**
     * Saves a candidate planetary analog to the authenticated user's account
     *
     * @param {Object} location - Candidate location to bookmark
     */
    const handleSave = (location) => {
        const locationId = location._id || location.id || location.name;

        // Optimistically toggle saved status in local state
        setOptimisticSavedIds((prev) => {
            const updated = new Set(prev);
            updated.add(locationId);
            return updated;
        });

        if (!user?.email) {
            toast.success(`"${location.name}" bookmarked! (Sign in to sync across devices)`);
            return;
        }

        // Persist to MongoDB backend
        fetch(`${API_BASE_URL}/savedLocs`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                ...location,
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
                toast.error("Failed to save location");
            });
    };

    // ------------------------------------------------------------------------
    // 7. Styling Helpers for Segmented Controls & Pills
    // ------------------------------------------------------------------------

    /**
     * Generates button classes for filter pills matching Search.png:
     * - Active: `#203445` background with `#3b5e7a` border and white text
     * - Inactive: `#1b212a` background with `#2c3542` border and muted text
     *
     * @param {boolean} isSelected - Whether the pill is currently active
     * @returns {string} - Tailored Tailwind CSS classes
     */
    const getPillClass = (isSelected) =>
        `px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
            isSelected
                ? "bg-[#203445] border border-[#3b5e7a] text-white shadow-sm"
                : "bg-[#1b212a] border border-[#2c3542] text-slate-400 hover:text-white hover:bg-slate-800/60"
        }`;

    // Memoize the list of displayed results
    const displayedResults = useMemo(() => {
        return filteredLoc && filteredLoc.length > 0 ? filteredLoc : [];
    }, [filteredLoc]);

    // ------------------------------------------------------------------------
    // 8. Render
    // ------------------------------------------------------------------------
    return (
        <div className="w-full h-full flex flex-col bg-[#151a22] text-slate-200 select-none">
            {/* Panel Header: "Find a Match" and "Mock Data" Tag (pr-9 clears standardized toggle button) */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 shrink-0 pr-9">
                <h2 className="text-sm font-medium text-white tracking-tight">
                    Find a Match
                </h2>
                <span className="text-[10px] text-slate-500 font-mono">
                    Mock Data
                </span>
            </div>

            {/* Scrollable Filter Controls & Results Container */}
            <div className="space-y-3.5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                {/* ---------------------------------------------------------- */}
                {/* Section: LOCATION Text Input */}
                {/* ---------------------------------------------------------- */}
                <div>
                    <label className="block text-[10px] font-semibold tracking-wider text-slate-400 mb-1 uppercase">
                        Location
                    </label>
                    <div className="flex items-center gap-2 bg-[#1b212a] border border-[#2c3542] rounded-lg px-2.5 py-1.5 focus-within:border-slate-500 transition">
                        <Search size={14} className="text-slate-400 shrink-0" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                            placeholder="Search name or country..."
                            className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                        />
                    </div>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* Section: TARGET BODY Segmented Control (Moon vs. Mars) */}
                {/* ---------------------------------------------------------- */}
                <div>
                    <label className="block text-[10px] font-semibold tracking-wider text-slate-400 mb-1 uppercase">
                        Target Body
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#141920] border border-[#2c3542] rounded-lg">
                        {/* Moon Option */}
                        <button
                            type="button"
                            onClick={() => setTargetBody("moon")}
                            className={`py-1.5 text-xs font-medium rounded-md text-center transition cursor-pointer ${
                                targetBody === "moon"
                                    ? "bg-[#203445] border border-[#3b5e7a] text-white shadow-sm"
                                    : "bg-[#1b212a] border border-[#2c3542] text-slate-400 hover:text-white"
                            }`}
                        >
                            Moon
                        </button>

                        {/* Mars Option (Active in Search.png) */}
                        <button
                            type="button"
                            onClick={() => setTargetBody("mars")}
                            className={`py-1.5 text-xs font-medium rounded-md text-center transition cursor-pointer ${
                                targetBody === "mars"
                                    ? "bg-[#203445] border border-[#3b5e7a] text-white shadow-sm"
                                    : "bg-[#1b212a] border border-[#2c3542] text-slate-400 hover:text-white"
                            }`}
                        >
                            Mars
                        </button>
                    </div>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* Section: TERRAIN TYPE Pills */}
                {/* ---------------------------------------------------------- */}
                <div>
                    <label className="block text-[10px] font-semibold tracking-wider text-slate-400 mb-1 uppercase">
                        Terrain Type
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                        {["Any", "Rocky", "Sandy", "Icy", "Volcanic"].map((item) => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => setTerrain(item)}
                                className={getPillClass(terrain === item)}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* Section: HUMIDITY Pills with Explanatory Subtext */}
                {/* ---------------------------------------------------------- */}
                <div>
                    <label className="block text-[10px] font-semibold tracking-wider text-slate-400 mb-0.5 uppercase">
                        Humidity
                    </label>
                    <p className="text-[10px] text-slate-500 mb-1.5">
                        Describes the Earth site, not the Moon or Mars.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {["Any", "Very dry", "Dry", "Moderate", "Humid"].map((item) => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => setHumidity(item)}
                                className={getPillClass(humidity === item)}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* Section: TEMPERATURE Categories & Dual-Range Slider Box */}
                {/* ---------------------------------------------------------- */}
                <div>
                    <label className="block text-[10px] font-semibold tracking-wider text-slate-400 mb-1 uppercase">
                        Temperature
                    </label>

                    {/* Qualitative Category Pills: Any, Freezing, Cold, Mild, Hot */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {["Any", "Freezing", "Cold", "Mild", "Hot"].map((item) => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => setTemperature(item)}
                                className={getPillClass(temperature === item)}
                            >
                                {item}
                            </button>
                        ))}
                    </div>

                    {/* Contained Range Slider Box matching Search.png */}
                    <div className="border border-[#2c3542] rounded-lg p-3 bg-[#181e26] space-y-2">
                        {/* Top Indicator Row */}
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-[11px] text-slate-400 font-medium">
                                Range limit:
                            </span>
                            <span className="text-[11px] font-mono text-[#82a8bf] font-medium">
                                {tempMin}°C to {tempMax}°C
                            </span>
                        </div>

                        {/* Minimum Temperature Slider Row */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 w-7 shrink-0 font-medium">
                                Min
                            </span>
                            <input
                                type="range"
                                min="-60"
                                max="50"
                                value={tempMin}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    if (val <= tempMax) setTempMin(val);
                                }}
                                className="w-full accent-[#82a8bf] h-1.5 bg-[#1b212a] rounded cursor-pointer"
                            />
                        </div>

                        {/* Maximum Temperature Slider Row */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 w-7 shrink-0 font-medium">
                                Max
                            </span>
                            <input
                                type="range"
                                min="-60"
                                max="50"
                                value={tempMax}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    if (val >= tempMin) setTempMax(val);
                                }}
                                className="w-full accent-[#82a8bf] h-1.5 bg-[#1b212a] rounded cursor-pointer"
                            />
                        </div>

                        {/* Bottom Limit Markers (-60°C and 50°C) */}
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-0.5">
                            <span>-60°C</span>
                            <span>50°C</span>
                        </div>
                    </div>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* Section: ACTION BUTTONS (Search & Reset Filters) */}
                {/* ---------------------------------------------------------- */}
                <div className="flex items-center gap-2 pt-1">
                    {/* Primary Search Button with light-blue fill */}
                    <button
                        type="button"
                        onClick={handleApplyFilters}
                        className="flex-1 bg-[#82a8bf] hover:bg-[#97bad0] text-slate-900 font-semibold px-4 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                        <Search size={13} className="text-slate-900" />
                        <span>Search</span>
                    </button>

                    {/* Reset Button */}
                    <button
                        type="button"
                        onClick={handleReset}
                        className="bg-[#1b212a] border border-[#2c3542] text-xs text-slate-400 hover:text-white hover:bg-slate-800/60 px-3 py-2 rounded-lg transition cursor-pointer"
                    >
                        Reset filters
                    </button>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* Section: RESULTS List (${displayedResults.length}) */}
                {/* ---------------------------------------------------------- */}
                <div className="border-t border-slate-800/80 pt-3">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                            Results ({displayedResults.length})
                        </span>
                    </div>

                    {/* List of Result Location Cards */}
                    <div className="space-y-3">
                        {displayedResults.length > 0 ? (
                            displayedResults.map((location) => {
                                const locKey = location._id || location.id || location.name;
                                const isSaved = savedLocationIds.has(locKey);

                                return (
                                    <div
                                        key={locKey}
                                        className="bg-[#1e2530] border border-[#2c3542] rounded-xl p-3.5 transition duration-150 hover:border-slate-600/80 shadow-md"
                                    >
                                        {/* Card Top Row: Globe Icon, Name, Country & Score */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                {/* Square Icon Container */}
                                                <div className="w-8 h-8 rounded-lg bg-[#27313f] border border-slate-700/60 flex items-center justify-center text-slate-400 shrink-0">
                                                    <Globe size={16} />
                                                </div>

                                                {/* Location Name & Country */}
                                                <div className="min-w-0">
                                                    <h3 className="text-xs sm:text-sm font-semibold text-white truncate leading-tight">
                                                        {location.name}
                                                    </h3>
                                                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                                        {location.country}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Monospace Similarity Score */}
                                            <span className="font-mono text-xs text-slate-300 shrink-0 font-medium">
                                                {location.similarityScore}%
                                            </span>
                                        </div>

                                        {/* Card Bottom Row: View on Map & Saved Indicator */}
                                        <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5 mt-2.5 text-xs">
                                            {/* View on Map Button */}
                                            <button
                                                type="button"
                                                onClick={() => handleViewOnMap(location)}
                                                className="flex items-center gap-1.5 text-slate-400 hover:text-white transition duration-150 cursor-pointer"
                                            >
                                                <MapPin size={13} className="text-slate-400" />
                                                <span>View on map</span>
                                            </button>

                                            {/* Saved Button / Status */}
                                            <button
                                                type="button"
                                                onClick={() => handleSave(location)}
                                                className="flex items-center gap-1 text-slate-300 hover:text-white transition duration-150 cursor-pointer"
                                            >
                                                <Check size={13} className={isSaved ? "text-emerald-400" : "text-slate-300"} />
                                                <span>{isSaved ? "Saved" : "Save"}</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs">
                                No candidate analog sites match the current filter criteria. Try adjusting the parameters or resetting filters.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Tweaks;
