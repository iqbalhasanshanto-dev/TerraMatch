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

// LocalStorage key for persisting custom data sources.
const CUSTOM_DATA_SOURCES_STORAGE_KEY = "terramatch_custom_data_sources";

// Legacy archive IDs superseded by official datasets.
const LEGACY_PLACEHOLDER_IDS = new Set([
    "hirise-crism",
    "srtm-elevation",
    "mro-sharad",
    "sentinel-2",
    "kaguya-selene",
    "usgs-astrogeology",
]);

// Official Space Apps Challenge resources and authoritative planetary archives.
const DEFAULT_PLANETARY_ARCHIVES = [
    // NASA Earthdata Search & Worldview
    {
        id: "nasadem",
        name: "NASA Earthdata Search (NASADEM Elevation DEM)",
        provider: "NASA Earthdata",
        agency: "NASA",
        agencyBadge: "bg-[#0B3A60]/30 border-[#0B3A60] text-[#83CAD8]",
        targetBody: "Earth",
        category: "earth",
        parameter: "Topography, Terrain & Slope",
        dataTypes: ["Topography & Slope", "Laser & Radar Elevation DEM"],
        resolution: "30m Global DEM",
        status: "Verified Archive",
        feed: true,
        portalUrl: "https://search.earthdata.nasa.gov/",
        description:
            "NASA Earthdata Search gateway integrating NASADEM, MODIS, SMAP, and GPM satellite observations for terrestrial planetary analog characterization.",
    },
    {
        id: "nasa-worldview",
        name: "NASA Worldview (GIBS Satellite Imagery Portal)",
        provider: "NASA EOSDIS / GIBS",
        agency: "NASA",
        agencyBadge: "bg-[#0B3A60]/30 border-[#0B3A60] text-[#83CAD8]",
        targetBody: "Earth",
        category: "earth",
        parameter: "Daily True-Color Satellite Imagery & Surface Reflectance",
        dataTypes: ["True-Color Imagery", "Atmospheric & Surface Layers"],
        resolution: "250m Daily Global Satellite Imagery",
        status: "Verified Archive",
        feed: true,
        portalUrl: "https://worldview.earthdata.nasa.gov/index.html",
        description:
            "Interactive full-resolution satellite imagery browser providing daily true-color and thermal layers (VIIRS, MODIS, AIRS) for Earth analog monitoring.",
    },
    {
        id: "modis-mod11",
        name: "MODIS Land Surface Temperature (MOD11)",
        provider: "NASA Earthdata",
        agency: "NASA",
        agencyBadge: "bg-[#0B3A60]/30 border-[#0B3A60] text-[#83CAD8]",
        targetBody: "Earth",
        category: "earth",
        parameter: "Surface Temperature & Diurnal Extrema",
        dataTypes: ["Surface Temperature", "Thermal Radiometry"],
        resolution: "1 km Daily Thermal Grid",
        status: "Verified Archive",
        feed: true,
        portalUrl:
            "https://search.earthdata.nasa.gov/search?q=MODIS%20Land%20Surface%20Temperature",
        description:
            "Terra and Aqua MODIS thermal infrared land surface temperature observations benchmarking diurnal thermal extremes against Moon and Mars curves.",
    },
    {
        id: "smap-l3",
        name: "SMAP L3 Global Soil Moisture",
        provider: "NASA Earthdata",
        agency: "NASA",
        agencyBadge: "bg-[#0B3A60]/30 border-[#0B3A60] text-[#83CAD8]",
        targetBody: "Earth",
        category: "earth",
        parameter: "Soil Moisture & Desiccation",
        dataTypes: ["Soil Moisture", "L-Band Radiometry"],
        resolution: "9 km Global Radiometer Grid",
        status: "Verified Archive",
        feed: true,
        portalUrl:
            "https://search.earthdata.nasa.gov/search?q=SMAP%20L3%20Soil%20Moisture",
        description:
            "Soil Moisture Active Passive L-band radiometer volumetric soil moisture retrievals quantifying hyper-arid desert desiccation and permafrost water-ice table boundaries.",
    },
    {
        id: "gpm-imerg",
        name: "GPM IMERG Global Precipitation",
        provider: "NASA Earthdata",
        agency: "NASA",
        agencyBadge: "bg-[#0B3A60]/30 border-[#0B3A60] text-[#83CAD8]",
        targetBody: "Earth",
        category: "earth",
        parameter: "Precipitation & Rainfall Rates",
        dataTypes: ["Precipitation & Rainfall", "Multi-Satellite Weathering"],
        resolution: "0.1° (~10 km) Multi-Satellite Grid",
        status: "Verified Archive",
        feed: true,
        portalUrl: "https://search.earthdata.nasa.gov/search?q=GPM%20IMERG",
        description:
            "Integrated Multi-satellitE Retrievals for GPM delivering global precipitation rates to evaluate hydrologic weathering analog limits on Earth.",
    },
    {
        id: "modis-mod09",
        name: "MODIS Surface Reflectance & Albedo (MOD09)",
        provider: "NASA Earthdata",
        agency: "NASA",
        agencyBadge: "bg-[#0B3A60]/30 border-[#0B3A60] text-[#83CAD8]",
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
            "Atmospherically corrected multispectral surface reflectance and albedo characteristics across barren regolith, basaltic flows, and dune fields.",
    },

    // NASA Planetary Data System (PDS) Moon & Mars
    {
        id: "nasa-pds",
        name: "NASA Planetary Data System (PDS — Moon & Mars Archive)",
        provider: "NASA PDS / GSFC",
        agency: "NASA",
        agencyBadge: "bg-[#0B3A60]/30 border-[#0B3A60] text-[#83CAD8]",
        targetBody: "Moon & Mars",
        category: "moon",
        parameter: "Planetary Geodesy, Regolith & Atmospheric Telemetry",
        dataTypes: ["Orbital Archive", "Planetary Telemetry"],
        resolution: "All PDS Mission Nodes",
        status: "Verified Archive",
        feed: true,
        portalUrl: "https://pds.nasa.gov/",
        description:
            "NASA's primary digital planetary archive federating all robotic and human exploration datasets across the Moon and Mars.",
    },
    {
        id: "lro-lola",
        name: "NASA LRO LOLA Lunar Elevation (LRO-L-LOLA-4-GDR-V1.0)",
        provider: "NASA PDS / WUSTL",
        agency: "NASA",
        agencyBadge: "bg-[#0B3A60]/30 border-[#0B3A60] text-[#83CAD8]",
        targetBody: "Moon",
        category: "moon",
        parameter: "Crater Topography, Slope & Polar PSR Relief",
        dataTypes: ["Topography & Slope", "Laser Altimetry DEM"],
        resolution: "5m Polar / 118m Global Laser DEM",
        status: "Verified Archive",
        feed: true,
        portalUrl: "https://pds-geosciences.wustl.edu/missions/lro/",
        description:
            "Lunar Reconnaissance Orbiter Laser Altimeter precision topographic records mapping crater wall slopes, south pole Artemis base locations, and lava tube skylights.",
    },
    {
        id: "lro-diviner",
        name: "NASA LRO Diviner Lunar Radiometer (Polar & Cryogenic Archive)",
        provider: "NASA PDS / UCLA",
        agency: "NASA",
        agencyBadge: "bg-[#0B3A60]/30 border-[#0B3A60] text-[#83CAD8]",
        targetBody: "Moon",
        category: "moon",
        parameter: "Surface Temperature & Polar Cryogenic Cold Traps",
        dataTypes: ["Surface Temperature", "Thermal Radiometry"],
        resolution: "100m Lunar Grid (~128 px/deg)",
        status: "Verified Archive",
        feed: true,
        portalUrl: "https://pds-geosciences.wustl.edu/missions/lro/diviner.htm",
        description:
            "Nine-channel thermal radiometer measuring lunar bolometric brightness temperatures from equatorial noon (390K) to cryogenic polar traps (40K).",
    },
    {
        id: "ch1-m3",
        name: "Chandrayaan-1 Moon Mineralogy Mapper (M3 Bundle)",
        provider: "NASA PDS / ISRO",
        agency: "NASA",
        agencyBadge: "bg-[#0B3A60]/30 border-[#0B3A60] text-[#83CAD8]",
        targetBody: "Moon",
        category: "moon",
        parameter: "Mineralogy, Pyroxene & Polar Water-Ice",
        dataTypes: ["Mineralogy & Water-Ice", "Imaging Spectroscopy"],
        resolution: "140m Hyperspectral Grid",
        status: "Verified Archive",
        feed: true,
        portalUrl:
            "https://pds.nasa.gov/ds-view/pds/viewBundle.jsp?identifier=urn:nasa:pds:ch1_m3",
        description:
            "Visible-to-near-infrared imaging spectrometer identifying anorthosite highlands, mare basalt flows, and surface OH/H2O absorption features.",
    },
    {
        id: "mgs-mola",
        name: "Mars Global Surveyor MOLA & Mars ODE Archive",
        provider: "NASA PDS / GSFC & WUSTL",
        agency: "NASA",
        agencyBadge: "bg-[#4A1D13]/40 border-[#D67051]/60 text-[#D67051]",
        targetBody: "Mars",
        category: "mars",
        parameter: "Topography, Global Datum & Landing Site Relief",
        dataTypes: ["Topography & Slope", "Laser Altimetry DEM"],
        resolution: "463m Global Datum (128 px/deg)",
        status: "Verified Archive",
        feed: true,
        portalUrl: "https://pds-geosciences.wustl.edu/missions/mgs/mola.html",
        description:
            "Mars Orbiter Laser Altimeter global topographic baseline establishing datum elevation, slopes, and crater depths across Martian exploration zones.",
    },
    {
        id: "mars-ode",
        name: "Mars Orbital Data Explorer (ODE — PDS Geosciences)",
        provider: "NASA PDS Geosciences / WUSTL",
        agency: "NASA",
        agencyBadge: "bg-[#4A1D13]/40 border-[#D67051]/60 text-[#D67051]",
        targetBody: "Mars",
        category: "mars",
        parameter: "Multi-Mission Geodesy, Imagery & Spectroscopy Index",
        dataTypes: ["Multi-Mission Geodesy", "PDS Query Index"],
        resolution: "Sub-Meter (HiRISE) to 100m (CRISM/CTX)",
        status: "Verified Archive",
        feed: true,
        portalUrl: "https://ode.rsl.wustl.edu/mars/mapsearch",
        description:
            "Integrated spatial search engine cross-referencing MRO HiRISE, CRISM, CTX, Mars Express, and Viking data for Martian landing site analysis.",
    },

    // CSA RADARSAT Constellation & Open Archives
    {
        id: "csa-rcm",
        name: "CSA RADARSAT Constellation Mission (RCM — C-Band SAR)",
        provider: "Canadian Space Agency (CSA)",
        agency: "CSA",
        agencyBadge: "bg-[#451818]/40 border-[#EF4444]/60 text-[#FCA5A5]",
        targetBody: "Earth",
        category: "earth",
        parameter: "C-Band Synthetic Aperture Radar (Cryosphere & Roughness)",
        dataTypes: ["SAR Radar", "Cryosphere & Roughness"],
        resolution: "1m – 100m Multi-Polarization Radar Modes",
        status: "Verified Archive",
        feed: true,
        portalUrl: "https://donnees-data.asc-csa.gc.ca/en/dataset/rcm",
        description:
            "Three-spacecraft C-band SAR constellation tracking permafrost ice-tables, glacial topography, and micro-relief surface roughness in Canadian Arctic analogs.",
    },
    {
        id: "csa-radarsat1",
        name: "CSA RADARSAT-1 Open Archive (All-Weather SAR)",
        provider: "Canadian Space Agency (CSA)",
        agency: "CSA",
        agencyBadge: "bg-[#451818]/40 border-[#EF4444]/60 text-[#FCA5A5]",
        targetBody: "Earth",
        category: "earth",
        parameter: "Long-Term Polar Cryosphere & Geological Structure",
        dataTypes: ["C-Band SAR", "Historical Polar Baselines"],
        resolution: "8m – 100m Standard & Beam Modes",
        status: "Verified Archive",
        feed: true,
        portalUrl: "https://donnees-data.asc-csa.gc.ca/en/dataset/radarsat1",
        description:
            "Complete open archive of RADARSAT-1 synthetic aperture radar observations capturing 17 years of Arctic cryospheric changes and structural geology.",
    },
    {
        id: "csa-sar-tutorial",
        name: "CSA Synthetic Aperture Radar (SAR) Python & QGIS Workflow",
        provider: "Canadian Space Agency (CSA)",
        agency: "CSA",
        agencyBadge: "bg-[#451818]/40 border-[#EF4444]/60 text-[#FCA5A5]",
        targetBody: "Earth",
        category: "earth",
        parameter: "SAR Polarimetric Processing & Terrain Analysis Tutorial",
        dataTypes: ["Python Pipeline", "QGIS Geospatial Scripts"],
        resolution: "Open-Source Python / QGIS Planetary Pipeline",
        status: "Verified Archive",
        feed: true,
        portalUrl: "https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial",
        description:
            "Official CSA Python and QGIS tutorial series for processing radar backscatter, polarimetry, and surface roughness across Earth analog testbeds.",
    },

    // ESA Copernicus Data Space & Open Science Catalog
    {
        id: "esa-copernicus",
        name: "ESA Copernicus Data Space & Open Science Catalog",
        provider: "European Space Agency (ESA)",
        agency: "ESA",
        agencyBadge: "bg-[#1E1B4B]/40 border-[#6366F1]/60 text-[#A5B4FC]",
        targetBody: "Earth",
        category: "earth",
        parameter: "Multispectral Mineralogy (Sentinel-2) & C-SAR (Sentinel-1)",
        dataTypes: ["Multispectral Imagery", "Interferometric C-SAR"],
        resolution: "10m Multispectral / 5m SAR Spatial Resolution",
        status: "Verified Archive",
        feed: true,
        portalUrl: "https://dataspace.copernicus.eu/",
        description:
            "European Copernicus Earth observation ecosystem delivering open Sentinel-1 SAR backscatter and Sentinel-2 13-band multispectral mineral spectroscopy.",
    },

    // JAXA G-Portal (ALOS PALSAR & GCOM-C)
    {
        id: "jaxa-gportal",
        name: "JAXA G-Portal (ALOS PALSAR L-Band Radar & GCOM-C Cryosphere)",
        provider: "Japan Aerospace Exploration Agency (JAXA)",
        agency: "JAXA",
        agencyBadge: "bg-[#3B1F4B]/40 border-[#A855F7]/60 text-[#D8B4FE]",
        targetBody: "Earth",
        category: "earth",
        parameter: "L-Band Radar Subsurface Penetration & Polar Cryosphere",
        dataTypes: ["L-Band SAR", "Cryosphere & Land Color"],
        resolution: "10m Polarimetric L-Band SAR / 250m Global Color",
        status: "Verified Archive",
        feed: true,
        portalUrl: "https://gportal.jaxa.jp/gpr/index/index",
        description:
            "JAXA satellite portal providing penetrating L-band radar (PALSAR-2) to image sub-sand bedrock and paleochannels, plus GCOM-C cryosphere observations.",
    },
];

