import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import { TERRAIN_OPTIONS, WEATHER_OPTIONS, DEFAULT_CRITERIA } from '../utils/criteriaMatch.js';

export default function CriteriaFilterPanel({ criteria, onChange }) {
  const set = (key, value) => onChange({ ...criteria, [key]: value });
  const reset = () => onChange(DEFAULT_CRITERIA);

  const labelClass = "block text-xs font-medium text-lightTextSecondary dark:text-darkTextSecondary mb-1";
  const inputClass = "w-full px-3 py-2 rounded-md text-sm border border-lightBorder dark:border-darkBorder " +
    "bg-lightInset dark:bg-darkInset text-lightText dark:text-darkText";

  return (
    <div className="bg-lightPanel dark:bg-darkPanel rounded-xl border border-lightBorder dark:border-darkBorder p-4 w-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-lightText dark:text-darkText flex items-center gap-2">
          <SlidersHorizontal size={16} />
          Find a location by conditions
        </p>
        <button
          onClick={reset}
          className="flex items-center gap-1 text-xs text-lightTextSecondary dark:text-darkTextSecondary hover:underline"
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className={labelClass}>Target</label>
          <div className="flex gap-2">
            {[
              { value: "any", label: "Any" },
              { value: "mars", label: "🔴 Mars" },
              { value: "moon", label: "🌕 Moon" }
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => set('target', opt.value)}
                className={
                  "flex-1 px-3 py-1.5 rounded-md text-sm border transition-colors " +
                  (criteria.target === opt.value
                    ? "bg-lightActiveNav text-white border-lightActiveNav dark:bg-darkActiveNav dark:border-darkActiveNav"
                    : "bg-lightInset dark:bg-darkInset text-lightText dark:text-darkText border-lightBorder dark:border-darkBorder hover:opacity-80")
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>Terrain type</label>
          <select
            value={criteria.terrain}
            onChange={(e) => set('terrain', e.target.value)}
            className={inputClass}
          >
            <option value="any">Any terrain</option>
            {TERRAIN_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Weather</label>
          <select
            value={criteria.weather}
            onChange={(e) => set('weather', e.target.value)}
            className={inputClass}
          >
            <option value="any">Any weather</option>
            {WEATHER_OPTIONS.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Temperature (°C)</label>
            <input
              type="number"
              placeholder="e.g. -20"
              value={criteria.temperature}
              onChange={(e) => set('temperature', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Humidity (%)</label>
            <input
              type="number"
              placeholder="e.g. 15"
              value={criteria.humidity}
              onChange={(e) => set('humidity', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-lightTextSecondary dark:text-darkTextSecondary">
        Leave fields on "Any" or empty to ignore them. Results below update live.
      </p>
    </div>
  );
}
