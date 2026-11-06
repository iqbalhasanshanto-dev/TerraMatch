import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import useLocations from '../Hooks/useLocations';
import Loader from './Loader';
import Modal from './Modal';
import { useContext, useEffect, useRef } from 'react';
import StateContext from '../States/StateContext';
import useAuth from '../Hooks/useAuth';
import { API_BASE_URL } from '../utils/api';

/**
 * Map Component
 * Renders the interactive Leaflet world map with candidate planetary analog site markers.
 * Handles search fly-to animations and saves recent searches if the user is authenticated.
 */
const Map = () => {
    const { isSearch, filteredLoc, mapTarget } = useContext(StateContext);
    const { locData, loading } = useLocations();
    const { user } = useAuth();

    // Default map center (Spain/Mediterranean region)
    const defaultPosition = [40.4637, -3.7492];
    const mapRef = useRef(null);

    // Watch for external mapTarget changes (e.g., clicking "View on map" in recent searches or tweaks)
    useEffect(() => {
        if (mapTarget && mapRef.current) {
            const { latitude, longitude, zoom = 12 } = mapTarget;
            mapRef.current.flyTo([latitude, longitude], zoom, {
                duration: 1.5,
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
            loc.name.toLowerCase().includes(query) ||
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
                mapRef.current.flyTo(coord, 11, { duration: 1.5 });
            }
        }
    };

    // Show filtered locations if any filter is active, otherwise show all
    const dataToMap = filteredLoc && filteredLoc.length > 0 ? filteredLoc : locData || [];

    return (
        <div className="relative w-full h-screen">
            {/* Overlay Search Input */}
            {isSearch && (
                <form
                    onSubmit={handleSearch}
                    className="absolute right-5 top-5 z-1000 w-72 max-w-[calc(100%-2.5rem)]"
                >
                    <label className="input flex items-center gap-2 w-full bg-base-100 shadow-xl border border-base-300 rounded-xl">
                        <svg
                            className="h-5 w-5 opacity-60 shrink-0"
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
                            className="grow"
                            placeholder="Search locations..."
                        />
                    </label>
                </form>
            )}

            {/* Leaflet Map Container */}
            <MapContainer
                center={defaultPosition}
                zoom={3}
                scrollWheelZoom={true}
                className="h-screen w-full z-10"
                ref={mapRef}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Markers for candidate sites */}
                {dataToMap.map((loc) => {
                    if (!loc?.coordinates?.latitude || !loc?.coordinates?.longitude) return null;
                    return (
                        <Marker
                            key={loc._id}
                            position={[loc.coordinates.latitude, loc.coordinates.longitude]}
                        >
                            <Popup>
                                <div className="text-sm">
                                    <strong className="text-base">{loc.name}</strong>
                                    <p className="text-xs opacity-70 mb-2">{loc.country}</p>
                                    <p className="text-xs">Climate: {loc.environment?.climate || 'N/A'}</p>
                                    <p className="text-xs mb-3">Similarity: {loc.similarityScore}%</p>
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
