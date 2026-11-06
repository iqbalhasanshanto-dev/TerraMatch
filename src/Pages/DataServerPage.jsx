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
    Trash2,
} from "lucide-react";
import { API_BASE_URL } from "../utils/api";
import { toast } from "react-toastify";

/**
 * ============================================================================
 * DataServerPage Component
 * ============================================================================
 * Elevated Data Sources & Planetary Archives directory, powered 100% dynamically
 * by MongoDB:
 * - Fetches datasets dynamically from GET /data-sources
 * - Modal form connects custom planetary archives directly to MongoDB via POST /data-sources
 * - Dynamically appends new datasets to state and recalculates total storage volume
 * - Deep-space palette design tokens:
 *   - Page Background: `#07090E` with starlight typography `#F1EEE9`
 *   - Card Surfaces: `#0B0E13` with border `#21242C` and hover `#83CAD8`/50
 *   - Active Category Filters: `#1A1D23` with `#F1EEE9`
 *   - Storage Volume Footer: `#0B0E13` with primary action button `#83CAD8`
 */
const DataServerPage = () => {
    // ------------------------------------------------------------------------
    // 1. Planetary Datasets Collection State (MongoDB)
    // ------------------------------------------------------------------------
    // Dynamic dataset documents fetched from MongoDB DataSources collection
    const [datasets, setDatasets] = useState([]);
    // Loading indicator for initial database hydration
    const [loadingDatasets, setLoadingDatasets] = useState(true);

    // ------------------------------------------------------------------------
    // 2. Filter & Search State Variables
    // ------------------------------------------------------------------------
    // Active planetary category filter ("all", "moon", "mars", "earth", "feeds")
    const [activeCategory, setActiveCategory] = useState("all");
    // Text search query matching dataset name, provider, body, or data types
    const [searchQuery, setSearchQuery] = useState("");
    // Ingestion modal open/close toggle state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Form inputs for custom dataset ingestion modal
    const [customSourceName, setCustomSourceName] = useState("");
    const [customProvider, setCustomProvider] = useState("");
    const [customTargetBody, setCustomTargetBody] = useState("Mars");
    const [customEndpoint, setCustomEndpoint] = useState("");

    // ------------------------------------------------------------------------
    // 3. Backend Health Telemetry State
    // ------------------------------------------------------------------------
    // Health check telemetry monitor for API & database connectivity
    const [healthStatus, setHealthStatus] = useState({
        loading: false,
        healthy: true,
        data: null,
    });

    // Pings backend /health endpoint to check server & database status
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

    // ------------------------------------------------------------------------
    // 4. Data Fetching Effects (GET /data-sources & GET /health)
    // ------------------------------------------------------------------------
    // Fetch live data sources from MongoDB on component mount
    useEffect(() => {
        let isMounted = true;

        fetch(`${API_BASE_URL}/data-sources`)
            .then((res) => res.json())
            .then((data) => {
                if (isMounted) {
                    if (Array.isArray(data)) {
                        setDatasets(data);
                    } else {
                        setDatasets([]);
                    }
                }
            })
            .catch((err) => {
                console.error("Failed to load planetary datasets from MongoDB:", err);
            })
            .finally(() => {
                if (isMounted) setLoadingDatasets(false);
            });

        // Initial health check ping
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
    // 5. Category Filter Definitions
    // ------------------------------------------------------------------------
    const categoryPills = [
        { id: "all", label: "All Sources" },
        { id: "moon", label: "Moon Archives" },
        { id: "mars", label: "Mars Missions" },
        { id: "earth", label: "Earth Remote Sensing" },
        { id: "feeds", label: "Active Feeds" },
    ];

    // ------------------------------------------------------------------------
    // 6. Dataset Filtering & Volume Calculations
    // ------------------------------------------------------------------------
    // Computes filtered datasets list based on active category and text query
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
                const typeMatch = Array.isArray(item.dataTypes) && item.dataTypes.some((t) => t.toLowerCase().includes(query));
                if (!nameMatch && !providerMatch && !bodyMatch && !typeMatch) {
                    return false;
                }
            }

            return true;
        });
    }, [datasets, activeCategory, searchQuery]);

    // Recalculates total storage volume dynamically across filtered datasets
    const totalVolumeDisplay = useMemo(() => {
        const totalGB = filteredDatasets.reduce(
            (sum, item) => sum + (Number(item.volumeGigabytes) || 0),
            0
        );
        const inTB = (totalGB / 1000).toFixed(2);
        return `${inTB} TB`;
    }, [filteredDatasets]);

    // ------------------------------------------------------------------------
    // 7. Custom Source Ingestion Handler (POST /data-sources)
    // ------------------------------------------------------------------------
    // Registers a new user-connected archive to MongoDB DataSources collection
    const handleAddCustomSource = async (e) => {
        e.preventDefault();
        if (!customSourceName.trim()) {
            toast.warn("Please enter a dataset name.");
            return;
        }

        const newSourcePayload = {
            name: customSourceName.trim(),
            provider: customProvider.trim() || "Independent Mission Contributor",
            targetBody: customTargetBody,
            category: customTargetBody.toLowerCase(),
            dataTypes: ["Orbital Telemetry", "Planetary DEM"],
            resolution: "Variable / High-Res",
            volumeGigabytes: 250,
            volumeDisplay: "250 GB",
            status: "Live & Synced",
            feed: true,
            description: `User-connected planetary archive for ${customTargetBody} exploration via ${customEndpoint.trim() || "direct STAC catalog feed"}.`,
            endpoint: customEndpoint.trim(),
            created_at: new Date(),
        };

        try {
            const response = await fetch(`${API_BASE_URL}/data-sources`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(newSourcePayload),
            });

            const result = await response.json();
            if (result.success) {
                const createdDoc = result.data || {
                    ...newSourcePayload,
                    _id: result.insertedId || Date.now().toString(),
                };
                // Prepend newly created source directly into state
                setDatasets((prev) => [createdDoc, ...prev]);
                toast.success(`Custom dataset "${customSourceName}" successfully connected to MongoDB!`);
                // Close modal and reset form
                setIsAddModalOpen(false);
                setCustomSourceName("");
                setCustomProvider("");
                setCustomEndpoint("");
            } else {
                toast.error("Failed to connect custom source to database.");
            }
        } catch (err) {
            console.error("Error creating custom data source:", err);
            toast.error("Network error while connecting custom data source.");
        }
    };

    // ------------------------------------------------------------------------
    // 8. Custom Source Deletion Handler (DELETE /data-sources/:id)
    // ------------------------------------------------------------------------
    const handleDeleteSource = (datasetId, datasetName) => {
        if (!datasetId) return;

        fetch(`${API_BASE_URL}/data-sources/${datasetId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    setDatasets((prev) => prev.filter((d) => (d._id || d.id) !== datasetId));
                    toast.info(`Removed archive "${datasetName}".`);
                }
            })
            .catch((err) => {
                console.error("Error deleting source:", err);
                toast.error("Failed to remove data source");
            });
    };

    // ------------------------------------------------------------------------
    // 9. Render
    // ------------------------------------------------------------------------
    return (
        <div className="w-full h-full overflow-y-auto bg-[#07090E] text-[#F1EEE9] select-none px-4 sm:px-6 lg:px-12 py-8 pb-16">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* ========================================================== */}
                {/* 1. Header Section: Title & Subtitle                        */}
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
                            Integrated mission telemetry, topographic DEMs, and orbital datasets stored in MongoDB.
                        </p>
                    </div>

                    {/* Backend Gateway Telemetry Pill */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-[#0B0E13] border border-[#21242C] rounded-lg px-3 py-1.5 text-xs">
                            <span
                                className={`w-2 h-2 rounded-full ${
                                    healthStatus.healthy
                                        ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                                        : "bg-amber-400"
                                }`}
                            />
                            <span className="text-[#F1EEE9] font-medium">
                                {healthStatus.healthy ? "MongoDB & Feeds Online" : "Telemetry Standby"}
                            </span>
                        </div>

                        {/* Status Refresh Trigger */}
                        <button
                            type="button"
                            onClick={pingServer}
                            className="p-1.5 rounded-lg bg-[#0B0E13] border border-[#21242C] text-[#8891A0] hover:text-[#F1EEE9] transition cursor-pointer"
                            title="Ping Telemetry Gateway"
                            aria-label="Ping Telemetry Gateway"
                        >
                            <RefreshCw
                                size={14}
                                className={healthStatus.loading ? "animate-spin text-[#F1EEE9]" : ""}
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
                    {loadingDatasets ? (
                        <div className="col-span-full text-center py-16 text-[#8891A0] text-xs">
                            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-[#83CAD8]" />
                            <p>Loading planetary datasets from MongoDB...</p>
                        </div>
                    ) : filteredDatasets.length > 0 ? (
                        filteredDatasets.map((dataset) => {
                            const datasetId = dataset._id || dataset.id;
                            const isCustom = !dataset.id?.startsWith("mgs") &&
                                             !dataset.id?.startsWith("lro") &&
                                             !dataset.id?.startsWith("hirise") &&
                                             !dataset.id?.startsWith("srtm") &&
                                             !dataset.id?.startsWith("mro") &&
                                             !dataset.id?.startsWith("sentinel") &&
                                             !dataset.id?.startsWith("kaguya") &&
                                             !dataset.id?.startsWith("usgs");

                            return (
                                <div
                                    key={datasetId}
                                    className="bg-[#0B0E13] border border-[#21242C] rounded-xl p-5 flex flex-col justify-between hover:border-[#83CAD8]/50 transition-all duration-150 shadow-md group relative"
                                >
                                    <div>
                                        {/* Top Row: Mission Name & Provider */}
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="min-w-0 pr-2">
                                                <h3 className="text-sm font-semibold text-[#F1EEE9] truncate leading-tight group-hover:text-white transition">
                                                    {dataset.name}
                                                </h3>
                                                <p className="text-xs text-[#8891A0] mt-0.5">
                                                    {dataset.provider}
                                                </p>
                                            </div>

                                            {/* Target Planetary Body Badge */}
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#181A21] border border-[#21242C] text-[#8891A0]">
                                                    {dataset.targetBody}
                                                </span>
                                                {isCustom && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteSource(datasetId, dataset.name)}
                                                        className="text-[#8891A0] hover:text-[#D04D39] p-1 transition cursor-pointer"
                                                        title="Remove custom source"
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

                                    {/* Bottom Telemetry Row: Resolution, Volume & Integration Status */}
                                    <div className="flex items-center justify-between border-t border-[#21242C] pt-3 text-xs">
                                        <div className="flex items-center gap-3 text-[#8891A0] font-mono text-[11px]">
                                            <span>Res: {dataset.resolution}</span>
                                            <span>•</span>
                                            <span className="text-[#F1EEE9] font-semibold">
                                                {dataset.volumeDisplay}
                                            </span>
                                        </div>

                                        {/* Live Status Pill with emerald indicator */}
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-[10px] font-medium">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            <span>{dataset.status || "Live & Synced"}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="col-span-full text-center py-16 px-4 rounded-xl border border-dashed border-[#21242C] text-[#8891A0] text-xs my-6">
                            <Globe2 size={32} className="mx-auto opacity-40 mb-2.5 text-[#8891A0]" />
                            <p className="font-medium text-[#F1EEE9] text-sm">
                                No planetary datasets match this filter.
                            </p>
                            <p className="text-[11px] text-[#8891A0] mt-1">
                                Try clearing search terms or switching to &quot;All Sources&quot;.
                            </p>
                        </div>
                    )}
                </div>

                {/* ============================================================== */}
                {/* 4. Dynamic Telemetry Footer Block                              */}
                {/* ============================================================== */}
                <aside
                    aria-label="Planetary telemetry storage overview"
                    className="w-full mt-8 bg-[#0B0E13] border border-[#21242C] rounded-xl px-5 sm:px-6 py-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                    {/* Left Telemetry Overview */}
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#1A1D23] border border-[#21242C] flex items-center justify-center text-[#83CAD8] shrink-0">
                            <HardDrive size={16} />
                        </div>
                        <div>
                            {/* Dynamically computes active count and total storage volume */}
                            <p className="text-xs sm:text-sm font-semibold text-[#F1EEE9] leading-tight">
                                {filteredDatasets.length} data sources integrated • {totalVolumeDisplay} total volume
                            </p>
                            <p className="text-[11px] text-[#8891A0] mt-0.5">
                                OGC WMS/WMTS endpoints & Cloud-Optimized GeoTIFFs (COG) active in MongoDB.
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
                            <span>Add Custom Source</span>
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
                                    placeholder="e.g. Artemis III Polar Candidate DEM"
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
                                    placeholder="e.g. NASA Goddard / ESA"
                                    className="w-full bg-[#07090E] border border-[#272C34] rounded-lg px-3 py-2 text-[#F1EEE9] focus:outline-none focus:border-[#83CAD8]"
                                />
                            </div>

                            <div>
                                <label className="block text-[#8891A0] mb-1 font-medium">
                                    Target Planetary Body
                                </label>
                                <select
                                    value={customTargetBody}
                                    onChange={(e) => setCustomTargetBody(e.target.value)}
                                    className="w-full bg-[#07090E] border border-[#272C34] rounded-lg px-3 py-2 text-[#F1EEE9] focus:outline-none focus:border-[#83CAD8]"
                                >
                                    <option value="Moon" className="bg-[#07090E]">Moon (Lunar)</option>
                                    <option value="Mars" className="bg-[#07090E]">Mars (Martian)</option>
                                    <option value="Earth" className="bg-[#07090E]">Earth (Terrestrial Analog)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[#8891A0] mb-1 font-medium">
                                    COG or STAC Endpoint URL
                                </label>
                                <input
                                    type="url"
                                    value={customEndpoint}
                                    onChange={(e) => setCustomEndpoint(e.target.value)}
                                    placeholder="https://planetary.stac.org/catalog.json"
                                    className="w-full bg-[#07090E] border border-[#272C34] rounded-lg px-3 py-2 text-[#F1EEE9] font-mono focus:outline-none focus:border-[#83CAD8]"
                                />
                            </div>

                            {/* Form Submit Buttons */}
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
