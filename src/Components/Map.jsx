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
    ExternalLink,
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
    getNasaWorldviewUrl,
    getRoversTested,
    getTargetBodyInfo,
} from "../utils/analogSpec";

// Fix Leaflet default icon asset paths for Vite bundling
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

// Custom cyan radar-reticle marker icon for coordinate probe
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

// Custom discovery beacon icon for non-catalog satellite sites
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

// Generates custom SVG marker icons styled by target planetary body (Moon, Mars, Dual)
const createAnalogMarkerIcon = (loc) => {
    const { hasMars, isDual } = getTargetBodyInfo(loc);

    let mainColor = "#83CAD8"; // Cyan for Moon
    let glowColor = "rgba(131,202,216,0.55)";
    let innerColor = "#07090E";
    let ringColor = "#83CAD8";

    if (isDual) {
        mainColor = "#83CAD8";
        glowColor = "rgba(206,184,130,0.6)";
        innerColor = "#CEB882"; // Gold / Terracotta core for dual Moon & Mars
        ringColor = "#83CAD8";
    } else if (hasMars) {
        mainColor = "#D67051"; // Terracotta for Mars
        glowColor = "rgba(214,112,81,0.6)";
        innerColor = "#07090E";
        ringColor = "#D67051";
    }

    const svgHtml = `
        <div style="filter: drop-shadow(0 2px 7px ${glowColor}); display:flex; align-items:center; justify-content:center; width:26px; height:32px;">
            <svg width="26" height="32" viewBox="0 0 26 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 1C6.37 1 1 6.37 1 13C1 21.5 13 31 13 31C13 31 25 21.5 25 13C25 6.37 19.63 1 13 1Z" 
                      fill="${mainColor}" 
                      stroke="#07090E" 
                      stroke-width="1.5" 
                      stroke-linejoin="round" />
                <circle cx="13" cy="12" r="4.8" fill="${innerColor}" stroke="${ringColor}" stroke-width="1.5" />
            </svg>
        </div>
    `;

    return L.divIcon({
        className: "terramatch-analog-marker-icon",
        html: svgHtml,
        iconSize: [26, 32],
        iconAnchor: [13, 32],
        popupAnchor: [0, -32],
    });
};

// Forwards map click coordinates to onProbeCoordinate when Probe Mode is active
const MapClickProbeHandler = ({ isProbeActive, onProbeCoordinate }) => {
    useMapEvents({
        click(event) {
            if (!isProbeActive) return;
            // Ignore clicks on popups, markers, and buttons
            if (
                event.originalEvent?.target?.closest?.(
                    ".leaflet-popup, .leaflet-marker-icon, button, a"
                )
            ) {
                return;
            }
            const { lat, lng } = event.latlng;
            onProbeCoordinate(lat, lng);
        },
    });

    return null;
};

