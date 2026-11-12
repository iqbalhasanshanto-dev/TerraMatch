// ----------------------------------------------------------------------------
// External Dependencies & UI Icons
// ----------------------------------------------------------------------------
import {
    useState,
    useEffect,
    useContext,
    useMemo,
    useCallback,
    useRef,
} from "react";
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
    Radar,
} from "lucide-react";
import { toast } from "react-toastify";

// ----------------------------------------------------------------------------
// Internal Hooks, Contexts & Utility Modules
// ----------------------------------------------------------------------------
import useLocations from "../Hooks/useLocations";
import useSaved from "../Hooks/useSaved";
import StateContext from "../States/StateContext";
import {
    formatSurfaceTemp,
    getAnalogCategory,
    getAnalogRecognitionStatus,
    getSurfaceTemperature,
    getTargetBodyInfo,
} from "../utils/analogSpec";
import {
    searchGlobalEarthLocation,
    scanWholeEarthAnalogs,
} from "../utils/earthTelemetryApi";

// ============================================================================
// 1. Mission Filter Option Constants, Keyword Maps & Preset Configurations
// ============================================================================

/**
 * Exploration & Mission Objective options covering both Permanent Moon Base and Mars exploration.
 */
const MISSION_OBJECTIVE_OPTIONS = [
    "Any objective",
    "Permanent Moon Base & Habitation",
    "Subsurface Caves & Lava Tubes",
    "Water-Ice & ISRU Resources",
    "Rover Mobility & Navigation",
    "Astrobiology & Biosignatures",
];

/**
 * Keyword mapping translating each Exploration Objective option into terms
 * matched against `analogCategory`, `roversTested`, `description`, and `terrain`.
 */
const MISSION_OBJECTIVE_KEYWORDS = {
    "Permanent Moon Base & Habitation": [
        "moon base",
        "habitation",
        "habitat",
        "permanent",
        "outpost",
        "shelter",
        "regolith shielding",
        "lunar",
        "radiation shielding",
        "structure",
        "construction",
        "simulant",
        "apollo",
        "artemis",
        "lava tube",
        "subsurface",
        "base",
    ],
    "Subsurface Caves & Lava Tubes": [
        "lava tube",
        "tube",
        "cave",
        "caves",
        "subsurface",
        "cavern",
        "void",
        "skylight",
        "subterranean",
        "basaltic lava",
        "speleology",
        "pangaea",
        "cavex",
        "underground",
        "shelter",
    ],
    "Water-Ice & ISRU Resources": [
        "water-ice",
        "water",
        "ice",
        "isru",
        "resource",
        "regolith",
        "permafrost",
        "extraction",
        "volatiles",
        "drilling",
        "cryogenic",
        "polar",
        "resolve",
        "viper",
        "prospecting",
        "simulant",
        "excavation",
        "hydrate",
    ],
    "Rover Mobility & Navigation": [
        "mobility",
        "navigation",
        "rover",
        "traverse",
        "traction",
        "slip",
        "wheel",
        "slope",
        "boulder",
        "dune",
        "sand",
        "obstacle",
        "autonomous",
        "locomotion",
        "exofit",
    ],
    "Astrobiology & Biosignatures": [
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
        "extremophile",
        "hypersaline",
        "iron-sulfate",
        "sulfate",
        "fossil",
    ],
};

/**
 * Geological Terrain & Mineralogy options for the Environment accordion row,
 * including Subsurface Caves & Lava Tubes.
 */
const TERRAIN_OPTIONS = [
    "Any",
    "Caves & Lava Tubes",
    "Rocky",
    "Sandy",
    "Icy",
    "Volcanic",
    "Impact Crater",
    "Salt / Evaporites",
    "Acidic / Iron",
];

/**
 * Keyword mapping linking Terrain & Geology choices to `terrain`,
 * `mineralogy`, `analogCategory`, and `description` catalog fields.
 */
