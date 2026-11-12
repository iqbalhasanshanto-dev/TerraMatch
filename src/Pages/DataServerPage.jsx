import { useState, useMemo, useEffect } from "react";
import {
    Database,
    Globe2,
    Plus,
    CheckCircle2,
    Search,
    RefreshCw,
    X,
    Trash2,
} from "lucide-react";
import { API_BASE_URL } from "../utils/api";
import { toast } from "react-toastify";

// ============================================================================
// 1. Constants, Authoritative Planetary Archives & LocalStorage Helpers
// ============================================================================

/**
 * LocalStorage key used to persist user-added custom data sources so custom
 * archives remain available on static Netlify deployments when the backend is offline.
 */
const CUSTOM_DATA_SOURCES_STORAGE_KEY = "terramatch_custom_data_sources";

/**
 * Legacy placeholder archive IDs from earlier prototype versions that should
 * be superseded by the 10 official NASA Earthdata / Moon PDS / Mars PDS datasets.
 */
const LEGACY_PLACEHOLDER_IDS = new Set([
    "hirise-crism",
    "srtm-elevation",
    "mro-sharad",
    "sentinel-2",
    "kaguya-selene",
    "usgs-astrogeology",
]);

/**
 * The 10 official NASA Earthdata, Moon PDS, and Mars PDS planetary archives
 * used both as the authoritative catalog definition and as the automatic static
 * fallback whenever `GET /data-sources` is unreachable on Netlify.
 * Each dataset defines real scientific parameters measured and spatial resolutions.
 */
