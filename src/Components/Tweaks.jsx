import {
    useState,
    useEffect,
    useContext,
    useMemo,
    useCallback,
    useRef,
} from "react";
import { useNavigate } from "react-router";
import {
    Search,
    Globe,
    MapPin,
    Check,
    ChevronDown,
    ChevronUp,
    Satellite,
    Loader2,
    Thermometer,
    Droplets,
    Sun,
    Mountain,
    Sparkles,
    Radar,
} from "lucide-react";
import useLocations from "../Hooks/useLocations";
import useSaved from "../Hooks/useSaved";
import StateContext from "../States/StateContext";
import useAuth from "../Hooks/useAuth";
import { toast } from "react-toastify";
import { showSignInPromptToast } from "../utils/authToast";
import {
    formatSurfaceTemp,
    getAnalogCategory,
    getSurfaceTemperature,
    getTargetBodyInfo,
} from "../utils/analogSpec";
import {
    searchGlobalEarthLocation,
    scanWholeEarthAnalogs,
} from "../utils/earthTelemetryApi";

// ============================================================================
// NASA / ESA Rover Mission Selection Filter Option Constants & Keyword Maps
// ============================================================================

/**
 * Rover Test Objective pill labels mirroring real planetary mission phases.
 */
const MISSION_OBJECTIVE_OPTIONS = [
    "Any",
    "Rover Mobility",
    "Subsurface Drilling",
    "Astrobiology",
    "ISRU & Regolith",
];

/**
 * Keyword mapping matching Rover Test Objectives against `analogCategory`,
 * `roversTested`, `description`, and `terrain` metadata.
 */
const MISSION_OBJECTIVE_KEYWORDS = {
    "Rover Mobility": [
        "mobility",
        "rover",
        "traction",
        "slip",
        "navigation",
        "dune",
        "traverse",
        "slope",
        "boulder",
        "wheel",
        "habitat",
    ],
    "Subsurface Drilling": [
        "drill",
        "drilling",
        "coring",
        "subsurface",
        "radar",
        "sounding",
        "icebreaker",
        "permafrost",
        "lava tube",
        "excavation",
    ],
    Astrobiology: [
        "astrobiology",
        "biosignature",
        "life",
        "microbiology",
        "endolith",
        "stromatolite",
        "habitability",
        "biomass",
        "halite",
        "perchlorate",
        "brine",
    ],
    "ISRU & Regolith": [
        "isru",
        "regolith",
        "volatiles",
        "excavation",
        "simulant",
        "basalt",
        "tephra",
        "extraction",
        "resource",
        "evaporite",
    ],
};

/**
 * Geological Terrain & Mineralogy pill labels for planetary surface matching.
 */
const TERRAIN_OPTIONS = [
    "Any",
    "Volcanic Basalt",
    "Impact Crater",
    "Hyper-Arid Desert",
    "Polar & Ice",
    "Salt / Evaporites",
    "Acidic / Iron",
];

/**
 * Keyword mapping linking geological terrain pills to `terrain`, `mineralogy`,
 * `analogCategory`, and `description` attributes.
 */
const TERRAIN_KEYWORD_MAP = {
    "Volcanic Basalt": [
        "volcanic",
        "volcano",
        "basalt",
        "basaltic",
        "lava",
        "caldera",
        "tephra",
        "scoria",
        "ash",
        "tuff",
        "pseudocrater",
        "rift",
        "geothermal",
    ],
    "Impact Crater": ["impact", "crater", "breccia", "shock"],
    "Hyper-Arid Desert": [
        "arid",
        "desert",
        "dune",
        "sand",
        "wadis",
        "yardang",
        "badlands",
        "gravel",
        "playa",
    ],
    "Polar & Ice": [
        "polar",
        "ice",
        "glacial",
        "glacier",
        "permafrost",
        "cryo",
        "frozen",
        "subarctic",
    ],
    "Salt / Evaporites": [
        "salt",
        "evaporite",
        "halite",
        "gypsum",
        "sulfate",
        "chloride",
        "brine",
        "playa",
        "saline",
        "takyr",
    ],
    "Acidic / Iron": [
        "acidic",
        "iron",
        "hematite",
        "jarosite",
        "perchlorate",
        "sulfur",
        "hydrothermal",
        "ferric",
    ],
};

/**
 * Aridity & Moisture Regime pill labels describing terrestrial field moisture.
 */
const HUMIDITY_OPTIONS = [
    "Any",
    "Hyper-Arid",
    "Arid / Dry",
    "Cryogenic / Frozen",
    "Hydrothermal",
];

/**
 * Keyword mapping linking moisture regime pills to `environment.climate`,
 * `environment.humidity`, `analogCategory`, and `terrain`.
 */
const HUMIDITY_KEYWORD_MAP = {
    "Hyper-Arid": ["hyper-arid", "extremely dry", "very dry"],
    "Arid / Dry": ["arid", "dry", "semi-arid", "desert"],
    "Cryogenic / Frozen": [
        "polar",
        "extremely cold",
        "cold",
        "subarctic",
        "cryo",
        "frozen",
        "permafrost",
        "glacial",
    ],
    Hydrothermal: [
        "hydrothermal",
        "geothermal",
        "brine",
        "maritime",
        "tropical",
        "lagoon",
        "acidic river",
        "spring",
    ],
};

/**
 * Quantitative Surface Temperature Tier pill labels (°C).
 */
const TEMPERATURE_TIER_OPTIONS = [
    "Any",
    "Cryogenic (< -10°C)",
    "Cold (-10 to 10°C)",
    "Temperate (10 to 25°C)",
    "Extreme Hot (> 25°C)",
];

/**
 * ============================================================================
 * Tweaks Component ("Find a Match" Planetary Analog Filter & Telemetry Engine)
 * ============================================================================
 * Interactive search, NASA/ESA mission-criteria filter panel, and Live Global
 * Earth Telemetry Discovery Engine:
 * - Filters the verified NASA/ESA analog catalog (`locData`) across Target
 *   Planetary Body, Rover Test Objective, Terrain & Geology, Aridity & Moisture
 *   Regime, Surface Temperature tiers/bounds, and Minimum Elevation (0m–4000m).
 * - Queries OpenStreetMap Nominatim + Open-Meteo in parallel via
 *   `searchGlobalEarthLocation(query)` to surface real-time global Earth
 *   candidates under "GLOBAL EARTH TELEMETRY MATCHES".
 * - Clicking any catalog or global telemetry card flies the map to the site,
 *   opens its live popup, logs it to Recent Searches, and allows bookmarking.
 */
