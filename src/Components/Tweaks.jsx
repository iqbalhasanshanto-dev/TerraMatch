import { Search, Globe, MapPin, Bookmark } from "lucide-react";
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
 */
const Tweaks = () => {
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
        `px-2.5 py-1 rounded-md border text-xs font-medium transition-colors ${
            selected
                ? "bg-primary text-primary-content border-primary"
                : "border-base-300 text-base-content/80 hover:bg-base-200"
        }`;

    return (
        <div className="w-full h-full text-base-content p-3 space-y-4 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-base-300 pb-2">
                <h2 className="text-sm font-semibold tracking-wide">
                    Filter Analog Parameters
                </h2>
            </div>

            {/* Target Body (Moon / Mars) */}
            <div>
                <label className="block text-[10px] font-semibold tracking-wider opacity-70 mb-1">
                    TARGET PLANETARY BODY
                </label>

                <div className="grid grid-cols-2 gap-1 p-0.5 border border-base-300 rounded-lg">
                    {["moon", "mars"].map(item => (
                        <button
                            key={item}
                            onClick={() => setTargetBody(item)}
                            className={`text-xs py-1.5 rounded-md capitalize font-medium transition-colors ${
                                targetBody === item
                                    ? "bg-primary text-primary-content"
                                    : "opacity-75 hover:opacity-100 hover:bg-base-200"
                            }`}
                        >
                            {item}
                        </button>
                    ))}
                </div>
            </div>

            {/* Terrain Type */}
            <div>
                <label className="block text-[10px] font-semibold tracking-wider opacity-70 mb-1">
                    TERRAIN TYPE
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
                <label className="block text-[10px] font-semibold tracking-wider opacity-70 mb-0.5">
                    HUMIDITY
                </label>
                <p className="text-[10px] opacity-60 mb-1.5">
                    Refers to Earth analog climate conditions.
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
                <label className="block text-[10px] font-semibold tracking-wider opacity-70 mb-1">
                    TEMPERATURE
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

            {/* Search and Reset Buttons */}
            <div className="flex items-center gap-2 pt-1">
                <button
                    onClick={handleSearch}
                    className="flex-1 flex items-center justify-center gap-1.5 btn btn-sm btn-primary"
                >
                    <Search size={14} />
                    Apply Filters
                </button>

                <button
                    onClick={handleReset}
                    className="btn btn-sm btn-ghost text-xs"
                >
                    Reset
                </button>
            </div>

            {/* Results List */}
            <div className="border-t border-base-300 pt-3">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-semibold tracking-wider opacity-70">
                        MATCHING SITES ({filteredLoc?.length || 0})
                    </p>
                </div>

                <div className="space-y-2 max-h-[calc(100vh-420px)] overflow-y-auto pr-1">
                    {filteredLoc && filteredLoc.length > 0 ? (
                        filteredLoc.map(location => (
                            <div
                                key={location._id}
                                className="border border-base-300 rounded-xl p-2.5 bg-base-100 shadow-sm"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 shrink-0 border border-base-300 rounded-lg flex items-center justify-center bg-base-200">
                                        <Globe size={16} className="opacity-70" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <Link
                                            to={`/details/${location._id}`}
                                            className="text-xs font-semibold hover:text-primary transition truncate block"
                                        >
                                            {location.name}
                                        </Link>
                                        <p className="text-[11px] opacity-60 truncate">
                                            {location.country}
                                        </p>
                                    </div>

                                    <span className="badge badge-sm badge-neutral font-mono text-[10px]">
                                        {location.similarityScore}%
                                    </span>
                                </div>

                                <div className="flex justify-between items-center border-t border-base-200 mt-2 pt-2 text-[11px]">
                                    <button
                                        onClick={() => handleViewOnMap(location)}
                                        className="flex items-center gap-1 opacity-70 hover:opacity-100 hover:text-primary transition"
                                    >
                                        <MapPin size={12} />
                                        <span>View on map</span>
                                    </button>

                                    <button
                                        onClick={() => handleSave(location)}
                                        className="flex items-center gap-1 text-primary hover:opacity-80 transition"
                                    >
                                        <Bookmark size={12} />
                                        <span>Save</span>
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-xs opacity-50 py-4">
                            No matching candidate locations found.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Tweaks;
