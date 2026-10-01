const SOURCES = [
  {
    name: "NASA POWER API",
    url: "https://power.larc.nasa.gov/",
    status: "Wired in",
    description: "Earth climate data (temperature, precipitation, radiation) by lat/lng. Powers src/utils/nasaPower.js — no API key required."
  },
  {
    name: "NASA Mars Trek",
    url: "https://trek.nasa.gov/mars/",
    status: "Planned",
    description: "Real Martian surface data — elevation, mineral composition, temperature — for comparing Earth analogs against actual Mars conditions."
  },
  {
    name: "NASA Moon Trek",
    url: "https://trek.nasa.gov/moon/",
    status: "Planned",
    description: "Real lunar surface data — elevation, regolith composition, lighting — for comparing Earth analogs against actual Moon conditions."
  },
  {
    name: "NASA Earthdata / MODIS",
    url: "https://www.earthdata.nasa.gov/",
    status: "Planned",
    description: "Vegetation index (NDVI) and land surface temperature, for a more detailed terrainSimilarity score."
  }
];

export default function DataSourcesPage() {
  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-xl font-semibold text-lightText dark:text-darkText mb-1">
        Data Sources
      </h1>
      <p className="text-sm text-lightTextSecondary dark:text-darkTextSecondary mb-6">
        Real NASA datasets this project uses or plans to use.
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
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-lightText dark:text-darkText">{s.name}</p>
              <span className={
                "text-xs px-2 py-0.5 rounded-full " +
                (s.status === "Wired in"
                  ? "bg-matchHigh/20 text-matchHigh"
                  : "bg-lightInset dark:bg-darkInset text-lightTextSecondary dark:text-darkTextSecondary")
              }>
                {s.status}
              </span>
            </div>
            <p className="text-xs text-lightTextSecondary dark:text-darkTextSecondary">{s.description}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
