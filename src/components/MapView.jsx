import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { overallScore, markerColor } from '../utils/scoring.js';

function makeIcon(target) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:16px;height:16px;border-radius:50%;
      background:${markerColor(target)};
      border:2px solid white;
      box-shadow:0 0 3px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
}

// Pans the map whenever the selected site changes. Must live inside
// <MapContainer> to access the map instance via useMap().
function FlyToSelected({ selectedSite }) {
  const map = useMap();

  if (selectedSite) {
    map.setView([selectedSite.lat, selectedSite.lng], 5, { animate: true });
  }

  return null;
}

export default function MapView({ sites, selectedSite, onSelect }) {
  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      maxZoom={12}
      className="flex-1 min-h-0"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {sites.map((site) => (
        <Marker
          key={site.id}
          position={[site.lat, site.lng]}
          icon={makeIcon(site.target)}
          eventHandlers={{ click: () => onSelect(site) }}
        >
          <Popup>
            <b>{site.name}</b>
            <br />
            Match: {overallScore(site.scores)}/10
          </Popup>
        </Marker>
      ))}

      <FlyToSelected selectedSite={selectedSite} />
    </MapContainer>
  );
}