const TERRAIN_KEYWORD_MAP = {
    "Caves & Lava Tubes": [
        "lava tube",
        "tube",
        "cave",
        "caves",
        "subsurface",
        "subterranean",
        "cavern",
        "skylight",
        "basaltic lava",
        "lava flows",
        "volcanic cones",
        "vesicular",
        "pangaea",
    ],
    Rocky: [
        "rock",
        "rocky",
        "boulder",
        "granite",
        "gabbro",
        "bedrock",
        "plateau",
        "canyon",
        "cliff",
        "scree",
        "alluvial",
    ],
    Sandy: [
        "sand",
        "sandy",
        "dune",
        "desert",
        "aeolian",
        "erg",
        "wadis",
        "wadi",
        "yardang",
        "badlands",
        "gravel",
    ],
    Icy: [
        "polar",
        "ice",
        "icy",
        "glacial",
        "glacier",
        "permafrost",
        "cryo",
        "frozen",
        "subarctic",
        "arctic",
        "antarctic",
    ],
    Volcanic: [
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
    "Impact Crater": ["impact", "crater", "breccia", "shock", "dome"],
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
 * Translates UI terrain labels into the canonical keys expected by
 * `scanWholeEarthAnalogs` in `earthTelemetryApi.js`.
 */
const WHOLE_EARTH_TERRAIN_MAP = {
    Any: "Any",
    "Caves & Lava Tubes": "Volcanic Basalt",
    Rocky: "rock",
    Sandy: "Hyper-Arid Desert",
    Icy: "Polar & Ice",
    Volcanic: "Volcanic Basalt",
    "Impact Crater": "Impact Crater",
    "Salt / Evaporites": "Salt / Evaporites",
    "Acidic / Iron": "Acidic / Iron",
};

/**
 * Aridity & Moisture options displayed in the Environment accordion row.
 */
const HUMIDITY_OPTIONS = ["Any", "Very dry", "Dry", "Moderate", "Humid"];

/**
 * Keyword mapping linking Aridity & Moisture labels to `environment.climate`,
 * `environment.humidity`, `analogCategory`, and `terrain` metadata.
 */
const HUMIDITY_KEYWORD_MAP = {
    "Very dry": ["hyper-arid", "extremely dry", "very dry", "arid"],
    Dry: ["arid", "dry", "semi-arid", "desert"],
    Moderate: [
        "temperate",
        "moderate",
        "coastal",
        "subarctic",
        "alpine",
        "maritime",
    ],
    Humid: [
        "humid",
        "hydrothermal",
        "geothermal",
        "tropical",
        "lagoon",
        "maritime",
        "spring",
        "wet",
    ],
};

/**
 * Translates UI aridity labels into the canonical keys expected by
 * `scanWholeEarthAnalogs` in `earthTelemetryApi.js`.
 */
const WHOLE_EARTH_HUMIDITY_MAP = {
    Any: "Any",
    "Very dry": "Very dry",
    Dry: "Arid / Dry",
    Moderate: "moderate",
    Humid: "Hydrothermal",
};

/**
 * Preconfigured Mission Presets for the "Mission preset" dropdown.
 * Selecting a preset automatically populates target body and environment filters
 * covering permanent lunar habitation, subterranean lava tubes, and Mars science.
 */
const MISSION_PRESETS = [
    {
        id: "custom",
        label: "Custom parameters",
        config: null,
    },
    {
        id: "moon-base-outpost",
        label: "Permanent Moon Base & Habitation Site",
        config: {
            targetBody: "moon",
            missionObjective: "Permanent Moon Base & Habitation",
            terrain: "Volcanic",
            humidity: "Any",
            tempMin: -60,
            tempMax: 50,
            minElevation: 0,
        },
    },
    {
        id: "lunar-lava-tubes",
        label: "Subsurface Caves & Lava Tubes Outpost",
        config: {
            targetBody: "moon",
            missionObjective: "Subsurface Caves & Lava Tubes",
            terrain: "Caves & Lava Tubes",
            humidity: "Any",
            tempMin: -30,
            tempMax: 35,
            minElevation: 0,
        },
    },
    {
        id: "moon-polar-water-ice",
        label: "Moon Polar Water-Ice & Cryogenic ISRU",
        config: {
            targetBody: "moon",
            missionObjective: "Water-Ice & ISRU Resources",
            terrain: "Any",
            humidity: "Any",
            tempMin: -60,
            tempMax: 0,
            minElevation: 500,
            searchScope: "whole-earth",
        },
    },
    {
        id: "mars-highlands",
        label: "Mars Highlands (Astrobiology & UV Cold Desert)",
        config: {
            targetBody: "mars",
            missionObjective: "Astrobiology & Biosignatures",
            terrain: "Any",
            humidity: "Very dry",
            tempMin: -50,
            tempMax: 25,
            minElevation: 1000,
        },
    },
    {
        id: "martian-aeolian-dune",
        label: "Martian Aeolian Dune Mobility",
        config: {
            targetBody: "mars",
            missionObjective: "Rover Mobility & Navigation",
            terrain: "Sandy",
            humidity: "Dry",
            tempMin: -60,
            tempMax: 50,
            minElevation: 0,
        },
    },
];

/** Minimum and maximum temperature bounds (°C) for the dual-thumb slider. */
const TEMP_SLIDER_MIN = -60;
const TEMP_SLIDER_MAX = 50;

/** Maximum elevation bound (meters) for the minimum elevation slider. */
const ELEVATION_SLIDER_MAX = 4800;

/**
 * ============================================================================
 * Tweaks Component ("Find a match" Search Console)
 * ============================================================================
 * Structured dark-mode planetary analog search console and telemetry engine:
 * - Header: Displays `"Find a match"`, subtitle, and clickable `"50 sites live"`
 *   directory drawer toggle.
 * - Location / Coordinates: Searches both the curated NASA/ESA catalog and live
 *   OpenStreetMap Nominatim + NASA POWER global telemetry.
 * - Target Planetary Body & Mission Presets: Segmented `Moon` / `Mars` control
 *   plus 1-click preset selector that auto-configures environment parameters.
 * - Environment Accordions & Sliders: Clean expandable rows for Rover objective,
 *   Terrain & geology, and Aridity & moisture, paired with a dual-thumb Surface
 *   temperature range slider (-60°C to 50°C) and Minimum elevation slider
 *   (0 m to 4,800 m).
 * - Search Scope & Results: Toggles between Whole-Earth Scan and NASA catalog
 *   only, executing catalog filtering, Whole-Earth satellite discovery, and
 *   map flyTo / bookmarking actions.
 */
const Tweaks = ({ onSelectLocation }) => {
    // ------------------------------------------------------------------------
    // 2. Context Subscriptions & Custom Hooks
    // ------------------------------------------------------------------------
    /** Full catalog of verified planetary analog locations (MongoDB + static fallback). */
    const { locData } = useLocations();

    /** Global filtered locations, map fly-to target, and centralized recent-search logger. */
    const { filteredLoc, setFilteredLoc, setMapTarget, recordRecentSearch } =
        useContext(StateContext);

    /** Centralized saved bookmarks hook for live Saved state indicators and save action. */
    const { savedLoc, saveLocation } = useSaved();

    // ------------------------------------------------------------------------
    // 3. Search Console Filter & UI Control State Variables
    // ------------------------------------------------------------------------
    /** Free-text place name or coordinate query for catalog and global Earth lookups. */
    const [searchQuery, setSearchQuery] = useState("");

    /** Selected target planetary body (`""`, `"moon"`, or `"mars"`). */
    const [targetBody, setTargetBody] = useState("");

    /** Active mission preset identifier (`"custom"` or preset `id`). */
    const [selectedPreset, setSelectedPreset] = useState("custom");

    /** Selected Rover objective filter value. */
    const [missionObjective, setMissionObjective] = useState("Any objective");

    /** Selected Terrain & geology filter value. */
    const [terrain, setTerrain] = useState("Any");

    /** Selected Aridity & moisture filter value. */
    const [humidity, setHumidity] = useState("Any");

    /** Tracks which inline Environment accordion row is currently expanded (`null` if none). */
    const [openEnvRow, setOpenEnvRow] = useState(null);

    /** Numeric minimum surface temperature bound (`-60°C` to `50°C`). */
    const [tempMin, setTempMin] = useState(TEMP_SLIDER_MIN);

    /** Numeric maximum surface temperature bound (`-60°C` to `50°C`). */
    const [tempMax, setTempMax] = useState(TEMP_SLIDER_MAX);

    /** Tracks which temperature thumb (`"min"` or `"max"`) was interacted with last for z-index layering. */
    const [activeTempThumb, setActiveTempThumb] = useState("max");

    /** Numeric minimum elevation cutoff (`0 m` to `4,800 m`). */
    const [minElevation, setMinElevation] = useState(0);

    /** Controls open/closed state of the collapsible full-catalog sites drawer. */
    const [showAllSitesCatalog, setShowAllSitesCatalog] = useState(false);

    /** Tracks whether the user has explicitly submitted a search query yet. */
    const [hasSearched, setHasSearched] = useState(false);

    /**
     * Active Search Scope mode:
     * - `"whole-earth"` (default): Scans both NASA catalog sites and non-NASA Earth regions
     * - `"catalog"`: Filters only the verified NASA/ESA catalog sites
     */
    const [searchScope, setSearchScope] = useState("whole-earth");

    /** Controls open/closed state of the compact Search scope dropdown menu. */
    const [scopeMenuOpen, setScopeMenuOpen] = useState(false);

    // ------------------------------------------------------------------------
    // 4. Remote Satellite Telemetry & Whole-Earth Scan State + Refs
    // ------------------------------------------------------------------------
    /** Array of live Earth telemetry matches returned by Nominatim + NASA POWER. */
    const [globalResults, setGlobalResults] = useState([]);

    /** Loading indicator while querying OpenStreetMap Nominatim & NASA POWER APIs. */
    const [isGlobalSearching, setIsGlobalSearching] = useState(false);

    /** Error message surfaced if the global telemetry API request fails. */
    const [globalSearchError, setGlobalSearchError] = useState(null);

    /** Records the last query string dispatched to `searchGlobalEarthLocation`. */
    const [lastGlobalQuery, setLastGlobalQuery] = useState("");

    /** Array of newly discovered non-NASA Earth sites returned by `scanWholeEarthAnalogs`. */
    const [wholeEarthResults, setWholeEarthResults] = useState([]);

    /** Loading indicator while scanning the 45-point Whole-Earth Grid batch API. */
    const [isWholeEarthScanning, setIsWholeEarthScanning] = useState(false);

    /** Error message surfaced if the Whole-Earth batch satellite scan fails. */
    const [wholeEarthScanError, setWholeEarthScanError] = useState(null);

    /** AbortController ref canceling stale in-flight global Earth telemetry searches. */
    const globalAbortRef = useRef(null);

    /** AbortController ref canceling stale in-flight Whole-Earth batch scan requests. */
    const wholeEarthAbortRef = useRef(null);

    /** DOM ref for the dual-thumb temperature slider track to support click-to-seek. */
    const tempTrackRef = useRef(null);

    /** DOM ref for the Search scope dropdown container to handle outside clicks. */
    const scopeMenuRef = useRef(null);

    // ------------------------------------------------------------------------
    // 5. Derived Lookups, Slider Percentages & Cleanup Effects
    // ------------------------------------------------------------------------
    /** Fast lookup Set containing all saved site IDs and names for Save badges. */
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

    /** Memoized list of matching verified NASA/ESA catalog cards (excluding global discoveries). */
    const displayedResults = useMemo(() => {
        if (!filteredLoc || filteredLoc.length === 0) return [];
        return filteredLoc.filter((item) => !item.isGlobalDiscovery);
    }, [filteredLoc]);

    /** Trimmed query string used to offer an explicit Global Earth Telemetry lookup CTA. */
    const trimmedSearchQuery = searchQuery.trim();

    /** Percentage offset (0–100) for the minimum temperature thumb on the slider track. */
    const tempMinPercent =
        ((tempMin - TEMP_SLIDER_MIN) / (TEMP_SLIDER_MAX - TEMP_SLIDER_MIN)) * 100;

    /** Percentage offset (0–100) for the maximum temperature thumb on the slider track. */
    const tempMaxPercent =
        ((tempMax - TEMP_SLIDER_MIN) / (TEMP_SLIDER_MAX - TEMP_SLIDER_MIN)) * 100;

    /** Percentage fill (0–100) for the minimum elevation slider track. */
    const elevationPercent = (minElevation / ELEVATION_SLIDER_MAX) * 100;

    /** Aborts any in-flight telemetry or Whole-Earth scan requests on unmount. */
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

    /** Keeps all catalog markers visible on the map initially and right after reset. */
    useEffect(() => {
        if (locData && locData.length > 0 && !hasSearched) {
            setFilteredLoc(locData);
        }
    }, [locData, hasSearched, setFilteredLoc]);

    /** Closes the Search scope dropdown menu when clicking outside its container. */
    useEffect(() => {
        if (!scopeMenuOpen) return;

        const handleOutsideClick = (event) => {
            if (
                scopeMenuRef.current &&
                !scopeMenuRef.current.contains(event.target)
            ) {
                setScopeMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [scopeMenuOpen]);

    // ------------------------------------------------------------------------
    // 6. Helper Functions: Telemetry Resolvers & Catalog Filtering Engine
    // ------------------------------------------------------------------------
    /**
     * Resolves the real mean surface temperature (`°C`) for a candidate site.
     */
    const getEstimatedTemperature = useCallback(
        (location) => getSurfaceTemperature(location),
        []
    );

    /**
     * Resolves the site elevation in meters above sea level (`0 m` fallback).
     */
    const getSiteElevation = useCallback(
        (location) => location?.environment?.elevationMeters ?? 0,
        []
    );

    /**
     * Filters the verified NASA/ESA analog catalog (`locData`) against all
     * active console parameters: free-text query, target planetary body,
     * rover objective, terrain & geology, aridity & moisture, temperature bounds,
     * and minimum elevation.
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
            const activeTempMin = overrides.tempMin ?? tempMin;
            const activeTempMax = overrides.tempMax ?? tempMax;
            const activeMinElevation = overrides.minElevation ?? minElevation;

            return locData.filter((location) => {
                // 1. Free-text query match against name, country, category, or coordinates
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

                // 2. Target extraterrestrial body ("moon" or "mars")
                if (activeTargetBody !== "" && activeTargetBody !== "Any") {
                    const hasAnalogMatch = location.analogType?.some(
                        (type) => type.toLowerCase() === activeTargetBody.toLowerCase()
                    );
                    if (!hasAnalogMatch) {
                        return false;
                    }
                }

                // 3. Rover objective match across category, roversTested, description & terrain
                if (
                    activeMissionObjective !== "Any objective" &&
                    activeMissionObjective !== "Any"
                ) {
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

                // 4. Terrain & geology match across terrain tags, mineralogy & description
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

                // 5. Aridity & moisture regime classification match
                if (activeHumidity !== "Any") {
                    const keywords = HUMIDITY_KEYWORD_MAP[activeHumidity] || [
                        activeHumidity.toLowerCase(),
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

                // 6. Dual-thumb surface temperature bounds (-60°C to 50°C)
                const siteTemp = getEstimatedTemperature(location);
                if (siteTemp < activeTempMin || siteTemp > activeTempMax) {
                    return false;
                }

                // 7. Minimum elevation cutoff (0 m to 4,800 m)
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
            tempMin,
            tempMax,
            minElevation,
            getEstimatedTemperature,
            getSiteElevation,
        ]
    );

    // ------------------------------------------------------------------------
    // 7. Live Global Earth Telemetry & Whole-Earth Scan Execution Helpers
    // ------------------------------------------------------------------------
    /**
     * Queries OpenStreetMap Nominatim and NASA POWER / Open-Meteo for `queryText`,
     * aborting any prior in-flight lookup so rapid searches stay consistent.
     */
    const runGlobalTelemetrySearch = useCallback(async (queryText) => {
        const cleanedQuery = (queryText || "").trim();
        if (!cleanedQuery) {
            setGlobalResults([]);
            setGlobalSearchError(null);
            setLastGlobalQuery("");
            return;
        }

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

    /**
     * Executes the active search across the verified NASA/ESA catalog and, when
     * `searchScope === "whole-earth"`, simultaneously runs `scanWholeEarthAnalogs`
     * to discover non-NASA Earth locations and plot them onto the map.
     */
    const executeSearch = useCallback(
        async (overrides = {}) => {
            const activeScope = overrides.searchScope ?? searchScope;
            const activeQuery = overrides.searchQuery ?? searchQuery;
            const activeTerrain = overrides.terrain ?? terrain;
            const activeHumidity = overrides.humidity ?? humidity;

            const activeCriteria = {
                searchQuery: activeQuery,
                targetBody: overrides.targetBody ?? targetBody,
                missionObjective: overrides.missionObjective ?? missionObjective,
                terrain: WHOLE_EARTH_TERRAIN_MAP[activeTerrain] || activeTerrain,
                humidity: WHOLE_EARTH_HUMIDITY_MAP[activeHumidity] || activeHumidity,
                temperature: "Any",
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

            // Dispatch Nominatim point lookup when user entered a place or coordinates
            const trimmed = activeQuery.trim();
            if (trimmed.length >= 2) {
                runGlobalTelemetrySearch(trimmed);
            } else {
                setGlobalResults([]);
                setGlobalSearchError(null);
                setLastGlobalQuery("");
            }

            // Cancel any pending Whole-Earth scan if user selected NASA catalog only
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
            tempMin,
            tempMax,
            minElevation,
            computeFilteredLocations,
            setFilteredLoc,
            recordRecentSearch,
            runGlobalTelemetrySearch,
        ]
    );

    // ------------------------------------------------------------------------
    // 8. Interactive UI Event Handlers (Presets, Reset, Sliders, Map & Save)
    // ------------------------------------------------------------------------
    /**
     * Submits the currently configured filters via the primary CTA button or Enter key.
     */
    const handleApplyFilters = () => {
        setOpenEnvRow(null);
        setScopeMenuOpen(false);
        executeSearch();
    };

    /**
     * Applies a selected Mission Preset from the dropdown, automatically populating
     * target planetary body and environment filters below.
     */
    const handlePresetChange = (presetId) => {
        setSelectedPreset(presetId);
        const match = MISSION_PRESETS.find((item) => item.id === presetId);
        if (!match || !match.config) {
            return;
        }

        const { config } = match;
        setTargetBody(config.targetBody);
        setMissionObjective(config.missionObjective);
        setTerrain(config.terrain);
        setHumidity(config.humidity);
        setTempMin(config.tempMin);
        setTempMax(config.tempMax);
        setMinElevation(config.minElevation);
        if (config.searchScope) {
            setSearchScope(config.searchScope);
        }
    };

    /**
     * Restores all search inputs, environment filters, sliders, and telemetry results
     * back to their neutral default values.
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
        setSelectedPreset("custom");
        setMissionObjective("Any objective");
        setTerrain("Any");
        setHumidity("Any");
        setOpenEnvRow(null);
        setTempMin(TEMP_SLIDER_MIN);
        setTempMax(TEMP_SLIDER_MAX);
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
     * Handles clicking directly along the temperature slider bar to snap the
     * nearest thumb (`tempMin` or `tempMax`) to the clicked temperature.
     */
    const handleTempTrackClick = (event) => {
        if (!tempTrackRef.current) return;
        const rect = tempTrackRef.current.getBoundingClientRect();
        if (rect.width <= 0) return;

        const ratio = Math.max(
            0,
            Math.min(1, (event.clientX - rect.left) / rect.width)
        );
        const clickedTemp = Math.round(
            TEMP_SLIDER_MIN + ratio * (TEMP_SLIDER_MAX - TEMP_SLIDER_MIN)
        );

        const distToMin = Math.abs(clickedTemp - tempMin);
        const distToMax = Math.abs(clickedTemp - tempMax);
        setSelectedPreset("custom");

        if (distToMin <= distToMax && clickedTemp <= tempMax) {
            setActiveTempThumb("min");
            setTempMin(clickedTemp);
        } else if (clickedTemp >= tempMin) {
            setActiveTempThumb("max");
            setTempMax(clickedTemp);
        }
    };

    /**
     * Flies the satellite map smoothly to any selected site, logs it in Recent
     * Searches, and collapses the mobile drawer when applicable.
     */
    const handleViewOnMap = useCallback(
        (loc) => {
            if (!loc) return;

            recordRecentSearch?.(loc);

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
     * Saves a catalog or newly discovered Earth site to saved locations
     * immediately for both signed-in users and guests.
     */
    const handleSave = (location) => {
        if (!location) return;
        saveLocation?.(location);
    };

    // ------------------------------------------------------------------------
    // 9. Environment Accordion Row Configuration
    // ------------------------------------------------------------------------
    /** Declarative definitions for the 3 clean horizontal Environment rows. */
    const environmentRows = [
        {
            id: "objective",
            label: "Exploration objective",
            displayValue: missionObjective,
            isDefault: missionObjective === "Any objective",
            selectedValue: missionObjective,
            options: MISSION_OBJECTIVE_OPTIONS,
            onSelect: (value) => {
                setMissionObjective(value);
                setSelectedPreset("custom");
            },
        },
        {
            id: "terrain",
            label: "Terrain & geology",
            displayValue: terrain === "Any" ? "Any terrain" : terrain,
            isDefault: terrain === "Any",
            selectedValue: terrain,
            options: TERRAIN_OPTIONS,
            onSelect: (value) => {
                setTerrain(value);
                setSelectedPreset("custom");
            },
        },
        {
            id: "humidity",
            label: "Aridity & moisture",
            displayValue: humidity === "Any" ? "Any regime" : humidity,
            isDefault: humidity === "Any",
            selectedValue: humidity,
            options: HUMIDITY_OPTIONS,
            onSelect: (value) => {
                setHumidity(value);
                setSelectedPreset("custom");
            },
        },
    ];

    // ------------------------------------------------------------------------
    // 10. Component Render Block
    // ------------------------------------------------------------------------
    return (
        <div className="w-full h-full flex flex-col bg-[#0B0E13] text-[#F1EEE9] select-none">
            {/* ============================================================== */}
            {/* Header Block: Title, Live Site Count Toggle & Subtitle         */}
            {/* Right padding (`pr-10`) avoids overlapping the drawer close btn */}
            {/* ============================================================== */}
            <div className="pb-3 mb-3 border-b border-[#21242C] shrink-0">
                <div className="flex items-center justify-between gap-2 pr-10">
                    <h2 className="text-lg font-bold text-[#F1EEE9] tracking-tight leading-tight">
                        Find a match
                    </h2>

                    {/* Clickable live count toggling the full-catalog drawer */}
                    <button
                        type="button"
                        onClick={() => setShowAllSitesCatalog((prev) => !prev)}
                        aria-expanded={showAllSitesCatalog}
                        aria-controls="tweaks-all-sites-catalog"
                        className="text-xs font-semibold text-[#83CAD8] hover:underline cursor-pointer shrink-0 transition"
                    >
                        {locData.length} sites live
                    </button>
                </div>

                <p className="text-xs text-[#8891A0] mt-0.5">
                    Find Earth analogs for planetary missions.
                </p>
            </div>

            {/* ============================================================== */}
            {/* Collapsible Full-Catalog Drawer (Toggled via "50 sites live")  */}
            {/* ============================================================== */}
            {showAllSitesCatalog && (
                <div
                    id="tweaks-all-sites-catalog"
                    className="mb-3 bg-[#07090E] border border-[#21242C] rounded-xl p-2.5 shrink-0"
                >
                    <div className="flex items-center justify-between mb-2 px-0.5">
                        <span className="text-[10px] font-semibold tracking-wider text-[#8891A0] uppercase">
                            All Planetary Analog Sites ({locData.length})
                        </span>
                        <button
                            type="button"
                            onClick={() => setShowAllSitesCatalog(false)}
                            className="text-[10px] text-[#83CAD8] hover:underline font-medium flex items-center gap-0.5 cursor-pointer"
                        >
                            <span>Close</span>
                            <ChevronUp size={12} aria-hidden="true" />
                        </button>
                    </div>

                    {/* Scrollable list of compact clickable site directory cards */}
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                        {locData.map((location) => {
                            const catalogKey =
                                location._id || location.id || location.name;
                            const { pillLabel, pillClassName } =
                                getTargetBodyInfo(location);
                            const recognition = getAnalogRecognitionStatus(location);
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
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${recognition.badgeClass}`}
                                        >
                                            {recognition.label}
                                        </span>
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

            {/* ============================================================== */}
            {/* Scrollable Search Console Controls & Results Container         */}
            {/* ============================================================== */}
            <div className="space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                {/* ---------------------------------------------------------- */}
                {/* 1. Location or Coordinates Search Input                    */}
                {/* ---------------------------------------------------------- */}
                <div>
                    <label
                        htmlFor="tweaks-location-search"
                        className="block text-xs font-medium text-[#8891A0] mb-1.5"
                    >
                        Location or coordinates
                    </label>
                    <div className="bg-[#181A21] border border-[#272C34] focus-within:border-[#83CAD8] rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 transition">
                        <Search
                            size={15}
                            aria-hidden="true"
                            className="text-[#8891A0] shrink-0"
                        />
                        <input
                            id="tweaks-location-search"
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) =>
                                e.key === "Enter" && handleApplyFilters()
                            }
                            placeholder="Search a place or enter coordinates"
                            className="w-full bg-transparent text-xs text-[#F1EEE9] placeholder-[#8891A0] focus:outline-none"
                        />
                    </div>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* 2. Target Planetary Body Segmented Control (Moon / Mars)   */}
                {/* ---------------------------------------------------------- */}
                <div>
                    <span className="block text-xs font-medium text-[#8891A0] mb-1.5">
                        Target planetary body
                    </span>
                    <div className="grid grid-cols-2 gap-1 p-1 bg-[#181A21] border border-[#21242C] rounded-xl">
                        {[
                            { id: "moon", label: "Moon" },
                            { id: "mars", label: "Mars" },
                        ].map((body) => {
                            const isSelected = targetBody === body.id;
                            return (
                                <button
                                    key={body.id}
                                    type="button"
                                    onClick={() => {
                                        setTargetBody((prev) =>
                                            prev === body.id ? "" : body.id
                                        );
                                        setSelectedPreset("custom");
                                    }}
                                    aria-pressed={isSelected}
                                    className={
                                        isSelected
                                            ? "bg-[#0B0E13] border border-[#83CAD8]/60 text-[#83CAD8] font-semibold rounded-lg py-2 text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                                            : "text-[#8891A0] hover:text-[#F1EEE9] py-2 text-xs font-medium rounded-lg border border-transparent flex items-center justify-center gap-1.5 transition cursor-pointer"
                                    }
                                >
                                    {isSelected && (
                                        <Check
                                            size={14}
                                            aria-hidden="true"
                                            className="text-[#83CAD8]"
                                        />
                                    )}
                                    <span>{body.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* 3. Mission Preset Dropdown                                 */}
                {/* ---------------------------------------------------------- */}
                <div>
                    <label
                        htmlFor="tweaks-mission-preset"
                        className="block text-xs font-medium text-[#8891A0] mb-1.5"
                    >
                        Mission preset
                    </label>
                    <div className="relative">
                        <select
                            id="tweaks-mission-preset"
                            value={selectedPreset}
                            onChange={(e) => handlePresetChange(e.target.value)}
                            style={{ colorScheme: "dark" }}
                            className="w-full appearance-none bg-[#181A21] border border-[#272C34] focus:border-[#83CAD8] rounded-xl px-3.5 py-2.5 pr-9 text-xs text-[#F1EEE9] focus:outline-none cursor-pointer transition"
                        >
                            {MISSION_PRESETS.map((preset) => (
                                <option
                                    key={preset.id}
                                    value={preset.id}
                                    className="bg-[#181A21] text-[#F1EEE9]"
                                >
                                    {preset.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown
                            size={14}
                            aria-hidden="true"
                            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8891A0]"
                        />
                    </div>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* 4. Environment Section (Accordion Rows + Range Sliders)    */}
                {/* ---------------------------------------------------------- */}
                <div className="pt-1">
                    {/* Environment Section Header + Reset Action */}
                    <div className="flex items-center justify-between pb-1">
                        <h3 className="text-sm font-bold text-[#F1EEE9]">
                            Environment
                        </h3>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="text-xs font-medium text-[#83CAD8] hover:underline cursor-pointer"
                        >
                            Reset filters
                        </button>
                    </div>

                    {/* 3 Clean Horizontal Inline Accordion Rows */}
                    <div>
                        {environmentRows.map((row) => {
                            const isOpen = openEnvRow === row.id;
                            return (
                                <div
                                    key={row.id}
                                    className="border-b border-[#21242C] py-3"
                                >
                                    {/* Row Header Trigger */}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setOpenEnvRow((prev) =>
                                                prev === row.id ? null : row.id
                                            )
                                        }
                                        aria-expanded={isOpen}
                                        className="w-full flex items-center justify-between gap-2 text-left cursor-pointer group"
                                    >
                                        <span className="text-xs font-medium text-[#8891A0] group-hover:text-[#F1EEE9] transition">
                                            {row.label}
                                        </span>
                                        <span
                                            className={`flex items-center gap-1 text-xs font-semibold transition ${
                                                row.isDefault
                                                    ? "text-[#8891A0] group-hover:text-[#F1EEE9]"
                                                    : "text-[#83CAD8]"
                                            }`}
                                        >
                                            <span>{row.displayValue}</span>
                                            <ChevronDown
                                                size={14}
                                                aria-hidden="true"
                                                className={`transition-transform duration-200 ${
                                                    isOpen ? "rotate-180" : ""
                                                }`}
                                            />
                                        </span>
                                    </button>

                                    {/* Expandable Inline Pill Tray */}
                                    {isOpen && (
                                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                                            {row.options.map((option) => {
                                                const isOptionSelected =
                                                    row.selectedValue === option;
                                                return (
                                                    <button
                                                        key={option}
                                                        type="button"
                                                        onClick={() =>
                                                            row.onSelect(option)
                                                        }
                                                        aria-pressed={
                                                            isOptionSelected
                                                        }
                                                        className={`px-2.5 py-1 rounded-lg text-[11px] border transition cursor-pointer ${
                                                            isOptionSelected
                                                                ? "bg-[#1A1D23] border-[#83CAD8] text-[#83CAD8] font-semibold shadow-sm"
                                                                : "bg-[#181A21] border-[#21242C] text-[#8891A0] hover:text-[#F1EEE9] hover:border-[#272C34]"
                                                        }`}
                                                    >
                                                        {option}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* ------------------------------------------------------ */}
                    {/* 5. Surface Temperature Dual-Thumb Range Slider         */}
                    {/* ------------------------------------------------------ */}
                    <div className="py-3.5 border-b border-[#21242C]">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-medium text-[#F1EEE9]">
                                Surface temperature
                            </span>
                            <span className="text-xs font-mono font-semibold text-[#83CAD8]">
                                {tempMin}°C to {tempMax}°C
                            </span>
                        </div>

                        {/* Custom Dual-Thumb Horizontal Track (-60°C to 50°C) */}
                        <div
                            ref={tempTrackRef}
                            onClick={handleTempTrackClick}
                            className="relative h-5 flex items-center cursor-pointer"
                        >
                            {/* Inactive Background Track */}
                            <div className="w-full h-1.5 bg-[#21242C] rounded-full relative">
                                {/* Active Cyan Highlight Span Between Thumbs */}
                                <div
                                    className="absolute top-0 bottom-0 bg-[#83CAD8] rounded-full"
                                    style={{
                                        left: `${tempMinPercent}%`,
                                        width: `${Math.max(
                                            0,
                                            tempMaxPercent - tempMinPercent
                                        )}%`,
                                    }}
                                />
                            </div>

                            {/* Visual Minimum Temperature Circular Thumb */}
                            <div
                                aria-hidden="true"
                                className="pointer-events-none absolute top-1/2 -translate-y-1/2 bg-[#0B0E13] border-2 border-[#83CAD8] w-4 h-4 rounded-full shadow-md"
                                style={{
                                    left: `calc(${tempMinPercent}% - ${
                                        (tempMinPercent / 100) * 16
                                    }px)`,
                                    zIndex: activeTempThumb === "min" ? 22 : 20,
                                }}
                            />

                            {/* Visual Maximum Temperature Circular Thumb */}
                            <div
                                aria-hidden="true"
                                className="pointer-events-none absolute top-1/2 -translate-y-1/2 bg-[#0B0E13] border-2 border-[#83CAD8] w-4 h-4 rounded-full shadow-md"
                                style={{
                                    left: `calc(${tempMaxPercent}% - ${
                                        (tempMaxPercent / 100) * 16
                                    }px)`,
                                    zIndex: activeTempThumb === "max" ? 22 : 21,
                                }}
                            />

                            {/* Accessible Invisible Native Range Input: Minimum Temp */}
                            <input
                                type="range"
                                aria-label="Minimum surface temperature"
                                min={TEMP_SLIDER_MIN}
                                max={TEMP_SLIDER_MAX}
                                value={tempMin}
                                onPointerDown={() => setActiveTempThumb("min")}
                                onFocus={() => setActiveTempThumb("min")}
                                onChange={(e) => {
                                    const val = Math.min(
                                        Number(e.target.value),
                                        tempMax
                                    );
                                    setTempMin(val);
                                    setSelectedPreset("custom");
                                }}
                                style={{
                                    zIndex:
                                        activeTempThumb === "min" ||
                                        tempMin > TEMP_SLIDER_MAX - 10
                                            ? 30
                                            : 25,
                                }}
                                className="pointer-events-none appearance-none bg-transparent absolute inset-0 w-full h-full opacity-0 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer"
                            />

                            {/* Accessible Invisible Native Range Input: Maximum Temp */}
                            <input
                                type="range"
                                aria-label="Maximum surface temperature"
                                min={TEMP_SLIDER_MIN}
                                max={TEMP_SLIDER_MAX}
                                value={tempMax}
                                onPointerDown={() => setActiveTempThumb("max")}
                                onFocus={() => setActiveTempThumb("max")}
                                onChange={(e) => {
                                    const val = Math.max(
                                        Number(e.target.value),
                                        tempMin
                                    );
                                    setTempMax(val);
                                    setSelectedPreset("custom");
                                }}
                                style={{
                                    zIndex: activeTempThumb === "max" ? 30 : 25,
                                }}
                                className="pointer-events-none appearance-none bg-transparent absolute inset-0 w-full h-full opacity-0 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer"
                            />
                        </div>

                        {/* Bottom Scale Endpoints */}
                        <div className="flex justify-between text-[11px] font-mono text-[#8891A0] mt-1">
                            <span>-60°C</span>
                            <span>50°C</span>
                        </div>
                    </div>

                    {/* ------------------------------------------------------ */}
                    {/* 6. Minimum Elevation Single-Thumb Slider (0m–4,800m)   */}
                    {/* ------------------------------------------------------ */}
                    <div className="py-3.5 border-b border-[#21242C]">
                        <div className="flex items-center justify-between mb-3">
                            <label
                                htmlFor="tweaks-min-elevation"
                                className="text-xs font-medium text-[#F1EEE9]"
                            >
                                Minimum elevation
                            </label>
                            <span className="text-xs font-semibold text-[#83CAD8]">
                                {minElevation === 0
                                    ? "Any elevation"
                                    : `≥ ${minElevation.toLocaleString()} m`}
                            </span>
                        </div>

                        {/* Custom Single-Thumb Horizontal Track (0 m to 4,800 m) */}
                        <div className="relative h-5 flex items-center">
                            <div className="w-full h-1.5 bg-[#21242C] rounded-full relative">
                                <div
                                    className="absolute left-0 top-0 bottom-0 bg-[#83CAD8] rounded-full"
                                    style={{ width: `${elevationPercent}%` }}
                                />
                            </div>

                            {/* Visual Circular Thumb */}
                            <div
                                aria-hidden="true"
                                className="pointer-events-none absolute top-1/2 -translate-y-1/2 bg-[#0B0E13] border-2 border-[#83CAD8] w-4 h-4 rounded-full shadow-md"
                                style={{
                                    left: `calc(${elevationPercent}% - ${
                                        (elevationPercent / 100) * 16
                                    }px)`,
                                }}
                            />

                            {/* Native Range Input Driving Elevation State */}
                            <input
                                id="tweaks-min-elevation"
                                type="range"
                                min={0}
                                max={ELEVATION_SLIDER_MAX}
                                step={100}
                                value={minElevation}
                                onChange={(e) => {
                                    setMinElevation(Number(e.target.value));
                                    setSelectedPreset("custom");
                                }}
                                className="appearance-none bg-transparent absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>

                        {/* Bottom Scale Endpoints */}
                        <div className="flex justify-between text-[11px] font-mono text-[#8891A0] mt-1">
                            <span>0 m</span>
                            <span>4,800 m</span>
                        </div>
                    </div>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* 7. Search Scope Row & Primary Search CTA Button            */}
                {/* ---------------------------------------------------------- */}
                <div className="space-y-3 pt-1">
                    {/* Horizontal Search Scope Row */}
                    <div
                        ref={scopeMenuRef}
                        className="relative flex items-center justify-between py-1"
                    >
                        <span className="text-xs font-medium text-[#8891A0]">
                            Search scope
                        </span>

                        <button
                            type="button"
                            onClick={() => setScopeMenuOpen((prev) => !prev)}
                            aria-expanded={scopeMenuOpen}
                            aria-haspopup="listbox"
                            className="flex items-center gap-1 text-xs font-semibold text-[#83CAD8] hover:underline cursor-pointer"
                        >
                            <span>
                                {searchScope === "whole-earth"
                                    ? "Whole-Earth scan"
                                    : "NASA catalog only"}
                            </span>
                            <ChevronDown
                                size={14}
                                aria-hidden="true"
                                className={`transition-transform duration-150 ${
                                    scopeMenuOpen ? "rotate-180" : ""
                                }`}
                            />
                        </button>

                        {/* Compact Dark Popover Menu for Scope Selection */}
                        {scopeMenuOpen && (
                            <div
                                role="listbox"
                                aria-label="Search scope options"
                                className="absolute right-0 bottom-full mb-1.5 w-52 bg-[#181A21] border border-[#272C34] rounded-xl shadow-2xl p-1 z-30"
                            >
                                {[
                                    {
                                        value: "whole-earth",
                                        label: "Whole-Earth scan",
                                        hint: "Catalog + global Earth scan",
                                    },
                                    {
                                        value: "catalog",
                                        label: "NASA catalog only",
                                        hint: `${locData.length} verified sites`,
                                    },
                                ].map((opt) => {
                                    const isSelected = searchScope === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            role="option"
                                            aria-selected={isSelected}
                                            onClick={() => {
                                                setSearchScope(opt.value);
                                                setScopeMenuOpen(false);
                                            }}
                                            className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between gap-2 transition cursor-pointer ${
                                                isSelected
                                                    ? "bg-[#0B0E13] text-[#83CAD8]"
                                                    : "text-[#F1EEE9] hover:bg-[#1A1D23]"
                                            }`}
                                        >
                                            <div>
                                                <p className="text-xs font-semibold leading-tight">
                                                    {opt.label}
                                                </p>
                                                <p className="text-[10px] text-[#8891A0] mt-0.5">
                                                    {opt.hint}
                                                </p>
                                            </div>
                                            {isSelected && (
                                                <Check
                                                    size={13}
                                                    aria-hidden="true"
                                                    className="text-[#83CAD8] shrink-0"
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Full-Width Primary Search CTA Button */}
                    <button
                        type="button"
                        onClick={handleApplyFilters}
                        className="w-full bg-[#83CAD8] hover:opacity-90 text-[#090D15] font-semibold py-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                    >
                        {isWholeEarthScanning ? (
                            <Loader2
                                size={15}
                                aria-hidden="true"
                                className="animate-spin text-[#090D15]"
                            />
                        ) : (
                            <Search
                                size={15}
                                aria-hidden="true"
                                className="text-[#090D15]"
                            />
                        )}
                        <span>
                            {isWholeEarthScanning
                                ? "Scanning Earth analogs..."
                                : "Search Earth analogs"}
                        </span>
                    </button>
                </div>

                {/* Explicit Global Earth Telemetry Lookup Shortcut when Typing a Place */}
                {trimmedSearchQuery.length > 0 &&
                    trimmedSearchQuery !== lastGlobalQuery && (
                        <button
                            type="button"
                            onClick={() => {
                                setHasSearched(true);
                                runGlobalTelemetrySearch(trimmedSearchQuery);
                            }}
                            className="w-full bg-[#181A21] border border-[#83CAD8]/40 hover:border-[#83CAD8] text-[#83CAD8] rounded-xl px-3 py-2 text-[11px] font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                            <Satellite size={13} aria-hidden="true" />
                            <span className="truncate">
                                Search Global Earth Satellite Telemetry for &apos;
                                {trimmedSearchQuery}&apos;
                            </span>
                        </button>
                    )}

                {/* ========================================================== */}
                {/* 8. Results Section (Catalog, Whole-Earth Scan & Telemetry) */}
                {/* ========================================================== */}
                {hasSearched && (
                    <div className="border-t border-[#21242C] pt-4 space-y-4">
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
                                        const recognition =
                                            getAnalogRecognitionStatus(location);
                                        const surfaceTemp =
                                            formatSurfaceTemp(location);
                                        const analogCategory =
                                            getAnalogCategory(location);

                                        return (
                                            /* Clickable Verified Catalog Result Card */
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

                                                    {/* Target Body Pill, Recognition Status & Real Mean Surface Temperature */}
                                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                                        <div className="flex items-center gap-1">
                                                            <span
                                                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${recognition.badgeClass}`}
                                                            >
                                                                {recognition.label}
                                                            </span>
                                                            <span
                                                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${pillClassName}`}
                                                            >
                                                                {pillLabel}
                                                            </span>
                                                        </div>
                                                        <span className="font-mono text-xs text-[#83CAD8] font-medium">
                                                            {surfaceTemp}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Footer Actions Row: View on Map + Save */}
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
                                            Scanning 45 remote terrestrial regions
                                            via batch satellite telemetry...
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
                                                    {/* Top Row: Discovery Beacon, Cyan Badge & Target Body */}
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
                                                                handleViewOnMap(
                                                                    site
                                                                );
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
                                        No unexplored non-NASA Earth regions matched
                                        these exact criteria.
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

                                                    {/* Live Open-Meteo Telemetry Grid */}
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

                                                    {/* Footer Actions Row: Fly to Coordinate + Save */}
                                                    <div className="flex items-center justify-between border-t border-[#21242C] pt-2.5 mt-2.5 text-xs">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleViewOnMap(
                                                                    site
                                                                );
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
                    </div>
                )}
            </div>
        </div>
    );
};

export default Tweaks;
