import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SITES } from '../data/sites.js';
import { overallScorePercent, matchColor, scoreLabel } from '../utils/scoring.js';

export default function Compare() {
  const [searchParams] = useSearchParams();
  const preselected = searchParams.get('site');

  const [leftId, setLeftId] = useState(preselected || SITES[0]?.id);
  const [rightId, setRightId] = useState(
    SITES.find((s) => s.id !== preselected)?.id || SITES[1]?.id
  );

  const left = SITES.find((s) => s.id === leftId);
  const right = SITES.find((s) => s.id === rightId);

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-xl font-semibold text-lightText dark:text-darkText mb-1">
        Compare
      </h1>
      <p className="text-sm text-lightTextSecondary dark:text-darkTextSecondary mb-6">
        Pick two candidate sites to see which suits which mission better.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <SiteSelect value={leftId} onChange={setLeftId} />
        <SiteSelect value={rightId} onChange={setRightId} />
      </div>

      {left && right && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <SiteSummary site={left} />
            <SiteSummary site={right} />
          </div>

          <SectionLabel>Real conditions</SectionLabel>
          <ComparisonTable
            rows={[
              ["Target", capitalize(left.target), capitalize(right.target)],
              ["Country", `${left.flag} ${left.country}`, `${right.flag} ${right.country}`],
              ["Terrain type", left.mock.terrainType, right.mock.terrainType],
              ["Current weather", `${left.mock.currentWeather}, ${left.mock.tempC}°C`, `${right.mock.currentWeather}, ${right.mock.tempC}°C`],
              ["Humidity", `${left.mock.humidityPercent}%`, `${right.mock.humidityPercent}%`],
              ["Air pressure", `${left.mock.airPressureHpa} hPa`, `${right.mock.airPressureHpa} hPa`],
              ["Elevation", `${left.mock.elevationM} m`, `${right.mock.elevationM} m`],
              ["Geology / soil type", left.mock.soilType, right.mock.soilType]
            ]}
          />

          <SectionLabel>Analog scores (1–10)</SectionLabel>
          <ComparisonTable
            rows={Object.keys(left.scores).map((key) => [
              scoreLabel(key),
              `${left.scores[key]}/10`,
              `${right.scores[key]}/10`
            ])}
          />

          <SectionLabel>Why each matches</SectionLabel>
          <div className="grid grid-cols-2 gap-4">
            <p className="text-xs text-lightTextSecondary dark:text-darkTextSecondary bg-lightPanel dark:bg-darkPanel rounded-xl border border-lightBorder dark:border-darkBorder p-4">
              {left.whyItMatches}
            </p>
            <p className="text-xs text-lightTextSecondary dark:text-darkTextSecondary bg-lightPanel dark:bg-darkPanel rounded-xl border border-lightBorder dark:border-darkBorder p-4">
              {right.whyItMatches}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-semibold text-lightTextSecondary dark:text-darkTextSecondary uppercase tracking-wide mt-6 mb-2">
      {children}
    </p>
  );
}

function ComparisonTable({ rows }) {
  return (
    <div className="bg-lightPanel dark:bg-darkPanel rounded-xl border border-lightBorder dark:border-darkBorder overflow-hidden">
      {rows.map(([label, leftVal, rightVal]) => (
        <div key={label} className="grid grid-cols-3 text-sm border-b border-lightBorder dark:border-darkBorder last:border-0">
          <div className="p-3 text-lightTextSecondary dark:text-darkTextSecondary">{label}</div>
          <div className="p-3 text-center text-lightText dark:text-darkText">{leftVal}</div>
          <div className="p-3 text-center text-lightText dark:text-darkText">{rightVal}</div>
        </div>
      ))}
    </div>
  );
}

function SiteSelect({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-md text-sm border border-lightBorder dark:border-darkBorder
                 bg-lightInset dark:bg-darkInset text-lightText dark:text-darkText"
    >
      {SITES.map((s) => (
        <option key={s.id} value={s.id}>
          {s.flag} {s.name}, {s.country}
        </option>
      ))}
    </select>
  );
}

function SiteSummary({ site }) {
  const percent = overallScorePercent(site.scores);
  return (
    <div className="bg-lightPanel dark:bg-darkPanel rounded-xl border border-lightBorder dark:border-darkBorder p-4">
      <div className={`w-full h-20 rounded-lg bg-gradient-to-br ${site.mock.thumbnailGradient} mb-3`} />
      <p className="text-sm font-semibold text-lightText dark:text-darkText">{site.name}</p>
      <p className="text-xs font-medium mt-1" style={{ color: matchColor(percent) }}>
        {percent}% overall match
      </p>
    </div>
  );
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
