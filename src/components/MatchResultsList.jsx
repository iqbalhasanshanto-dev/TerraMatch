import { matchColor } from '../utils/scoring.js';

export default function MatchResultsList({ results, selectedId, onSelect, heading, hint }) {
  return (
    <div className="bg-lightPanel dark:bg-darkPanel rounded-xl border border-lightBorder dark:border-darkBorder p-3 w-full">
      <p className="text-xs font-medium text-lightTextSecondary dark:text-darkTextSecondary mb-1 px-1">
        {heading || "Matching locations"}
      </p>
      {hint && (
        <p className="text-[11px] text-lightTextSecondary dark:text-darkTextSecondary mb-2 px-1">
          {hint}
        </p>
      )}
      <div className="space-y-1.5 mt-2">
        {results.map(({ site, percent }) => {
          const color = matchColor(percent);
          const isSelected = selectedId === site.id;

          return (
            <button
              key={site.id}
              onClick={() => onSelect(site)}
              className={
                "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm text-left transition-colors " +
                (isSelected
                  ? "border border-lightActiveNav dark:border-darkActiveNav bg-lightInset dark:bg-darkInset"
                  : "border border-transparent hover:bg-lightInset dark:hover:bg-darkInset")
              }
            >
              <span className="flex items-center gap-2 text-lightText dark:text-darkText">
                {site.flag} {site.name}
              </span>
              <span className="text-xs font-semibold" style={{ color }}>
                {percent}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