// Satellite map with planetary analog markers and live coordinate telemetry probing
const Map = ({ isSidebarOpen }) => {
    // Context and location data hooks
    const { filteredLoc, mapTarget, setMapTarget, recordRecentSearch } =
        useContext(StateContext);
    const { locData, loading } = useLocations();
    const { savedLoc, saveLocation } = useSaved();

    // Live coordinate telemetry probe state
    const [isProbeActive, setIsProbeActive] = useState(false);
    const [localProbe, setLocalProbe] = useState(null);
    const probeAbortRef = useRef(null);

    // Map container, Leaflet map, and marker references
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const markerRefs = useRef({});
    const probeMarkerRef = useRef(null);
    const prevSidebarOpenRef = useRef(isSidebarOpen);
    const defaultPosition = [20.0, 0.0];

    // Fast lookup Set of saved location keys
    const savedLocationIds = useMemo(() => {
        const set = new Set();
        (savedLoc || []).forEach((item) => {
            [item._id, item.locationId, item.id, item.name]
                .filter(Boolean)
                .forEach((key) => set.add(key));
        });
        return set;
    }, [savedLoc]);

    // Resolves active telemetry pin prioritizing the most recent probe or search target
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

    // Cancel active telemetry request on unmount
    useEffect(() => {
        return () => {
            if (probeAbortRef.current) {
                probeAbortRef.current.abort();
            }
        };
    }, []);

    // Resolves the Leaflet marker ref for a given target
    const resolveTargetMarker = useCallback((target) => {
        if (!target) return null;

        if (target.telemetrySite && probeMarkerRef.current) {
            return probeMarkerRef.current;
        }

        const candidateKeys = [
            target.locationId,
            target.id,
            target.name ? `name:${target.name}` : null,
        ].filter(Boolean);

        for (const key of candidateKeys) {
            if (markerRefs.current[key]) return markerRefs.current[key];
        }

        return null;
    }, []);

    // Auto-resizes map on container dimension changes
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

    // Sets crosshair cursor when Probe Mode is active
    useEffect(() => {
        if (!mapRef.current) return;
        const mapContainer = mapRef.current.getContainer();
        if (!mapContainer) return;
        mapContainer.style.cursor = isProbeActive ? "crosshair" : "";
        return () => {
            mapContainer.style.cursor = "";
        };
    }, [isProbeActive]);

    // Centers map viewport when desktop drawer toggles
    useEffect(() => {
        const previousState = prevSidebarOpenRef.current;
        prevSidebarOpenRef.current = isSidebarOpen;

        if (!mapRef.current || previousState === isSidebarOpen) return;

        if (typeof window !== "undefined" && window.innerWidth >= 1024) {
            mapRef.current.panBy([isSidebarOpen ? 160 : -160, 0], {
                animate: true,
                duration: 0.3,
            });
        }
    }, [isSidebarOpen]);

    // Smooth camera flight and popup auto-open when mapTarget changes
    useEffect(() => {
        if (!mapTarget || !mapRef.current || loading) return;

        const map = mapRef.current;
        const { latitude, longitude, zoom = 11 } = mapTarget;

        if (typeof latitude !== "number" || typeof longitude !== "number") return;

        let isCancelled = false;
        let popupOpened = false;

        const openTargetPopup = () => {
            if (isCancelled || popupOpened) return;
            const targetMarker = resolveTargetMarker(mapTarget);
            if (targetMarker && typeof targetMarker.openPopup === "function") {
                popupOpened = true;
                targetMarker.openPopup();
            }
        };

        const currentCenter = map.getCenter();
        const isAlreadyAtTarget =
            Math.abs(currentCenter.lat - latitude) < 0.0005 &&
            Math.abs(currentCenter.lng - longitude) < 0.0005 &&
            Math.abs(map.getZoom() - zoom) < 0.05;

        map.flyTo([latitude, longitude], zoom, {
            animate: true,
            duration: 1.6,
            easeLinearity: 0.25,
        });

        if (isAlreadyAtTarget) {
            const quickPopupTimer = setTimeout(openTargetPopup, 150);
            return () => {
                isCancelled = true;
                clearTimeout(quickPopupTimer);
            };
        }

        map.once("moveend", openTargetPopup);
        const fallbackTimer = setTimeout(openTargetPopup, 1750);

        return () => {
            isCancelled = true;
            map.off("moveend", openTargetPopup);
            clearTimeout(fallbackTimer);
        };
    }, [mapTarget, mapTarget?.timestamp, loading, resolveTargetMarker]);

    // Auto-open probe marker popup on drop
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

    // Queries live telemetry for clicked coordinate and logs to Recent Searches
    const handleProbeCoordinate = useCallback(
        async (lat, lon) => {
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

    // Saves custom probed Earth analog coordinate
    const handleSaveTelemetrySite = useCallback(
        (site) => {
            if (!site) return;
            saveLocation?.(site);
        },
        [saveLocation]
    );

    // Clears active custom telemetry pin
    const handleDismissTelemetryPin = useCallback(() => {
        if (probeAbortRef.current) {
            probeAbortRef.current.abort();
        }
        setLocalProbe(null);
        if (mapTarget?.telemetrySite) {
            setMapTarget(null);
        }
    }, [mapTarget, setMapTarget]);

    // Logs clicked catalog marker to Recent Searches and flies to coordinates
    const handleMarkerClick = useCallback(
        (loc) => {
            if (!loc) return;

            recordRecentSearch?.(loc);

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

    // Custom zoom in control handler
    const handleZoomIn = () => {
        if (mapRef.current) {
            mapRef.current.zoomIn();
        }
    };

    // Custom zoom out control handler
    const handleZoomOut = () => {
        if (mapRef.current) {
            mapRef.current.zoomOut();
        }
    };

    if (loading) return <Loader />;

    // Resolves filtered search subset or full analog catalog
    const dataToMap =
        Array.isArray(filteredLoc) ? filteredLoc : locData || [];

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full bg-[#07090E] overflow-hidden select-none"
        >
            {/* Live coordinate telemetry probe toggle */}
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

            {/* Single world map with 60° dragging cushion */}
            <MapContainer
                center={defaultPosition}
                zoom={1.8}
                minZoom={1.5}
                maxZoom={18}
                zoomSnap={0.25}
                zoomDelta={0.5}
                maxBounds={[
                    [-90, -240],
                    [90, 240],
                ]}
                maxBoundsViscosity={0.85}
                worldCopyJump={false}
                zoomControl={false}
                scrollWheelZoom={true}
                style={{ backgroundColor: "#07090E" }}
                className="h-full w-full z-10"
                ref={mapRef}
            >
                {/* Esri World Imagery tile layer bounded to single world */}
                <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
                    noWrap={true}
                    bounds={[
                        [-85.0511, -180],
                        [85.0511, 180],
                    ]}
                    maxNativeZoom={18}
                    maxZoom={18}
                    keepBuffer={6}
                    updateWhenIdle={false}
                />

                {/* Click-to-probe event listener */}
                <MapClickProbeHandler
                    isProbeActive={isProbeActive}
                    onProbeCoordinate={handleProbeCoordinate}
                />

                {/* Live telemetry probe marker and popup */}
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
                            eventHandlers={{
                                popupclose: handleDismissTelemetryPin,
                            }}
                        >
                            <Popup
                                className="terramatch-popup"
                                closeButton={true}
                                autoPan={true}
                                autoPanPaddingTopLeft={[24, 80]}
                                autoPanPaddingBottomRight={[24, 40]}
                            >
                                <div className="p-1 pr-8 text-[#F1EEE9] min-w-56 max-w-72">
                                    {activeTelemetryPin.isLoading ? (
                                        /* Telemetry loading state */
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
                                        /* Telemetry error state */
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
                                        /* Analyzed analog site profile */
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
                                                    {/* Location title and country */}
                                                    <div className="min-w-0 pr-2">
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gradient-to-r from-[#83CAD8]/20 to-[#F59E0B]/20 border border-[#83CAD8]/45 text-[9px] font-mono uppercase tracking-wider text-[#83CAD8] mb-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                                                            <span>
                                                                {site.isGlobalDiscovery
                                                                    ? "SATELLITE DISCOVERY"
                                                                    : "LIVE TELEMETRY PROBE"}
                                                            </span>
                                                        </span>
                                                        <h4 className="font-bold text-sm text-[#F1EEE9] leading-tight">
                                                            {site.name}
                                                        </h4>
                                                        <p className="text-xs text-[#8891A0]">
                                                            {site.country}
                                                        </p>
                                                    </div>

                                                    {/* Coordinates and target body badges */}
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

                                                    {/* Telemetry measurements grid */}
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

                                                    {/* Planetary analog classification */}
                                                    <p className="text-[11px] text-[#8891A0] mb-2 leading-snug">
                                                        <span className="font-semibold text-[#F1EEE9]">
                                                            Classification:
                                                        </span>{" "}
                                                        {site.analogCategory}
                                                    </p>

                                                    {/* Save custom site action */}
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

                                                    {/* NASA Worldview deep-link */}
                                                    <a
                                                        href={getNasaWorldviewUrl(
                                                            site.coordinates.latitude,
                                                            site.coordinates.longitude
                                                        )}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-1.5 w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-[#181A21] border border-[#21242C] hover:border-[#83CAD8] text-[#8891A0] hover:text-[#83CAD8] flex items-center justify-center gap-1.5 transition"
                                                    >
                                                        <span>Open in NASA Worldview</span>
                                                        <ExternalLink size={12} aria-hidden="true" />
                                                    </a>
                                                </div>
                                            );
                                        })()
                                    ) : null}
                                </div>
                            </Popup>
                        </Marker>
                    )}

                {/* Catalog analog site markers */}
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
                            icon={
                                isDiscoverySite
                                    ? globalDiscoveryIcon
                                    : createAnalogMarkerIcon(loc)
                            }
                            ref={(instance) => {
                                // Store marker ref under canonical keys
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
                            {/* Analog site popup */}
                            <Popup
                                className="terramatch-popup"
                                closeButton={true}
                                autoPan={true}
                                autoPanPaddingTopLeft={[24, 80]}
                                autoPanPaddingBottomRight={[24, 40]}
                            >
                                <div className="p-1 pr-8 text-[#F1EEE9] min-w-52 max-w-68">
                                    {/* Satellite discovery badge */}
                                    {isDiscoverySite && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gradient-to-r from-[#83CAD8]/20 to-[#F59E0B]/20 border border-[#83CAD8]/50 text-[#83CAD8] text-[9px] font-bold tracking-wider uppercase mb-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                                            <span>SATELLITE DISCOVERY</span>
                                        </span>
                                    )}

                                    <h4 className="font-bold text-sm text-[#F1EEE9] leading-tight">
                                        {loc.name}
                                    </h4>
                                    <p className="text-xs text-[#8891A0] mb-1.5">
                                        {loc.country}
                                    </p>

                                    {/* Target body match badges */}
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

                                    {/* Telemetry and mission history details */}
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

                                    {/* NASA Worldview satellite imagery link */}
                                    <a
                                        href={getNasaWorldviewUrl(
                                            loc.coordinates.latitude,
                                            loc.coordinates.longitude
                                        )}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mb-2 w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-[#181A21] border border-[#21242C] hover:border-[#83CAD8] text-[#8891A0] hover:text-[#83CAD8] flex items-center justify-center gap-1.5 transition cursor-pointer"
                                    >
                                        <span>Open in NASA Worldview</span>
                                        <ExternalLink size={12} aria-hidden="true" />
                                    </a>

                                    <Modal loc={loc} />
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            {/* Custom zoom controls */}
            <div
                className={`absolute bottom-8 z-20 flex flex-col gap-1.5 select-none transition-all duration-300 ${
                    isSidebarOpen ? "lg:right-[24.5rem] right-4" : "right-4"
                }`}
            >
                {/* Zoom in button */}
                <button
                    type="button"
                    onClick={handleZoomIn}
                    className="w-8 h-8 rounded-lg bg-[#0B0E13]/95 backdrop-blur-md border border-[#21242C] text-[#F1EEE9] hover:text-[#83CAD8] hover:border-[#83CAD8]/60 hover:bg-[#1E2129] flex items-center justify-center shadow-xl transition cursor-pointer"
                    title="Zoom in"
                    aria-label="Zoom in"
                >
                    <Plus size={16} aria-hidden="true" />
                </button>

                {/* Zoom out button */}
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