const Tweaks = ({ onSelectLocation }) => {
    // ------------------------------------------------------------------------
    // 1. Contexts, Custom Hooks & Global State Subscriptions
    // ------------------------------------------------------------------------
    /** Full catalog of verified planetary analog locations (MongoDB + static fallback). */
    const { locData } = useLocations();

    /** Global filtered locations, map fly-to target, and centralized recent-search logger. */
    const { filteredLoc, setFilteredLoc, setMapTarget, recordRecentSearch } =
        useContext(StateContext);

    /** Router navigation helper used by the guest `"Sign in →"` toast CTA. */
    const navigate = useNavigate();

    /** Current Firebase user session for database bookmarking. */
    const { user } = useAuth();

    /** Centralized saved bookmarks hook for live Saved state indicators and save action. */
    const { savedLoc, saveLocation } = useSaved();

    // ------------------------------------------------------------------------
    // 2. Mission Filter & Telemetry Search State Variables
    // ------------------------------------------------------------------------
    /** Free-text search query matching catalog site/country or any global Earth location. */
    const [searchQuery, setSearchQuery] = useState("");

    /** Target planetary body selector (`""`, `"moon"`, or `"mars"` — unselected by default). */
    const [targetBody, setTargetBody] = useState("");

    /** Rover Test Objective filter pill (`"Any"` or NASA/ESA testing focus). */
    const [missionObjective, setMissionObjective] = useState("Any");

    /** Geological terrain & mineralogy filter pill. */
    const [terrain, setTerrain] = useState("Any");

    /** Terrestrial aridity & moisture regime filter pill. */
    const [humidity, setHumidity] = useState("Any");

    /** Quantitative surface temperature tier filter pill. */
    const [temperature, setTemperature] = useState("Any");

    /** Numeric minimum surface temperature bound slider (`-60°C` to `50°C`). */
    const [tempMin, setTempMin] = useState(-60);

    /** Numeric maximum surface temperature bound slider (`-60°C` to `50°C`). */
    const [tempMax, setTempMax] = useState(50);

    /** Numeric minimum elevation cutoff slider (`0m` to `4000m`) for thin-atmosphere sites. */
    const [minElevation, setMinElevation] = useState(0);

    /** Controls visibility of the collapsible full analog sites directory dropdown. */
    const [showAllSitesCatalog, setShowAllSitesCatalog] = useState(false);

    /** Tracks whether the user has explicitly submitted a search/filter query yet. */
    const [hasSearched, setHasSearched] = useState(false);

    /**
     * Active Search Scope mode:
     * - `"whole-earth"` (default): Scans both the 50 NASA catalog sites AND non-NASA remote Earth sites
     * - `"catalog"`: Filters only the 50 verified NASA/ESA catalog sites
     */
    const [searchScope, setSearchScope] = useState("whole-earth");

    /** Array of synthesized live Earth telemetry matches from Nominatim + NASA POWER. */
    const [globalResults, setGlobalResults] = useState([]);

    /** Loading indicator while querying OpenStreetMap Nominatim & NASA POWER APIs. */
    const [isGlobalSearching, setIsGlobalSearching] = useState(false);

    /** Stores user-facing error text if the global telemetry API request fails. */
    const [globalSearchError, setGlobalSearchError] = useState(null);

    /** Records the last query string dispatched to `searchGlobalEarthLocation`. */
    const [lastGlobalQuery, setLastGlobalQuery] = useState("");

    /** Array of newly discovered non-NASA Earth sites returned by `scanWholeEarthAnalogs`. */
    const [wholeEarthResults, setWholeEarthResults] = useState([]);

    /** Loading indicator while scanning the 45-point Whole-Earth Grid batch API. */
    const [isWholeEarthScanning, setIsWholeEarthScanning] = useState(false);

    /** Error message if the Whole-Earth batch satellite scan fails. */
    const [wholeEarthScanError, setWholeEarthScanError] = useState(null);

    /** AbortController ref canceling stale in-flight global Earth telemetry searches. */
    const globalAbortRef = useRef(null);

    /** AbortController ref canceling stale in-flight Whole-Earth batch scan requests. */
    const wholeEarthAbortRef = useRef(null);

    // ------------------------------------------------------------------------
    // 3. Derived Saved Location Keys Lookup Set & Cleanup Effect
    // ------------------------------------------------------------------------
    /** Indexes all persisted/local saved bookmark keys into one fast lookup Set. */
    const savedLocationIds = useMemo(() => {
        const set = new Set();
        if (savedLoc && savedLoc.length > 0) {
            savedLoc.forEach((item) => {
                const keys = [item._id, item.locationId, item.id, item.name].filter(
                    Boolean
                );
                keys.forEach((key) => set.add(key));
            });
        }
        return set;
    }, [savedLoc]);

    // Cancel any active global telemetry or Whole-Earth scan fetch when Tweaks unmounts
    useEffect(() => {
        return () => {
            if (globalAbortRef.current) {
                globalAbortRef.current.abort();
            }
            if (wholeEarthAbortRef.current) {
                wholeEarthAbortRef.current.abort();
            }
        };
    }, []);

    // ------------------------------------------------------------------------
    // 4. Helper Function: Surface Temperature & Elevation Resolvers
    // ------------------------------------------------------------------------
    /**
     * Resolves the real mean surface temperature (`°C`) for a candidate site.
     */
    const getEstimatedTemperature = useCallback(
        (location) => getSurfaceTemperature(location),
        []
    );

    /**
     * Resolves the site elevation in meters above sea level (`0m` fallback).
     */
    const getSiteElevation = useCallback(
        (location) => location?.environment?.elevationMeters ?? 0,
        []
    );

    // ------------------------------------------------------------------------
    // 5. Helper Function: Multi-Variable NASA/ESA Catalog Filtering Engine
    // ------------------------------------------------------------------------
    /**
     * Evaluates all verified catalog locations against search text, target body,
     * rover test objective, terrain & geology, aridity/moisture regime,
     * surface temperature tier/range, and minimum elevation threshold.
     * Accepts optional `overrides` so 1-click Mission Presets evaluate deterministically.
     */
    const computeFilteredLocations = useCallback(
        (overrides = {}) => {
            if (!locData || locData.length === 0) return [];

            const activeQuery = overrides.searchQuery ?? searchQuery;
            const activeTargetBody = overrides.targetBody ?? targetBody;
            const activeMissionObjective =
                overrides.missionObjective ?? missionObjective;
            const activeTerrain = overrides.terrain ?? terrain;
            const activeHumidity = overrides.humidity ?? humidity;
            const activeTemperature = overrides.temperature ?? temperature;
            const activeTempMin = overrides.tempMin ?? tempMin;
            const activeTempMax = overrides.tempMax ?? tempMax;
            const activeMinElevation = overrides.minElevation ?? minElevation;

            return locData.filter((location) => {
                // Filter 1: Case-insensitive site name, country, or description text match
                if (activeQuery.trim()) {
                    const query = activeQuery.trim().toLowerCase();
                    const nameMatch = location.name?.toLowerCase().includes(query);
                    const countryMatch = location.country?.toLowerCase().includes(query);
                    const categoryMatch = location.analogCategory
                        ?.toLowerCase()
                        .includes(query);
                    if (!nameMatch && !countryMatch && !categoryMatch) {
                        return false;
                    }
                }

                // Filter 2: Target extraterrestrial body ("moon" or "mars")
                if (activeTargetBody !== "" && activeTargetBody !== "Any") {
                    const hasAnalogMatch = location.analogType?.some(
                        (type) => type.toLowerCase() === activeTargetBody.toLowerCase()
                    );
                    if (!hasAnalogMatch) {
                        return false;
                    }
                }

                // Filter 3: Rover Test Objective (analogCategory, roversTested, description, terrain)
                if (activeMissionObjective !== "Any") {
                    const keywords =
                        MISSION_OBJECTIVE_KEYWORDS[activeMissionObjective] || [
                            activeMissionObjective.toLowerCase(),
                        ];
                    const searchableCorpus = [
                        location.analogCategory || "",
                        location.roversTested || "",
                        location.description || "",
                        ...(Array.isArray(location.terrain) ? location.terrain : []),
                    ]
                        .join(" ")
                        .toLowerCase();

                    const hasObjectiveMatch = keywords.some((kw) =>
                        searchableCorpus.includes(kw)
                    );
                    if (!hasObjectiveMatch) {
                        return false;
                    }
                }

                // Filter 4: Terrain & Geology match across terrain tags, mineralogy & description
                if (activeTerrain !== "Any") {
                    const keywords = TERRAIN_KEYWORD_MAP[activeTerrain] || [
                        activeTerrain.toLowerCase(),
                    ];
                    const geologyCorpus = [
                        ...(Array.isArray(location.terrain) ? location.terrain : []),
                        location.mineralogy || "",
                        location.analogCategory || "",
                        location.description || "",
                    ]
                        .join(" ")
                        .toLowerCase();

                    const hasTerrainMatch = keywords.some((kw) =>
                        geologyCorpus.includes(kw)
                    );
                    if (!hasTerrainMatch) {
                        return false;
                    }
                }

                // Filter 5: Aridity & Moisture Regime classification match
                if (activeHumidity !== "Any") {
                    const normalizedHumidity =
                        activeHumidity === "Very dry" ? "Hyper-Arid" : activeHumidity;
                    const keywords = HUMIDITY_KEYWORD_MAP[normalizedHumidity] || [
                        normalizedHumidity.toLowerCase(),
                    ];
                    const moistureCorpus = [
                        location.environment?.climate || "",
                        location.environment?.humidity || "",
                        location.analogCategory || "",
                        location.description || "",
                        ...(Array.isArray(location.terrain) ? location.terrain : []),
                    ]
                        .join(" ")
                        .toLowerCase();

                    const hasHumidityMatch = keywords.some((kw) =>
                        moistureCorpus.includes(kw)
                    );
                    if (!hasHumidityMatch) {
                        return false;
                    }
                }

                // Filter 6: Surface Temperature Tier & Numeric Bounds (-60°C to 50°C)
                const siteTemp = getEstimatedTemperature(location);
                if (activeTemperature !== "Any") {
                    if (
                        activeTemperature === "Cryogenic (< -10°C)" &&
                        !(siteTemp < -10)
                    ) {
                        return false;
                    }
                    if (
                        activeTemperature === "Cold (-10 to 10°C)" &&
                        !(siteTemp >= -10 && siteTemp <= 10)
                    ) {
                        return false;
                    }
                    if (
                        activeTemperature === "Temperate (10 to 25°C)" &&
                        !(siteTemp > 10 && siteTemp <= 25)
                    ) {
                        return false;
                    }
                    if (
                        activeTemperature === "Extreme Hot (> 25°C)" &&
                        !(siteTemp > 25)
                    ) {
                        return false;
                    }
                }
                if (siteTemp < activeTempMin || siteTemp > activeTempMax) {
                    return false;
                }

                // Filter 7: Minimum Elevation cutoff (0m to 4000m) for high-altitude UV/thin-air sites
                if (
                    activeMinElevation > 0 &&
                    getSiteElevation(location) < activeMinElevation
                ) {
                    return false;
                }

                return true;
            });
        },
        [
            locData,
            searchQuery,
            targetBody,
            missionObjective,
            terrain,
            humidity,
            temperature,
            tempMin,
            tempMax,
            minElevation,
            getEstimatedTemperature,
            getSiteElevation,
        ]
    );

    // ------------------------------------------------------------------------
    // 6. Synchronization Effect: Show All Markers Until a Search Is Submitted
    // ------------------------------------------------------------------------
    useEffect(() => {
        // Keep all 50 catalog pins visible on the map on initial load / after reset
        if (locData && locData.length > 0 && !hasSearched) {
            setFilteredLoc(locData);
        }
    }, [locData, hasSearched, setFilteredLoc]);

    // ------------------------------------------------------------------------
    // 7. Live Global Earth Telemetry Search Helper
    // ------------------------------------------------------------------------
    /**
     * Queries OpenStreetMap Nominatim and Open-Meteo for `queryText`, canceling
     * any prior in-flight request so rapid searches stay consistent.
     */
    const runGlobalTelemetrySearch = useCallback(async (queryText) => {
        const cleanedQuery = (queryText || "").trim();
        if (!cleanedQuery) {
            setGlobalResults([]);
            setGlobalSearchError(null);
            setLastGlobalQuery("");
            return;
        }

        // Cancel any previous in-flight Nominatim/Open-Meteo search request
        if (globalAbortRef.current) {
            globalAbortRef.current.abort();
        }
        const controller = new AbortController();
        globalAbortRef.current = controller;

        setIsGlobalSearching(true);
        setGlobalSearchError(null);
        setLastGlobalQuery(cleanedQuery);

        try {
            const telemetryMatches = await searchGlobalEarthLocation(
                cleanedQuery,
                controller.signal
            );
            setGlobalResults(telemetryMatches);
        } catch (error) {
            if (error?.name === "AbortError") {
                return;
            }
            console.error("Global Earth telemetry search error:", error);
            setGlobalResults([]);
            setGlobalSearchError(
                error?.message || "Unable to fetch live satellite telemetry right now."
            );
        } finally {
            if (globalAbortRef.current === controller) {
                setIsGlobalSearching(false);
            }
        }
    }, []);

    // ------------------------------------------------------------------------
    // 8. User Action Handlers (Search, Whole-Earth Scan, Presets, Reset, Save)
    // ------------------------------------------------------------------------
    /**
     * Executes the active search across the 50 NASA/ESA catalog sites and, when
     * `searchScope === "whole-earth"`, simultaneously runs `scanWholeEarthAnalogs`
     * to discover brand-new non-NASA Earth locations and plot them on the map.
     * Accepts optional `overrides` for deterministic 1-click Mission Presets.
     */
    const executeSearch = useCallback(
        async (overrides = {}) => {
            const activeScope = overrides.searchScope ?? searchScope;
            const activeQuery = overrides.searchQuery ?? searchQuery;
            const activeCriteria = {
                searchQuery: activeQuery,
                targetBody: overrides.targetBody ?? targetBody,
                missionObjective: overrides.missionObjective ?? missionObjective,
                terrain: overrides.terrain ?? terrain,
                humidity: overrides.humidity ?? humidity,
                temperature: overrides.temperature ?? temperature,
                tempMin: overrides.tempMin ?? tempMin,
                tempMax: overrides.tempMax ?? tempMax,
                minElevation: overrides.minElevation ?? minElevation,
            };

            const catalogResults = computeFilteredLocations(overrides);
            setHasSearched(true);
            setFilteredLoc(catalogResults);

            if (catalogResults.length > 0) {
                recordRecentSearch?.(catalogResults[0]);
            }

            // Run Nominatim point lookup when user entered a place name
            const trimmed = activeQuery.trim();
            if (trimmed.length >= 2) {
                runGlobalTelemetrySearch(trimmed);
            } else {
                setGlobalResults([]);
                setGlobalSearchError(null);
                setLastGlobalQuery("");
            }

            // If Catalog-Only scope is selected, cancel any pending Whole-Earth Scan
            if (activeScope !== "whole-earth") {
                if (wholeEarthAbortRef.current) {
                    wholeEarthAbortRef.current.abort();
                }
                setWholeEarthResults([]);
                setIsWholeEarthScanning(false);
                setWholeEarthScanError(null);
                return;
            }

            // Whole-Earth Scan Mode: batch-scan 45 remote terrestrial regions
            if (wholeEarthAbortRef.current) {
                wholeEarthAbortRef.current.abort();
            }
            const scanController = new AbortController();
            wholeEarthAbortRef.current = scanController;

            setIsWholeEarthScanning(true);
            setWholeEarthScanError(null);

            try {
                const discoveredSites = await scanWholeEarthAnalogs(
                    activeCriteria,
                    scanController.signal
                );
                setWholeEarthResults(discoveredSites);
                // Merge newly discovered non-NASA Earth sites directly onto the world map
                setFilteredLoc([...catalogResults, ...discoveredSites]);

                if (catalogResults.length === 0 && discoveredSites.length > 0) {
                    recordRecentSearch?.(discoveredSites[0]);
                }
            } catch (error) {
                if (error?.name === "AbortError") {
                    return;
                }
                console.error("Whole-Earth analog scan error:", error);
                setWholeEarthResults([]);
                setWholeEarthScanError(
                    error?.message ||
                        "Unable to complete Whole-Earth satellite scan right now."
                );
            } finally {
                if (wholeEarthAbortRef.current === scanController) {
                    setIsWholeEarthScanning(false);
                }
            }
        },
        [
            searchScope,
            searchQuery,
            targetBody,
            missionObjective,
            terrain,
            humidity,
            temperature,
            tempMin,
            tempMax,
            minElevation,
            computeFilteredLocations,
            setFilteredLoc,
            recordRecentSearch,
            runGlobalTelemetrySearch,
        ]
    );

    /**
     * Button handler for clicking "Search" or pressing Enter in the search box.
     */
    const handleApplyFilters = () => {
        executeSearch();
    };

    /**
     * 1-Click Mission Preset: "🌑 Moon Grey Zone"
     * Targets cold, high-elevation lunar terminator / polar-highland analogs
     * and automatically triggers a Whole-Earth Scan for unexplored candidates.
     */
    const handleApplyMoonGreyZonePreset = () => {
        const preset = {
            searchQuery: "",
            targetBody: "moon",
            missionObjective: "Any",
            terrain: "Any",
            humidity: "Any",
            temperature: "Any",
            tempMin: -60,
            tempMax: 0,
            minElevation: 500,
            searchScope: "whole-earth",
        };
        setSearchQuery(preset.searchQuery);
        setTargetBody(preset.targetBody);
        setMissionObjective(preset.missionObjective);
        setTerrain(preset.terrain);
        setHumidity(preset.humidity);
        setTemperature(preset.temperature);
        setTempMin(preset.tempMin);
        setTempMax(preset.tempMax);
        setMinElevation(preset.minElevation);
        setSearchScope(preset.searchScope);
        executeSearch(preset);
    };

    /**
     * 1-Click Mission Preset: "🔴 Mars Highlands"
     * Targets hyper-arid, elevated Martian highland regolith analogs across
     * both the verified catalog and the active search scope.
     */
    const handleApplyMarsHighlandsPreset = () => {
        const preset = {
            searchQuery: "",
            targetBody: "mars",
            missionObjective: "Any",
            terrain: "Any",
            humidity: "Hyper-Arid",
            temperature: "Any",
            tempMin: -50,
            tempMax: 25,
            minElevation: 1000,
            searchScope,
        };
        setSearchQuery(preset.searchQuery);
        setTargetBody(preset.targetBody);
        setMissionObjective(preset.missionObjective);
        setTerrain(preset.terrain);
        setHumidity(preset.humidity);
        setTemperature(preset.temperature);
        setTempMin(preset.tempMin);
        setTempMax(preset.tempMax);
        setMinElevation(preset.minElevation);
        executeSearch(preset);
    };

    /**
     * Restores all search criteria, Whole-Earth Scan discoveries, and telemetry
     * results back to neutral defaults.
     */
    const handleReset = () => {
        if (globalAbortRef.current) {
            globalAbortRef.current.abort();
        }
        if (wholeEarthAbortRef.current) {
            wholeEarthAbortRef.current.abort();
        }
        setSearchQuery("");
        setTargetBody("");
        setMissionObjective("Any");
        setTerrain("Any");
        setHumidity("Any");
        setTemperature("Any");
        setTempMin(-60);
        setTempMax(50);
        setMinElevation(0);
        setHasSearched(false);
        setGlobalResults([]);
        setIsGlobalSearching(false);
        setGlobalSearchError(null);
        setLastGlobalQuery("");
        setWholeEarthResults([]);
        setIsWholeEarthScanning(false);
        setWholeEarthScanError(null);

        if (locData) {
            setFilteredLoc(locData);
        }
        toast.info("Filters reset to default.");
    };

    /**
     * Flies the map smoothly to a catalog site, Whole-Earth Scan discovery, or
     * live Global Earth Telemetry site, opens its scientific popup, logs it in
     * Recent Searches, and collapses the mobile drawer when applicable.
     */
    const handleViewOnMap = useCallback(
        (loc) => {
            if (!loc) return;

            // Immediately record this site in centralized Recent Searches
            recordRecentSearch?.(loc);

            // Dispatch smooth fly-to target (Whole-Earth Scan sites already have pins in `filteredLoc`)
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
                    telemetrySite:
                        loc.isLiveTelemetry && !loc.isGlobalDiscovery ? loc : null,
                    timestamp: Date.now(),
                });
            }

            setShowAllSitesCatalog(false);
            onSelectLocation?.(loc);
        },
        [recordRecentSearch, setMapTarget, onSelectLocation]
    );

    /**
     * Saves a catalog or newly discovered Global Earth Telemetry site to the
     * scientist's profile (or triggers the `"Sign in →"` prompt for guests).
     */
    const handleSave = (location) => {
        if (!location) return;

        if (!user?.email) {
            showSignInPromptToast(navigate);
            return;
        }

        saveLocation?.(location);
    };

    // ------------------------------------------------------------------------
    // 9. Styling Helpers & Memoized Results List
    // ------------------------------------------------------------------------
    /** Returns deep-space pill styling classes based on active selection state. */
    const getPillClass = (isSelected) =>
        `px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
            isSelected
                ? "bg-[#1E2129] border border-[#83CAD8] text-[#F1EEE9] shadow-sm"
                : "bg-[#181A21] border border-[#21242C] text-[#8891A0] hover:text-[#F1EEE9] hover:bg-[#1E2129]"
        }`;

    /** Memoized list of matching verified NASA/ESA catalog result cards (excluding global discoveries). */
    const displayedResults = useMemo(() => {
        if (!filteredLoc || filteredLoc.length === 0) return [];
        return filteredLoc.filter((item) => !item.isGlobalDiscovery);
    }, [filteredLoc]);

    /** Trimmed query string used for the explicit Global Earth Telemetry CTA. */
    const trimmedSearchQuery = searchQuery.trim();

    // ------------------------------------------------------------------------
    // 10. Component Render Block
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
                            const { pillLabel, pillClassName } =
                                getTargetBodyInfo(location);
                            const surfaceTemp = formatSurfaceTemp(location);

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
                                        <span
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${pillClassName}`}
                                        >
                                            {pillLabel}
                                        </span>
                                        <span className="font-mono text-[10px] text-[#83CAD8] font-medium">
                                            {surfaceTemp}
                                        </span>
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
                {/* Filter 1: LOCATION Text Search (Catalog + Global Earth)    */}
                {/* ---------------------------------------------------------- */}
                <div>
                    <label
                        htmlFor="tweaks-location-search"
                        className="block text-[10px] font-semibold tracking-wider text-[#8891A0] mb-1 uppercase"
                    >
                        Location / Global Earth Search
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
                            placeholder="Search catalog or any place on Earth..."
                            className="w-full bg-transparent text-xs text-[#F1EEE9] placeholder-[#8891A0] focus:outline-none"
                        />
                    </div>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* Filter 2: TARGET PLANETARY BODY Segmented Control          */}
                {/* ---------------------------------------------------------- */}
                <div>
                    <span className="block text-[10px] font-semibold tracking-wider text-[#8891A0] mb-1 uppercase">
                        Target Planetary Body
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

                    {/* 1-Click Mission Presets Row ("Moon Grey Zone" & "Mars Highlands") */}
                    <div className="mt-2">
                        <span className="flex items-center gap-1 text-[10px] font-semibold tracking-wider text-[#8891A0] mb-1 uppercase">
                            <Sparkles
                                size={10}
                                aria-hidden="true"
                                className="text-[#83CAD8]"
                            />
                            <span>Mission Presets</span>
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                            <button
                                type="button"
                                onClick={handleApplyMoonGreyZonePreset}
                                className="px-2.5 py-1.5 rounded-lg bg-[#181A21] border border-[#21242C] hover:border-[#83CAD8] text-[11px] font-medium text-[#F1EEE9] flex items-center justify-center gap-1.5 transition cursor-pointer"
                            >
                                <span aria-hidden="true">🌑</span>
                                <span>Moon Grey Zone</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleApplyMarsHighlandsPreset}
                                className="px-2.5 py-1.5 rounded-lg bg-[#181A21] border border-[#21242C] hover:border-[#D67051] text-[11px] font-medium text-[#F1EEE9] flex items-center justify-center gap-1.5 transition cursor-pointer"
                            >
                                <span aria-hidden="true">🔴</span>
                                <span>Mars Highlands</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* Filter 3: ROVER TEST OBJECTIVE Pill Selector               */}
                {/* ---------------------------------------------------------- */}
                <div>
                    <span className="block text-[10px] font-semibold tracking-wider text-[#8891A0] mb-1 uppercase">
                        Rover Test Objective
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                        {MISSION_OBJECTIVE_OPTIONS.map((item) => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => setMissionObjective(item)}
                                aria-pressed={missionObjective === item}
                                className={getPillClass(missionObjective === item)}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* Filter 4: TERRAIN & GEOLOGY Pill Selector                  */}
                {/* ---------------------------------------------------------- */}
                <div>
                    <span className="block text-[10px] font-semibold tracking-wider text-[#8891A0] mb-1 uppercase">
                        Terrain &amp; Geology
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                        {TERRAIN_OPTIONS.map((item) => (
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
                {/* Filter 5: ARIDITY & MOISTURE REGIME Pill Selector          */}
                {/* ---------------------------------------------------------- */}
                <div>
                    <span className="block text-[10px] font-semibold tracking-wider text-[#8891A0] mb-0.5 uppercase">
                        Aridity &amp; Moisture Regime
                    </span>
                    <p className="text-[10px] text-[#8891A0] mb-1.5">
                        Describes the Earth analog environment and moisture profile.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {HUMIDITY_OPTIONS.map((item) => (
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
                {/* Filter 6: SURFACE TEMPERATURE Tiers & Range Sliders        */}
                {/* ---------------------------------------------------------- */}
                <div>
                    <span className="block text-[10px] font-semibold tracking-wider text-[#8891A0] mb-1 uppercase">
                        Surface Temperature
                    </span>

                    {/* Quantitative Temperature Tier Pills */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {TEMPERATURE_TIER_OPTIONS.map((item) => (
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

                    {/* Numeric Min/Max Temperature Range Slider Card (-60°C to 50°C) */}
                    <div className="border border-[#272C34] rounded-lg p-3 bg-[#181A21] space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-[11px] text-[#8891A0] font-medium">
                                Temperature range:
                            </span>
                            <span className="text-[11px] font-mono text-[#83CAD8] font-medium">
                                {tempMin}°C to {tempMax}°C
                            </span>
                        </div>

                        {/* Minimum Temperature Bound Slider */}
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

                        {/* Maximum Temperature Bound Slider */}
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

                    {/* Compact Minimum Elevation Slider (0m to 4000m) */}
                    <div className="border border-[#272C34] rounded-lg p-3 bg-[#181A21] space-y-1.5 mt-2">
                        <div className="flex items-center justify-between text-xs">
                            <label
                                htmlFor="tweaks-min-elevation"
                                className="text-[11px] text-[#8891A0] font-medium flex items-center gap-1"
                            >
                                <Mountain
                                    size={12}
                                    aria-hidden="true"
                                    className="text-[#83CAD8]"
                                />
                                <span>Min Elevation (m)</span>
                            </label>
                            <span className="text-[11px] font-mono text-[#83CAD8] font-medium">
                                {minElevation === 0
                                    ? "Any (≥ 0m)"
                                    : `≥ ${minElevation.toLocaleString()} m`}
                            </span>
                        </div>

                        <input
                            id="tweaks-min-elevation"
                            type="range"
                            min="0"
                            max="4000"
                            step="100"
                            value={minElevation}
                            onChange={(e) => setMinElevation(Number(e.target.value))}
                            className="w-full accent-[#83CAD8] h-1.5 bg-[#07090E] rounded cursor-pointer"
                        />

                        <div className="flex justify-between text-[10px] text-[#8891A0] font-mono">
                            <span>0 m</span>
                            <span>High-Altitude UV / Thin Air</span>
                            <span>4,000 m</span>
                        </div>
                    </div>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* Search Scope Toggle & Filter Action Buttons                */}
                {/* ---------------------------------------------------------- */}
                <div className="space-y-2 pt-1">
                    {/* Search Scope Segmented Toggle: Catalog vs. Whole-Earth Scan */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-semibold tracking-wider text-[#8891A0] uppercase">
                                Search Scope
                            </span>
                            <span className="text-[10px] font-mono text-[#83CAD8]">
                                {searchScope === "whole-earth"
                                    ? "Includes Non-NASA Earth Sites"
                                    : "50 Historical Sites Only"}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#07090E] border border-[#272C34] rounded-lg">
                            <button
                                type="button"
                                onClick={() => setSearchScope("catalog")}
                                aria-pressed={searchScope === "catalog"}
                                className={`py-1.5 px-2 text-[11px] font-medium rounded-md text-center transition cursor-pointer ${
                                    searchScope === "catalog"
                                        ? "bg-[#1E2129] border border-[#83CAD8] text-[#F1EEE9] shadow-sm"
                                        : "bg-[#181A21] border border-[#21242C] text-[#8891A0] hover:text-[#F1EEE9]"
                                }`}
                            >
                                Catalog (50 Sites)
                            </button>

                            <button
                                type="button"
                                onClick={() => setSearchScope("whole-earth")}
                                aria-pressed={searchScope === "whole-earth"}
                                className={`py-1.5 px-2 text-[11px] font-medium rounded-md text-center transition cursor-pointer flex items-center justify-center gap-1 ${
                                    searchScope === "whole-earth"
                                        ? "bg-[#1E2129] border border-[#83CAD8] text-[#83CAD8] shadow-sm"
                                        : "bg-[#181A21] border border-[#21242C] text-[#8891A0] hover:text-[#F1EEE9]"
                                }`}
                            >
                                <Radar size={11} aria-hidden="true" />
                                <span>Whole-Earth Scan</span>
                            </button>
                        </div>
                    </div>

                    {/* Primary Search & Reset Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleApplyFilters}
                            className="flex-1 bg-[#83CAD8] hover:opacity-90 text-[#090D15] font-semibold px-4 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                        >
                            {isWholeEarthScanning ? (
                                <Loader2
                                    size={13}
                                    aria-hidden="true"
                                    className="animate-spin text-[#090D15]"
                                />
                            ) : (
                                <Search
                                    size={13}
                                    aria-hidden="true"
                                    className="text-[#090D15]"
                                />
                            )}
                            <span>
                                {isWholeEarthScanning ? "Scanning Earth..." : "Search"}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={handleReset}
                            className="bg-[#181A21] border border-[#21242C] text-xs text-[#8891A0] hover:text-[#F1EEE9] hover:bg-[#1E2129] px-3 py-2 rounded-lg transition cursor-pointer"
                        >
                            Reset filters
                        </button>
                    </div>
                </div>

                {/* Explicit Live Global Earth Telemetry Search Shortcut when typing a place */}
                {trimmedSearchQuery.length > 0 &&
                    trimmedSearchQuery !== lastGlobalQuery && (
                        <button
                            type="button"
                            onClick={() => {
                                setHasSearched(true);
                                runGlobalTelemetrySearch(trimmedSearchQuery);
                            }}
                            className="w-full bg-[#181A21] border border-[#83CAD8]/40 hover:border-[#83CAD8] text-[#83CAD8] rounded-lg px-3 py-2 text-[11px] font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                            <Satellite size={13} aria-hidden="true" />
                            <span className="truncate">
                                Search Global Earth Satellite Telemetry for &apos;
                                {trimmedSearchQuery}&apos;
                            </span>
                        </button>
                    )}

                {/* ---------------------------------------------------------- */}
                {/* Results List Section: Verified Catalog + Global Telemetry  */}
                {/* ---------------------------------------------------------- */}
                <div className="border-t border-[#21242C] pt-3 space-y-4">
                    {hasSearched ? (
                        <>
                            {/* Section A: Verified NASA/ESA Catalog Matches */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-semibold tracking-wider text-[#8891A0] uppercase">
                                        Verified Catalog Results ({displayedResults.length})
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {displayedResults.length > 0 ? (
                                        displayedResults.map((location) => {
                                            const locKey =
                                                location._id ||
                                                location.id ||
                                                location.name;
                                            const isSaved =
                                                savedLocationIds.has(locKey) ||
                                                savedLocationIds.has(location.id) ||
                                                savedLocationIds.has(location.name);
                                            const { pillLabel, pillClassName } =
                                                getTargetBodyInfo(location);
                                            const surfaceTemp =
                                                formatSurfaceTemp(location);
                                            const analogCategory =
                                                getAnalogCategory(location);

                                            return (
                                                /* Clickable Analog Result Card */
                                                <article
                                                    key={locKey}
                                                    onClick={() =>
                                                        handleViewOnMap(location)
                                                    }
                                                    className="relative bg-[#181A21] border border-[#21242C] rounded-xl p-3.5 transition duration-150 hover:border-[#83CAD8]/50 has-[.card-primary-action:focus-visible]:outline-2 has-[.card-primary-action:focus-visible]:outline-[#83CAD8] shadow-md cursor-pointer"
                                                >
                                                    {/* Top Row: Site Icon, Title, Country, Target Body & Temp */}
                                                    <div className="flex items-start justify-between gap-2.5">
                                                        <div className="flex items-start gap-3 min-w-0">
                                                            <div className="w-8 h-8 rounded-lg bg-[#1A1D23] border border-[#21242C] flex items-center justify-center text-[#8891A0] shrink-0 mt-0.5">
                                                                <Globe
                                                                    size={16}
                                                                    aria-hidden="true"
                                                                />
                                                            </div>

                                                            <div className="min-w-0">
                                                                <h3 className="text-xs sm:text-sm font-semibold text-[#F1EEE9] truncate leading-tight">
                                                                    {location.name}
                                                                </h3>
                                                                <p className="text-[11px] text-[#8891A0] truncate mt-0.5">
                                                                    {location.country}
                                                                </p>
                                                                <p className="text-[10px] text-[#8891A0]/85 truncate mt-1">
                                                                    {analogCategory}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Target Body Pill & Real Mean Surface Temperature */}
                                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                                            <span
                                                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${pillClassName}`}
                                                            >
                                                                {pillLabel}
                                                            </span>
                                                            <span className="font-mono text-xs text-[#83CAD8] font-medium">
                                                                {surfaceTemp}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Footer Actions Row */}
                                                    <div className="flex items-center justify-between border-t border-[#21242C] pt-2.5 mt-2.5 text-xs">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleViewOnMap(
                                                                    location
                                                                );
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
                                                                {isSaved
                                                                    ? "Saved"
                                                                    : "Save"}
                                                            </span>
                                                        </button>
                                                    </div>
                                                </article>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-6 px-4 rounded-xl border border-dashed border-[#21242C] text-[#8891A0] text-xs">
                                            No verified catalog sites match these exact
                                            parameters.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Section B: NEW EARTH DISCOVERIES (Whole-Earth Scan) */}
                            {searchScope === "whole-earth" && (
                                <div className="border-t border-[#21242C] pt-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-semibold tracking-wider text-[#83CAD8] uppercase flex items-center gap-1.5">
                                            <Radar size={12} aria-hidden="true" />
                                            <span>
                                                NEW EARTH DISCOVERIES (Whole-Earth Scan •{" "}
                                                {wholeEarthResults.length})
                                            </span>
                                        </span>
                                    </div>

                                    {isWholeEarthScanning ? (
                                        <div className="flex items-center justify-center gap-2 py-6 px-4 rounded-xl border border-[#83CAD8]/30 bg-[#181A21]/70 text-xs text-[#8891A0]">
                                            <Loader2
                                                size={14}
                                                className="animate-spin text-[#83CAD8]"
                                                aria-hidden="true"
                                            />
                                            <span>
                                                Scanning 45 remote terrestrial regions via batch satellite telemetry...
                                            </span>
                                        </div>
                                    ) : wholeEarthScanError ? (
                                        <div className="p-3 rounded-xl border border-[#D67051]/40 bg-[#181A21] text-xs text-[#D67051] space-y-2">
                                            <p>{wholeEarthScanError}</p>
                                            <button
                                                type="button"
                                                onClick={handleApplyFilters}
                                                className="px-2.5 py-1 rounded bg-[#1E2129] border border-[#21242C] text-[#F1EEE9] text-[11px] hover:border-[#83CAD8] cursor-pointer transition"
                                            >
                                                Retry Whole-Earth Scan
                                            </button>
                                        </div>
                                    ) : wholeEarthResults.length > 0 ? (
                                        <div className="space-y-3">
                                            {wholeEarthResults.map((site) => {
                                                const siteKey =
                                                    site._id || site.id || site.name;
                                                const isSaved =
                                                    savedLocationIds.has(siteKey) ||
                                                    savedLocationIds.has(site.id) ||
                                                    savedLocationIds.has(site.name);
                                                const { pillLabel, pillClassName } =
                                                    getTargetBodyInfo(site);
                                                const telemetry = site.telemetry || {};

                                                return (
                                                    <article
                                                        key={siteKey}
                                                        onClick={() =>
                                                            handleViewOnMap(site)
                                                        }
                                                        className="relative bg-[#181A21] border border-[#83CAD8]/40 rounded-xl p-3.5 transition duration-150 hover:border-[#83CAD8] shadow-md cursor-pointer"
                                                    >
                                                        {/* Top Row: Discovery Beacon, Cyan NEW DISCOVERY Badge & Target Body */}
                                                        <div className="flex items-start justify-between gap-2.5">
                                                            <div className="flex items-start gap-2.5 min-w-0">
                                                                <div className="w-8 h-8 rounded-lg bg-[#83CAD8]/15 border border-[#83CAD8]/40 flex items-center justify-center text-[#83CAD8] shrink-0 mt-0.5">
                                                                    <Radar
                                                                        size={15}
                                                                        aria-hidden="true"
                                                                    />
                                                                </div>

                                                                <div className="min-w-0">
                                                                    <span className="inline-block px-1.5 py-0.5 rounded bg-[#83CAD8]/15 border border-[#83CAD8]/40 text-[#83CAD8] text-[9px] font-bold tracking-wider uppercase mb-1">
                                                                        NEW DISCOVERY
                                                                    </span>
                                                                    <h3 className="text-xs sm:text-sm font-semibold text-[#F1EEE9] truncate leading-tight">
                                                                        {site.name}
                                                                    </h3>
                                                                    <p className="text-[11px] text-[#8891A0] truncate mt-0.5">
                                                                        {site.country}
                                                                    </p>
                                                                    <p className="text-[10px] text-[#83CAD8]/90 truncate mt-1">
                                                                        {site.analogCategory}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                                <span
                                                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${pillClassName}`}
                                                                >
                                                                    {pillLabel}
                                                                </span>
                                                                <span className="font-mono text-xs text-[#83CAD8] font-medium">
                                                                    {telemetry.temperatureC ??
                                                                        site.temperature}
                                                                    °C
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Live Satellite Telemetry Summary Grid */}
                                                        <div className="grid grid-cols-2 gap-1.5 mt-2.5 pt-2 border-t border-[#21242C]/80 text-[10px] font-mono">
                                                            <div className="flex items-center gap-1 text-[#8891A0]">
                                                                <Mountain
                                                                    size={11}
                                                                    className="text-[#83CAD8] shrink-0"
                                                                    aria-hidden="true"
                                                                />
                                                                <span>
                                                                    Elev:{" "}
                                                                    <strong className="text-[#F1EEE9]">
                                                                        {(
                                                                            telemetry.elevationMeters ??
                                                                            0
                                                                        ).toLocaleString()}{" "}
                                                                        m
                                                                    </strong>
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1 text-[#8891A0]">
                                                                <Thermometer
                                                                    size={11}
                                                                    className="text-[#83CAD8] shrink-0"
                                                                    aria-hidden="true"
                                                                />
                                                                <span>
                                                                    Temp:{" "}
                                                                    <strong className="text-[#F1EEE9]">
                                                                        {telemetry.temperatureC ??
                                                                            site.temperature}
                                                                        °C
                                                                    </strong>
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1 text-[#8891A0]">
                                                                <Droplets
                                                                    size={11}
                                                                    className="text-[#83CAD8] shrink-0"
                                                                    aria-hidden="true"
                                                                />
                                                                <span>
                                                                    Hum:{" "}
                                                                    <strong className="text-[#F1EEE9]">
                                                                        {telemetry.humidityPercent ??
                                                                            0}
                                                                        %
                                                                    </strong>
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1 text-[#8891A0]">
                                                                <Sun
                                                                    size={11}
                                                                    className="text-[#83CAD8] shrink-0"
                                                                    aria-hidden="true"
                                                                />
                                                                <span>
                                                                    Flux:{" "}
                                                                    <strong className="text-[#F1EEE9]">
                                                                        {telemetry.solarRadiationWm2 ??
                                                                            0}{" "}
                                                                        W/m²
                                                                    </strong>
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Footer Actions Row */}
                                                        <div className="flex items-center justify-between border-t border-[#21242C] pt-2.5 mt-2.5 text-xs">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleViewOnMap(site);
                                                                }}
                                                                aria-label={`View discovery on map: ${site.name}`}
                                                                className="card-primary-action flex items-center gap-1.5 text-[#8891A0] hover:text-[#F1EEE9] focus-visible:outline-none transition duration-150 cursor-pointer after:content-[''] after:absolute after:inset-0 after:rounded-xl"
                                                            >
                                                                <MapPin
                                                                    size={13}
                                                                    aria-hidden="true"
                                                                    className="text-[#83CAD8]"
                                                                />
                                                                <span>View on map</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleSave(site);
                                                                }}
                                                                aria-label={
                                                                    isSaved
                                                                        ? `Saved ${site.name}`
                                                                        : `Save ${site.name}`
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
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-5 px-4 rounded-xl border border-dashed border-[#21242C] text-[#8891A0] text-xs">
                                            No unexplored non-NASA Earth regions matched these exact criteria.
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Section C: Global Earth Telemetry Matches (Nominatim + NASA POWER) */}
                            {(isGlobalSearching ||
                                globalResults.length > 0 ||
                                globalSearchError ||
                                lastGlobalQuery) && (
                                <div className="border-t border-[#21242C] pt-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-semibold tracking-wider text-[#83CAD8] uppercase flex items-center gap-1.5">
                                            <Satellite size={12} aria-hidden="true" />
                                            <span>
                                                GLOBAL EARTH TELEMETRY MATCHES (
                                                {globalResults.length})
                                            </span>
                                        </span>
                                    </div>

                                    {isGlobalSearching ? (
                                        <div className="flex items-center justify-center gap-2 py-6 px-4 rounded-xl border border-[#21242C] bg-[#181A21]/60 text-xs text-[#8891A0]">
                                            <Loader2
                                                size={14}
                                                className="animate-spin text-[#83CAD8]"
                                                aria-hidden="true"
                                            />
                                            <span>
                                                Acquiring satellite elevation &amp;
                                                meteorology...
                                            </span>
                                        </div>
                                    ) : globalSearchError ? (
                                        <div className="p-3 rounded-xl border border-[#D67051]/40 bg-[#181A21] text-xs text-[#D67051] space-y-2">
                                            <p>{globalSearchError}</p>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    runGlobalTelemetrySearch(
                                                        lastGlobalQuery ||
                                                            trimmedSearchQuery
                                                    )
                                                }
                                                className="px-2.5 py-1 rounded bg-[#1E2129] border border-[#21242C] text-[#F1EEE9] text-[11px] hover:border-[#83CAD8] cursor-pointer transition"
                                            >
                                                Retry Telemetry Lookup
                                            </button>
                                        </div>
                                    ) : globalResults.length > 0 ? (
                                        <div className="space-y-3">
                                            {globalResults.map((site) => {
                                                const siteKey =
                                                    site._id || site.id || site.name;
                                                const isSaved =
                                                    savedLocationIds.has(siteKey) ||
                                                    savedLocationIds.has(site.id) ||
                                                    savedLocationIds.has(site.name);
                                                const { pillLabel, pillClassName } =
                                                    getTargetBodyInfo(site);
                                                const telemetry = site.telemetry || {};

                                                return (
                                                    <article
                                                        key={siteKey}
                                                        onClick={() =>
                                                            handleViewOnMap(site)
                                                        }
                                                        className="relative bg-[#181A21] border border-[#83CAD8]/30 rounded-xl p-3.5 transition duration-150 hover:border-[#83CAD8] shadow-md cursor-pointer"
                                                    >
                                                        {/* Top Row: Live Satellite Icon, Region Name & Target Pill */}
                                                        <div className="flex items-start justify-between gap-2.5">
                                                            <div className="flex items-start gap-2.5 min-w-0">
                                                                <div className="w-8 h-8 rounded-lg bg-[#83CAD8]/10 border border-[#83CAD8]/35 flex items-center justify-center text-[#83CAD8] shrink-0 mt-0.5">
                                                                    <Satellite
                                                                        size={15}
                                                                        aria-hidden="true"
                                                                    />
                                                                </div>

                                                                <div className="min-w-0">
                                                                    <h3 className="text-xs sm:text-sm font-semibold text-[#F1EEE9] truncate leading-tight">
                                                                        {site.name}
                                                                    </h3>
                                                                    <p className="text-[11px] text-[#8891A0] truncate mt-0.5">
                                                                        {site.country}
                                                                    </p>
                                                                    <p className="text-[10px] text-[#83CAD8]/90 truncate mt-1">
                                                                        {site.analogCategory}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                                <span
                                                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${pillClassName}`}
                                                                >
                                                                    {pillLabel}
                                                                </span>
                                                                <span className="font-mono text-xs text-[#83CAD8] font-medium">
                                                                    {telemetry.temperatureC ??
                                                                        site.temperature}
                                                                    °C
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Live Open-Meteo Telemetry Grid (Elevation, Temp, Humidity, Solar Flux) */}
                                                        <div className="grid grid-cols-2 gap-1.5 mt-2.5 pt-2 border-t border-[#21242C]/80 text-[10px] font-mono">
                                                            <div className="flex items-center gap-1 text-[#8891A0]">
                                                                <Mountain
                                                                    size={11}
                                                                    className="text-[#83CAD8] shrink-0"
                                                                    aria-hidden="true"
                                                                />
                                                                <span>
                                                                    Elev:{" "}
                                                                    <strong className="text-[#F1EEE9]">
                                                                        {(
                                                                            telemetry.elevationMeters ??
                                                                            0
                                                                        ).toLocaleString()}{" "}
                                                                        m
                                                                    </strong>
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1 text-[#8891A0]">
                                                                <Thermometer
                                                                    size={11}
                                                                    className="text-[#83CAD8] shrink-0"
                                                                    aria-hidden="true"
                                                                />
                                                                <span>
                                                                    Temp:{" "}
                                                                    <strong className="text-[#F1EEE9]">
                                                                        {telemetry.temperatureC ??
                                                                            site.temperature}
                                                                        °C
                                                                    </strong>
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1 text-[#8891A0]">
                                                                <Droplets
                                                                    size={11}
                                                                    className="text-[#83CAD8] shrink-0"
                                                                    aria-hidden="true"
                                                                />
                                                                <span>
                                                                    Hum:{" "}
                                                                    <strong className="text-[#F1EEE9]">
                                                                        {telemetry.humidityPercent ??
                                                                            0}
                                                                        %
                                                                    </strong>
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1 text-[#8891A0]">
                                                                <Sun
                                                                    size={11}
                                                                    className="text-[#83CAD8] shrink-0"
                                                                    aria-hidden="true"
                                                                />
                                                                <span>
                                                                    Flux:{" "}
                                                                    <strong className="text-[#F1EEE9]">
                                                                        {telemetry.solarRadiationWm2 ??
                                                                            0}{" "}
                                                                        W/m²
                                                                    </strong>
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Footer Actions Row: Fly to Coordinate + Save to Profile */}
                                                        <div className="flex items-center justify-between border-t border-[#21242C] pt-2.5 mt-2.5 text-xs">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleViewOnMap(site);
                                                                }}
                                                                aria-label={`Fly to telemetry site: ${site.name}`}
                                                                className="card-primary-action flex items-center gap-1.5 text-[#8891A0] hover:text-[#F1EEE9] focus-visible:outline-none transition duration-150 cursor-pointer after:content-[''] after:absolute after:inset-0 after:rounded-xl"
                                                            >
                                                                <MapPin
                                                                    size={13}
                                                                    aria-hidden="true"
                                                                    className="text-[#83CAD8]"
                                                                />
                                                                <span>View on map</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleSave(site);
                                                                }}
                                                                aria-label={
                                                                    isSaved
                                                                        ? `Saved ${site.name}`
                                                                        : `Save ${site.name}`
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
                                                                    {isSaved
                                                                        ? "Saved"
                                                                        : "Save"}
                                                                </span>
                                                            </button>
                                                        </div>
                                                    </article>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-5 px-4 rounded-xl border border-dashed border-[#21242C] text-[#8891A0] text-xs">
                                            No global Earth coordinates matched &ldquo;
                                            {lastGlobalQuery}&rdquo;.
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        /* Compact Pre-Search Prompt Before User Submits Filters */
                        <p className="text-[11px] leading-relaxed text-[#8891A0] bg-[#181A21]/60 border border-[#21242C] rounded-xl p-3">
                            {`Select mission parameters above or enter any Earth location and click Search, or click '${locData.length} Sites Live' at the top to browse all verified sites.`}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Tweaks;
