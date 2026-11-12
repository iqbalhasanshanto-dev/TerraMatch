import { useState, useContext, useEffect, useRef, useCallback, useMemo } from "react";
import {
    MapContainer,
    Marker,
    Popup,
    TileLayer,
    useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
    Plus,
    Minus,
    Loader2,
    Bookmark,
    Check,
    Mountain,
    Thermometer,
    Droplets,
    Sun,
    X,
} from "lucide-react";
import useLocations from "../Hooks/useLocations";
import useSaved from "../Hooks/useSaved";
import Loader from "./Loader";
import Modal from "./Modal";
import StateContext from "../States/StateContext";
import { analyzeCoordinateTelemetry } from "../utils/earthTelemetryApi";
import {
    formatSurfaceTemp,
    getAnalogCategory,
    getRoversTested,
    getTargetBodyInfo,
} from "../utils/analogSpec";

// ============================================================================
// 1. Leaflet Default Marker Icon Asset Resolution for Vite Bundling
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

// ============================================================================
// 2. Custom Cyan Telemetry Probe Marker Icon (`L.divIcon`)
// ============================================================================

/**
 * Custom glowing cyan radar-reticle marker icon rendered for live probed Earth
 * coordinates and Global Earth Telemetry search targets.
 */
const telemetryProbeIcon = L.divIcon({
    className: "terramatch-telemetry-probe-icon",
    html: `
        <div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
            <span style="position:absolute;inset:0;border-radius:9999px;background:rgba(131,202,216,0.22);border:1.5px solid #83CAD8;box-shadow:0 0 12px rgba(131,202,216,0.75);"></span>
            <span style="width:10px;height:10px;border-radius:9999px;background:#83CAD8;border:2px solid #07090E;"></span>
        </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
});

/**
 * Custom cyan-and-gold orbital discovery beacon icon rendered for non-NASA
 * Earth locations discovered via Whole-Earth Batch Satellite Scan.
 */
const globalDiscoveryIcon = L.divIcon({
    className: "terramatch-global-discovery-icon",
    html: `
        <div style="position:relative;width:26px;height:26px;display:flex;align-items:center;justify-content:center;">
            <span style="position:absolute;inset:0;border-radius:9999px;background:rgba(245,158,11,0.18);border:1.5px solid #83CAD8;box-shadow:0 0 12px rgba(131,202,216,0.7),0 0 6px rgba(245,158,11,0.65);"></span>
            <span style="width:10px;height:10px;border-radius:9999px;background:linear-gradient(135deg,#83CAD8,#F59E0B);border:2px solid #07090E;"></span>
        </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
});

// ============================================================================
// 3. Helper Sub-Component: Leaflet Click-to-Probe Listener
// ============================================================================

/**
 * Listens for map click events inside `<MapContainer>` when Probe Mode is active
 * and forwards clicked `(lat, lng)` coordinates to `onProbeCoordinate`.
 */
const MapClickProbeHandler = ({ isProbeActive, onProbeCoordinate }) => {
    useMapEvents({
        click(event) {
            if (!isProbeActive) return;
            const { lat, lng } = event.latlng;
            onProbeCoordinate(lat, lng);
        },
    });

    return null;
};

/**
 * ============================================================================
 * Map Component
 * ============================================================================
 * Renders the Esri World Imagery satellite map with interactive markers for
 * Earth-based planetary analog sites and a Live Coordinate Telemetry Probe:
 * - Background Void: `#07090E`
 * - Custom Zoom Controls: `#0B0E13` with `#21242C` border and `#1E2129` hover
 * - Popup Styling: `#F1EEE9` headings, `#8891A0` labels, `#83CAD8` scores
 * - Smooth Fly-To & Auto-Popup:
 *   Maintains `markerRefs.current[locId]` for catalog markers and
 *   `probeMarkerRef` for live telemetry markers so updating `mapTarget`
 *   smoothly flies the map and opens the corresponding `<Popup>` on arrival.
 * - Live Coordinate Telemetry Probe (`🛰️ Probe Any Earth Coordinate`):
 *   Allows scientists to click anywhere on the satellite map, drops a custom
 *   cyan telemetry pin, queries Nominatim + Open-Meteo via
 *   `analyzeCoordinateTelemetry(lat, lon)`, and lets them save the site.
 */
