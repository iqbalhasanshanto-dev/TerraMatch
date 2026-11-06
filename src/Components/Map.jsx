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
 * analog site markers using Esri World Imagery tiles, styled to match the
 * custom deep-space color tokens:
 * - Map Background: `#07090E`
 * - Custom Bottom-Right Zoom Buttons: `#0B0E13` with `#21242C` border and hover `#1E2129`
 * - Popup Theming: Starlight text `#F1EEE9`, muted metadata `#8891A0`, and `#83CAD8` similarity score
 */
const Map = ({ isSidebarOpen }) => {
    // ------------------------------------------------------------------------
    // 1. Context Subscriptions & Data Hooks
    // ------------------------------------------------------------------------
    const { filteredLoc, mapTarget } = useContext(StateContext);
    const { locData, loading } = useLocations();

    // ------------------------------------------------------------------------
    // 2. DOM & Leaflet Map References
    // ------------------------------------------------------------------------
    const containerRef = useRef(null);
    const mapRef = useRef(null);

    // Global default map center coordinates (equatorial view)
    const defaultPosition = [20.0, 10.0];

    // ------------------------------------------------------------------------
    // 3. Automatic Map Re-rendering on Resize & Sidebar Transition
    // ------------------------------------------------------------------------
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

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

    useEffect(() => {
        if (!mapRef.current) return;

        mapRef.current.invalidateSize({ animate: true });

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
    const handleZoomIn = () => {
        if (mapRef.current) {
            mapRef.current.zoomIn();
        }
    };

    const handleZoomOut = () => {
        if (mapRef.current) {
            mapRef.current.zoomOut();
        }
    };

    if (loading) return <Loader />;

    // ------------------------------------------------------------------------
    // 6. Dataset Resolution
    // ------------------------------------------------------------------------
    const dataToMap = filteredLoc && filteredLoc.length > 0 ? filteredLoc : locData || [];

    // ------------------------------------------------------------------------
    // 7. Render
    // ------------------------------------------------------------------------
    return (
        <div
            ref={containerRef}
            className="relative w-full h-full bg-[#07090E] overflow-hidden select-none"
        >
            {/* Leaflet Satellite Map Container */}
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
                                <div className="p-1 text-[#F1EEE9] min-w-44">
                                    <h4 className="font-bold text-sm text-[#F1EEE9] leading-tight">
                                        {loc.name}
                                    </h4>
                                    <p className="text-xs text-[#8891A0] mb-1.5">{loc.country}</p>
                                    <div className="space-y-0.5 text-[11px] text-[#8891A0] mb-2 border-t border-[#21242C] pt-1.5">
                                        <p>
                                            <span className="font-semibold text-[#F1EEE9]">Climate:</span>{" "}
                                            {loc.environment?.climate || "Extreme Arid"}
                                        </p>
                                        <p>
                                            <span className="font-semibold text-[#F1EEE9]">Similarity:</span>{" "}
                                            <span className="font-mono text-[#83CAD8] font-bold">
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

            {/* Custom Bottom-Right Dark Zoom Controls (bg-[#0B0E13], border-[#21242C]) */}
            <div className="absolute bottom-8 right-4 z-20 flex flex-col gap-1.5 select-none">
                {/* Zoom In Button */}
                <button
                    type="button"
                    onClick={handleZoomIn}
                    className="w-8 h-8 rounded-lg bg-[#0B0E13]/95 backdrop-blur-md border border-[#21242C] text-[#F1EEE9] hover:text-[#83CAD8] hover:border-[#83CAD8]/60 hover:bg-[#1E2129] flex items-center justify-center shadow-xl transition cursor-pointer"
                    title="Zoom in"
                    aria-label="Zoom in"
                >
                    <Plus size={16} />
                </button>

                {/* Zoom Out Button */}
                <button
                    type="button"
                    onClick={handleZoomOut}
                    className="w-8 h-8 rounded-lg bg-[#0B0E13]/95 backdrop-blur-md border border-[#21242C] text-[#F1EEE9] hover:text-[#83CAD8] hover:border-[#83CAD8]/60 hover:bg-[#1E2129] flex items-center justify-center shadow-xl transition cursor-pointer"
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
