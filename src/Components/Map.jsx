import { useContext, useEffect, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Plus, Minus } from "lucide-react";
import useLocations from "../Hooks/useLocations";
import Loader from "./Loader";
import Modal from "./Modal";
import StateContext from "../States/StateContext";

// Fix for default Leaflet icon paths in Vite/React bundling
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

/**
 * ============================================================================
 * Map Component
 * ============================================================================
 * Renders the realistic satellite imagery world map with candidate planetary
 * analog site markers using Esri World Imagery tiles.
 *
 * Key Capabilities & Fixes:
 * 1. Automatic Tile Re-rendering on Resize:
 *    Uses a `ResizeObserver` and an effect monitoring `isSidebarOpen` to call
 *    `mapRef.current.invalidateSize()` both immediately and after sidebar
 *    CSS transition completion (320ms), eliminating the dark unrendered strip bug.
 * 2. Bottom-Right Dark Zoom Controls:
 *    Disables Leaflet's default top-left zoom controls (`zoomControl={false}`)
 *    and provides custom dark-themed `+` and `-` zoom buttons at `bottom-8 right-4`,
 *    which fluidly adapt as the flexbox sidebar expands and collapses.
 * 3. Clean Viewport:
 *    Removed the redundant top-left floating search input; all query filtering
 *    is now consolidated in the dedicated "Find a Match" filter panel (`Tweaks.jsx`).
 */
