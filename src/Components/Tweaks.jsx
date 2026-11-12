import { useState, useEffect, useContext, useMemo, useCallback } from "react";
import {
    Search,
    Globe,
    MapPin,
    Check,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
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
 * Interactive search and multi-variable filtering panel for planetary analog sites:
 * - Connects dynamically to MongoDB / static fallback via `useLocations()`
 *   displaying `"{locData.length} Sites Live"`.
 * - Records explored/searched sites into centralized Recent Searches via
 *   `StateContext.recordRecentSearch` (MongoDB + `localStorage` mirror).
 * - Entire result cards (as well as "View on map") are clickable to fly/zoom
 *   the map to the selected target, open its popup, record it in Recent Searches,
 *   and auto-collapse the mobile sidebar via `onSelectLocation`.
 * - Bookmark ("Save") button uses `e.stopPropagation()` so saving does not
 *   trigger card navigation or close the mobile drawer.
 */
const Tweaks = ({ onSelectLocation }) => {
    // ------------------------------------------------------------------------
    // 1. Contexts, Custom Hooks & Global State Subscriptions
    // ------------------------------------------------------------------------
    // Full catalog of planetary analog locations (MongoDB with static JSON fallback)
    const { locData } = useLocations();

    // Global filtered locations, map fly-to target, and centralized recent-search logger
    const { filteredLoc, setFilteredLoc, setMapTarget, recordRecentSearch } =
        useContext(StateContext);

    // Current Firebase user session for database bookmarking
    const { user } = useAuth();

    // User's saved bookmarks hook for live Saved state indicators
    const { savedLoc, setSavedLoc, refetchSaved } = useSaved();

    // ------------------------------------------------------------------------
    // 2. Filter Control State Variables
    // ------------------------------------------------------------------------
    // Free-text search query matching site name or country
    const [searchQuery, setSearchQuery] = useState("");

    // Target planetary body selector ("", "moon", or "mars" — unselected by default)
    const [targetBody, setTargetBody] = useState("");

    // Qualitative terrain category filter ("Any", "Rocky", "Sandy", "Icy", "Volcanic")
    const [terrain, setTerrain] = useState("Any");

    // Earth site humidity regime filter ("Any", "Very dry", "Dry", "Moderate", "Humid")
    const [humidity, setHumidity] = useState("Any");

    // Qualitative climate/temperature tier filter ("Any", "Freezing", "Cold", "Mild", "Hot")
    const [temperature, setTemperature] = useState("Any");

    // Numeric minimum surface temperature bound slider (-60°C to 50°C)
    const [tempMin, setTempMin] = useState(-50);

    // Numeric maximum surface temperature bound slider (-60°C to 50°C)
    const [tempMax, setTempMax] = useState(40);

    // Controls visibility of the collapsible full analog sites directory dropdown
    const [showAllSitesCatalog, setShowAllSitesCatalog] = useState(false);

    // Tracks whether the user has explicitly submitted a search/filter query yet
    const [hasSearched, setHasSearched] = useState(false);

    // Optimistic set of bookmarked location keys for instantaneous "Saved" feedback
    const [optimisticSavedIds, setOptimisticSavedIds] = useState(() => new Set());

    // ------------------------------------------------------------------------
    // 3. Derived Saved Location Keys Lookup Set
    // ------------------------------------------------------------------------
    // Combines persisted MongoDB bookmarks and optimistic local saves into one fast lookup Set
    const savedLocationIds = useMemo(() => {
        const set = new Set(optimisticSavedIds);
        if (savedLoc && savedLoc.length > 0) {
            savedLoc.forEach((item) => {
                const keys = [item._id, item.locationId, item.id, item.name].filter(Boolean);
                keys.forEach((key) => set.add(key));
            });
        }
        return set;
    }, [savedLoc, optimisticSavedIds]);

    // ------------------------------------------------------------------------
    // 4. Helper Function: Estimated Surface Temperature Derivation
    // ------------------------------------------------------------------------
    /**
     * Derives an estimated representative temperature (°C) for sites that store
     * qualitative climate descriptions instead of an explicit numeric `temperature`.
     */
    const getEstimatedTemperature = useCallback((location) => {
        if (typeof location.temperature === "number") {
            return location.temperature;
        }

        const climate = (location.environment?.climate || "").toLowerCase();
        const lat = Math.abs(location.coordinates?.latitude || 0);

        if (
            climate.includes("polar") ||
            climate.includes("extremely cold") ||
            lat > 70
        ) {
            return -35;
        }
        if (climate.includes("cold") || climate.includes("subarctic") || lat > 55) {
            return -5;
        }
        if (
            climate.includes("temperate") ||
            climate.includes("mediterranean") ||
            climate.includes("cool")
        ) {
            return 16;
        }
        if (
            climate.includes("hot") ||
            climate.includes("hyper-arid") ||
            climate.includes("extremely hot")
        ) {
            return 32;
        }
        return 20;
    }, []);

    // ------------------------------------------------------------------------
    // 5. Helper Function: Multi-Variable Analog Site Filtering Engine
    // ------------------------------------------------------------------------
    /**
     * Evaluates all candidate locations against the active search text, target body,
     * terrain tags, humidity class, temperature class, and numeric temperature range.
     */
    const computeFilteredLocations = useCallback(() => {
        if (!locData || locData.length === 0) return [];

        return locData.filter((location) => {
            // Filter 1: Case-insensitive name or country text match
            if (searchQuery.trim()) {
                const query = searchQuery.trim().toLowerCase();
                const nameMatch = location.name?.toLowerCase().includes(query);
                const countryMatch = location.country?.toLowerCase().includes(query);
                if (!nameMatch && !countryMatch) {
                    return false;
                }
            }

            // Filter 2: Target extraterrestrial body ("moon" or "mars" when explicitly selected)
            if (targetBody !== "" && targetBody !== "Any") {
                const hasAnalogMatch = location.analogType?.some(
                    (type) => type.toLowerCase() === targetBody.toLowerCase()
                );
                if (!hasAnalogMatch) {
                    return false;
                }
            }

            // Filter 3: Geological terrain keyword match
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

            // Filter 4: Terrestrial humidity classification match
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

            // Filter 5: Qualitative temperature tier match
            if (temperature !== "Any") {
                const climateText = (location.environment?.climate || "").toLowerCase();
                const tempCategoryMap = {
                    Freezing: ["polar", "extremely cold", "freezing", "ice"],
                    Cold: ["cold", "subarctic", "cool"],
                    Mild: ["mild", "temperate", "mediterranean", "moderate"],
                    Hot: ["hot", "hyper-arid", "extremely hot", "tropical"],
                };

                const keywords = tempCategoryMap[temperature] || [
                    temperature.toLowerCase(),
                ];
                const hasTempCategoryMatch = keywords.some((kw) =>
                    climateText.includes(kw)
                );
                if (!hasTempCategoryMatch) {
                    return false;
                }
            }

            // Filter 6: Numeric temperature range bounds (-60°C to 50°C)
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
    // 6. Synchronization Effect: Show All Markers Until a Search Is Submitted
    // ------------------------------------------------------------------------
    useEffect(() => {
        // Keep all 50 analog pins visible on the map on initial load / after reset
        if (locData && locData.length > 0 && !hasSearched) {
            setFilteredLoc(locData);
        }
    }, [locData, hasSearched, setFilteredLoc]);

    // ------------------------------------------------------------------------
    // 7. User Action Handlers (Search, Reset, Card/Map Focus, Save)
    // ------------------------------------------------------------------------
    /**
     * Applies current filter parameters, reveals the matching Results section,
     * updates map pins, and logs the top matching site to Recent Searches.
     */
    const handleApplyFilters = () => {
        const results = computeFilteredLocations();
        setHasSearched(true);
        setFilteredLoc(results);

        // Log the top match to Recent Searches (works locally with MongoDB and on static hosts)
        if (results.length > 0) {
            recordRecentSearch?.(results[0]);
        }
    };

    /**
     * Restores all search criteria back to neutral defaults ("Any" / unselected),
     * hides the results list, and restores all 50 markers on the map.
     */
    const handleReset = () => {
        setSearchQuery("");
        setTargetBody("");
        setTerrain("Any");
        setHumidity("Any");
        setTemperature("Any");
        setTempMin(-50);
        setTempMax(40);
        setHasSearched(false);

        if (locData) {
            setFilteredLoc(locData);
        }
        toast.info("Filters reset to default.");
    };

    /**
     * Handles clicking a location card, catalog row, or "View on map":
     * 1. Records the location at the top of Recent Searches.
     * 2. Updates `mapTarget` with a fresh timestamp so Map flies/zooms smoothly
     *    and opens the corresponding marker popup even on repeat clicks.
     * 3. Closes the All Sites catalog dropdown and collapses the mobile drawer.
     */
    const handleViewOnMap = useCallback(
        (loc) => {
            if (!loc) return;

            // Immediately record this location in centralized Recent Searches
            recordRecentSearch?.(loc);

            // Dispatch smooth fly-to zoom & auto-open popup target to Map component
            if (
                typeof loc?.coordinates?.latitude === "number" &&
                typeof loc?.coordinates?.longitude === "number"
            ) {
                setMapTarget({
                    latitude: loc.coordinates.latitude,
                    longitude: loc.coordinates.longitude,
                    zoom: 11,
                    locationId: loc._id || loc.id,
                    name: loc.name,
                    timestamp: Date.now(),
                });
            }

            // Close the collapsible catalog dropdown when a site is chosen
            setShowAllSitesCatalog(false);

            // Collapse mobile drawer if callback is provided by RightDashboard
            onSelectLocation?.(loc);
        },
        [recordRecentSearch, setMapTarget, onSelectLocation]
    );

    /**
     * Bookmarks a location optimistically and persists it to MongoDB `/savedLocs`
     * when the user is signed in.
     */
    const handleSave = (location) => {
        const locationId = location._id || location.id || location.name;

        // Optimistically add key so the card immediately renders "Saved"
        setOptimisticSavedIds((prev) => {
            const updated = new Set(prev);
            updated.add(locationId);
            return updated;
        });

        if (!user?.email) {
            toast.success(
                `"${location.name}" bookmarked! (Sign in to sync across devices)`
            );
            return;
        }

        // Optimistically prepend to useSaved hook state
        if (setSavedLoc) {
            setSavedLoc((prev) => {
                if (
                    prev.some(
                        (s) => (s._id || s.locationId || s.id || s.name) === locationId
                    )
                ) {
                    return prev;
                }
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

        // Persist bookmark to MongoDB Saved collection
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
                    refetchSaved?.();
                }
            })
            .catch((err) => {
                console.error("Save error:", err);
                toast.error("Failed to save location");
            });
    };

    // ------------------------------------------------------------------------
    // 8. Styling Helpers & Memoized Results List
    // ------------------------------------------------------------------------
    /**
     * Returns deep-space pill styling classes based on active selection state.
     */
    const getPillClass = (isSelected) =>
        `px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
            isSelected
                ? "bg-[#1E2129] border border-[#83CAD8] text-[#F1EEE9] shadow-sm"
                : "bg-[#181A21] border border-[#21242C] text-[#8891A0] hover:text-[#F1EEE9] hover:bg-[#1E2129]"
        }`;

    // Memoized list of active result cards to render
    const displayedResults = useMemo(() => {
        return filteredLoc && filteredLoc.length > 0 ? filteredLoc : [];
    }, [filteredLoc]);

    // ------------------------------------------------------------------------
    // 9. Component Render Block
    // ------------------------------------------------------------------------
    return (
        <div className="w-full h-full flex flex-col bg-[#0B0E13] text-[#F1EEE9] select-none">
            {/* Panel Header: Title and Interactive All-Sites Directory Toggle */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#21242C] shrink-0 pr-10">
                <h2 className="text-sm font-medium text-[#F1EEE9] tracking-tight">
                    Find a Match
                </h2>

                {/* Toggle button opening/closing the full analog catalog directory */}
                <button
                    type="button"
                    onClick={() => setShowAllSitesCatalog((prev) => !prev)}
                    aria-expanded={showAllSitesCatalog}
                    aria-controls="tweaks-all-sites-catalog"
                    className="px-2 py-1 rounded-md bg-[#181A21] border border-[#21242C] hover:border-[#83CAD8] text-[10px] text-[#83CAD8] font-mono font-medium flex items-center gap-1 cursor-pointer transition"
                >
                    <span>{locData.length} Sites Live</span>
                    {showAllSitesCatalog ? (
                        <ChevronUp size={12} aria-hidden="true" />
                    ) : (
                        <ChevronDown size={12} aria-hidden="true" />
                    )}
                </button>
            </div>

            {/* -------------------------------------------------------------- */}
            {/* Collapsible Directory Panel: All Planetary Analog Sites        */}
            {/* -------------------------------------------------------------- */}
            {showAllSitesCatalog && (
                <div
                    id="tweaks-all-sites-catalog"
                    className="mb-3 bg-[#07090E] border border-[#21242C] rounded-xl p-2.5 shrink-0"
                >
                    <div className="flex items-center justify-between mb-2 px-0.5">
                        <span className="text-[10px] font-semibold tracking-wider text-[#8891A0] uppercase">
                            All Planetary Analog Sites ({locData.length})
                        </span>
                        <span className="text-[10px] text-[#83CAD8] font-mono">
                            Select site
                        </span>
                    </div>

                    {/* Scrollable list of compact clickable site directory cards */}
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                        {locData.map((location) => {
                            const catalogKey =
                                location._id || location.id || location.name;
                            return (
                                <button
                                    key={catalogKey}
                                    type="button"
                                    onClick={() => handleViewOnMap(location)}
                                    className="w-full text-left bg-[#181A21] border border-[#21242C] hover:border-[#83CAD8]/60 rounded-lg p-2.5 flex items-center justify-between gap-2 cursor-pointer transition"
                                >
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-[#F1EEE9] truncate leading-tight">
                                            {location.name}
                                        </p>
                                        <p className="text-[10px] text-[#8891A0] truncate mt-0.5">
                                            {location.country}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {typeof location.similarityScore === "number" && (
                                            <span className="font-mono text-[10px] text-[#83CAD8]">
                                                {location.similarityScore}%
                                            </span>
                                        )}
                                        <MapPin
                                            size={12}
                                            aria-hidden="true"
                                            className="text-[#8891A0]"
                                        />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Scrollable Search Filters & Results Container */}
            <div className="space-y-3.5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                {/* ---------------------------------------------------------- */}
                {/* Filter Section: LOCATION Text Search Input                 */}
                {/* ---------------------------------------------------------- */}
                <div>
                    <label
                        htmlFor="tweaks-location-search"
                        className="block text-[10px] font-semibold tracking-wider text-[#8891A0] mb-1 uppercase"
                    >
                        Location
                    </label>
                    <div className="flex items-center gap-2 bg-[#181A21] border border-[#272C34] rounded-lg px-2.5 py-1.5 focus-within:border-[#83CAD8] transition">
                        <Search
                            size={14}
                            aria-hidden="true"
                            className="text-[#8891A0] shrink-0"
                        />
                        <input
                            id="tweaks-location-search"
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
                {/* Filter Section: TARGET BODY Segmented Control (Moon/Mars)  */}
                {/* ---------------------------------------------------------- */}
                <div>
                    <span className="block text-[10px] font-semibold tracking-wider text-[#8891A0] mb-1 uppercase">
                        Target Body
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#07090E] border border-[#272C34] rounded-lg">
                        {/* Moon Toggle Button (re-clicking deselects back to "") */}
                        <button
                            type="button"
                            onClick={() =>
                                setTargetBody((prev) => (prev === "moon" ? "" : "moon"))
                            }
                            aria-pressed={targetBody === "moon"}
                            className={`py-1.5 text-xs font-medium rounded-md text-center transition cursor-pointer ${
                                targetBody === "moon"
                                    ? "bg-[#1E2129] border border-[#83CAD8] text-[#F1EEE9] shadow-sm"
                                    : "bg-[#181A21] border border-[#21242C] text-[#8891A0] hover:text-[#F1EEE9]"
                            }`}
                        >
                            Moon
                        </button>

                        {/* Mars Toggle Button (re-clicking deselects back to "") */}
                        <button
                            type="button"
                            onClick={() =>
                                setTargetBody((prev) => (prev === "mars" ? "" : "mars"))
                            }
                            aria-pressed={targetBody === "mars"}
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
                {/* Filter Section: TERRAIN TYPE Pill Selector                 */}
                {/* ---------------------------------------------------------- */}
                <div>
                    <span className="block text-[10px] font-semibold tracking-wider text-[#8891A0] mb-1 uppercase">
                        Terrain Type
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                        {["Any", "Rocky", "Sandy", "Icy", "Volcanic"].map((item) => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => setTerrain(item)}
                                aria-pressed={terrain === item}
                                className={getPillClass(terrain === item)}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* Filter Section: HUMIDITY Pill Selector                     */}
                {/* ---------------------------------------------------------- */}
                <div>
                    <span className="block text-[10px] font-semibold tracking-wider text-[#8891A0] mb-0.5 uppercase">
                        Humidity
                    </span>
                    <p className="text-[10px] text-[#8891A0] mb-1.5">
                        Describes the Earth site, not the Moon or Mars.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {["Any", "Very dry", "Dry", "Moderate", "Humid"].map((item) => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => setHumidity(item)}
                                aria-pressed={humidity === item}
                                className={getPillClass(humidity === item)}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* Filter Section: TEMPERATURE Tiers & Numeric Range Sliders  */}
                {/* ---------------------------------------------------------- */}
                <div>
                    <span className="block text-[10px] font-semibold tracking-wider text-[#8891A0] mb-1 uppercase">
                        Temperature
                    </span>

                    {/* Qualitative Category Pills */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {["Any", "Freezing", "Cold", "Mild", "Hot"].map((item) => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => setTemperature(item)}
                                aria-pressed={temperature === item}
                                className={getPillClass(temperature === item)}
                            >
                                {item}
                            </button>
                        ))}
                    </div>

                    {/* Numeric Min/Max Temperature Range Slider Card */}
                    <div className="border border-[#272C34] rounded-lg p-3 bg-[#181A21] space-y-2">
                        {/* Range Summary Header */}
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-[11px] text-[#8891A0] font-medium">
                                Range limit:
                            </span>
                            <span className="text-[11px] font-mono text-[#83CAD8] font-medium">
                                {tempMin}°C to {tempMax}°C
                            </span>
                        </div>

                        {/* Minimum Bound Range Slider */}
                        <div className="flex items-center gap-2">
                            <label
                                htmlFor="tweaks-temp-min"
                                className="text-[10px] text-[#8891A0] w-7 shrink-0 font-medium"
                            >
                                Min
                            </label>
                            <input
                                id="tweaks-temp-min"
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

                        {/* Maximum Bound Range Slider */}
                        <div className="flex items-center gap-2">
                            <label
                                htmlFor="tweaks-temp-max"
                                className="text-[10px] text-[#8891A0] w-7 shrink-0 font-medium"
                            >
                                Max
                            </label>
                            <input
                                id="tweaks-temp-max"
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

                        {/* Slider Scale Endpoints */}
                        <div className="flex justify-between text-[10px] text-[#8891A0] font-mono pt-0.5">
                            <span>-60°C</span>
                            <span>50°C</span>
                        </div>
                    </div>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* Filter Action Buttons: Apply Search & Reset Filters        */}
                {/* ---------------------------------------------------------- */}
                <div className="flex items-center gap-2 pt-1">
                    <button
                        type="button"
                        onClick={handleApplyFilters}
                        className="flex-1 bg-[#83CAD8] hover:opacity-90 text-[#090D15] font-semibold px-4 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                        <Search size={13} aria-hidden="true" className="text-[#090D15]" />
                        <span>Search</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleReset}
                        className="bg-[#181A21] border border-[#21242C] text-xs text-[#8891A0] hover:text-[#F1EEE9] hover:bg-[#1E2129] px-3 py-2 rounded-lg transition cursor-pointer"
                    >
                        Reset filters
                    </button>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* Results List Section: Shown Only After Explicit Search     */}
                {/* ---------------------------------------------------------- */}
                <div className="border-t border-[#21242C] pt-3">
                    {hasSearched ? (
                        <>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-semibold tracking-wider text-[#8891A0] uppercase">
                                    Results ({displayedResults.length})
                                </span>
                            </div>

                            <div className="space-y-3">
                                {displayedResults.length > 0 ? (
                                    displayedResults.map((location) => {
                                        const locKey =
                                            location._id || location.id || location.name;
                                        const isSaved =
                                            savedLocationIds.has(locKey) ||
                                            savedLocationIds.has(location.id) ||
                                            savedLocationIds.has(location.name);

                                        return (
                                            /* Clickable Analog Result Card (Entire surface selects location) */
                                            <article
                                                key={locKey}
                                                onClick={() => handleViewOnMap(location)}
                                                className="relative bg-[#181A21] border border-[#21242C] rounded-xl p-3.5 transition duration-150 hover:border-[#83CAD8]/50 has-[.card-primary-action:focus-visible]:outline-2 has-[.card-primary-action:focus-visible]:outline-[#83CAD8] shadow-md cursor-pointer"
                                            >
                                                {/* Top Row: Site Icon, Title, Country & Match Score */}
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-8 h-8 rounded-lg bg-[#1A1D23] border border-[#21242C] flex items-center justify-center text-[#8891A0] shrink-0">
                                                            <Globe size={16} aria-hidden="true" />
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

                                                {/* Footer Actions Row: Stretched "View on map" + Independent "Save" */}
                                                <div className="flex items-center justify-between border-t border-[#21242C] pt-2.5 mt-2.5 text-xs">
                                                    {/* Primary Card Trigger stretched across the entire card via ::after */}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleViewOnMap(location);
                                                        }}
                                                        aria-label={`View on map: ${location.name}`}
                                                        className="card-primary-action flex items-center gap-1.5 text-[#8891A0] hover:text-[#F1EEE9] focus-visible:outline-none transition duration-150 cursor-pointer after:content-[''] after:absolute after:inset-0 after:rounded-xl"
                                                    >
                                                        <MapPin
                                                            size={13}
                                                            aria-hidden="true"
                                                            className="text-[#8891A0]"
                                                        />
                                                        <span>View on map</span>
                                                    </button>

                                                    {/* Independent Save Action (Elevated above card overlay with stopPropagation) */}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSave(location);
                                                        }}
                                                        aria-label={
                                                            isSaved
                                                                ? `Saved ${location.name}`
                                                                : `Save ${location.name}`
                                                        }
                                                        className="relative z-10 flex items-center gap-1 text-[#8891A0] hover:text-[#83CAD8] transition duration-150 cursor-pointer py-0.5 px-1 rounded"
                                                    >
                                                        <Check
                                                            size={13}
                                                            aria-hidden="true"
                                                            className={
                                                                isSaved
                                                                    ? "text-[#83CAD8]"
                                                                    : "text-[#8891A0]"
                                                            }
                                                        />
                                                        <span
                                                            className={
                                                                isSaved
                                                                    ? "text-[#83CAD8] font-medium"
                                                                    : ""
                                                            }
                                                        >
                                                            {isSaved ? "Saved" : "Save"}
                                                        </span>
                                                    </button>
                                                </div>
                                            </article>
                                        );
                                    })
                                ) : (
                                    /* Empty Results Feedback Box */
                                    <div className="text-center py-8 px-4 rounded-xl border border-dashed border-[#21242C] text-[#8891A0] text-xs">
                                        No candidate analog sites match the current filter criteria.
                                        Try adjusting parameters or resetting filters.
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        /* Compact Pre-Search Prompt Before User Submits Filters */
                        <p className="text-[11px] leading-relaxed text-[#8891A0] bg-[#181A21]/60 border border-[#21242C] rounded-xl p-3">
                            {`Select your target parameters above and click Search to view matching analog sites, or click '${locData.length} Sites Live' at the top to browse the full catalog.`}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Tweaks;
