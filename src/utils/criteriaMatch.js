import { overallScorePercent } from './scoring.js';

export const TERRAIN_OPTIONS = [
  "Desert",
  "Polar desert",
  "Ice-free polar desert",
  "Volcanic highland",
  "River basin"
];

export const WEATHER_OPTIONS = ["Clear", "Windy"];

export const DEFAULT_CRITERIA = {
  target: "any", // "any" | "mars" | "moon"
  terrain: "any",
  weather: "any",
  temperature: "",
  humidity: ""
};

// Basic distance-based scoring — not a real climate-matching model, just
// enough to rank sites against what the user typed in. Swap for a real
// algorithm (and real per-site data) once the backend exists.
export function computeCriteriaMatches(sites, criteria) {
  const pool =
    criteria.target && criteria.target !== "any"
      ? sites.filter((s) => s.target === criteria.target)
      : sites;

  const results = pool.map((site) => {
    const dims = [];

    if (criteria.terrain && criteria.terrain !== "any") {
      dims.push(site.mock.terrainType === criteria.terrain ? 100 : 20);
    }
    if (criteria.weather && criteria.weather !== "any") {
      dims.push(site.mock.currentWeather === criteria.weather ? 100 : 30);
    }
    if (criteria.temperature !== "" && criteria.temperature !== undefined) {
      const diff = Math.abs(site.mock.tempC - Number(criteria.temperature));
      dims.push(Math.max(0, 100 - diff * 3));
    }
    if (criteria.humidity !== "" && criteria.humidity !== undefined) {
      const diff = Math.abs(site.mock.humidityPercent - Number(criteria.humidity));
      dims.push(Math.max(0, 100 - diff * 2));
    }

    // No criteria set yet — fall back to the site's overall analog score
    // so the list still shows something sensible before the user filters.
    const percent = dims.length
      ? Math.round(dims.reduce((a, b) => a + b, 0) / dims.length)
      : overallScorePercent(site.scores);

    return { site, percent, filtered: dims.length > 0 };
  });

  return results.sort((a, b) => b.percent - a.percent);
}
