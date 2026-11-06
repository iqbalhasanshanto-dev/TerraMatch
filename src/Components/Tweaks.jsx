import { useState, useEffect, useContext, useMemo, useCallback } from "react";
import { Search, Globe, MapPin, Check } from "lucide-react";
import useLocations from "../Hooks/useLocations";
import useSaved from "../Hooks/useSaved";
import useRecent from "../Hooks/useRecent";
import StateContext from "../States/StateContext";
import useAuth from "../Hooks/useAuth";
import { toast } from "react-toastify";
import { API_BASE_URL } from "../utils/api";

/**
 * ============================================================================
 * Tweaks Component ("Find a Match" Planetary Analog Filter Panel)
 * ============================================================================
 * Search and multi-variable filtering panel for planetary analog candidates:
 * - 100% dynamic MongoDB connection displaying "{locData.length} Sites Live"
 * - Automatically registers recent searches to MongoDB when user clicks "Search" or "View on map"
 * - Instant bookmarking via POST /savedLocs with immediate state synchronization
 * - Full deep-space theme styling with custom slider indicators and segmented controls
 */
const Tweaks = () => {
    // ------------------------------------------------------------------------
    // 1. Contexts, Custom Hooks & Global State Subscriptions
    // ------------------------------------------------------------------------
    // Real catalog locations fetched from MongoDB Location collection
    const { locData } = useLocations();
    // Filtered locations array and map camera positioning context
    const { filteredLoc, setFilteredLoc, setMapTarget } = useContext(StateContext);
    // User authentication state for associating database entries
    const { user } = useAuth();
    // Saved locations hook providing user bookmarks and refetch function
    const { savedLoc, setSavedLoc, refetchSaved } = useSaved();
    // Recent searches hook providing refetch trigger for real-time sidebar updates
    const { refetchRecent } = useRecent();

    // ------------------------------------------------------------------------
    // 2. Filter State Variables
    // ------------------------------------------------------------------------
    // Text search query matching location name or country
    const [searchQuery, setSearchQuery] = useState("");
    // Target planetary body filter ("mars", "moon", or "Any")
    const [targetBody, setTargetBody] = useState("mars");
    // Qualitative terrain classification filter ("Any", "Rocky", "Sandy", etc.)
    const [terrain, setTerrain] = useState("Any");
    // Earth humidity regime filter ("Any", "Very dry", "Dry", "Moderate", "Humid")
    const [humidity, setHumidity] = useState("Any");
    // Qualitative temperature category filter ("Any", "Freezing", "Cold", etc.)
    const [temperature, setTemperature] = useState("Any");
    // Numeric minimum temperature limit slider (-60°C to 50°C)
    const [tempMin, setTempMin] = useState(-50);
    // Numeric maximum temperature limit slider (-60°C to 50°C)
    const [tempMax, setTempMax] = useState(40);
    // Optimistic set of bookmarked IDs to give instant UI feedback on save
    const [optimisticSavedIds, setOptimisticSavedIds] = useState(() => new Set());

    // Merged set of saved IDs derived from backend data and optimistic additions
    const savedLocationIds = useMemo(() => {
        const set = new Set(optimisticSavedIds);
        if (savedLoc && savedLoc.length > 0) {
            savedLoc.forEach((item) => {
                const key = item._id || item.id || item.name;
                set.add(key);
            });
        }
        return set;
    }, [savedLoc, optimisticSavedIds]);

    // ------------------------------------------------------------------------
    // 3. Helper: Estimated Site Temperature Derivation
    // ------------------------------------------------------------------------
    // Calculates a representative surface temperature based on site metadata
    const getEstimatedTemperature = useCallback((location) => {
        if (typeof location.temperature === "number") {
            return location.temperature;
        }

        const climate = (location.environment?.climate || "").toLowerCase();
        const lat = Math.abs(location.coordinates?.latitude || 0);

        if (climate.includes("polar") || climate.includes("extremely cold") || lat > 70) {
            return -35;
        }
        if (climate.includes("cold") || climate.includes("subarctic") || lat > 55) {
            return -5;
        }
        if (climate.includes("temperate") || climate.includes("mediterranean") || climate.includes("cool")) {
            return 16;
        }
        if (climate.includes("hot") || climate.includes("hyper-arid") || climate.includes("extremely hot")) {
            return 32;
        }
        return 20;
    }, []);

    // ------------------------------------------------------------------------
    // 4. Multi-Variable Filtering Logic
    // ------------------------------------------------------------------------
    // Filters all MongoDB candidate locations according to active search parameters
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
    // Sync initial filtered locations when MongoDB locations first load
    useEffect(() => {
        if (locData && locData.length > 0) {
            const initialResults = computeFilteredLocations();
            setFilteredLoc(initialResults);
        }
    }, [locData, computeFilteredLocations, setFilteredLoc]);

    // ------------------------------------------------------------------------
    // 6. Natural Recent Search Logging Handler
    // ------------------------------------------------------------------------
    // Automatically posts explored analog locations to MongoDB RecentSearches collection
    const recordRecentSearch = useCallback(
        async (loc) => {
            if (!user?.email || !loc) return;

            try {
                // Prepare clean payload without internal _id to avoid duplicate key errors
                const payload = {
                    locationId: loc._id || loc.id,
                    name: loc.name,
                    country: loc.country,
                    similarityScore: loc.similarityScore || 85,
                    coordinates: loc.coordinates,
                    analogType: loc.analogType || ["mars"],
                    environment: loc.environment,
                    terrain: loc.terrain,
                    created_at: new Date(),
                    created_by: user.email,
                };

                await fetch(`${API_BASE_URL}/recent-searches`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                });

                // Trigger sidebar refresh so recent searches populate dynamically
                refetchRecent?.();
            } catch (err) {
                console.error("Failed to record recent search in MongoDB:", err);
            }
        },
        [user, refetchRecent]
    );

    // ------------------------------------------------------------------------
    // 7. User Action Handlers
    // ------------------------------------------------------------------------
    // Triggered when user clicks "Search" or presses Enter
    const handleApplyFilters = () => {
        const results = computeFilteredLocations();
        setFilteredLoc(results);

        // If logged in and search yielded matches, record top match to recent searches
        if (user?.email && results.length > 0) {
            recordRecentSearch(results[0]);
        }
    };

    // Resets all filters back to default Mars baseline
    const handleReset = () => {
        setSearchQuery("");
        setTargetBody("mars");
        setTerrain("Any");
        setHumidity("Any");
        setTemperature("Any");
        setTempMin(-50);
        setTempMax(40);

        if (locData) {
            const defaultMarsList = locData.filter((loc) =>
                loc.analogType?.some((t) => t.toLowerCase() === "mars")
            );
            setFilteredLoc(defaultMarsList);
        }
        toast.info("Filters reset to default.");
    };

    // Centers map camera on candidate coordinates and logs to MongoDB recent searches
    const handleViewOnMap = (loc) => {
        if (loc?.coordinates?.latitude && loc?.coordinates?.longitude) {
            setMapTarget({
                latitude: loc.coordinates.latitude,
                longitude: loc.coordinates.longitude,
                zoom: 10,
            });
        }

        // Record location to user's MongoDB recent search history
        if (user?.email && loc) {
            recordRecentSearch(loc);
        }
    };

    // Bookmarks location to user's MongoDB Saved collection and synchronizes state
    const handleSave = (location) => {
        const locationId = location._id || location.id || location.name;

        // Optimistically record ID in set for instant checkmark appearance
        setOptimisticSavedIds((prev) => {
            const updated = new Set(prev);
            updated.add(locationId);
            return updated;
        });

        if (!user?.email) {
            toast.success(`"${location.name}" bookmarked! (Sign in to sync across devices)`);
            return;
        }

        // Optimistically update savedLoc list in useSaved hook
        if (setSavedLoc) {
            setSavedLoc((prev) => {
                if (prev.some((s) => (s._id || s.id || s.name) === locationId)) return prev;
                return [
                    {
                        ...location,
                        locationId,
                        created_at: new Date(),
                        created_by: user.email,
                    },
                    ...prev,
                ];
            });
        }

        // Persist to MongoDB Saved collection via backend endpoint
        fetch(`${API_BASE_URL}/savedLocs`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                ...location,
                locationId,
                created_at: new Date(),
                created_by: user.email,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    toast.success("Location saved to your profile!");
                    // Refetch from MongoDB to ensure state parity
                    refetchSaved?.();
                }
            })
            .catch((err) => {
                console.error("Save error:", err);
                toast.error("Failed to save location");
            });
    };

    // ------------------------------------------------------------------------
    // 8. Styling Helpers for Pills & Segmented Controls
    // ------------------------------------------------------------------------
    const getPillClass = (isSelected) =>
        `px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
            isSelected
                ? "bg-[#1E2129] border border-[#83CAD8] text-[#F1EEE9] shadow-sm"
                : "bg-[#181A21] border border-[#21242C] text-[#8891A0] hover:text-[#F1EEE9] hover:bg-[#1E2129]"
        }`;

    const displayedResults = useMemo(() => {
        return filteredLoc && filteredLoc.length > 0 ? filteredLoc : [];
    }, [filteredLoc]);

    // ------------------------------------------------------------------------
    // 9. Render
    // ------------------------------------------------------------------------
    return (
        <div className="w-full h-full flex flex-col bg-[#0B0E13] text-[#F1EEE9] select-none">
            {/* Panel Header: "Find a Match" and Live Sites Count */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#21242C] shrink-0 pr-9">
                <h2 className="text-sm font-medium text-[#F1EEE9] tracking-tight">
                    Find a Match
                </h2>
                {/* Replaced static mock label with dynamic MongoDB sites count */}
                <span className="text-[10px] text-[#83CAD8] font-mono font-medium">
                    {locData.length} Sites Live
                </span>
            </div>

            {/* Scrollable Filter Controls & Results Container */}
            <div className="space-y-3.5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                {/* ---------------------------------------------------------- */}
                {/* Section: LOCATION Text Input                               */}
                {/* ---------------------------------------------------------- */}
                <div>
                    <label className="block text-[10px] font-semibold tracking-wider text-[#8891A0] mb-1 uppercase">
                        Location
                    </label>
                    <div className="flex items-center gap-2 bg-[#181A21] border border-[#272C34] rounded-lg px-2.5 py-1.5 focus-within:border-[#83CAD8] transition">
                        <Search size={14} className="text-[#8891A0] shrink-0" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                            placeholder="Search name or country..."
                            className="w-full bg-transparent text-xs text-[#F1EEE9] placeholder-[#8891A0] focus:outline-none"
                        />
                    </div>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* Section: TARGET BODY Segmented Control (Moon vs. Mars)     */}
                {/* ---------------------------------------------------------- */}
                <div>
                    <label className="block text-[10px] font-semibold tracking-wider text-[#8891A0] mb-1 uppercase">
                        Target Body
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#07090E] border border-[#272C34] rounded-lg">
                        {/* Moon Option */}
                        <button
                            type="button"
                            onClick={() => setTargetBody("moon")}
                            className={`py-1.5 text-xs font-medium rounded-md text-center transition cursor-pointer ${
                                targetBody === "moon"
                                    ? "bg-[#1E2129] border border-[#83CAD8] text-[#F1EEE9] shadow-sm"
                                    : "bg-[#181A21] border border-[#21242C] text-[#8891A0] hover:text-[#F1EEE9]"
                            }`}
                        >
                            Moon
                        </button>

                        {/* Mars Option */}
                        <button
                            type="button"
                            onClick={() => setTargetBody("mars")}
                            className={`py-1.5 text-xs font-medium rounded-md text-center transition cursor-pointer ${
                                targetBody === "mars"
                                    ? "bg-[#1E2129] border border-[#83CAD8] text-[#F1EEE9] shadow-sm"
                                    : "bg-[#181A21] border border-[#21242C] text-[#8891A0] hover:text-[#F1EEE9]"
                            }`}
                        >
                            Mars
                        </button>
                    </div>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* Section: TERRAIN TYPE Pills                                */}
                {/* ---------------------------------------------------------- */}
                <div>
                    <label className="block text-[10px] font-semibold tracking-wider text-[#8891A0] mb-1 uppercase">
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
                {/* Section: HUMIDITY Pills with Explanatory Subtext           */}
                {/* ---------------------------------------------------------- */}
                <div>
                    <label className="block text-[10px] font-semibold tracking-wider text-[#8891A0] mb-0.5 uppercase">
                        Humidity
                    </label>
                    <p className="text-[10px] text-[#8891A0] mb-1.5">
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
                {/* Section: TEMPERATURE Categories & Dual-Range Slider Box    */}
                {/* ---------------------------------------------------------- */}
                <div>
                    <label className="block text-[10px] font-semibold tracking-wider text-[#8891A0] mb-1 uppercase">
                        Temperature
                    </label>

                    {/* Qualitative Category Pills */}
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

                    {/* Contained Range Slider Box */}
                    <div className="border border-[#272C34] rounded-lg p-3 bg-[#181A21] space-y-2">
                        {/* Top Indicator Row */}
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-[11px] text-[#8891A0] font-medium">
                                Range limit:
                            </span>
                            <span className="text-[11px] font-mono text-[#83CAD8] font-medium">
                                {tempMin}°C to {tempMax}°C
                            </span>
                        </div>

                        {/* Minimum Slider Row */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#8891A0] w-7 shrink-0 font-medium">
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
                                className="w-full accent-[#83CAD8] h-1.5 bg-[#07090E] rounded cursor-pointer"
                            />
                        </div>

                        {/* Maximum Slider Row */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#8891A0] w-7 shrink-0 font-medium">
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
                                className="w-full accent-[#83CAD8] h-1.5 bg-[#07090E] rounded cursor-pointer"
                            />
                        </div>

                        {/* Bottom Limit Markers */}
                        <div className="flex justify-between text-[10px] text-[#8891A0] font-mono pt-0.5">
                            <span>-60°C</span>
                            <span>50°C</span>
                        </div>
                    </div>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* Section: ACTION BUTTONS (Search & Reset Filters)           */}
                {/* ---------------------------------------------------------- */}
                <div className="flex items-center gap-2 pt-1">
                    {/* Primary Search Button */}
                    <button
                        type="button"
                        onClick={handleApplyFilters}
                        className="flex-1 bg-[#83CAD8] hover:opacity-90 text-[#090D15] font-semibold px-4 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                        <Search size={13} className="text-[#090D15]" />
                        <span>Search</span>
                    </button>

                    {/* Reset Button */}
                    <button
                        type="button"
                        onClick={handleReset}
                        className="bg-[#181A21] border border-[#21242C] text-xs text-[#8891A0] hover:text-[#F1EEE9] hover:bg-[#1E2129] px-3 py-2 rounded-lg transition cursor-pointer"
                    >
                        Reset filters
                    </button>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* Section: RESULTS List (${displayedResults.length})         */}
                {/* ---------------------------------------------------------- */}
                <div className="border-t border-[#21242C] pt-3">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-semibold tracking-wider text-[#8891A0] uppercase">
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
                                        className="bg-[#181A21] border border-[#21242C] rounded-xl p-3.5 transition duration-150 hover:border-[#83CAD8]/50 shadow-md"
                                    >
                                        {/* Card Top Row: Icon, Name, Country & Score */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-[#1A1D23] border border-[#21242C] flex items-center justify-center text-[#8891A0] shrink-0">
                                                    <Globe size={16} />
                                                </div>

                                                <div className="min-w-0">
                                                    <h3 className="text-xs sm:text-sm font-semibold text-[#F1EEE9] truncate leading-tight">
                                                        {location.name}
                                                    </h3>
                                                    <p className="text-[11px] text-[#8891A0] truncate mt-0.5">
                                                        {location.country}
                                                    </p>
                                                </div>
                                            </div>

                                            <span className="font-mono text-xs text-[#83CAD8] shrink-0 font-medium">
                                                {location.similarityScore}%
                                            </span>
                                        </div>

                                        {/* Card Bottom Row: View on Map & Saved Indicator */}
                                        <div className="flex items-center justify-between border-t border-[#21242C] pt-2.5 mt-2.5 text-xs">
                                            <button
                                                type="button"
                                                onClick={() => handleViewOnMap(location)}
                                                className="flex items-center gap-1.5 text-[#8891A0] hover:text-[#F1EEE9] transition duration-150 cursor-pointer"
                                            >
                                                <MapPin size={13} className="text-[#8891A0]" />
                                                <span>View on map</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleSave(location)}
                                                className="flex items-center gap-1 text-[#8891A0] hover:text-[#83CAD8] transition duration-150 cursor-pointer"
                                            >
                                                <Check
                                                    size={13}
                                                    className={isSaved ? "text-[#83CAD8]" : "text-[#8891A0]"}
                                                />
                                                <span className={isSaved ? "text-[#83CAD8] font-medium" : ""}>
                                                    {isSaved ? "Saved" : "Save"}
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-8 px-4 rounded-xl border border-dashed border-[#21242C] text-[#8891A0] text-xs">
                                No candidate analog sites match the current filter criteria. Try adjusting parameters or resetting filters.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Tweaks;
