import { Bookmark } from 'lucide-react';
import { SITES } from '../data/sites.js';
import { overallScorePercent, matchColor } from '../utils/scoring.js';
import { useSavedLocations } from '../context/SavedLocationsContext.jsx';

export default function SavedLocations() {
  const { savedIds, toggleSaved } = useSavedLocations();
  const saved = SITES.filter((s) => savedIds.includes(s.id));

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-xl font-semibold text-lightText dark:text-darkText mb-1">
        Saved Locations
      </h1>
      <p className="text-sm text-lightTextSecondary dark:text-darkTextSecondary mb-6">
        Sites you've bookmarked from the Explore Map view.
      </p>

      {saved.length === 0 ? (
        <div className="bg-lightPanel dark:bg-darkPanel rounded-xl border border-lightBorder dark:border-darkBorder p-6 text-center">
          <Bookmark className="mx-auto mb-2 text-lightTextSecondary dark:text-darkTextSecondary" />
          <p className="text-sm text-lightTextSecondary dark:text-darkTextSecondary">
            Nothing saved yet. Head to Explore Map and hit "Save location" on a site.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {saved.map((site) => {
            const percent = overallScorePercent(site.scores);
            return (
              <div
                key={site.id}
                className="flex items-center justify-between bg-lightPanel dark:bg-darkPanel rounded-xl border border-lightBorder dark:border-darkBorder p-4"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${site.mock.thumbnailGradient}`} />
                  <div>
                    <p className="text-sm font-semibold text-lightText dark:text-darkText">
                      {site.flag} {site.name}, {site.country}
                    </p>
                    <p className="text-xs font-medium" style={{ color: matchColor(percent) }}>
                      {percent}% match
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleSaved(site.id)}
                  className="text-xs text-lightTextSecondary dark:text-darkTextSecondary hover:underline"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
