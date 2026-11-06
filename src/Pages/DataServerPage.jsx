import { useState, useMemo, useEffect } from "react";
import {
    Database,
    Globe2,
    Plus,
    CheckCircle2,
    Search,
    RefreshCw,
    X,
    HardDrive,
} from "lucide-react";
import { API_BASE_URL } from "../utils/api";
import { toast } from "react-toastify";

/**
 * ============================================================================
 * Planetary Datasets Catalog
 * ============================================================================
 * Curated planetary archives, digital elevation models (DEMs), spectral
 * surveys, and Earth remote sensing feeds integrated into TerraMatch.
 */
const DATASET_CATALOG = [
    {
        id: "mgs-mola",
        name: "Mars Global Surveyor (MGS MOLA)",
        provider: "NASA JPL",
        targetBody: "Mars",
        category: "mars",
        dataTypes: ["Elevation DEM", "Topography"],
        resolution: "128 px/deg (463 m)",
        volumeGigabytes: 1400,
        volumeDisplay: "1.4 TB",
        status: "Live & Synced",
        feed: true,
        description:
            "Global laser altimetry topographic surface map used as the primary planetary elevation and roughness datum for martian analog correlation.",
    },
    {
        id: "lro-lola",
        name: "Lunar Reconnaissance Orbiter (LRO LOLA)",
        provider: "NASA GSFC",
        targetBody: "Moon",
        category: "moon",
        dataTypes: ["Altimetry DEM", "Crater Slope"],
        resolution: "5 m/px Polar",
        volumeGigabytes: 820,
        volumeDisplay: "820 GB",
        status: "Live & Synced",
        feed: true,
        description:
            "High-precision laser altimeter datasets evaluating lunar south pole slope gradients and micro-cold-trap illumination environments.",
    },
    {
        id: "hirise-crism",
        name: "HiRISE Mineralogical Imagery (CRISM)",
        provider: "NASA / U. Arizona",
        targetBody: "Mars",
        category: "mars",
        dataTypes: ["Basalt Spectroscopy", "Surface Mineralogy"],
        resolution: "0.25 m/px",
        volumeGigabytes: 2800,
        volumeDisplay: "2.8 TB",
        status: "Live & Synced",
        feed: true,
        description:
            "Hyperspectral infrared reflectance and visual orthomosaics identifying phyllosilicates, olivine, and sulfates across candidate martian landing zones.",
    },
    {
        id: "srtm-elevation",
        name: "Shuttle Radar Topography Mission (SRTM)",
        provider: "USGS / NASA",
        targetBody: "Earth",
        category: "earth",
        dataTypes: ["Elevation DEM", "Geomorphology"],
        resolution: "30 m/px Global",
        volumeGigabytes: 340,
        volumeDisplay: "340 GB",
        status: "Live & Synced",
        feed: false,
        description:
            "Global digital elevation models for Earth field research sites, enabling multi-scale slope matching with extraterrestrial test polygons.",
    },
    {
        id: "mro-sharad",
        name: "Mars Reconnaissance Orbiter (SHARAD)",
        provider: "ASI / NASA JPL",
        targetBody: "Mars",
        category: "mars",
        dataTypes: ["Radar Sounding", "Subsurface Ice"],
        resolution: "15 m Depth",
        volumeGigabytes: 460,
        volumeDisplay: "460 GB",
        status: "Live & Synced",
        feed: true,
        description:
            "Subsurface sounding radar data mapping shallow glaciers and permafrost sheets analogous to high-latitude terrestrial polar permafrost.",
    },
    {
        id: "sentinel-2",
        name: "Copernicus Sentinel-2 Surface Reflectance",
        provider: "ESA",
        targetBody: "Earth",
        category: "earth",
        dataTypes: ["Multispectral", "Vegetation Index"],
        resolution: "10 m Multispectral",
        volumeGigabytes: 1100,
        volumeDisplay: "1.1 TB",
        status: "Live & Synced",
        feed: true,
        description:
            "High-cadence multispectral surface observation monitoring aridity extremes, soil moisture, and sparse vegetation at Earth analog proving grounds.",
    },
    {
        id: "kaguya-selene",
        name: "Kaguya (SELENE) Terrain Camera Archive",
        provider: "JAXA",
        targetBody: "Moon",
        category: "moon",
        dataTypes: ["Stereo DEM", "Lava Tube Skylights"],
        resolution: "10 m Global",
        volumeGigabytes: 520,
        volumeDisplay: "520 GB",
        status: "Live & Synced",
        feed: false,
        description:
            "Lunar surface stereo photogrammetry documenting mare basalt collapse pits and lava tube entrances for subterranean planetary habitat modeling.",
    },
    {
        id: "usgs-astrogeology",
        name: "USGS Planetary GIS & Geologic Mapping",
        provider: "USGS Astrogeology",
        targetBody: "Moon & Mars",
        category: "moon",
        dataTypes: ["Stratigraphy", "Impact Breccia"],
        resolution: "1:5,000,000 Global",
        volumeGigabytes: 180,
        volumeDisplay: "180 GB",
        status: "Live & Synced",
        feed: false,
        description:
            "Standardized geological callsets classifying impact melt sheets, regolith breccia, and volcanic basalt stratigraphy across lunar and martian bodies.",
    },
];

