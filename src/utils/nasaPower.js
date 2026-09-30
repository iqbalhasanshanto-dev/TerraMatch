// NASA POWER API — free, no API key required.
// Docs: https://power.larc.nasa.gov/docs/services/api/
//
// This pulls long-term climatology (temperature, precipitation) for a given
// lat/lng, which can replace the manually-estimated `aridity` and
// `temperatureExtreme` scores in src/data/sites.js with real measurements.
//
// Usage:
//   import { fetchClimatology } from './utils/nasaPower.js';
//   const data = await fetchClimatology(75.33, -89.0); // Devon Island

const POWER_BASE_URL = 'https://power.larc.nasa.gov/api/temporal/climatology/point';

export async function fetchClimatology(lat, lng) {
  const params = new URLSearchParams({
    parameters: 'T2M,T2M_MAX,T2M_MIN,PRECTOTCORR', // temp avg/max/min, precipitation
    community: 'RE',
    longitude: lng,
    latitude: lat,
    format: 'JSON'
  });

  const response = await fetch(`${POWER_BASE_URL}?${params}`);

  if (!response.ok) {
    throw new Error(`NASA POWER API error: ${response.status}`);
  }

  const data = await response.json();
  return data.properties.parameter;
  // Shape: { T2M: { JAN: ..., FEB: ..., ..., ANN: <annual average> }, ... }
}

// Rough helper: turns annual mean temperature + precipitation into a 1-10
// "extremeness" score, so it can slot into the existing scores object.
// This is a starting formula — tune the thresholds against your 5 sites
// once you see real numbers.
export function scoreFromClimatology(climatology) {
  const annualTemp = climatology.T2M?.ANN ?? 15;
  const annualPrecip = climatology.PRECTOTCORR?.ANN ?? 50;

  // Colder and more extreme = higher Mars/Moon analog score
  const temperatureExtreme = Math.min(
    10,
    Math.round(Math.abs(annualTemp - 15) / 4)
  );

  // Drier = higher aridity score
  const aridity = Math.min(10, Math.round((100 - Math.min(annualPrecip, 100)) / 10));

  return { temperatureExtreme, aridity };
}
