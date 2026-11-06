import { Search, Globe, MapPin, Bookmark, ChevronRight } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import useLocations from "../Hooks/useLocations";
import StateContext from "../States/StateContext";
import useAuth from "../Hooks/useAuth";
import { toast } from "react-toastify";
import { API_BASE_URL } from "../utils/api";
import { Link } from "react-router";

/**
 * Tweaks Component
 * Sidebar filter panel for tailoring search parameters: target planetary body (Moon/Mars),
 * terrain keywords, environmental humidity, and temperature categories.
 * Styled in matching #151a22 dark slate.
 */
const Tweaks = ({ onCollapse, onClose }) => {
    const handleClose = onClose || onCollapse;
    const { locData } = useLocations();
    const { filteredLoc, setFilteredLoc, setMapTarget } = useContext(StateContext);
    const { user } = useAuth();

    // Filter states
    const [targetBody, setTargetBody] = useState("mars");
    const [terrain, setTerrain] = useState("Any");
    const [humidity, setHumidity] = useState("Any");
    const [temperature, setTemperature] = useState("Any");

    // Initialize filtered locations when locData is loaded
    useEffect(() => {
        if (locData && locData.length > 0) {
            setFilteredLoc(locData);
        }
    }, [locData, setFilteredLoc]);

    // Apply combined filter criteria
    const handleSearch = () => {
        let result = [...(locData || [])];

        // 1. Target body filter (Moon or Mars)
        if (targetBody !== "Any") {
            result = result.filter(location =>
                location.analogType?.some(
                    type => type.toLowerCase() === targetBody.toLowerCase()
                )
            );
        }

        // 2. Terrain keywords
        if (terrain !== "Any") {
            const terrainKeywords = {
                Rocky: ["rocky", "rock", "boulder"],
                Sandy: ["sandy", "sand", "desert"],
                Icy: ["icy", "ice", "frozen", "glacier"],
                Volcanic: ["volcanic", "lava", "volcano"],
                Dusty: ["dusty", "dust"],
                Polar: ["polar", "antarctic", "arctic"],
                Canyon: ["canyon", "gorge"]
            };

            const keywords = terrainKeywords[terrain] || [];

            result = result.filter(location =>
                location.terrain?.some(item =>
                    keywords.some(keyword =>
                        item.toLowerCase().includes(keyword)
                    )
                )
            );
        }

        // 3. Environmental Humidity
        if (humidity !== "Any") {
            result = result.filter(location =>
                location.environment?.humidity?.toLowerCase() === humidity.toLowerCase()
            );
        }

        // 4. Environmental Temperature
        if (temperature !== "Any") {
            result = result.filter(location =>
                location.environment?.temperature?.toLowerCase() === temperature.toLowerCase()
            );
        }

        setFilteredLoc(result);
    };

    // Reset filters back to default
    const handleReset = () => {
        setTargetBody("mars");
        setTerrain("Any");
        setHumidity("Any");
        setTemperature("Any");
        setFilteredLoc(locData || []);
    };

    // Save a location directly from the tweaks list
    const handleSave = (location) => {
        if (!user?.email) {
            toast.warn("Please log in to save locations.");
            return;
        }

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
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    toast.success("Location saved to your profile!");
                }
            })
            .catch(err => {
                console.error("Save error:", err);
                toast.error("Failed to save location");
            });
    };

    // Fly map to selected coordinates
    const handleViewOnMap = (location) => {
        if (location?.coordinates?.latitude && location?.coordinates?.longitude) {
            setMapTarget({
                latitude: location.coordinates.latitude,
                longitude: location.coordinates.longitude,
                zoom: 11
            });
        }
    };

    // Button style helper
    const getButtonClass = (selected) =>
        `px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
            selected
                ? "bg-[#242c37] text-white border-slate-600 shadow-sm"
                : "border-slate-800 bg-[#19202a] text-slate-400 hover:text-white hover:bg-slate-800"
        }`;

    return (
        <div className="w-full h-full flex flex-col bg-[#151a22] text-slate-200 select-none">
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-800/80 shrink-0">
                <div className="flex items-center gap-2">
                    <Search size={16} className="text-slate-400" />
                    <h2 className="text-sm font-semibold tracking-tight text-white">
                        Filter Parameters
                    </h2>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleReset}
                        className="text-xs text-slate-400 hover:text-white transition cursor-pointer"
                    >
                        Reset
                    </button>

                    {handleClose && (
                        <button
                            onClick={handleClose}
                            title="Collapse sidebar"
                            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800/60 transition ml-1 cursor-pointer"
                        >
                            <ChevronRight size={16} />
                        </button>
                    )}
                </div>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
                {/* Target Body (Moon / Mars) */}
                <div>
                    <label className="block text-[10px] font-semibold tracking-wider text-slate-400 mb-1.5 uppercase">
                        Target Planetary Body
                    </label>

                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#19202a] border border-slate-800 rounded-lg">
                        {["moon", "mars"].map(item => (
                            <button
                                key={item}
                                onClick={() => setTargetBody(item)}
                                className={`text-xs py-1.5 rounded-md capitalize font-medium transition-colors cursor-pointer ${
                                    targetBody === item
                                        ? "bg-[#242c37] text-white border border-slate-700 shadow-sm"
                                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                                }`}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Terrain Type */}
                <div>
                    <label className="block text-[10px] font-semibold tracking-wider text-slate-400 mb-1.5 uppercase">
                        Terrain Type
                    </label>

                    <div className="flex flex-wrap gap-1.5">
                        {["Any", "Rocky", "Sandy", "Icy", "Volcanic", "Dusty", "Polar", "Canyon"].map(item => (
                            <button
                                key={item}
                                onClick={() => setTerrain(item)}
                                className={getButtonClass(terrain === item)}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Humidity */}
                <div>
                    <label className="block text-[10px] font-semibold tracking-wider text-slate-400 mb-0.5 uppercase">
                        Humidity
                    </label>
                    <p className="text-[10px] text-slate-500 mb-1.5">
                        Earth analog environmental conditions.
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                        {["Any", "Very dry", "Dry", "Moderate", "Humid"].map(item => (
                            <button
                                key={item}
                                onClick={() => setHumidity(item)}
                                className={getButtonClass(humidity === item)}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Temperature */}
                <div>
                    <label className="block text-[10px] font-semibold tracking-wider text-slate-400 mb-1.5 uppercase">
                        Temperature
                    </label>

                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {["Any", "Freezing", "Cold", "Mid", "Hot"].map(item => (
                            <button
                                key={item}
                                onClick={() => setTemperature(item)}
                                className={getButtonClass(temperature === item)}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Search Action Button */}
                <div className="pt-1">
                    <button
                        onClick={handleSearch}
                        className="w-full flex items-center justify-center gap-1.5 bg-[#242c37] border border-slate-700 text-white hover:bg-slate-700 py-2 rounded-lg text-xs font-medium transition cursor-pointer shadow-sm"
                    >
                        <Search size={14} />
                        Apply Filters
                    </button>
                </div>

                {/* Results List */}
                <div className="border-t border-slate-800/80 pt-3">
                    <div className="flex justify-between items-center mb-2.5">
                        <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                            Matching Sites ({filteredLoc?.length || 0})
                        </p>
                    </div>

                    <div className="space-y-2.5 max-h-[calc(100vh-420px)] overflow-y-auto pr-0.5">
                        {filteredLoc && filteredLoc.length > 0 ? (
                            filteredLoc.map(location => (
                                <div
                                    key={location._id || location.name}
                                    className="border border-slate-700/60 rounded-xl p-3 bg-[#1e2530] shadow-sm hover:border-slate-600/80 transition"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 shrink-0 border border-slate-700/50 rounded-lg flex items-center justify-center bg-[#252e3b]">
                                            <Globe size={15} className="text-slate-400" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <Link
                                                to={`/details/${location._id}`}
                                                className="text-xs font-semibold text-white hover:text-slate-300 transition truncate block"
                                            >
                                                {location.name}
                                            </Link>
                                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                                {location.country}
                                            </p>
                                        </div>

                                        <span className="text-xs font-mono text-slate-300 font-medium">
                                            {location.similarityScore}%
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center border-t border-slate-700/40 mt-2.5 pt-2 text-xs">
                                        <button
                                            onClick={() => handleViewOnMap(location)}
                                            className="flex items-center gap-1 text-slate-400 hover:text-white transition cursor-pointer"
                                        >
                                            <MapPin size={12} />
                                            <span>View on map</span>
                                        </button>

                                        <button
                                            onClick={() => handleSave(location)}
                                            className="flex items-center gap-1 text-slate-300 hover:text-white transition cursor-pointer"
                                        >
                                            <Bookmark size={12} />
                                            <span>Save</span>
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-xs text-slate-500 py-6">
                                No matching candidate locations found.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Tweaks;
