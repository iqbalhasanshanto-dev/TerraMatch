import { overallScore, markerColor } from '../utils/scoring.js';

export default function SiteList({ sites, selectedId, onSelect }) {
  const sorted = [...sites].sort(
    (a, b) => overallScore(b.scores) - overallScore(a.scores)
  );

  return (
    <div className="space-y-2">
      {sorted.map((site) => (
        <div
          key={site.id}
          onClick={() => onSelect(site)}
          className={
            "flex justify-between items-center px-3 py-2 rounded-md border cursor-pointer text-sm " +
            (selectedId === site.id
              ? "border-base bg-slate-100"
              : "border-slate-200 hover:bg-slate-50")
          }
        >
          <span className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: markerColor(site.target) }}
            ></span>
            {site.name}
          </span>
          <span className="text-slate-600">{overallScore(site.scores)}/10</span>
        </div>
      ))}
    </div>
  );
}