const DEFAULT_PLANETARY_ARCHIVES = [
    // ------------------------------------------------------------------------
    // Earth Datasets (Category: "earth") — NASA Earthdata
    // ------------------------------------------------------------------------
    {
        id: "nasadem",
        name: "NASADEM (NASA Digital Elevation Model)",
        provider: "NASA Earthdata",
        targetBody: "Earth",
        category: "earth",
        parameter: "Topography & Slope",
        dataTypes: ["Topography & Slope", "Elevation DEM"],
        resolution: "30m Global DEM",
        status: "Verified Archive",
        feed: true,
        portalUrl: "https://search.earthdata.nasa.gov/search?q=NASADEM",
        description:
            "Reprocessed global SRTM radar elevation and slope dataset providing high-accuracy terrain relief for Earth analog site characterization.",
    },
    {
        id: "modis-mod11",
        name: "MODIS Land Surface Temperature (MOD11)",
        provider: "NASA Earthdata",
        targetBody: "Earth",
        category: "earth",
        parameter: "Surface Temperature",
        dataTypes: ["Surface Temperature", "Thermal Radiometry"],
        resolution: "1 km Daily Thermal Grid",
        status: "Verified Archive",
        feed: true,
        portalUrl:
            "https://search.earthdata.nasa.gov/search?q=MODIS%20Land%20Surface%20Temperature",
        description:
            "Terra and Aqua MODIS thermal infrared land surface temperature and emissivity observations benchmarking diurnal thermal extremes.",
    },
    {
        id: "smap-l3",
        name: "SMAP L3 Soil Moisture",
        provider: "NASA Earthdata",
        targetBody: "Earth",
        category: "earth",
        parameter: "Soil Moisture",
        dataTypes: ["Soil Moisture", "L-Band Radiometry"],
        resolution: "9 km Global Radiometer Grid",
        status: "Verified Archive",
        feed: true,
        portalUrl:
            "https://search.earthdata.nasa.gov/search?q=SMAP%20L3%20Soil%20Moisture",
        description:
            "Soil Moisture Active Passive L-band radiometer volumetric soil moisture retrievals quantifying hyper-arid desert desiccation.",
    },
    {
        id: "gpm-imerg",
        name: "GPM IMERG Precipitation",
        provider: "NASA Earthdata",
        targetBody: "Earth",
        category: "earth",
        parameter: "Precipitation & Rainfall",
        dataTypes: ["Precipitation & Rainfall", "Multi-Satellite Weathering"],
        resolution: "0.1° (~10 km) Multi-Satellite Grid",
        status: "Verified Archive",
        feed: true,
        portalUrl: "https://search.earthdata.nasa.gov/search?q=GPM%20IMERG",
        description:
            "Integrated Multi-satellitE Retrievals for GPM delivering global precipitation rates to evaluate hydrologic weathering analog limits.",
    },
    {
        id: "modis-mod09",
        name: "MODIS Surface Reflectance (MOD09)",
        provider: "NASA Earthdata",
        targetBody: "Earth",
        category: "earth",
        parameter: "Surface Albedo & Mineral Reflectance",
        dataTypes: ["Surface Albedo", "Multispectral Reflectance"],
        resolution: "250m – 500m Multispectral Bands",
        status: "Verified Archive",
        feed: true,
        portalUrl:
            "https://search.earthdata.nasa.gov/search?q=MODIS%20Surface%20Reflectance",
        description:
            "Atmospherically corrected multispectral surface reflectance and albedo characteristics across barren regolith and basaltic testbeds.",
    },

    // ------------------------------------------------------------------------
    // Moon Datasets (Category: "moon") — NASA PDS Lunar Archives
    // ------------------------------------------------------------------------
    {
        id: "lro-lola",
        name: "LRO LOLA Lunar Elevation (LRO-L-LOLA-4-GDR-V1.0)",
        provider: "NASA PDS / WUSTL",
        targetBody: "Moon",
        category: "moon",
        parameter: "Topography & Slope",
        dataTypes: ["Topography & Slope", "Laser Altimetry DEM"],
        resolution: "5m Polar / 118m Global DEM",
        status: "Verified Archive",
        feed: true,
        portalUrl:
            "https://pds.nasa.gov/ds-view/pds/viewDataset.jsp?dsid=LRO-L-LOLA-4-GDR-V1.0",
        description:
            "Lunar Reconnaissance Orbiter Laser Altimeter gridded data records mapping crater slopes, permanently shadowed regions, and polar relief.",
    },
    {
        id: "lro-diviner",
        name: "LRO Diviner Lunar Radiometer (LRO-L-DLRE-4-RDR-V1.0)",
        provider: "NASA PDS / UCLA",
        targetBody: "Moon",
        category: "moon",
        parameter: "Surface Temperature",
        dataTypes: ["Surface Temperature", "Thermal Radiometry"],
        resolution: "100m Lunar Grid (~128 px/deg)",
        status: "Verified Archive",
        feed: true,
        portalUrl:
            "https://data.nasa.gov/dataset/?q=LRO-L-DLRE-4-RDR-V1.0",
        description:
            "Nine-channel infrared radiometer measuring lunar diurnal bolometric brightness temperatures from equatorial noon to cryogenic polar traps.",
    },
    {
        id: "ch1-m3",
        name: "Chandrayaan-1 Moon Mineralogy Mapper (urn:nasa:pds:ch1_m3)",
        provider: "NASA PDS / ISRO",
        targetBody: "Moon",
        category: "moon",
        parameter: "Mineralogy & Water-Ice",
        dataTypes: ["Mineralogy & Water-Ice", "Imaging Spectroscopy"],
        resolution: "140m Hyperspectral Grid",
        status: "Verified Archive",
        feed: true,
        portalUrl:
            "https://pds.nasa.gov/ds-view/pds/viewBundle.jsp?identifier=urn:nasa:pds:ch1_m3",
        description:
            "Visible-to-near-infrared imaging spectrometer bundle identifying highland anorthosite, mare basalt, and polar OH/H2O absorption features.",
    },

    // ------------------------------------------------------------------------
    // Mars Datasets (Category: "mars") — NASA PDS Geosciences / GSFC
    // ------------------------------------------------------------------------
    {
        id: "mars-ode",
        name: "Mars Orbital Data Explorer (ODE)",
        provider: "NASA PDS Geosciences / WUSTL",
        targetBody: "Mars",
        category: "mars",
        parameter: "Multi-Mission Geodesy & Spectroscopy",
        dataTypes: ["Multi-Mission Geodesy", "PDS Query Index"],
        resolution: "Sub-Meter to 100m Multi-Resolution",
        status: "Verified Archive",
        feed: true,
        portalUrl: "https://ode.rsl.wustl.edu/mars/mapsearch",
        description:
            "Integrated PDS Geosciences Node spatial search portal indexing MRO HiRISE, CRISM, CTX, Mars Express, and Viking orbital observations.",
    },
    {
        id: "mgs-mola",
        name: "Mars Global Surveyor MOLA (MGS MOLA)",
        provider: "NASA PDS / GSFC",
        targetBody: "Mars",
        category: "mars",
        parameter: "Topography & Planetary Datum",
        dataTypes: ["Topography & Slope", "Laser Altimetry DEM"],
        resolution: "463m Global DEM (128 px/deg)",
        status: "Verified Archive",
        feed: true,
        portalUrl:
            "https://pds-geosciences.wustl.edu/missions/mgs/mola.html",
        description:
            "Mars Orbiter Laser Altimeter precision global topographic datum and slope profiles used as the reference elevation baseline for Martian analogs.",
    },
];

