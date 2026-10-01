// Reference locations off-Earth: the things a user searches for ("Mars",
// "Jezero Crater", etc). Each resolves to a parent body ("mars" or "moon")
// so we know which SITES entries to compare it against.
//
// Values here are well-known reference figures (NASA fact sheets) — fine as
// placeholders. Swap for live NASA API data (Mars Trek / Moon Trek) once the
// backend is wired up; see src/utils/nasaPower.js for the pattern to follow.

export const TARGETS = [
  {
    id: "mars",
    name: "Mars",
    parentBody: "mars",
    type: "planet",
    surfaceType: "Rocky, dusty",
    avgTempC: -63,
    gravityG: 0.38,
    atmosphere: "CO2 (thin)"
  },
  {
    id: "jezero-crater",
    name: "Jezero Crater",
    parentBody: "mars",
    type: "crater",
    surfaceType: "Ancient lakebed, clay-rich",
    avgTempC: -60,
    gravityG: 0.38,
    atmosphere: "CO2 (thin)"
  },
  {
    id: "hellas-planitia",
    name: "Hellas Planitia",
    parentBody: "mars",
    type: "crater",
    surfaceType: "Deep impact basin",
    avgTempC: -70,
    gravityG: 0.38,
    atmosphere: "CO2 (thin)"
  },
  {
    id: "valles-marineris",
    name: "Valles Marineris",
    parentBody: "mars",
    type: "canyon",
    surfaceType: "Canyon system, layered rock",
    avgTempC: -65,
    gravityG: 0.38,
    atmosphere: "CO2 (thin)"
  },
  {
    id: "moon",
    name: "Moon",
    parentBody: "moon",
    type: "planet",
    surfaceType: "Basaltic regolith",
    avgTempC: -53,
    gravityG: 0.166,
    atmosphere: "None (exosphere)"
  },
  {
    id: "lunar-south-pole",
    name: "Lunar South Pole",
    parentBody: "moon",
    type: "pole",
    surfaceType: "Permanently shadowed craters, ice deposits",
    avgTempC: -173,
    gravityG: 0.166,
    atmosphere: "None (exosphere)"
  },
  {
    id: "shackleton-crater",
    name: "Shackleton Crater",
    parentBody: "moon",
    type: "crater",
    surfaceType: "Permanently shadowed, ice-bearing",
    avgTempC: -183,
    gravityG: 0.166,
    atmosphere: "None (exosphere)"
  }
];

// Generic fallback reference info when a user selects an Earth site directly
// (e.g. clicking a map marker) rather than searching a named target first.
export function genericTarget(parentBody) {
  return parentBody === "mars"
    ? TARGETS.find((t) => t.id === "mars")
    : TARGETS.find((t) => t.id === "moon");
}

export const EXAMPLE_SEARCHES = [
  "Moon",
  "Mars",
  "Lunar South Pole",
  "Jezero Crater",
  "Shackleton Crater"
];
