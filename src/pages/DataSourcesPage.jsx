const SOURCES = [
  {
    name: "NASA POWER (Prediction Of Worldwide Energy Resources)",
    url: "https://power.larc.nasa.gov/",
    status: "Live — wired in",
    statusTone: "live",
    feeds: "Aridity & Temperature Extreme scores — fetched live per site, see the \"Live NASA POWER data\" panel on any selected location."
  },
  {
    name: "MODIS (Moderate Resolution Imaging Spectroradiometer)",
    url: "https://modis.gsfc.nasa.gov/",
    status: "Catalogued on data.nasa.gov",
    statusTone: "catalogued",
    feeds: "Planned: Terrain Similarity score, via vegetation index (NDVI) and land surface temperature."
  },
  {
    name: "NASA Mars Trek",
    url: "https://trek.nasa.gov/mars/",
    status: "Reference",
    statusTone: "reference",
    feeds: "Mars reference stats shown in the search panel. Planned: real Martian surface data to replace published averages."
  },
  {
    name: "NASA Moon Trek",
    url: "https://trek.nasa.gov/moon/",
    status: "Reference",
    statusTone: "reference",
    feeds: "Moon reference stats shown in the search panel. Planned: real lunar surface data to replace published averages."
  },
  {
    name: "NASA Haughton-Mars Project (HMP)",
    url: "https://www.marsonearth.org/",
    status: "Research reference",
    statusTone: "reference",
    feeds: "Validates Devon Island as a documented Mars analog site — informs its scoring and description."
  },
  {
    name: "HI-SEAS (Hawaii Space Exploration Analog and Simulation)",
    url: "https://hi-seas.org/",
    status: "Research reference",
    statusTone: "reference",
    feeds: "Validates Mauna Kea as a documented Moon analog site — informs its scoring and description."
  },
  {
    name: "OpenStreetMap",
    url: "https://www.openstreetmap.org/",
    status: "Map tiles (not NASA)",
    statusTone: "other",
    feeds: "Base map rendering for the interactive map — included for attribution, not a NASA dataset."
  }
];

const TONE_CLASSES = {
  live: "bg-matchHigh/20 text-matchHigh",
  catalogued: "bg-matchMedium/20 text-matchMedium",
  reference: "bg-lightInset dark:bg-darkInset text-lightTextSecondary dark:text-darkTextSecondary",
  other: "bg-lightInset dark:bg-darkInset text-lightTextSecondary dark:text-darkTextSecondary"
};

export default function DataSourcesPage() {
  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-xl font-semibold text-lightText dark:text-darkText mb-1">
        Data Sources
      </h1>
      <p className="text-sm text-lightTextSecondary dark:text-darkTextSecondary mb-6">
        What this project uses, what's live right now, and what's planned.
      </p>

      <div className="space-y-3">
        {SOURCES.map((s) => (
          <a
            key={s.name}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className="block bg-lightPanel dark:bg-darkPanel rounded-xl border border-lightBorder dark:border-darkBorder p-4 hover:border-lightActiveNav dark:hover:border-darkActiveNav transition-colors"
          >
            <div className="flex items-center justify-between gap-3 mb-1">
              <p className="text-sm font-semibold text-lightText dark:text-darkText">{s.name}</p>
              <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${TONE_CLASSES[s.statusTone]}`}>
                {s.status}
              </span>
            </div>
            <p className="text-xs text-lightTextSecondary dark:text-darkTextSecondary">{s.feeds}</p>
          </a>
        ))}
      </div>

      <p className="mt-6 text-xs text-lightTextSecondary dark:text-darkTextSecondary">
        Only NASA POWER and MODIS appear as indexed dataset entries on NASA's official
        Open Data Portal (data.nasa.gov) — verified directly. The others are real, directly
        relevant NASA tools and research programs, listed honestly by what they're used for today.
      </p>
    </div>
  );
}