/**
 * ============================================================================
 * DataServerPage Component
 * ============================================================================
 * Elevated Data Sources & Planetary Archives directory. Provides multi-category
 * filtering across Moon archives, Mars missions, and Earth remote sensing feeds,
 * paired with backend API status telemetry and a custom source ingestion trigger.
 */
const DataServerPage = () => {
    // ------------------------------------------------------------------------
    // 1. Filter & Search State Management
    // ------------------------------------------------------------------------

    // Active category filter pill: 'all' | 'moon' | 'mars' | 'earth' | 'feeds'
    const [activeCategory, setActiveCategory] = useState("all");

    // Text search query for filtering datasets by name, provider, or data type
    const [searchQuery, setSearchQuery] = useState("");

    // Modal state for adding a custom planetary source
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Form inputs for custom dataset ingestion modal
    const [customSourceName, setCustomSourceName] = useState("");
    const [customProvider, setCustomProvider] = useState("");
    const [customTargetBody, setCustomTargetBody] = useState("Mars");
    const [customEndpoint, setCustomEndpoint] = useState("");

    // ------------------------------------------------------------------------
    // 2. Backend Health Telemetry State
    // ------------------------------------------------------------------------
    const [healthStatus, setHealthStatus] = useState({
        loading: false,
        healthy: true,
        data: null,
    });

    /**
     * Checks backend server health and uptime
     */
    const pingServer = () => {
        setHealthStatus((prev) => ({ ...prev, loading: true }));
        fetch(`${API_BASE_URL}/health`)
            .then((res) => res.json())
            .then((data) => {
                setHealthStatus({
                    loading: false,
                    healthy: data.status === "healthy",
                    data,
                });
            })
            .catch(() => {
                setHealthStatus({
                    loading: false,
                    healthy: false,
                    data: null,
                });
            });
    };

    // Ping server health on initial component mount
    useEffect(() => {
        let isMounted = true;
        fetch(`${API_BASE_URL}/health`)
            .then((res) => res.json())
            .then((data) => {
                if (isMounted) {
                    setHealthStatus({
                        loading: false,
                        healthy: data.status === "healthy",
                        data,
                    });
                }
            })
            .catch(() => {
                if (isMounted) {
                    setHealthStatus({
                        loading: false,
                        healthy: false,
                        data: null,
                    });
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    // ------------------------------------------------------------------------
    // 3. Category Filter Definitions
    // ------------------------------------------------------------------------
    const categoryPills = [
        { id: "all", label: "All Sources" },
        { id: "moon", label: "Moon Archives" },
        { id: "mars", label: "Mars Missions" },
        { id: "earth", label: "Earth Remote Sensing" },
        { id: "feeds", label: "Active Feeds" },
    ];

    // ------------------------------------------------------------------------
    // 4. Dataset Filtering & Volume Calculations
    // ------------------------------------------------------------------------
    const filteredDatasets = useMemo(() => {
        return DATASET_CATALOG.filter((item) => {
            // Category filter logic
            if (activeCategory === "moon") {
                if (item.category !== "moon" && !item.targetBody.includes("Moon")) return false;
            } else if (activeCategory === "mars") {
                if (item.category !== "mars" && !item.targetBody.includes("Mars")) return false;
            } else if (activeCategory === "earth") {
                if (item.category !== "earth" && !item.targetBody.includes("Earth")) return false;
            } else if (activeCategory === "feeds") {
                if (!item.feed) return false;
            }

            // Text search query filter
            if (searchQuery.trim()) {
                const query = searchQuery.trim().toLowerCase();
                const nameMatch = item.name.toLowerCase().includes(query);
                const providerMatch = item.provider.toLowerCase().includes(query);
                const bodyMatch = item.targetBody.toLowerCase().includes(query);
                const typeMatch = item.dataTypes.some((t) => t.toLowerCase().includes(query));
                if (!nameMatch && !providerMatch && !bodyMatch && !typeMatch) {
                    return false;
                }
            }

            return true;
        });
    }, [activeCategory, searchQuery]);

    // Total storage volume calculation in Terabytes
    const totalVolumeDisplay = useMemo(() => {
        const totalGB = filteredDatasets.reduce((sum, item) => sum + item.volumeGigabytes, 0);
        const inTB = (totalGB / 1000).toFixed(2);
        return `${inTB} TB`;
    }, [filteredDatasets]);

    // ------------------------------------------------------------------------
    // 5. Custom Source Ingestion Handler
    // ------------------------------------------------------------------------
    const handleAddCustomSource = (e) => {
        e.preventDefault();
        if (!customSourceName.trim()) {
            toast.warn("Please enter a dataset name.");
            return;
        }

        toast.success(`Custom dataset "${customSourceName}" successfully staged!`);
        setIsAddModalOpen(false);
        setCustomSourceName("");
        setCustomProvider("");
        setCustomEndpoint("");
    };

    // ------------------------------------------------------------------------
    // 6. Render
    // ------------------------------------------------------------------------
    return (
        <div className="w-full h-full overflow-y-auto bg-[#13161c] text-slate-200 select-none px-4 sm:px-6 lg:px-12 py-8 pb-16">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* ========================================================== */}
                {/* 1. Header Section: Title & Subtitle                        */}
                {/* ========================================================== */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[#82a8bf] uppercase tracking-wider mb-0.5">
                            <Database size={15} />
                            <span>Planetary Data Infrastructure</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                            Data Sources & Planetary Archives
                        </h1>
                        <p className="text-xs text-slate-400">
                            Integrated mission telemetry, topographic DEMs, and orbital datasets.
                        </p>
                    </div>

                    {/* Backend Gateway Telemetry Pill */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-[#181f28] border border-[#273240] rounded-lg px-3 py-1.5 text-xs">
                            <span
                                className={`w-2 h-2 rounded-full ${
                                    healthStatus.healthy
                                        ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                                        : "bg-amber-400"
                                }`}
                            />
                            <span className="text-slate-300 font-medium">
                                {healthStatus.healthy ? "API Feeds Online" : "Telemetry Standby"}
                            </span>
                        </div>

                        {/* Status Refresh Trigger */}
                        <button
                            type="button"
                            onClick={pingServer}
                            className="p-1.5 rounded-lg bg-[#181f28] border border-[#273240] text-slate-400 hover:text-white transition cursor-pointer"
                            title="Ping Telemetry Gateway"
                            aria-label="Ping Telemetry Gateway"
                        >
                            <RefreshCw
                                size={14}
                                className={healthStatus.loading ? "animate-spin text-white" : ""}
                            />
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
                                            ? "bg-[#242c37] border border-slate-700 text-white shadow-sm"
                                            : "bg-[#1a212b] border border-[#273240] text-slate-400 hover:text-white"
                                    }`}
                                >
                                    {pill.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Right: Search Filter Input */}
                    <div className="flex items-center gap-2 w-full md:w-72 bg-[#1a212b] border border-[#273240] rounded-lg px-2.5 py-1.5 focus-within:border-slate-500 transition">
                        <Search size={14} className="text-slate-400 shrink-0" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter datasets or mission..."
                            className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="text-slate-500 hover:text-white text-xs cursor-pointer"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>
                </div>

                {/* ========================================================== */}
                {/* 3. Modern Dataset Directory Layout (Cards Grid)           */}
                {/* ========================================================== */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5 pt-2">
                    {filteredDatasets.length > 0 ? (
                        filteredDatasets.map((dataset) => (
                            <div
                                key={dataset.id}
                                className="bg-[#181f28] border border-[#273240] rounded-xl p-5 flex flex-col justify-between hover:border-slate-600/80 transition-all duration-150 shadow-md group"
                            >
                                <div>
                                    {/* Top Row: Mission Name & Provider */}
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-semibold text-white truncate leading-tight group-hover:text-slate-100 transition">
                                                {dataset.name}
                                            </h3>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {dataset.provider}
                                            </p>
                                        </div>

                                        {/* Target Planetary Body Badge */}
                                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#222b37] border border-[#2f3b4c] text-slate-300 shrink-0">
                                            {dataset.targetBody}
                                        </span>
                                    </div>

                                    {/* Narrative Description */}
                                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2 mb-3">
                                        {dataset.description}
                                    </p>

                                    {/* Data Types Tags */}
                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        {dataset.dataTypes.map((type) => (
                                            <span
                                                key={type}
                                                className="px-2 py-0.5 rounded-md text-[10px] bg-[#141920] border border-[#2c3542] text-slate-300 font-mono"
                                            >
                                                {type}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Bottom Telemetry Row: Resolution, Volume & Integration Status */}
                                <div className="flex items-center justify-between border-t border-[#232c38] pt-3 text-xs">
                                    <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                                        <span>Res: {dataset.resolution}</span>
                                        <span>•</span>
                                        <span className="text-slate-300 font-semibold">
                                            {dataset.volumeDisplay}
                                        </span>
                                    </div>

                                    {/* Live Status Pill with glowing emerald indicator */}
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-[10px] font-medium">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        <span>{dataset.status}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        /* Empty State when filter yields 0 matches */
                        <div className="col-span-full text-center py-16 px-4 rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs my-6">
                            <Globe2 size={32} className="mx-auto opacity-40 mb-2.5 text-slate-500" />
                            <p className="font-medium text-slate-400 text-sm">
                                No planetary datasets match this filter.
                            </p>
                            <p className="text-[11px] text-slate-500 mt-1">
                                Try clearing search terms or switching to &quot;All Sources&quot;.
                            </p>
                        </div>
                    )}
                </div>

                {/* ============================================================== */}
                {/* 4. Static Telemetry Footer Block                               */}
                {/* ============================================================== */}
                <aside
                    aria-label="Planetary telemetry storage overview"
                    className="w-full mt-8 bg-[#181f28] border border-[#273240] rounded-xl px-5 sm:px-6 py-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                    {/* Left Telemetry Overview */}
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#202936] border border-[#2f3d4e] flex items-center justify-center text-[#82a8bf] shrink-0">
                            <HardDrive size={16} />
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm font-semibold text-white leading-tight">
                                {filteredDatasets.length} data sources integrated • {totalVolumeDisplay} total volume
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                OGC WMS/WMTS endpoints & Cloud-Optimized GeoTIFFs (COG) active.
                            </p>
                        </div>
                    </div>

                    {/* Right Action: Ingest Custom Source Trigger */}
                    <div className="flex items-center justify-end">
                        <button
                            type="button"
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-[#82a8bf] hover:bg-[#97bad0] text-slate-900 font-semibold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        >
                            <Plus size={14} className="text-slate-900" />
                            <span>Add Custom Source</span>
                        </button>
                    </div>
                </aside>
            </div>

            {/* ============================================================== */}
            {/* 5. Custom Source Ingestion Modal                               */}
            {/* ============================================================== */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-[#181f28] border border-[#273240] rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-[#232c38] pb-3">
                            <div className="flex items-center gap-2 text-white font-semibold text-sm">
                                <Plus size={16} className="text-[#82a8bf]" />
                                <h3>Connect Custom Planetary Archive</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="text-slate-400 hover:text-white transition cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleAddCustomSource} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block text-slate-400 mb-1 font-medium">
                                    Dataset / Mission Name
                                </label>
                                <input
                                    type="text"
                                    value={customSourceName}
                                    onChange={(e) => setCustomSourceName(e.target.value)}
                                    placeholder="e.g. Artemis III Polar Candidate DEM"
                                    required
                                    className="w-full bg-[#131820] border border-[#273240] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-slate-500"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-400 mb-1 font-medium">
                                    Agency or Institutional Provider
                                </label>
                                <input
                                    type="text"
                                    value={customProvider}
                                    onChange={(e) => setCustomProvider(e.target.value)}
                                    placeholder="e.g. NASA Goddard / ESA"
                                    className="w-full bg-[#131820] border border-[#273240] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-slate-500"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-400 mb-1 font-medium">
                                    Target Planetary Body
                                </label>
                                <select
                                    value={customTargetBody}
                                    onChange={(e) => setCustomTargetBody(e.target.value)}
                                    className="w-full bg-[#131820] border border-[#273240] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-slate-500"
                                >
                                    <option value="Moon">Moon (Lunar)</option>
                                    <option value="Mars">Mars (Martian)</option>
                                    <option value="Earth">Earth (Terrestrial Analog)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-slate-400 mb-1 font-medium">
                                    COG or STAC Endpoint URL
                                </label>
                                <input
                                    type="url"
                                    value={customEndpoint}
                                    onChange={(e) => setCustomEndpoint(e.target.value)}
                                    placeholder="https://planetary.stac.org/catalog.json"
                                    className="w-full bg-[#131820] border border-[#273240] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-slate-500"
                                />
                            </div>

                            {/* Form Submit Buttons */}
                            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#232c38]">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-3.5 py-1.5 rounded-lg border border-[#273240] text-slate-400 hover:text-white transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-[#82a8bf] hover:bg-[#97bad0] text-slate-900 font-semibold px-4 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5"
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
