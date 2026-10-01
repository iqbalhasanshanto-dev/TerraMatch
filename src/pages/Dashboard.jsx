import { useState } from 'react';
import SearchPanel from '../components/SearchPanel.jsx';
import ReferenceLocationCard from '../components/ReferenceLocationCard.jsx';
import EarthLocationCard from '../components/EarthLocationCard.jsx';
import MapView from '../components/MapView.jsx';
import { SITES } from '../data/sites.js';
import { bestMatchesFor } from '../utils/scoring.js';
import { genericTarget } from '../data/targets.js';

// This is the default landing screen: search by named target (Mars, Moon,
// a crater) and see the best-matching Earth site. For searching by
// conditions (humidity/temperature/weather/terrain) instead, see
// pages/ExploreMap.jsx.
export default function Dashboard() {
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);

  const handleSelectTarget = (target) => {
    setSelectedTarget(target);
    const matches = bestMatchesFor(SITES, target.parentBody);
    setSelectedSite(matches[0] || null);
  };

  // Clicking a marker directly selects that site; infer a generic reference
  // target for its parent body so the reference card still has something to show.
  const handleSelectSite = (site) => {
    setSelectedSite(site);
    if (!selectedTarget || selectedTarget.parentBody !== site.target) {
      setSelectedTarget(genericTarget(site.target));
    }
  };

  return (
    <div className="flex h-full">
      <MapView sites={SITES} selectedSite={selectedSite} onSelect={handleSelectSite} />

      <aside className="w-96 shrink-0 h-full overflow-y-auto border-l border-lightBorder dark:border-darkBorder bg-lightBg dark:bg-darkBg p-4 space-y-4">
        <SearchPanel onSelectTarget={handleSelectTarget} />
        {selectedTarget && <ReferenceLocationCard target={selectedTarget} />}
        {selectedSite && (
          <EarthLocationCard
            site={selectedSite}
            onClose={() => {
              setSelectedSite(null);
              setSelectedTarget(null);
            }}
          />
        )}
      </aside>
    </div>
  );
}
