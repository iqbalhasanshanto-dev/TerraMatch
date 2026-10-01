import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { overallScorePercent, matchColor } from '../utils/scoring.js';
import MapLegend from './MapLegend.jsx';

function makeIcon(percent) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:16px;height:16px;border-radius:50%;
      background:${matchColor(percent)};
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

// `percentOverrides`: optional { [siteId]: percent } map. When provided
// (e.g. from the criteria-match search), markers use those percents for
// color/tooltip instead of each site's fixed overall analog score.
export default function MapView({ sites, selectedSite, onSelect, percentOverrides }) {
  return (
    <div className="relative flex-1 min-h-0">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        maxZoom={12}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {sites.map((site) => {
          const percent = percentOverrides?.[site.id] ?? overallScorePercent(site.scores);
          const isSelected = selectedSite?.id === site.id;

          return (
            <Marker
              key={site.id}
              position={[site.lat, site.lng]}
              icon={makeIcon(percent)}
              eventHandlers={{ click: () => onSelect(site) }}
            >
              {isSelected && (
                <Tooltip permanent direction="top" offset={[0, -10]} className="!bg-white !text-slate-900 !text-xs !rounded-md !border-0 !shadow-md">
                  <strong>{site.name}, {site.country}</strong>
                  <br />
                  {percent}% match
                </Tooltip>
              )}
            </Marker>
          );
        })}

        <FlyToSelected selectedSite={selectedSite} />
      </MapContainer>

      <div className="absolute bottom-4 right-4 z-[1000]">
        <MapLegend />
      </div>
    </div>
  );
}
