import { overallScore, scoreLabel } from '../utils/scoring.js';

export default function SiteDetails({ site }) {
  if (!site) {
    return (
      <p className="text-slate-500 text-sm">
        Click a marker or a site in the list to see its full analog score.
      </p>
    );
  }

  const badgeClass =
    site.target === "mars" ? "bg-mars text-white" : "bg-moon text-white";

  return (
    <div>
      <h3 className="font-semibold text-slate-900 flex items-center gap-2">
        {site.name}
        <span className={`text-xs px-2 py-0.5 rounded-full ${badgeClass}`}>
          {site.target.toUpperCase()}
        </span>
      </h3>
      <p className="text-sm text-slate-600 mt-2">{site.description}</p>
      <div className="text-lg font-bold text-slate-900 mt-3 mb-2">
        Overall match: {overallScore(site.scores)} / 10
      </div>
      {Object.entries(site.scores).map(([key, value]) => (
        <div
          key={key}
          className="flex justify-between text-sm py-1 border-b border-slate-100"
        >
          <span>{scoreLabel(key)}</span>
          <span>{value}/10</span>
        </div>
      ))}
    </div>
  );
}