const Map = ({ isSidebarOpen }) => {
    // ------------------------------------------------------------------------
    // 1. Context Subscriptions, Auth & Saved Bookmarks Hooks
    // ------------------------------------------------------------------------
    const { filteredLoc, mapTarget, setMapTarget, recordRecentSearch } =
        useContext(StateContext);
    const { locData, loading } = useLocations();
    const { savedLoc, saveLocation } = useSaved();

    // ------------------------------------------------------------------------
    // 2. Live Coordinate Telemetry Probe State Variables
    // ------------------------------------------------------------------------
    /** Toggles click-anywhere Earth telemetry probing mode on the map canvas. */
    const [isProbeActive, setIsProbeActive] = useState(false);

    /**
     * Stores the latest manually probed coordinate state:
     * `{ coordinates, timestamp, isLoading, data, error }`.
     */
    const [localProbe, setLocalProbe] = useState(null);

    /** AbortController ref canceling stale coordinate probe API requests. */
    const probeAbortRef = useRef(null);

    // ------------------------------------------------------------------------
    // 3. DOM, Leaflet Map & Marker Dictionary References
    // ------------------------------------------------------------------------
    /** Container element observed for responsive container resizing. */
    const containerRef = useRef(null);

    /** Leaflet Map instance reference assigned via `<MapContainer ref={mapRef} />`. */
    const mapRef = useRef(null);

    /** Dictionary mapping location IDs (and fallback name keys) to Leaflet Marker refs. */
    const markerRefs = useRef({});

    /** Leaflet Marker ref for the active custom cyan telemetry probe pin. */
    const probeMarkerRef = useRef(null);

    /** Tracks previous sidebar state so subtle desktop pan only runs on real toggles. */
    const prevSidebarOpenRef = useRef(isSidebarOpen);

    /** Global default map center coordinates (equatorial overview). */
    const defaultPosition = [20.0, 10.0];

    // ------------------------------------------------------------------------
    // 4. Derived Saved Keys Lookup & Active Telemetry Pin Resolution
    // ------------------------------------------------------------------------
    /** Fast lookup Set of already-saved location keys for the Save button indicator. */
    const savedLocationIds = useMemo(() => {
        const set = new Set();
        (savedLoc || []).forEach((item) => {
            [item._id, item.locationId, item.id, item.name]
                .filter(Boolean)
                .forEach((key) => set.add(key));
        });
        return set;
    }, [savedLoc]);

    /**
     * Resolves which custom cyan telemetry pin should be displayed on the map:
     * either a manually probed coordinate (`localProbe`) or a Global Earth
     * Telemetry search result selected from `Tweaks.jsx` (`mapTarget.telemetrySite`),
     * prioritizing whichever interaction happened most recently.
     */
    const activeTelemetryPin = useMemo(() => {
        const externalSite = mapTarget?.telemetrySite || null;
        const externalTimestamp = externalSite ? mapTarget?.timestamp || 0 : 0;
        const localTimestamp = localProbe ? localProbe.timestamp || 0 : 0;

        if (!localProbe && !externalSite) {
            return null;
        }

        if (externalSite && externalTimestamp >= localTimestamp) {
            return {
                coordinates: externalSite.coordinates,
                isLoading: false,
                error: null,
                data: externalSite,
                timestamp: externalTimestamp,
            };
        }

        return localProbe;
    }, [localProbe, mapTarget]);

    // Cancel any active telemetry probe request on component unmount
    useEffect(() => {
        return () => {
            if (probeAbortRef.current) {
                probeAbortRef.current.abort();
            }
        };
    }, []);

    // ------------------------------------------------------------------------
    // 5. Helper Function: Target Marker Ref Resolver
    // ------------------------------------------------------------------------
    /**
     * Looks up a rendered Leaflet Marker instance for either a live telemetry
     * target (`probeMarkerRef`) or a catalog location (`markerRefs.current`).
     */
    const resolveTargetMarker = useCallback((target) => {
        if (!target) return null;
        if (target.telemetrySite && probeMarkerRef.current) {
            return probeMarkerRef.current;
        }
        if (target.locationId && markerRefs.current[target.locationId]) {
            return markerRefs.current[target.locationId];
        }
        if (target.name && markerRefs.current[`name:${target.name}`]) {
            return markerRefs.current[`name:${target.name}`];
        }
        return null;
    }, []);

    // ------------------------------------------------------------------------
    // 6. Automatic Map Resize & Cursor Mode Synchronization
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

    // Syncs Leaflet container cursor to crosshair whenever Probe Mode is active
    useEffect(() => {
        if (!mapRef.current) return;
        const mapContainer = mapRef.current.getContainer();
        if (!mapContainer) return;
        mapContainer.style.cursor = isProbeActive ? "crosshair" : "";
        return () => {
            mapContainer.style.cursor = "";
        };
    }, [isProbeActive]);

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
    // 7. Smooth Fly-To Animation & Auto-Open Marker Popup Effect
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

        // If already centered at this location, open popup promptly
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

    // Automatically open the custom cyan probe marker popup immediately when dropped
    useEffect(() => {
        if (!localProbe) return;
        const timer = setTimeout(() => {
            if (
                probeMarkerRef.current &&
                typeof probeMarkerRef.current.openPopup === "function"
            ) {
                probeMarkerRef.current.openPopup();
            }
        }, 60);
        return () => clearTimeout(timer);
    }, [localProbe]);

    // ------------------------------------------------------------------------
    // 8. User Interaction Handlers (Coordinate Probe, Marker Clicks, Save, Zoom)
    // ------------------------------------------------------------------------
    /**
     * Drops a custom cyan telemetry pin at `(lat, lon)`, queries live elevation,
     * temperature, humidity, solar radiation, and place metadata via
     * `analyzeCoordinateTelemetry`, and records the analyzed site in Recent Searches.
     */
    const handleProbeCoordinate = useCallback(
        async (lat, lon) => {
            // Abort any previous in-flight probe lookup
            if (probeAbortRef.current) {
                probeAbortRef.current.abort();
            }
            const controller = new AbortController();
            probeAbortRef.current = controller;

            const probeTimestamp = Date.now();
            setLocalProbe({
                coordinates: { latitude: lat, longitude: lon },
                timestamp: probeTimestamp,
                isLoading: true,
                data: null,
                error: null,
            });

            try {
                const telemetryProfile = await analyzeCoordinateTelemetry(
                    lat,
                    lon,
                    undefined,
                    controller.signal
                );

                setLocalProbe({
                    coordinates: telemetryProfile.coordinates,
                    timestamp: probeTimestamp,
                    isLoading: false,
                    data: telemetryProfile,
                    error: null,
                });

                // Record discovered Earth coordinate in centralized Recent Searches
                recordRecentSearch?.(telemetryProfile);
            } catch (error) {
                if (error?.name === "AbortError") {
                    return;
                }
                console.error("Coordinate telemetry probe error:", error);
                setLocalProbe((prev) =>
                    prev
                        ? {
                              ...prev,
                              isLoading: false,
                              error:
                                  error?.message ||
                                  "Unable to acquire satellite telemetry for this coordinate.",
                          }
                        : null
                );
            }
        },
        [recordRecentSearch]
    );

    /**
     * Saves a probed custom Earth analog coordinate immediately
     * for both authenticated users and guests.
     */
    const handleSaveTelemetrySite = useCallback(
        (site) => {
            if (!site) return;
            saveLocation?.(site);
        },
        [saveLocation]
    );

    /**
     * Clears the active custom telemetry pin from the map.
     */
    const handleDismissTelemetryPin = useCallback(() => {
        if (probeAbortRef.current) {
            probeAbortRef.current.abort();
        }
        setLocalProbe(null);
        if (mapTarget?.telemetrySite) {
            setMapTarget(null);
        }
    }, [mapTarget, setMapTarget]);

    /**
     * Logs a clicked catalog map marker to centralized Recent Searches and flies
     * smoothly to that marker while ensuring its popup stays centered and open.
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

    /** Increases map zoom level by one step via the custom bottom-right `"+"` control. */
    const handleZoomIn = () => {
        if (mapRef.current) {
            mapRef.current.zoomIn();
        }
    };

    /** Decreases map zoom level by one step via the custom bottom-right `"-"` control. */
    const handleZoomOut = () => {
        if (mapRef.current) {
            mapRef.current.zoomOut();
        }
    };

    // Show loading spinner while initial planetary analog sites fetch completes
    if (loading) return <Loader />;

    // ------------------------------------------------------------------------
    // 9. Active Dataset Resolution
    // ------------------------------------------------------------------------
    // Display filtered subset when search criteria are active; otherwise show all sites
    const dataToMap =
        filteredLoc && filteredLoc.length > 0 ? filteredLoc : locData || [];

    // ------------------------------------------------------------------------
    // 10. Component Render Block
    // ------------------------------------------------------------------------
    return (
        <div
            ref={containerRef}
            className="relative w-full h-full bg-[#07090E] overflow-hidden select-none"
        >
            {/* Top-Left Live Coordinate Telemetry Probe Toggle Control */}
            <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => setIsProbeActive((prev) => !prev)}
                    aria-pressed={isProbeActive}
                    className={`bg-[#0B0E13]/95 backdrop-blur-md border text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-2 shadow-xl transition cursor-pointer ${
                        isProbeActive
                            ? "border-[#83CAD8] text-[#83CAD8] shadow-[#83CAD8]/15"
                            : "border-[#21242C] text-[#F1EEE9] hover:border-[#83CAD8]/60 hover:text-[#83CAD8]"
                    }`}
                >
                    <span aria-hidden="true">🛰️</span>
                    <span>Probe Any Earth Coordinate</span>
                    {isProbeActive && (
                        <span className="w-2 h-2 rounded-full bg-[#83CAD8] animate-pulse" />
                    )}
                </button>

                {isProbeActive && (
                    <span className="bg-[#0B0E13]/90 backdrop-blur-md border border-[#83CAD8]/40 text-[#83CAD8] text-[11px] font-mono px-2.5 py-1 rounded-lg shadow-lg">
                        Click anywhere on map
                    </span>
                )}
            </div>

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

                {/* Click-to-Probe Coordinate Event Listener */}
                <MapClickProbeHandler
                    isProbeActive={isProbeActive}
                    onProbeCoordinate={handleProbeCoordinate}
                />

                {/* Custom Cyan Telemetry Probe Pin & Live Scientific Popup */}
                {activeTelemetryPin &&
                    typeof activeTelemetryPin.coordinates?.latitude === "number" &&
                    typeof activeTelemetryPin.coordinates?.longitude === "number" && (
                        <Marker
                            position={[
                                activeTelemetryPin.coordinates.latitude,
                                activeTelemetryPin.coordinates.longitude,
                            ]}
                            icon={telemetryProbeIcon}
                            ref={probeMarkerRef}
                        >
                            <Popup className="terramatch-popup">
                                <div className="p-1 text-[#F1EEE9] min-w-56 max-w-68">
                                    {activeTelemetryPin.isLoading ? (
                                        /* Loading State While Acquiring Nominatim + Open-Meteo Telemetry */
                                        <div className="py-3 flex flex-col items-center justify-center text-center gap-2">
                                            <Loader2
                                                size={18}
                                                className="animate-spin text-[#83CAD8]"
                                                aria-hidden="true"
                                            />
                                            <p className="text-xs font-medium text-[#F1EEE9]">
                                                Analyzing Earth Coordinate...
                                            </p>
                                            <p className="text-[10px] font-mono text-[#8891A0]">
                                                {activeTelemetryPin.coordinates.latitude.toFixed(
                                                    4
                                                )}
                                                °,{" "}
                                                {activeTelemetryPin.coordinates.longitude.toFixed(
                                                    4
                                                )}
                                                °
                                            </p>
                                        </div>
                                    ) : activeTelemetryPin.error ? (
                                        /* Telemetry Error Feedback */
                                        <div className="space-y-2 py-1">
                                            <p className="text-xs font-semibold text-[#D67051]">
                                                Telemetry Probe Error
                                            </p>
                                            <p className="text-[11px] text-[#8891A0]">
                                                {activeTelemetryPin.error}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleProbeCoordinate(
                                                        activeTelemetryPin.coordinates
                                                            .latitude,
                                                        activeTelemetryPin.coordinates
                                                            .longitude
                                                    )
                                                }
                                                className="w-full py-1.5 px-3 rounded-lg bg-[#1A1D23] border border-[#21242C] hover:border-[#83CAD8] text-xs font-medium text-[#F1EEE9] cursor-pointer transition"
                                            >
                                                Retry Probe
                                            </button>
                                        </div>
                                    ) : activeTelemetryPin.data ? (
                                        /* Live Synthesized Planetary Analog Profile Popup */
                                        (() => {
                                            const site = activeTelemetryPin.data;
                                            const { popupBadges } =
                                                getTargetBodyInfo(site);
                                            const telemetry = site.telemetry || {};
                                            const siteId =
                                                site._id ||
                                                site.id ||
                                                site.locationId ||
                                                site.name;
                                            const isSaved =
                                                savedLocationIds.has(siteId) ||
                                                savedLocationIds.has(site.name);

                                            return (
                                                <div>
                                                    {/* Header: Region Name & Dismiss Pin Action */}
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gradient-to-r from-[#83CAD8]/20 to-[#F59E0B]/20 border border-[#83CAD8]/45 text-[9px] font-mono uppercase tracking-wider text-[#83CAD8] mb-1">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                                                                <span>
                                                                    {site.isGlobalDiscovery
                                                                        ? "Whole-Earth Satellite Discovery • Non-Catalog Site"
                                                                        : "Live Satellite Telemetry • Non-Catalog Site"}
                                                                </span>
                                                            </span>
                                                            <h4 className="font-bold text-sm text-[#F1EEE9] leading-tight">
                                                                {site.name}
                                                            </h4>
                                                            <p className="text-xs text-[#8891A0]">
                                                                {site.country}
                                                            </p>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={
                                                                handleDismissTelemetryPin
                                                            }
                                                            aria-label="Clear telemetry pin"
                                                            title="Clear telemetry pin"
                                                            className="p-1 rounded bg-[#181A21] border border-[#21242C] text-[#8891A0] hover:text-[#F1EEE9] cursor-pointer shrink-0"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>

                                                    {/* Exact Coordinates & Suitability Badges */}
                                                    <p className="text-[10px] font-mono text-[#8891A0] mt-1 mb-1.5">
                                                        {site.coordinates.latitude.toFixed(
                                                            4
                                                        )}
                                                        °,{" "}
                                                        {site.coordinates.longitude.toFixed(
                                                            4
                                                        )}
                                                        °
                                                    </p>

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

                                                    {/* Live Telemetry Measurements Grid */}
                                                    <div className="grid grid-cols-2 gap-1.5 border-t border-[#21242C] pt-2 mb-2 text-[11px]">
                                                        <div className="bg-[#181A21] border border-[#21242C] rounded p-1.5">
                                                            <span className="text-[9px] text-[#8891A0] uppercase flex items-center gap-1">
                                                                <Mountain
                                                                    size={10}
                                                                    className="text-[#83CAD8]"
                                                                />
                                                                Elevation
                                                            </span>
                                                            <span className="font-mono font-bold text-[#F1EEE9]">
                                                                {(
                                                                    telemetry.elevationMeters ??
                                                                    site.environment
                                                                        ?.elevationMeters ??
                                                                    0
                                                                ).toLocaleString()}{" "}
                                                                m
                                                            </span>
                                                        </div>

                                                        <div className="bg-[#181A21] border border-[#21242C] rounded p-1.5">
                                                            <span className="text-[9px] text-[#8891A0] uppercase flex items-center gap-1">
                                                                <Thermometer
                                                                    size={10}
                                                                    className="text-[#83CAD8]"
                                                                />
                                                                Temp (2m)
                                                            </span>
                                                            <span className="font-mono font-bold text-[#83CAD8]">
                                                                {telemetry.temperatureC ??
                                                                    site.temperature}
                                                                °C
                                                            </span>
                                                        </div>

                                                        <div className="bg-[#181A21] border border-[#21242C] rounded p-1.5">
                                                            <span className="text-[9px] text-[#8891A0] uppercase flex items-center gap-1">
                                                                <Droplets
                                                                    size={10}
                                                                    className="text-[#83CAD8]"
                                                                />
                                                                Humidity
                                                            </span>
                                                            <span className="font-mono font-bold text-[#F1EEE9]">
                                                                {telemetry.humidityPercent ??
                                                                    site.environment
                                                                        ?.humidityPercent ??
                                                                    0}
                                                                %
                                                            </span>
                                                        </div>

                                                        <div className="bg-[#181A21] border border-[#21242C] rounded p-1.5">
                                                            <span className="text-[9px] text-[#8891A0] uppercase flex items-center gap-1">
                                                                <Sun
                                                                    size={10}
                                                                    className="text-[#83CAD8]"
                                                                />
                                                                Solar Flux
                                                            </span>
                                                            <span className="font-mono font-bold text-[#F1EEE9]">
                                                                {telemetry.solarRadiationWm2 ??
                                                                    site.environment
                                                                        ?.solarRadiationWm2 ??
                                                                    0}{" "}
                                                                W/m²
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Synthesized Analog Classification */}
                                                    <p className="text-[11px] text-[#8891A0] mb-2 leading-snug">
                                                        <span className="font-semibold text-[#F1EEE9]">
                                                            Classification:
                                                        </span>{" "}
                                                        {site.analogCategory}
                                                    </p>

                                                    {/* Save Custom Analog Site CTA */}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleSaveTelemetrySite(
                                                                site
                                                            )
                                                        }
                                                        className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                                                            isSaved
                                                                ? "bg-[#1A1D23] border border-[#83CAD8] text-[#83CAD8]"
                                                                : "bg-[#83CAD8] hover:opacity-90 text-[#090D15]"
                                                        }`}
                                                    >
                                                        {isSaved ? (
                                                            <>
                                                                <Check size={13} />
                                                                <span>
                                                                    Saved Custom Analog
                                                                    Site
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Bookmark size={13} />
                                                                <span>
                                                                    Save Custom Analog
                                                                    Site
                                                                </span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })()
                                    ) : null}
                                </div>
                            </Popup>
                        </Marker>
                    )}

                {/* Candidate Planetary Analog Site Markers */}
                {dataToMap.map((loc) => {
                    if (
                        typeof loc?.coordinates?.latitude !== "number" ||
                        typeof loc?.coordinates?.longitude !== "number"
                    ) {
                        return null;
                    }

                    const locId = loc._id || loc.id;
                    const isDiscoverySite = Boolean(
                        loc.isGlobalDiscovery || loc.isLiveTelemetry
                    );
                    const { popupBadges } = getTargetBodyInfo(loc);
                    const surfaceTemp = formatSurfaceTemp(loc);
                    const analogCategory = getAnalogCategory(loc);
                    const roversTested = getRoversTested(loc);

                    return (
                        <Marker
                            key={locId || loc.name}
                            position={[
                                loc.coordinates.latitude,
                                loc.coordinates.longitude,
                            ]}
                            {...(isDiscoverySite ? { icon: globalDiscoveryIcon } : {})}
                            ref={(instance) => {
                                // Store ref under all canonical keys for reliable popup lookup
                                if (instance) {
                                    if (locId) markerRefs.current[locId] = instance;
                                    if (loc.id) markerRefs.current[loc.id] = instance;
                                    if (loc.name) {
                                        markerRefs.current[`name:${loc.name}`] =
                                            instance;
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
                                    {/* Distinct Cyan/Gold Discovery Badge for Non-Catalog Earth Sites */}
                                    {isDiscoverySite && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gradient-to-r from-[#83CAD8]/20 to-[#F59E0B]/20 border border-[#83CAD8]/50 text-[#83CAD8] text-[9px] font-bold tracking-wider uppercase mb-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                                            <span>
                                                Whole-Earth Satellite Discovery • Non-Catalog Site
                                            </span>
                                        </span>
                                    )}

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
                                        {isDiscoverySite && (
                                            <p>
                                                <span className="font-semibold text-[#F1EEE9]">
                                                    Elevation / RH:
                                                </span>{" "}
                                                <span className="font-mono text-[#F59E0B]">
                                                    {(
                                                        loc.environment?.elevationMeters ?? 0
                                                    ).toLocaleString()}{" "}
                                                    m •{" "}
                                                    {loc.environment?.humidityPercent ?? 0}%
                                                </span>
                                            </p>
                                        )}
                                        <p>
                                            <span className="font-semibold text-[#F1EEE9]">
                                                Climate &amp; Humidity:
                                            </span>{" "}
                                            <span className="capitalize">
                                                {loc.environment?.climate ||
                                                    "Hyper-arid"}
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
                                                {isDiscoverySite
                                                    ? "Telemetry Source:"
                                                    : "Rovers/Missions Tested:"}
                                            </span>{" "}
                                            {isDiscoverySite
                                                ? loc.dataSource || roversTested
                                                : roversTested}
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
