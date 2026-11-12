import { useContext, useEffect, useRef, useCallback } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Plus, Minus } from "lucide-react";
import useLocations from "../Hooks/useLocations";
import Loader from "./Loader";
import Modal from "./Modal";
import StateContext from "../States/StateContext";
import {
    formatSurfaceTemp,
    getAnalogCategory,
    getRoversTested,
    getTargetBodyInfo,
} from "../utils/analogSpec";

// ============================================================================
// Leaflet Default Marker Icon Asset Resolution for Vite Bundling
// ============================================================================
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
 * Renders the Esri World Imagery satellite map with interactive markers for
 * Earth-based planetary analog sites, styled with TerraMatch deep-space tokens:
 * - Background Void: `#07090E`
 * - Custom Zoom Controls: `#0B0E13` with `#21242C` border and `#1E2129` hover
 * - Popup Styling: `#F1EEE9` headings, `#8891A0` labels, `#83CAD8` scores
 * - Smooth Fly-To & Auto-Popup:
 *   Maintains `markerRefs.current[locId]` for all markers so updating `mapTarget`
 *   smoothly flies the map (`duration: 1.6`, `easeLinearity: 0.25`) and opens
 *   the target marker's Leaflet `<Popup>` automatically upon arrival.
 * - Marker Click Logging:
 *   Clicking any marker on the map records the site in centralized Recent Searches
 *   (`recordRecentSearch`) and smoothly flies/zooms into that marker.
 */
