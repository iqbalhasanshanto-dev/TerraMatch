import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import useLocations from '../Hooks/useLocations';
import Loader from './Loader';
import Modal from './Modal';
import { useContext, useEffect, useRef } from 'react';
import StateContext from '../States/StateContext';
import useAuth from '../Hooks/useAuth';
import { API_BASE_URL } from '../utils/api';

// Fix for default Leaflet icon paths in Vite/React
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

/**
 * Map Component
 * Renders the realistic satellite imagery world map with candidate planetary analog site markers.
 * Handles search fly-to animations and retains interactive marker popups and history saving.
 */
const Map = () => {
    const { isSearch, filteredLoc, mapTarget } = useContext(StateContext);
    const { locData, loading } = useLocations();
    const { user } = useAuth();

    // Default map center (equatorial/global view)
    const defaultPosition = [20.0, 10.0];
    const mapRef = useRef(null);

    // Watch for external mapTarget changes (e.g. clicking "View on map" in recent searches)
    useEffect(() => {
        if (mapTarget && mapRef.current) {
            const { latitude, longitude, zoom = 10 } = mapTarget;
            mapRef.current.flyTo([latitude, longitude], zoom, {
                duration: 1.8,
                easeLinearity: 0.25,
            });
        }
    }, [mapTarget]);

    if (loading) return <Loader />;

    // Handle search input inside map overlay
    const handleSearch = (e) => {
        e.preventDefault();
        const query = e.target.location.value.trim().toLowerCase();
        if (!query) return;

        // Find candidate matching the query
        const place = (locData || []).find(loc =>
            loc.name?.toLowerCase().includes(query) ||
            loc.country?.toLowerCase().includes(query)
        );

        if (place && place.coordinates) {
            // If user is authenticated, record the search in backend
            if (user?.email) {
                fetch(`${API_BASE_URL}/recent-searches`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        ...place,
                        created_at: new Date(),
                        created_by: user.email,
                    }),
                })
                    .then(res => res.json())
                    .catch(err => console.error("Error saving search history:", err));
            }

            // Fly map to selected place coordinates
            const coord = [place.coordinates.latitude, place.coordinates.longitude];
            if (mapRef.current) {
                mapRef.current.flyTo(coord, 10, { duration: 1.8 });
            }
        }
    };

    // Show filtered locations if any filter is active, otherwise show all
    const dataToMap = filteredLoc && filteredLoc.length > 0 ? filteredLoc : locData || [];

    return (
        <div className="relative w-full h-full bg-[#080d15] overflow-hidden">
            {/* Overlay Search Input */}
            {isSearch && (
                <form
                    onSubmit={handleSearch}
                    className="absolute left-6 top-6 z-1000 w-80 max-w-[calc(100%-3rem)]"
                >
                    <label className="flex items-center gap-2.5 w-full bg-[#151a22]/95 backdrop-blur-md px-3.5 py-2.5 shadow-2xl border border-slate-700/80 rounded-xl text-slate-200">
                        <svg
                            className="h-4 w-4 text-slate-400 shrink-0"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.3-4.3" />
                        </svg>

                        <input
                            name="location"
                            type="search"
                            className="grow bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none"
                            placeholder="Search planetary analog site..."
                        />
                    </label>
                </form>
            )}

            {/* Leaflet Map Container */}
            <MapContainer
                center={defaultPosition}
                zoom={2.5}
                minZoom={2}
                maxZoom={18}
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

                {/* Markers for candidate analog sites */}
                {dataToMap.map((loc) => {
                    if (!loc?.coordinates?.latitude || !loc?.coordinates?.longitude) return null;
                    return (
                        <Marker
                            key={loc._id || loc.id}
                            position={[loc.coordinates.latitude, loc.coordinates.longitude]}
                        >
                            <Popup className="terramatch-popup">
                                <div className="p-1 text-slate-900 min-w-44">
                                    <h4 className="font-bold text-sm text-slate-900 leading-tight">{loc.name}</h4>
                                    <p className="text-xs text-slate-600 mb-1.5">{loc.country}</p>
                                    <div className="space-y-0.5 text-[11px] text-slate-700 mb-2 border-t border-slate-200 pt-1.5">
                                        <p><span className="font-semibold">Climate:</span> {loc.environment?.climate || 'Extreme Arid'}</p>
                                        <p><span className="font-semibold">Similarity:</span> <span className="font-mono text-slate-900 font-bold">{loc.similarityScore}%</span></p>
                                    </div>
                                    <Modal loc={loc} />
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
};

export default Map;
