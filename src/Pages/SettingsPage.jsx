import { useState } from "react";
import Container from "../Components/Container";
import { Settings, Sliders, Layers } from "lucide-react";
import { toast } from "react-toastify";

/**
 * SettingsPage Component
 * Configuration preferences for planetary analog mapping, telemetry overlays, and units.
 */
const SettingsPage = () => {
    const [satelliteLayer, setSatelliteLayer] = useState("esri");
    const [units, setUnits] = useState("metric");
    const [autoFly, setAutoFly] = useState(true);
    const [similarityThreshold, setSimilarityThreshold] = useState(70);

    const handleSavePreferences = (e) => {
        e.preventDefault();
        toast.success("Preferences saved successfully!");
    };

    return (
        <Container>
            <div className="py-8 px-4 max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                        <Settings size={16} />
                        <span>Configuration</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Platform Settings</h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Manage mapping providers, analog telemetry criteria, and interface preferences.
                    </p>
                </div>

                <form onSubmit={handleSavePreferences} className="space-y-6">
                    {/* Geospatial Map Settings */}
                    <div className="bg-[#151a22] border border-slate-800 rounded-xl p-5 space-y-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-white">
                            <Layers size={18} className="text-slate-400" />
                            <h3>Geospatial Map Settings</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div>
                                <label className="block text-slate-400 mb-1.5 font-medium">Default Satellite Layer</label>
                                <select
                                    value={satelliteLayer}
                                    onChange={(e) => setSatelliteLayer(e.target.value)}
                                    className="w-full bg-[#1e2530] border border-slate-700/60 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-slate-500"
                                >
                                    <option value="esri">Esri World Imagery (High Resolution)</option>
                                    <option value="osm">OpenStreetMap Standard</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-slate-400 mb-1.5 font-medium">Measurement System</label>
                                <select
                                    value={units}
                                    onChange={(e) => setUnits(e.target.value)}
                                    className="w-full bg-[#1e2530] border border-slate-700/60 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-slate-500"
                                >
                                    <option value="metric">Metric (°C, meters, km)</option>
                                    <option value="imperial">Imperial (°F, feet, miles)</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <div>
                                <p className="text-xs text-slate-300 font-medium">Smooth Map Transitions</p>
                                <p className="text-[11px] text-slate-500">Automatically pan and zoom smoothly when selecting candidate sites.</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={autoFly}
                                onChange={(e) => setAutoFly(e.target.checked)}
                                className="toggle toggle-sm bg-[#1e2530] border-slate-700 checked:bg-slate-300"
                            />
                        </div>
                    </div>

                    {/* Analog Similarity Weights */}
                    <div className="bg-[#151a22] border border-slate-800 rounded-xl p-5 space-y-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-white">
                            <Sliders size={18} className="text-slate-400" />
                            <h3>Analog Similarity Scoring</h3>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400">Minimum Similarity Threshold Filter</span>
                                <span className="text-white font-mono font-medium">{similarityThreshold}%</span>
                            </div>
                            <input
                                type="range"
                                min="50"
                                max="95"
                                value={similarityThreshold}
                                onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
                                className="w-full accent-slate-300"
                            />
                            <p className="text-[11px] text-slate-500">
                                Analog locations scoring below this threshold will be marked low-confidence.
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="submit"
                            className="bg-[#242c37] hover:bg-slate-700 border border-slate-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition shadow-sm"
                        >
                            Save Preferences
                        </button>
                    </div>
                </form>
            </div>
        </Container>
    );
};

export default SettingsPage;