const Map = ({ isSidebarOpen }) => {
    // ------------------------------------------------------------------------
    // 1. Context Subscriptions & Location Dataset Hook
    // ------------------------------------------------------------------------
    const { filteredLoc, mapTarget, setMapTarget, recordRecentSearch } =
        useContext(StateContext);
    const { locData, loading } = useLocations();

    // ------------------------------------------------------------------------
    // 2. DOM, Leaflet Map & Marker Dictionary References
    // ------------------------------------------------------------------------
    // Container element observed for responsive container resizing
    const containerRef = useRef(null);

    // Leaflet Map instance reference assigned via `<MapContainer ref={mapRef} />`
    const mapRef = useRef(null);

    // Dictionary mapping location IDs (and fallback name keys) to Leaflet Marker refs
    const markerRefs = useRef({});

    // Tracks previous sidebar state so subtle desktop pan only runs on real toggles
    const prevSidebarOpenRef = useRef(isSidebarOpen);

    // Global default map center coordinates (equatorial overview)
    const defaultPosition = [20.0, 10.0];

    // ------------------------------------------------------------------------
    // 3. Helper Function: Target Marker Ref Resolver
    // ------------------------------------------------------------------------
    /**
     * Looks up a rendered Leaflet Marker instance by `locationId` (primary) or
     * `"name:<locationName>"` fallback key inside `markerRefs.current`.
     */
    const resolveTargetMarker = useCallback((target) => {
        if (!target) return null;
        if (target.locationId && markerRefs.current[target.locationId]) {
            return markerRefs.current[target.locationId];
        }
        if (target.name && markerRefs.current[`name:${target.name}`]) {
            return markerRefs.current[`name:${target.name}`];
        }
        return null;
    }, []);

    // ------------------------------------------------------------------------
    // 4. Automatic Map Resize Synchronization (Container & Sidebar Toggle)
    // ------------------------------------------------------------------------
    // Observes map container dimensions so Leaflet tiles adapt seamlessly across breakpoints
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

    // Subtly shifts the visible viewport center on desktop when the overlay drawer toggles
    useEffect(() => {
        const previousState = prevSidebarOpenRef.current;
        prevSidebarOpenRef.current = isSidebarOpen;

        if (!mapRef.current || previousState === isSidebarOpen) return;

        // Only pan subtly on desktop (>= 1024px) where the right drawer overlays the canvas
        if (typeof window !== "undefined" && window.innerWidth >= 1024) {
            mapRef.current.panBy([isSidebarOpen ? 160 : -160, 0], {
                animate: true,
                duration: 0.3,
            });
        }
    }, [isSidebarOpen]);

    // ------------------------------------------------------------------------
    // 5. Smooth Fly-To Animation & Auto-Open Marker Popup Effect
    // ------------------------------------------------------------------------
    // Triggers whenever `mapTarget` (including `mapTarget.timestamp`) updates
    useEffect(() => {
        if (!mapTarget || !mapRef.current || loading) return;

        const map = mapRef.current;
        const { latitude, longitude, zoom = 11 } = mapTarget;

        if (typeof latitude !== "number" || typeof longitude !== "number") return;

        let isCancelled = false;
        let popupOpened = false;

        /**
         * Opens the Leaflet popup for the target location once the camera finishes flying.
         */
        const openTargetPopup = () => {
            if (isCancelled || popupOpened) return;
            const targetMarker = resolveTargetMarker(mapTarget);
            if (targetMarker && typeof targetMarker.openPopup === "function") {
                popupOpened = true;
                targetMarker.openPopup();
            }
        };

        // Check whether the viewport is already positioned at the requested target
        const currentCenter = map.getCenter();
        const isAlreadyAtTarget =
            Math.abs(currentCenter.lat - latitude) < 0.0005 &&
            Math.abs(currentCenter.lng - longitude) < 0.0005 &&
            Math.abs(map.getZoom() - zoom) < 0.05;

        // Initiate smooth Leaflet camera flight to the selected coordinates
        map.flyTo([latitude, longitude], zoom, {
            animate: true,
            duration: 1.6,
            easeLinearity: 0.25,
        });

        // If already centered at this location (e.g. clicking same card twice), open popup promptly
        if (isAlreadyAtTarget) {
            const quickPopupTimer = setTimeout(openTargetPopup, 150);
            return () => {
                isCancelled = true;
                clearTimeout(quickPopupTimer);
            };
        }

        // Attach `moveend` listener AFTER `flyTo` starts so stopping a prior flight cannot fire early
        map.once("moveend", openTargetPopup);

        // Safety fallback timer ensures popup opens even if a short animation skips `moveend`
        const fallbackTimer = setTimeout(openTargetPopup, 1750);

        return () => {
            isCancelled = true;
            map.off("moveend", openTargetPopup);
            clearTimeout(fallbackTimer);
        };
    }, [mapTarget, mapTarget?.timestamp, loading, resolveTargetMarker]);

    // ------------------------------------------------------------------------
    // 6. User Interaction Handlers (Marker Clicks & Custom Zoom Buttons)
    // ------------------------------------------------------------------------
    /**
     * Logs a clicked map marker to centralized Recent Searches and flies smoothly
     * to that marker while ensuring its popup stays centered and open.
     */
    const handleMarkerClick = useCallback(
        (loc) => {
            if (!loc) return;

            // Record clicked marker in centralized Recent Searches (MongoDB + localStorage)
            recordRecentSearch?.(loc);

            // Fly/zoom smoothly to the clicked marker via shared `mapTarget` pipeline
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
                    timestamp: Date.now(),
                });
            }
        },
        [recordRecentSearch, setMapTarget]
    );

    /**
     * Increases map zoom level by one step via the custom bottom-right "+" control.
     */
    const handleZoomIn = () => {
        if (mapRef.current) {
            mapRef.current.zoomIn();
        }
    };

    /**
     * Decreases map zoom level by one step via the custom bottom-right "-" control.
     */
    const handleZoomOut = () => {
        if (mapRef.current) {
            mapRef.current.zoomOut();
        }
    };

    // Show loading spinner while initial planetary analog sites fetch completes
    if (loading) return <Loader />;

    // ------------------------------------------------------------------------
    // 7. Active Dataset Resolution
    // ------------------------------------------------------------------------
    // Display filtered subset when search criteria are active; otherwise show all sites
    const dataToMap =
        filteredLoc && filteredLoc.length > 0 ? filteredLoc : locData || [];

    // ------------------------------------------------------------------------
    // 8. Component Render Block
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

                {/* Candidate Planetary Analog Site Markers */}
                {dataToMap.map((loc) => {
                    if (
                        typeof loc?.coordinates?.latitude !== "number" ||
                        typeof loc?.coordinates?.longitude !== "number"
                    ) {
                        return null;
                    }

                    const locId = loc._id || loc.id;
                    const { popupBadges } = getTargetBodyInfo(loc);
                    const surfaceTemp = formatSurfaceTemp(loc);
                    const analogCategory = getAnalogCategory(loc);
                    const roversTested = getRoversTested(loc);

                    return (
                        <Marker
                            key={locId || loc.name}
                            position={[loc.coordinates.latitude, loc.coordinates.longitude]}
                            ref={(instance) => {
                                // Store ref under all canonical keys for reliable popup lookup
                                if (instance) {
                                    if (locId) markerRefs.current[locId] = instance;
                                    if (loc.id) markerRefs.current[loc.id] = instance;
                                    if (loc.name) {
                                        markerRefs.current[`name:${loc.name}`] = instance;
                                    }
                                } else {
                                    if (locId) delete markerRefs.current[locId];
                                    if (loc.id) delete markerRefs.current[loc.id];
                                    if (loc.name) {
                                        delete markerRefs.current[`name:${loc.name}`];
                                    }
                                }
                            }}
                            eventHandlers={{
                                click: () => handleMarkerClick(loc),
                            }}
                        >
                            {/* Deep-Space Styled Scientific Analog Site Summary Popup */}
                            <Popup className="terramatch-popup">
                                <div className="p-1 text-[#F1EEE9] min-w-52 max-w-64">
                                    <h4 className="font-bold text-sm text-[#F1EEE9] leading-tight">
                                        {loc.name}
                                    </h4>
                                    <p className="text-xs text-[#8891A0] mb-1.5">
                                        {loc.country}
                                    </p>

                                    {/* Color-Coded Target Match Badges (`MARS ANALOG` / `MOON ANALOG`) */}
                                    <div className="flex flex-wrap items-center gap-1 mb-2">
                                        {popupBadges.map((badge) => (
                                            <span
                                                key={badge.label}
                                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${badge.className}`}
                                            >
                                                {badge.label}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Real Scientific Telemetry & Mission History */}
                                    <div className="space-y-1 text-[11px] text-[#8891A0] mb-2 border-t border-[#21242C] pt-1.5">
                                        <p>
                                            <span className="font-semibold text-[#F1EEE9]">
                                                Surface Temp:
                                            </span>{" "}
                                            <span className="font-mono text-[#83CAD8] font-bold">
                                                {surfaceTemp}
                                            </span>
                                        </p>
                                        <p>
                                            <span className="font-semibold text-[#F1EEE9]">
                                                Climate &amp; Humidity:
                                            </span>{" "}
                                            <span className="capitalize">
                                                {loc.environment?.climate || "Hyper-arid"}
                                            </span>
                                        </p>
                                        <p>
                                            <span className="font-semibold text-[#F1EEE9]">
                                                Primary Focus:
                                            </span>{" "}
                                            {analogCategory}
                                        </p>
                                        <p className="leading-snug">
                                            <span className="font-semibold text-[#F1EEE9]">
                                                Rovers/Missions Tested:
                                            </span>{" "}
                                            {roversTested}
                                        </p>
                                    </div>
                                    <Modal loc={loc} />
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            {/* Custom Bottom-Right Dark Zoom Controls (Shifts smoothly around overlay drawer) */}
            <div
                className={`absolute bottom-8 z-20 flex flex-col gap-1.5 select-none transition-all duration-300 ${
                    isSidebarOpen ? "lg:right-[24.5rem] right-4" : "right-4"
                }`}
            >
                {/* Zoom In Button */}
                <button
                    type="button"
                    onClick={handleZoomIn}
                    className="w-8 h-8 rounded-lg bg-[#0B0E13]/95 backdrop-blur-md border border-[#21242C] text-[#F1EEE9] hover:text-[#83CAD8] hover:border-[#83CAD8]/60 hover:bg-[#1E2129] flex items-center justify-center shadow-xl transition cursor-pointer"
                    title="Zoom in"
                    aria-label="Zoom in"
                >
                    <Plus size={16} aria-hidden="true" />
                </button>

                {/* Zoom Out Button */}
                <button
                    type="button"
                    onClick={handleZoomOut}
                    className="w-8 h-8 rounded-lg bg-[#0B0E13]/95 backdrop-blur-md border border-[#21242C] text-[#F1EEE9] hover:text-[#83CAD8] hover:border-[#83CAD8]/60 hover:bg-[#1E2129] flex items-center justify-center shadow-xl transition cursor-pointer"
                    title="Zoom out"
                    aria-label="Zoom out"
                >
                    <Minus size={16} aria-hidden="true" />
                </button>
            </div>
        </div>
    );
};

export default Map;
