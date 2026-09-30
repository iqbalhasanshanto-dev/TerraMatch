import { useState } from 'react';
import Header from './components/Header.jsx';
import FilterBar from './components/FilterBar.jsx';
import MapView from './components/MapView.jsx';
import SiteList from './components/SiteList.jsx';
import SiteDetails from './components/SiteDetails.jsx';
import { SITES } from './data/sites.js';

export default function App() {
  const [filter, setFilter] = useState('all');
  const [selectedSite, setSelectedSite] = useState(null);

  const visibleSites =
    filter === 'all' ? SITES : SITES.filter((s) => s.target === filter);

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <main className="flex flex-1 min-h-0">
        <div className="flex-[2] flex flex-col min-h-0">
          <FilterBar filter={filter} setFilter={setFilter} />
          <MapView
            sites={visibleSites}
            selectedSite={selectedSite}
            onSelect={setSelectedSite}
          />
        </div>

        <aside className="flex-1 max-w-sm border-l border-slate-200 bg-white p-4 overflow-y-auto">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">
            Candidate Sites
          </h2>
          <SiteList
            sites={visibleSites}
            selectedId={selectedSite?.id}
            onSelect={setSelectedSite}
          />

          <h2 className="text-sm font-semibold text-slate-900 mt-6 mb-2">
            Site Details
          </h2>
          <SiteDetails site={selectedSite} />
        </aside>
      </main>
    </div>
  );
}