// Set of built-in official archive IDs.
const DEFAULT_ARCHIVE_IDS = new Set(DEFAULT_PLANETARY_ARCHIVES.map((item) => item.id));

// Reads custom planetary archives from localStorage.
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

// Serializes and persists custom planetary archives to localStorage.
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

// Reconciles server records with official datasets and normalizes properties.
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
        // Enforce authoritative scientific parameters and links
        return {
            ...official,
            ...match,
            name: official.name,
            provider: official.provider,
            agency: official.agency,
            agencyBadge: official.agencyBadge,
            targetBody: official.targetBody,
            category: official.category,
            parameter: official.parameter,
            resolution: official.resolution,
            portalUrl: official.portalUrl,
        };
    });

    return [...officialFromServer, ...customFromServer];
};

// Merges primary archive sources with fallback or local sources without duplicates.
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

// Planetary and Earth data archives directory component.
const DataServerPage = () => {
    // Planetary datasets collection state
    const [datasets, setDatasets] = useState([]);
    const [loadingDatasets, setLoadingDatasets] = useState(true);

    // Filter, search, and custom ingestion modal state
    const [activeCategory, setActiveCategory] = useState("all");
    const [activeAgency, setActiveAgency] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [customSourceName, setCustomSourceName] = useState("");
    const [customProvider, setCustomProvider] = useState("");
    const [customTargetBody, setCustomTargetBody] = useState("Mars");
    const [customParameter, setCustomParameter] = useState("");
    const [customResolution, setCustomResolution] = useState("");
    const [customEndpoint, setCustomEndpoint] = useState("");

    // Fetches data sources from API with fallback to local defaults
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
                    // Reconcile official datasets and merge custom sources
                    const reconciled = reconcileOfficialCatalog(data);
                    setDatasets(mergeDatasets(reconciled, localCustomSources));
                } else {
                    // Fall back to default archives and local custom sources
                    setDatasets(
                        mergeDatasets(localCustomSources, DEFAULT_PLANETARY_ARCHIVES)
                    );
                }
            })
            .catch((err) => {
                // Fall back to static defaults if backend is unreachable
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

    // Agency and planetary body filter pill definitions
    const agencyPills = [
        { id: "all", label: "All Sources" },
        { id: "nasa", label: "NASA (Earth, Moon & Mars)" },
        { id: "csa", label: "CSA (RADARSAT SAR)" },
        { id: "esa", label: "ESA (Copernicus)" },
        { id: "jaxa", label: "JAXA (G-Portal)" },
    ];

    const categoryPills = [
        { id: "all", label: "All Bodies" },
        { id: "moon", label: "Moon Archives" },
        { id: "mars", label: "Mars Missions" },
        { id: "earth", label: "Earth Remote Sensing" },
    ];

    // Filter datasets by target body, agency, and search query
    const filteredDatasets = useMemo(() => {
        return datasets.filter((item) => {
            const body = (item.targetBody || "").toLowerCase();
            const category = (item.category || "").toLowerCase();
            const itemAgency = (item.agency || item.provider || "").toLowerCase();

            // Filter by target planetary body
            if (activeCategory === "moon") {
                if (category !== "moon" && !body.includes("moon")) return false;
            } else if (activeCategory === "mars") {
                if (category !== "mars" && !body.includes("mars")) return false;
            } else if (activeCategory === "earth") {
                if (category !== "earth" && !body.includes("earth")) return false;
            }

            // Filter by space agency
            if (activeAgency === "nasa") {
                if (!itemAgency.includes("nasa")) return false;
            } else if (activeAgency === "csa") {
                if (!itemAgency.includes("csa") && !itemAgency.includes("canadian")) return false;
            } else if (activeAgency === "esa") {
                if (!itemAgency.includes("esa") && !itemAgency.includes("copernicus")) return false;
            } else if (activeAgency === "jaxa") {
                if (!itemAgency.includes("jaxa") && !itemAgency.includes("japan")) return false;
            }

            // Filter by search query
            if (searchQuery.trim()) {
                const query = searchQuery.trim().toLowerCase();
                const nameMatch = (item.name || "").toLowerCase().includes(query);
                const providerMatch = (item.provider || "").toLowerCase().includes(query);
                const agencyMatch = (item.agency || "").toLowerCase().includes(query);
                const bodyMatch = body.includes(query);
                const parameterMatch = (item.parameter || "").toLowerCase().includes(query);
                const resolutionMatch = (item.resolution || "").toLowerCase().includes(query);
                const typeMatch =
                    Array.isArray(item.dataTypes) &&
                    item.dataTypes.some((t) => t.toLowerCase().includes(query));
                if (
                    !nameMatch &&
                    !providerMatch &&
                    !agencyMatch &&
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
    }, [datasets, activeCategory, activeAgency, searchQuery]);

    // Registers a new user-connected planetary archive
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

        // Attempt backend persistence when accessible
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

        // Persist custom source to localStorage and update state
        const existingCustom = readCustomSourcesFromStorage();
        writeCustomSourcesToStorage([createdDoc, ...existingCustom]);
        setDatasets((prev) => [createdDoc, ...prev]);

        toast.success(`Custom dataset "${customSourceName}" added to archives!`);

        // Close modal and reset form
        setIsAddModalOpen(false);
        setCustomSourceName("");
        setCustomProvider("");
        setCustomParameter("");
        setCustomResolution("");
        setCustomEndpoint("");
    };

    // Removes a user-added custom archive from state and storage
    const handleDeleteSource = (datasetId, datasetName) => {
        if (!datasetId) return;

        // Remove from state immediately
        setDatasets((prev) =>
            prev.filter((d) => (d._id || d.id) !== datasetId)
        );

        // Remove from localStorage
        const updatedCustom = readCustomSourcesFromStorage().filter(
            (d) => (d._id || d.id) !== datasetId
        );
        writeCustomSourcesToStorage(updatedCustom);

        toast.info(`Removed archive "${datasetName}".`);

        // Sync deletion with backend if online
        fetch(`${API_BASE_URL}/data-sources/${encodeURIComponent(datasetId)}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
        }).catch(() => {});
    };

    return (
        <div className="w-full h-full overflow-y-auto bg-[#07090E] text-[#F1EEE9] select-none px-4 sm:px-6 lg:px-12 py-8 pb-16">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header section and add source CTA */}
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

                    {/* Quick action: Ingest custom source */}
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

                {/* Filter toolbar: Agency and category pills with search input */}
                <div className="space-y-3 pt-1">
                    {/* Top Row: Agency Pills (NASA, CSA, ESA, JAXA) & Search Input */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-semibold text-[#8891A0] uppercase tracking-wider mr-1 shrink-0">
                                Agency:
                            </span>
                            {agencyPills.map((pill) => {
                                const isSelected = activeAgency === pill.id;
                                return (
                                    <button
                                        key={pill.id}
                                        type="button"
                                        onClick={() => setActiveAgency(pill.id)}
                                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                            isSelected
                                                ? "bg-[#1A1D23] border border-[#83CAD8] text-[#83CAD8] shadow-sm"
                                                : "bg-[#0B0E13] border border-[#21242C] text-[#8891A0] hover:text-[#F1EEE9]"
                                        }`}
                                    >
                                        {pill.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Search Filter Input */}
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

                    {/* Bottom Row: Target Planetary Body Pills (All, Moon, Mars, Earth) */}
                    <div className="flex flex-wrap items-center gap-1.5 border-t border-[#21242C]/60 pt-2.5">
                        <span className="text-[10px] font-semibold text-[#8891A0] uppercase tracking-wider mr-1 shrink-0">
                            Target Body:
                        </span>
                        {categoryPills.map((pill) => {
                            const isSelected = activeCategory === pill.id;
                            return (
                                <button
                                    key={pill.id}
                                    type="button"
                                    onClick={() => setActiveCategory(pill.id)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                                        isSelected
                                            ? "bg-[#181A21] border border-[#83CAD8]/50 text-[#F1EEE9] shadow-sm font-semibold"
                                            : "bg-[#0B0E13] border border-[#21242C] text-[#8891A0] hover:text-[#F1EEE9]"
                                    }`}
                                >
                                    {pill.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Dataset directory cards grid */}
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

                                            {/* Agency Badge, Target Planetary Body Badge & Custom Delete Button */}
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {dataset.agency && (
                                                    <span
                                                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                            dataset.agencyBadge ||
                                                            "bg-[#181A21] border-[#21242C] text-[#8891A0]"
                                                        }`}
                                                    >
                                                        {dataset.agency}
                                                    </span>
                                                )}
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

                {/* Open planetary and earth datasets footer summary */}
                <aside
                    aria-label="Planetary telemetry archives overview"
                    className="w-full mt-8 bg-[#0B0E13] border border-[#21242C] rounded-xl px-5 sm:px-6 py-5 shadow-md flex flex-col gap-4"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Summary description */}
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#1A1D23] border border-[#21242C] flex items-center justify-center text-[#83CAD8] shrink-0">
                                <Database size={16} />
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm font-semibold text-[#F1EEE9] leading-tight">
                                    {filteredDatasets.length} Open Planetary &amp; Earth Datasets Integrated (NASA, CSA, ESA, JAXA &amp; Custom Sources)
                                </p>
                                <p className="text-[11px] text-[#8891A0] mt-0.5">
                                    OGC WMS/WMTS endpoints, SAR radar archives &amp; Cloud-Optimized GeoTIFFs (COG) ready for Moon and Mars analog mission analysis.
                                </p>
                            </div>
                        </div>

                        {/* Ingest custom source CTA */}
                        <div className="flex items-center justify-end shrink-0">
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

                    {/* Partner attribution notice */}
                    <div className="border-t border-[#21242C] pt-3 text-[11px] text-[#8891A0] leading-relaxed">
                        <p>
                            <strong className="text-[#F1EEE9]">Official 2026 NASA Space Apps Challenge Partner Notice:</strong>{" "}
                            Data resources integrated within TerraMatch include open telemetry, radar, and satellite archives from the{" "}
                            <strong className="text-[#F1EEE9]">Canadian Space Agency (CSA)</strong>,{" "}
                            <strong className="text-[#F1EEE9]">European Space Agency (ESA)</strong>, and{" "}
                            <strong className="text-[#F1EEE9]">Japan Aerospace Exploration Agency (JAXA)</strong>, provided under international open science agreements and the 2026 NASA Space Apps Challenge partnership framework.
                        </p>
                    </div>
                </aside>
            </div>

            {/* Custom source ingestion modal */}
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