/**
 * Set of built-in official archive IDs used to distinguish canonical NASA/PDS
 * datasets from custom researcher-added sources.
 */
const DEFAULT_ARCHIVE_IDS = new Set(DEFAULT_PLANETARY_ARCHIVES.map((item) => item.id));

/**
 * Safely reads user-created custom planetary archives from `localStorage`.
 *
 * @returns {Array<Object>} List of custom data sources persisted locally.
 */
const readCustomSourcesFromStorage = () => {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(CUSTOM_DATA_SOURCES_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn("Unable to read custom data sources from localStorage:", error);
        return [];
    }
};

/**
 * Safely serializes and persists custom planetary archives to `localStorage`.
 *
 * @param {Array<Object>} sources - Custom data source records to persist.
 */
const writeCustomSourcesToStorage = (sources) => {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(
            CUSTOM_DATA_SOURCES_STORAGE_KEY,
            JSON.stringify(Array.isArray(sources) ? sources : [])
        );
    } catch (error) {
        console.warn("Unable to write custom data sources to localStorage:", error);
    }
};

/**
 * Reconciles backend MongoDB records with the authoritative 10 official datasets
 * so any legacy placeholder items or missing scientific parameters/resolutions
 * are cleanly normalized while preserving user-added custom archives.
 *
 * @param {Array<Object>} serverRecords - Records fetched from MongoDB API.
 * @returns {Array<Object>} Normalized list of planetary archives.
 */
const reconcileOfficialCatalog = (serverRecords) => {
    const officialById = new Map(
        DEFAULT_PLANETARY_ARCHIVES.map((item) => [item.id, item])
    );

    const customFromServer = (Array.isArray(serverRecords) ? serverRecords : []).filter(
        (item) => {
            if (!item || !item.id) return Boolean(item?.name);
            return !officialById.has(item.id) && !LEGACY_PLACEHOLDER_IDS.has(item.id);
        }
    );

    const officialFromServer = DEFAULT_PLANETARY_ARCHIVES.map((official) => {
        const match = (Array.isArray(serverRecords) ? serverRecords : []).find(
            (item) => item?.id === official.id
        );
        if (!match) return official;
        // Enforce authoritative scientific parameters and portal links
        return {
            ...official,
            ...match,
            name: official.name,
            provider: official.provider,
            targetBody: official.targetBody,
            category: official.category,
            parameter: official.parameter,
            resolution: official.resolution,
            portalUrl: official.portalUrl,
        };
    });

    return [...officialFromServer, ...customFromServer];
};

/**
 * Deduplicates and merges primary planetary archive sources with fallback or
 * custom localStorage sources by ID or name.
 *
 * @param {Array<Object>} primaryList - Authoritative or server datasets.
 * @param {Array<Object>} secondaryList - Locally persisted or fallback datasets.
 * @returns {Array<Object>} Merged deduplicated array.
 */
const mergeDatasets = (primaryList, secondaryList) => {
    const merged = [];
    const seen = new Set();

    const addIfUnique = (item) => {
        if (!item || !item.name) return;
        const key = String(item._id || item.id || item.name).toLowerCase();
        const nameKey = item.name.toLowerCase();
        if (seen.has(key) || seen.has(nameKey)) return;
        seen.add(key);
        seen.add(nameKey);
        merged.push(item);
    };

    (Array.isArray(primaryList) ? primaryList : []).forEach(addIfUnique);
    (Array.isArray(secondaryList) ? secondaryList : []).forEach(addIfUnique);

    return merged;
};

/**
 * ============================================================================
 * DataServerPage Component
 * ============================================================================
 * Clean Open Planetary & Earth Data Archives Directory for the NASA Space Apps
 * Challenge ("Identify Earth Locations that Analog the Permanent Moon Base
 * Locations and Mars"):
 * - Displays verified planetary archives from NASA, ESA, ISRO, and USGS.
 * - Shows real Scientific Parameters Measured and Spatial Resolutions on each card.
 * - Provides direct "Open Official Archive ↗" deep-links to official archives.
 * - Supports adding custom data sources (NASA, ESA, ISRO, JAXA, USGS, local STAC/COG).
 * - Deep-space palette design tokens:
 *   - Page Background: `#07090E` with starlight typography `#F1EEE9`
 *   - Card Surfaces: `#0B0E13` with border `#21242C` and hover `#83CAD8`/50
 *   - Category Filters: `#1A1D23` with `#F1EEE9`
 *   - Integrated Footer: `#0B0E13` with primary action button `#83CAD8`
 */