const Map = ({ isSidebarOpen }) => {
    // ------------------------------------------------------------------------
    // 1. Context Subscriptions & Data Hooks
    // ------------------------------------------------------------------------
    // Filtered candidate locations and target coordinates for smooth map panning
    const { filteredLoc, mapTarget } = useContext(StateContext);

    // Complete list of planetary analog sites loaded from backend or local fallback
    const { locData, loading } = useLocations();

    // ------------------------------------------------------------------------
    // 2. DOM & Leaflet Map References
    // ------------------------------------------------------------------------
    // Reference to the outer wrapper `<div>` observed by ResizeObserver
    const containerRef = useRef(null);

    // Reference to the underlying Leaflet Map instance
    const mapRef = useRef(null);

    // Global default map center coordinates (equatorial view)
    const defaultPosition = [20.0, 10.0];

    // ------------------------------------------------------------------------
    // 3. Automatic Map Re-rendering (Fixes Dark Unrendered Strip Bug)
    // ------------------------------------------------------------------------
    /**
     * Recomputes Leaflet tile coverage whenever the container dimensions change.
     * Prevents the blank dark strip on the right when the sidebar collapses.
     */
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Create ResizeObserver to monitor flex container width changes
        const resizeObserver = new ResizeObserver(() => {
            if (mapRef.current) {
                mapRef.current.invalidateSize({ animate: false });
            }
        });

        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    /**
     * Synchronizes map dimensions when `isSidebarOpen` changes, running both
     * immediately and right after the 300ms CSS slide transition concludes.
     */
    useEffect(() => {
        if (!mapRef.current) return;

        // Immediate invalidation
        mapRef.current.invalidateSize({ animate: true });

        // Delayed invalidation after CSS drawer transition finishes (320ms)
        const transitionTimer = setTimeout(() => {
            if (mapRef.current) {
                mapRef.current.invalidateSize({ animate: true });
            }
        }, 320);

        return () => clearTimeout(transitionTimer);
    }, [isSidebarOpen]);

    // ------------------------------------------------------------------------
    // 4. Smooth Fly-To Animations for External Targets
    // ------------------------------------------------------------------------
    /**
     * Pans and zooms the map smoothly to the selected candidate location
     * when `mapTarget` updates (e.g. clicking "View on map" in recent searches or tweaks).
     */
    useEffect(() => {
        if (mapTarget && mapRef.current) {
            const { latitude, longitude, zoom = 10 } = mapTarget;
            mapRef.current.flyTo([latitude, longitude], zoom, {
                duration: 1.8,
                easeLinearity: 0.25,
            });
        }
    }, [mapTarget]);

    // ------------------------------------------------------------------------
    // 5. Zoom Control Handlers
    // ------------------------------------------------------------------------
    /**
     * Zooms in by 1 step
     */
    const handleZoomIn = () => {
        if (mapRef.current) {
            mapRef.current.zoomIn();
        }
    };

    /**
     * Zooms out by 1 step
     */
    const handleZoomOut = () => {
        if (mapRef.current) {
            mapRef.current.zoomOut();
        }
    };

    if (loading) return <Loader />;

    // ------------------------------------------------------------------------
    // 6. Dataset Resolution
    // ------------------------------------------------------------------------
    // Show filtered locations if active; otherwise show full dataset
    const dataToMap = filteredLoc && filteredLoc.length > 0 ? filteredLoc : locData || [];

    // ------------------------------------------------------------------------
    // 7. Render
    // ------------------------------------------------------------------------
    return (
        <div
            ref={containerRef}
            className="relative w-full h-full bg-[#080d15] overflow-hidden select-none"
        >
            {/* ============================================================== */}
            {/* Leaflet Satellite Map Container (Default Zoom Controls Hidden) */}
            {/* ============================================================== */}
            <MapContainer
                center={defaultPosition}
                zoom={2.5}
                minZoom={2}
                maxZoom={18}
                zoomControl={false}
                scrollWheelZoom={true}
                className="h-full w-full z-10"
                ref={mapRef}
            >
                {/* High-Resolution Esri World Imagery Satellite Tile Layer */}
                <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
                    maxZoom={18}
                />

                {/* Markers for Candidate Planetary Analog Sites */}
                {dataToMap.map((loc) => {
                    if (!loc?.coordinates?.latitude || !loc?.coordinates?.longitude) return null;
                    return (
                        <Marker
                            key={loc._id || loc.id}
                            position={[loc.coordinates.latitude, loc.coordinates.longitude]}
                        >
                            <Popup className="terramatch-popup">
                                <div className="p-1 text-slate-900 min-w-44">
                                    <h4 className="font-bold text-sm text-slate-900 leading-tight">
                                        {loc.name}
                                    </h4>
                                    <p className="text-xs text-slate-600 mb-1.5">{loc.country}</p>
                                    <div className="space-y-0.5 text-[11px] text-slate-700 mb-2 border-t border-slate-200 pt-1.5">
                                        <p>
                                            <span className="font-semibold">Climate:</span>{" "}
                                            {loc.environment?.climate || "Extreme Arid"}
                                        </p>
                                        <p>
                                            <span className="font-semibold">Similarity:</span>{" "}
                                            <span className="font-mono text-slate-900 font-bold">
                                                {loc.similarityScore}%
                                            </span>
                                        </p>
                                    </div>
                                    <Modal loc={loc} />
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            {/* ============================================================== */}
            {/* Custom Bottom-Right Dark Zoom Controls                         */}
            {/* ============================================================== */}
            {/* Positioned at bottom-8 right-4 inside the map viewport so they */}
            {/* automatically shift smoothly as the flexbox sidebar collapses   */}
            <div className="absolute bottom-8 right-4 z-20 flex flex-col gap-1.5 select-none">
                {/* Zoom In Button */}
                <button
                    type="button"
                    onClick={handleZoomIn}
                    className="w-8 h-8 rounded-lg bg-[#151a22]/95 backdrop-blur-md border border-slate-700/80 text-slate-200 hover:text-white hover:border-slate-500 hover:bg-[#1e2530] flex items-center justify-center shadow-xl transition cursor-pointer"
                    title="Zoom in"
                    aria-label="Zoom in"
                >
                    <Plus size={16} />
                </button>

                {/* Zoom Out Button */}
                <button
                    type="button"
                    onClick={handleZoomOut}
                    className="w-8 h-8 rounded-lg bg-[#151a22]/95 backdrop-blur-md border border-slate-700/80 text-slate-200 hover:text-white hover:border-slate-500 hover:bg-[#1e2530] flex items-center justify-center shadow-xl transition cursor-pointer"
                    title="Zoom out"
                    aria-label="Zoom out"
                >
                    <Minus size={16} />
                </button>
            </div>
        </div>
    );
};

export default Map;
