import { useMemo, useState } from 'react';
import MapView from '../components/MapView.jsx';
import CriteriaFilterPanel from '../components/CriteriaFilterPanel.jsx';
import MatchResultsList from '../components/MatchResultsList.jsx';
import EarthLocationCard from '../components/EarthLocationCard.jsx';
import { SITES } from '../data/sites.js';
import { computeCriteriaMatches, DEFAULT_CRITERIA } from '../utils/criteriaMatch.js';

// Search by desired conditions (humidity, temperature, weather, terrain)
// instead of by a named target — for "I need somewhere around -20°C and dry,
// what matches?" style queries. For searching by target name (Mars, Moon,
// a crater) instead, see pages/Dashboard.jsx.
export default function ExploreMap() {
  const [criteria, setCriteria] = useState(DEFAULT_CRITERIA);
  const [selectedId, setSelectedId] = useState(null);

  const results = useMemo(
    () => computeCriteriaMatches(SITES, criteria),
    [criteria]
  );

  const percentOverrides = useMemo(() => {
    const map = {};
    results.forEach(({ site, percent }) => { map[site.id] = percent; });
    return map;
  }, [results]);

  const selected = results.find((r) => r.site.id === selectedId);
  const visibleSites = results.map((r) => r.site);

  return (
    <div className="flex h-full">
      <MapView
        sites={visibleSites}
        selectedSite={selected?.site}
        onSelect={(site) => setSelectedId(site.id)}
        percentOverrides={percentOverrides}
      />

      <aside className="w-96 shrink-0 h-full overflow-y-auto border-l border-lightBorder dark:border-darkBorder bg-lightBg dark:bg-darkBg p-4 space-y-4">
        <CriteriaFilterPanel criteria={criteria} onChange={setCriteria} />
        <MatchResultsList
          results={results}
          selectedId={selectedId}
          onSelect={(site) => setSelectedId(site.id)}
        />
        {selected && (
          <EarthLocationCard site={selected.site} matchPercent={selected.percent} />
        )}
      </aside>
    </div>
  );
}