const DataServerPage = () => {
    // ------------------------------------------------------------------------
    // 1. Planetary Datasets Collection State (MongoDB + Static Fallback)
    // ------------------------------------------------------------------------
    /** Active dataset list hydrated from MongoDB or default archives + localStorage. */
    const [datasets, setDatasets] = useState([]);

    /** Loading indicator for initial database/fallback hydration. */
    const [loadingDatasets, setLoadingDatasets] = useState(true);

    // ------------------------------------------------------------------------
    // 2. Filter, Search & Custom Ingestion Modal State Variables
    // ------------------------------------------------------------------------
    /** Active planetary category filter ("all", "moon", "mars", "earth", "feeds"). */
    const [activeCategory, setActiveCategory] = useState("all");

    /** Free-text search query matching dataset name, provider, body, or data types. */
    const [searchQuery, setSearchQuery] = useState("");

    /** Ingestion modal open/close toggle state for adding custom sources. */
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    /** Controlled form input for custom dataset name. */
    const [customSourceName, setCustomSourceName] = useState("");

    /** Controlled form input for agency or institutional provider. */
    const [customProvider, setCustomProvider] = useState("");

    /** Controlled form input for target planetary body ("Moon", "Mars", "Earth"). */
    const [customTargetBody, setCustomTargetBody] = useState("Mars");

    /** Controlled form input for scientific parameter measured. */
    const [customParameter, setCustomParameter] = useState("");

    /** Controlled form input for spatial resolution. */
    const [customResolution, setCustomResolution] = useState("");

    /** Controlled form input for STAC/COG or archive portal URL. */
    const [customEndpoint, setCustomEndpoint] = useState("");

    // ------------------------------------------------------------------------
    // 3. Data Fetching Effects (GET /data-sources with Automatic Fallback)
    // ------------------------------------------------------------------------
    useEffect(() => {
        let isMounted = true;
        const localCustomSources = readCustomSourcesFromStorage();

        // Query live data sources catalog from Express/MongoDB backend
        fetch(`${API_BASE_URL}/data-sources`)
            .then((res) => {
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }
                return res.json();
            })
            .then((data) => {
                if (!isMounted) return;
                if (Array.isArray(data) && data.length > 0) {
                    // Reconcile official 10 NASA/PDS datasets and merge local custom sources
                    const reconciled = reconcileOfficialCatalog(data);
                    setDatasets(mergeDatasets(reconciled, localCustomSources));
                } else {
                    // Empty server response: serve official defaults + local custom sources
                    setDatasets(
                        mergeDatasets(localCustomSources, DEFAULT_PLANETARY_ARCHIVES)
                    );
                }
            })
            .catch((err) => {
                // Backend unreachable (e.g. static host): serve official defaults + local custom sources
                console.debug(
                    "Using static planetary archives fallback:",
                    err?.message || err
                );
                if (isMounted) {
                    setDatasets(
                        mergeDatasets(localCustomSources, DEFAULT_PLANETARY_ARCHIVES)
                    );
                }
            })
            .finally(() => {
                if (isMounted) setLoadingDatasets(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    // ------------------------------------------------------------------------
    // 4. Category Filter Definitions
    // ------------------------------------------------------------------------
    const categoryPills = [
        { id: "all", label: "All Sources" },
        { id: "moon", label: "Moon Archives" },
        { id: "mars", label: "Mars Missions" },
        { id: "earth", label: "Earth Remote Sensing" },
        { id: "feeds", label: "Active Feeds" },
    ];

    // ------------------------------------------------------------------------
    // 5. Dataset Filtering Logic
    // ------------------------------------------------------------------------
    /** Computes filtered datasets list based on active category and text query. */
    const filteredDatasets = useMemo(() => {
        return datasets.filter((item) => {
            const body = item.targetBody || "";
            const category = item.category || "";

            if (activeCategory === "moon") {
                if (category !== "moon" && !body.includes("Moon")) return false;
            } else if (activeCategory === "mars") {
                if (category !== "mars" && !body.includes("Mars")) return false;
            } else if (activeCategory === "earth") {
                if (category !== "earth" && !body.includes("Earth")) return false;
            } else if (activeCategory === "feeds") {
                if (!item.feed) return false;
            }

            if (searchQuery.trim()) {
                const query = searchQuery.trim().toLowerCase();
                const nameMatch = (item.name || "").toLowerCase().includes(query);
                const providerMatch = (item.provider || "").toLowerCase().includes(query);
                const bodyMatch = body.toLowerCase().includes(query);
                const parameterMatch = (item.parameter || "").toLowerCase().includes(query);
                const resolutionMatch = (item.resolution || "").toLowerCase().includes(query);
                const typeMatch =
                    Array.isArray(item.dataTypes) &&
                    item.dataTypes.some((t) => t.toLowerCase().includes(query));
                if (
                    !nameMatch &&
                    !providerMatch &&
                    !bodyMatch &&
                    !parameterMatch &&
                    !resolutionMatch &&
                    !typeMatch
                ) {
                    return false;
                }
            }

            return true;
        });
    }, [datasets, activeCategory, searchQuery]);

    // ------------------------------------------------------------------------
    // 6. Custom Source Ingestion Handler (LocalStorage + MongoDB Background)
    // ------------------------------------------------------------------------
    /**
     * Registers a new user-connected planetary archive to state and `localStorage`,
     * and attempts to persist it to MongoDB via `POST /data-sources`.
     * Supports datasets from NASA, ESA, ISRO, JAXA, USGS, or custom local sources.
     */
    const handleAddCustomSource = async (e) => {
        e.preventDefault();
        if (!customSourceName.trim()) {
            toast.warn("Please enter a dataset name.");
            return;
        }

        const localId = `custom-${Date.now()}`;
        const parameterValue = customParameter.trim() || "Topography & Slope";
        const resolutionValue = customResolution.trim() || "30m Global Grid";

        const newSourcePayload = {
            id: localId,
            name: customSourceName.trim(),
            provider:
                customProvider.trim() ||
                "NASA, ESA, ISRO, JAXA, USGS or Custom Contributor",
            targetBody: customTargetBody,
            category: customTargetBody.toLowerCase(),
            parameter: parameterValue,
            dataTypes: [parameterValue, "Planetary Archive"],
            resolution: resolutionValue,
            status: "Custom Archive",
            feed: true,
            description: `User-connected planetary archive for ${customTargetBody} exploration via ${
                customEndpoint.trim() || "direct STAC/COG catalog feed"
            }.`,
            endpoint: customEndpoint.trim(),
            portalUrl: customEndpoint.trim(),
            created_at: new Date().toISOString(),
        };

        let createdDoc = { ...newSourcePayload, _id: localId };

        // Attempt remote MongoDB persistence when backend is accessible
        try {
            const response = await fetch(`${API_BASE_URL}/data-sources`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(newSourcePayload),
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    createdDoc = result.data || {
                        ...newSourcePayload,
                        _id: result.insertedId || localId,
                    };
                }
            }
        } catch (err) {
            console.debug("Backend data-sources POST skipped:", err?.message || err);
        }

        // Persist custom source to localStorage and update active state immediately
        const existingCustom = readCustomSourcesFromStorage();
        writeCustomSourcesToStorage([createdDoc, ...existingCustom]);
        setDatasets((prev) => [createdDoc, ...prev]);

        toast.success(`Custom dataset "${customSourceName}" added to archives!`);

        // Close modal and reset form fields
        setIsAddModalOpen(false);
        setCustomSourceName("");
        setCustomProvider("");
        setCustomParameter("");
        setCustomResolution("");
        setCustomEndpoint("");
    };

    // ------------------------------------------------------------------------
    // 7. Custom Source Deletion Handler (LocalStorage + Quiet DELETE Sync)
    // ------------------------------------------------------------------------
    /**
     * Removes a user-added custom source from state and `localStorage`, and
     * dispatches a quiet `DELETE /data-sources/:id` request to MongoDB.
     *
     * @param {string} datasetId - ID of the dataset to remove.
     * @param {string} datasetName - Display name for confirmation toast.
     */
    const handleDeleteSource = (datasetId, datasetName) => {
        if (!datasetId) return;

        // Remove from React state immediately
        setDatasets((prev) =>
            prev.filter((d) => (d._id || d.id) !== datasetId)
        );

        // Remove from localStorage custom data sources cache
        const updatedCustom = readCustomSourcesFromStorage().filter(
            (d) => (d._id || d.id) !== datasetId
        );
        writeCustomSourcesToStorage(updatedCustom);

        toast.info(`Removed archive "${datasetName}".`);

        // Quietly synchronize deletion with backend if online
        fetch(`${API_BASE_URL}/data-sources/${encodeURIComponent(datasetId)}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
        }).catch(() => {});
    };

    // ------------------------------------------------------------------------
    // 8. Component Render Block
    // ------------------------------------------------------------------------
    return (
        <div className="w-full h-full overflow-y-auto bg-[#07090E] text-[#F1EEE9] select-none px-4 sm:px-6 lg:px-12 py-8 pb-16">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* ========================================================== */}
                {/* 1. Header Section: Title, Mission Scope & Add Source CTA   */}
                {/* ========================================================== */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#21242C] pb-5">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[#83CAD8] uppercase tracking-wider mb-0.5">
                            <Database size={15} />
                            <span>Planetary Data Infrastructure</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-[#F1EEE9] tracking-tight">
                            Data Sources & Planetary Archives
                        </h1>
                        <p className="text-xs text-[#8891A0]">
                            Integrated mission telemetry, topographic DEMs, and orbital datasets from NASA, ESA, ISRO, and USGS.
                        </p>
                    </div>

                    {/* Quick Action: Ingest Custom Source Trigger */}
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-[#83CAD8] hover:opacity-90 text-[#090D15] font-semibold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        >
                            <Plus size={14} className="text-[#090D15]" />
                            <span>+ Add Custom Source</span>
                        </button>
                    </div>
                </div>

                {/* ========================================================== */}
                {/* 2. Filter Toolbar: Category Pills & Search Input           */}
                {/* ========================================================== */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
                    {/* Left: Category Filter Pills */}
                    <div className="flex flex-wrap items-center gap-2">
                        {categoryPills.map((pill) => {
                            const isSelected = activeCategory === pill.id;
                            return (
                                <button
                                    key={pill.id}
                                    type="button"
                                    onClick={() => setActiveCategory(pill.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                                        isSelected
                                            ? "bg-[#1A1D23] border border-[#21242C] text-[#F1EEE9] shadow-sm"
                                            : "bg-[#0B0E13] border border-[#21242C] text-[#8891A0] hover:text-[#F1EEE9]"
                                    }`}
                                >
                                    {pill.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Right: Search Filter Input */}
                    <div className="flex items-center gap-2 w-full md:w-72 bg-[#0B0E13] border border-[#272C34] rounded-lg px-2.5 py-1.5 focus-within:border-[#83CAD8] transition">
                        <Search size={14} className="text-[#8891A0] shrink-0" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter datasets or mission..."
                            className="w-full bg-transparent text-xs text-[#F1EEE9] placeholder-[#8891A0] focus:outline-none"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="text-[#8891A0] hover:text-[#F1EEE9] text-xs cursor-pointer"
                                aria-label="Clear search query"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>
                </div>

                {/* ========================================================== */}
                {/* 3. Dataset Directory Cards Grid                            */}
                {/* ========================================================== */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5 pt-2">
                    {loadingDatasets ? (
                        <div className="col-span-full text-center py-16 text-[#8891A0] text-xs">
                            <RefreshCw
                                size={24}
                                className="animate-spin mx-auto mb-2 text-[#83CAD8]"
                            />
                            <p>Loading planetary datasets...</p>
                        </div>
                    ) : filteredDatasets.length > 0 ? (
                        filteredDatasets.map((dataset) => {
                            const datasetId = dataset._id || dataset.id;
                            const isCustom = !DEFAULT_ARCHIVE_IDS.has(dataset.id);

                            return (
                                <div
                                    key={datasetId}
                                    className="bg-[#0B0E13] border border-[#21242C] rounded-xl p-5 flex flex-col justify-between hover:border-[#83CAD8]/50 transition-all duration-150 shadow-md group relative"
                                >
                                    <div>
                                        {/* Top Row: Mission Name, Provider & Target Body Badge */}
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="min-w-0 pr-2">
                                                <h3 className="text-sm font-semibold text-[#F1EEE9] truncate leading-tight group-hover:text-white transition">
                                                    {dataset.name}
                                                </h3>
                                                <p className="text-xs text-[#8891A0] mt-0.5">
                                                    {dataset.provider}
                                                </p>
                                            </div>

                                            {/* Target Planetary Body Badge & Custom Delete Button */}
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#181A21] border border-[#21242C] text-[#8891A0]">
                                                    {dataset.targetBody}
                                                </span>
                                                {isCustom && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleDeleteSource(
                                                                datasetId,
                                                                dataset.name
                                                            )
                                                        }
                                                        className="text-[#8891A0] hover:text-[#D04D39] p-1 transition cursor-pointer"
                                                        title="Remove custom source"
                                                        aria-label={`Remove custom source ${dataset.name}`}
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Narrative Description */}
                                        <p className="text-[11px] text-[#8891A0] leading-relaxed line-clamp-2 mb-3">
                                            {dataset.description}
                                        </p>

                                        {/* Data Types Tags */}
                                        <div className="flex flex-wrap gap-1.5 mb-4">
                                            {Array.isArray(dataset.dataTypes) &&
                                                dataset.dataTypes.map((type) => (
                                                    <span
                                                        key={type}
                                                        className="px-2 py-0.5 rounded-md text-[10px] bg-[#07090E] border border-[#21242C] text-[#8891A0] font-mono"
                                                    >
                                                        {type}
                                                    </span>
                                                ))}
                                        </div>
                                    </div>

                                    {/* Bottom Telemetry Row: Scientific Parameter, Spatial Resolution & Official Archive Link */}
                                    <div className="border-t border-[#21242C] pt-3 space-y-2 text-xs">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            {/* Scientific Parameter & Spatial Resolution */}
                                            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                                <span className="text-[#8891A0] font-medium">Parameter:</span>
                                                <span className="text-[#83CAD8] font-semibold bg-[#181A21] border border-[#21242C] px-2 py-0.5 rounded">
                                                    {dataset.parameter ||
                                                        (dataset.dataTypes && dataset.dataTypes[0]) ||
                                                        "Topography & Slope"}
                                                </span>
                                                <span className="text-[#8891A0] hidden sm:inline">•</span>
                                                <span className="text-[#8891A0] font-medium">Resolution:</span>
                                                <span className="text-[#F1EEE9] font-mono font-medium">
                                                    {dataset.resolution}
                                                </span>
                                            </div>

                                            {/* External Official Portal Link ("Open Official Archive ↗") */}
                                            {(dataset.portalUrl || dataset.endpoint) && (
                                                <a
                                                    href={dataset.portalUrl || dataset.endpoint}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#83CAD8] hover:text-[#a8dde8] hover:underline transition shrink-0"
                                                >
                                                    <span>Open Official Archive ↗</span>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="col-span-full text-center py-16 px-4 rounded-xl border border-dashed border-[#21242C] text-[#8891A0] text-xs my-6">
                            <Globe2
                                size={32}
                                className="mx-auto opacity-40 mb-2.5 text-[#8891A0]"
                            />
                            <p className="font-medium text-[#F1EEE9] text-sm">
                                No planetary datasets match this filter.
                            </p>
                            <p className="text-[11px] text-[#8891A0] mt-1">
                                Try clearing search terms or switching to &quot;All Sources&quot;.
                            </p>
                        </div>
                    )}
                </div>

                {/* ========================================================== */}
                {/* 4. Open Planetary & Earth Datasets Integrated Footer Block */}
                {/* ========================================================== */}
                <aside
                    aria-label="Planetary telemetry archives overview"
                    className="w-full mt-8 bg-[#0B0E13] border border-[#21242C] rounded-xl px-5 sm:px-6 py-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                    {/* Left: Open Planetary Datasets Summary */}
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#1A1D23] border border-[#21242C] flex items-center justify-center text-[#83CAD8] shrink-0">
                            <Database size={16} />
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm font-semibold text-[#F1EEE9] leading-tight">
                                {filteredDatasets.length} Open Planetary &amp; Earth Datasets Integrated (NASA, ESA, ISRO, USGS &amp; Custom Sources)
                            </p>
                            <p className="text-[11px] text-[#8891A0] mt-0.5">
                                OGC WMS/WMTS endpoints &amp; Cloud-Optimized GeoTIFFs (COG) ready for Moon and Mars analog mission analysis.
                            </p>
                        </div>
                    </div>

                    {/* Right Action: Ingest Custom Source Trigger */}
                    <div className="flex items-center justify-end">
                        <button
                            type="button"
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-[#83CAD8] hover:opacity-90 text-[#090D15] font-semibold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        >
                            <Plus size={14} className="text-[#090D15]" />
                            <span>+ Add Custom Source</span>
                        </button>
                    </div>
                </aside>
            </div>

            {/* ============================================================== */}
            {/* 5. Custom Source Ingestion Modal                               */}
            {/* ============================================================== */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-[#090B10] border border-[#21242C] rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-[#F1EEE9]">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-[#21242C] pb-3">
                            <div className="flex items-center gap-2 text-[#F1EEE9] font-semibold text-sm">
                                <Plus size={16} className="text-[#83CAD8]" />
                                <h3>Connect Custom Planetary Archive</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="text-[#8891A0] hover:text-[#F1EEE9] transition cursor-pointer"
                                aria-label="Close modal"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleAddCustomSource} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block text-[#8891A0] mb-1 font-medium">
                                    Dataset / Mission Name
                                </label>
                                <input
                                    type="text"
                                    value={customSourceName}
                                    onChange={(e) => setCustomSourceName(e.target.value)}
                                    placeholder="e.g. Artemis III South Pole Candidate DEM"
                                    required
                                    className="w-full bg-[#07090E] border border-[#272C34] rounded-lg px-3 py-2 text-[#F1EEE9] focus:outline-none focus:border-[#83CAD8]"
                                />
                            </div>

                            <div>
                                <label className="block text-[#8891A0] mb-1 font-medium">
                                    Agency or Institutional Provider
                                </label>
                                <input
                                    type="text"
                                    value={customProvider}
                                    onChange={(e) => setCustomProvider(e.target.value)}
                                    placeholder="e.g. NASA, ESA, ISRO, JAXA, USGS, or Custom"
                                    className="w-full bg-[#07090E] border border-[#272C34] rounded-lg px-3 py-2 text-[#F1EEE9] focus:outline-none focus:border-[#83CAD8]"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[#8891A0] mb-1 font-medium">
                                        Target Planetary Body
                                    </label>
                                    <select
                                        value={customTargetBody}
                                        onChange={(e) => setCustomTargetBody(e.target.value)}
                                        className="w-full bg-[#07090E] border border-[#272C34] rounded-lg px-3 py-2 text-[#F1EEE9] focus:outline-none focus:border-[#83CAD8]"
                                    >
                                        <option value="Moon" className="bg-[#07090E]">
                                            Moon (Lunar)
                                        </option>
                                        <option value="Mars" className="bg-[#07090E]">
                                            Mars (Martian)
                                        </option>
                                        <option value="Earth" className="bg-[#07090E]">
                                            Earth (Terrestrial Analog)
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[#8891A0] mb-1 font-medium">
                                        Scientific Parameter Measured
                                    </label>
                                    <input
                                        type="text"
                                        value={customParameter}
                                        onChange={(e) => setCustomParameter(e.target.value)}
                                        placeholder="e.g. Topography & Slope"
                                        className="w-full bg-[#07090E] border border-[#272C34] rounded-lg px-3 py-2 text-[#F1EEE9] focus:outline-none focus:border-[#83CAD8]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[#8891A0] mb-1 font-medium">
                                    Spatial Resolution
                                </label>
                                <input
                                    type="text"
                                    value={customResolution}
                                    onChange={(e) => setCustomResolution(e.target.value)}
                                    placeholder="e.g. 30m Global DEM, 100m Lunar Grid"
                                    className="w-full bg-[#07090E] border border-[#272C34] rounded-lg px-3 py-2 text-[#F1EEE9] focus:outline-none focus:border-[#83CAD8]"
                                />
                            </div>

                            <div>
                                <label className="block text-[#8891A0] mb-1 font-medium">
                                    COG, STAC Endpoint, or Portal URL
                                </label>
                                <input
                                    type="url"
                                    value={customEndpoint}
                                    onChange={(e) => setCustomEndpoint(e.target.value)}
                                    placeholder="https://planetary.stac.org/catalog.json"
                                    className="w-full bg-[#07090E] border border-[#272C34] rounded-lg px-3 py-2 text-[#F1EEE9] font-mono focus:outline-none focus:border-[#83CAD8]"
                                />
                            </div>

                            {/* Form Action Buttons */}
                            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#21242C]">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-3.5 py-1.5 rounded-lg border border-[#21242C] text-[#8891A0] hover:text-[#F1EEE9] transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-[#83CAD8] hover:opacity-90 text-[#090D15] font-semibold px-4 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                                >
                                    <CheckCircle2 size={14} />
                                    <span>Register Source</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataServerPage;
