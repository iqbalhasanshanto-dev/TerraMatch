import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ExploreMap from './pages/ExploreMap.jsx';
import SavedLocations from './pages/SavedLocations.jsx';
import Compare from './pages/Compare.jsx';
import DataSourcesPage from './pages/DataSourcesPage.jsx';
import About from './pages/About.jsx';

export default function App() {
  return (
    <div className="flex h-screen bg-lightBg dark:bg-darkBg">
      <Sidebar />
      <main className="relative flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/explore" element={<ExploreMap />} />
          <Route path="/saved" element={<SavedLocations />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/data-sources" element={<DataSourcesPage />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>
    </div>
  );
}
