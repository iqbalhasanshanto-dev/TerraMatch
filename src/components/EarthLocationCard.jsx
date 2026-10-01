import { Bookmark, GitCompareArrows, Cloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { overallScorePercent, matchColor } from '../utils/scoring.js';
import { useSavedLocations } from '../context/SavedLocationsContext.jsx';

export default function EarthLocationCard({ site, matchPercent }) {
  const navigate = useNavigate();
  const { isSaved, toggleSaved } = useSavedLocations();

  if (!site) return null;

  const percent = matchPercent ?? overallScorePercent(site.scores);
  const color = matchColor(percent);
  const saved = isSaved(site.id);

  return (
    <div className="bg-lightPanel dark:bg-darkPanel rounded-xl border border-lightBorder dark:border-darkBorder p-4 w-full">
      <p className="text-xs font-medium text-lightTextSecondary dark:text-darkTextSecondary mb-2">
        Selected Earth Location
      </p>

      <div className="flex items-center gap-3">
        <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${site.mock.thumbnailGradient} shrink-0`} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-lightText dark:text-darkText">{site.name}</p>
          <p className="text-xs text-lightTextSecondary dark:text-darkTextSecondary">
            {site.flag} {site.country}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-lightTextSecondary dark:text-darkTextSecondary">Similarity score</span>
          <span className="font-semibold" style={{ color }}>{percent}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-lightInset dark:bg-darkInset overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${percent}%`, backgroundColor: color }}
          />
        </div>
      </div>

      <dl className="mt-4 space-y-1.5 text-xs">
        <Row label="Current weather" value={<span className="flex items-center gap-1"><Cloud size={12} />{site.mock.currentWeather}, {site.mock.tempC}°C</span>} />
        <Row label="Humidity" value={`${site.mock.humidityPercent}%`} />
        <Row label="Atmosphere" value={`Air pressure: ${site.mock.airPressureHpa} hPa, Oxygen level: ${site.mock.oxygenLevelPercent}%`} wrap />
        <Row label="Terrain type" value={site.mock.terrainType} />
        <Row label="Elevation" value={`${site.mock.elevationM} m`} />
        <Row label="Geology / soil type" value={site.mock.soilType} />
      </dl>

      <div className="mt-4">
        <p className="text-xs font-medium text-lightText dark:text-darkText mb-1">Why it matches</p>
        <p className="text-xs text-lightTextSecondary dark:text-darkTextSecondary">
          {site.whyItMatches}
        </p>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => toggleSaved(site.id)}
          className={
            "flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-md text-white " +
            "bg-lightBtnSave dark:bg-darkBtnPrimary hover:opacity-90"
          }
        >
          <Bookmark size={14} fill={saved ? "currentColor" : "none"} />
          {saved ? 'Saved' : 'Save location'}
        </button>
        <button
          onClick={() => navigate(`/compare?site=${site.id}`)}
          className={
            "flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-md text-white " +
            "bg-lightBtnCompare dark:bg-darkBtnPrimary hover:opacity-90"
          }
        >
          <GitCompareArrows size={14} />
          Compare
        </button>
      </div>

      <p className="mt-3 text-[11px] text-lightTextSecondary dark:text-darkTextSecondary">
        Data source: NASA Earth Observatory, USGS
      </p>
    </div>
  );
}

function Row({ label, value, wrap }) {
  return (
    <div className={wrap ? "" : "flex justify-between gap-4"}>
      <dt className="text-lightTextSecondary dark:text-darkTextSecondary">{label}</dt>
      <dd className={"text-lightText dark:text-darkText font-medium " + (wrap ? "mt-0.5" : "text-right")}>
        {value}
      </dd>
    </div>
  );
}
