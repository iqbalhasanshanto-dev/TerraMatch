import { useState } from 'react';
import { Search, X, MapPin } from 'lucide-react';
import { TARGETS, EXAMPLE_SEARCHES } from '../data/targets.js';

export default function SearchPanel({ onSelectTarget }) {
  const [query, setQuery] = useState('');

  const matches = query.trim()
    ? TARGETS.filter((t) =>
        t.name.toLowerCase().includes(query.trim().toLowerCase())
      )
    : [];

  const handlePick = (target) => {
    setQuery(target.name);
    onSelectTarget(target);
  };

  const handleExample = (label) => {
    const target = TARGETS.find((t) => t.name === label);
    if (target) handlePick(target);
  };

  return (
    <div className="bg-lightPanel dark:bg-darkPanel rounded-xl border border-lightBorder dark:border-darkBorder p-4 w-full">
      <div className="flex items-center gap-2 bg-lightInset dark:bg-darkInset rounded-lg px-3 py-2">
        <Search size={16} className="text-lightTextSecondary dark:text-darkTextSecondary" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a space location..."
          className="bg-transparent outline-none text-sm flex-1 text-lightText dark:text-darkText placeholder:text-lightTextSecondary dark:placeholder:text-darkTextSecondary"
        />
        {query && (
          <button onClick={() => setQuery('')} aria-label="Clear search">
            <X size={14} className="text-lightTextSecondary dark:text-darkTextSecondary" />
          </button>
        )}
      </div>

      {matches.length > 0 && (
        <ul className="mt-2 space-y-1">
          {matches.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => handlePick(t)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left
                           text-lightText dark:text-darkText hover:bg-lightInset dark:hover:bg-darkInset"
              >
                {t.type === 'planet' ? <Search size={14} /> : <MapPin size={14} />}
                {t.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!query && (
        <div className="mt-4">
          <p className="text-xs text-lightTextSecondary dark:text-darkTextSecondary mb-2">
            Examples:
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {EXAMPLE_SEARCHES.map((label) => (
              <button
                key={label}
                onClick={() => handleExample(label)}
                className="px-3 py-1 rounded-full text-xs
                           bg-lightInset dark:bg-darkInset
                           text-lightText dark:text-darkText
                           hover:bg-lightBorder dark:hover:bg-darkActiveNav"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="bg-lightInset dark:bg-darkInset rounded-lg p-4 text-center">
            <div className="text-2xl mb-1">🪐</div>
            <p className="text-sm font-medium text-lightText dark:text-darkText">
              Search for a location
            </p>
            <p className="text-xs text-lightTextSecondary dark:text-darkTextSecondary mt-1">
              Type a Moon, Mars, or crater name to find matching places on Earth.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
