// Candidate Earth locations used as analogs for Moon/Mars base sites.
//
// `scores` (1-10 each) feed overallScore()/overallScorePercent() in
// utils/scoring.js — that's the real analog-quality logic, and
// aridity/temperatureExtreme are already wired to real NASA POWER data
// in utils/nasaPower.js.
//
// `mock` holds the extra display fields the UI design calls for (current
// weather, air pressure, etc). These are placeholders — NOT real
// measurements — hardcoded so the UI has something to render. The backend
// dev should replace `mock` with a real API response per site; keep the
// same field names so the components don't need to change.

export const SITES = [
  {
    id: "devon-island",
    name: "Devon Island",
    country: "Canada",
    flag: "🇨🇦",
    lat: 75.33,
    lng: -89.0,
    target: "mars",
    description: "Cold, dry polar desert with an impact crater (Haughton). Used by NASA's Haughton-Mars Project since 2000.",
    whyItMatches: "Extreme cold, aridity, and an impact-crater landscape closely mirror Martian polar terrain.",
    scores: {
      aridity: 8,
      temperatureExtreme: 9,
      terrainSimilarity: 9,
      isolation: 9,
      geologicalRelevance: 9
    },
    mock: {
      thumbnailGradient: "from-slate-400 to-slate-600",
      currentWeather: "Clear",
      tempC: -5,
      humidityPercent: 55,
      airPressureHpa: 1012,
      oxygenLevelPercent: 21,
      terrainType: "Polar desert",
      elevationM: 500,
      soilType: "Rocky, permafrost"
    }
  },
  {
    id: "atacama-desert",
    name: "Atacama Desert",
    country: "Chile",
    flag: "🇨🇱",
    lat: -24.5,
    lng: -69.25,
    target: "mars",
    description: "Driest non-polar desert on Earth. Soil chemistry and extreme UV exposure closely resemble Martian surface conditions.",
    whyItMatches: "It has a dry climate, low humidity, rocky soil, and a similar mineral composition to Mars.",
    scores: {
      aridity: 10,
      temperatureExtreme: 6,
      terrainSimilarity: 8,
      isolation: 6,
      geologicalRelevance: 8
    },
    mock: {
      thumbnailGradient: "from-orange-300 to-red-500",
      currentWeather: "Clear",
      tempC: 18,
      humidityPercent: 12,
      airPressureHpa: 1018,
      oxygenLevelPercent: 21,
      terrainType: "Desert",
      elevationM: 2400,
      soilType: "Sandy, rocky, volcanic"
    }
  },
  {
    id: "mcmurdo-dry-valleys",
    name: "McMurdo Dry Valleys",
    country: "Antarctica",
    flag: "🇦🇶",
    lat: -77.5,
    lng: 162.0,
    target: "mars",
    description: "Ice-free polar desert with permafrost and extreme cold. One of the closest terrestrial matches to Martian cryogenic conditions.",
    whyItMatches: "Permafrost, near-zero precipitation, and extreme cold replicate Martian cryogenic surface conditions.",
    scores: {
      aridity: 9,
      temperatureExtreme: 10,
      terrainSimilarity: 8,
      isolation: 10,
      geologicalRelevance: 8
    },
    mock: {
      thumbnailGradient: "from-slate-200 to-slate-400",
      currentWeather: "Windy",
      tempC: -18,
      humidityPercent: 30,
      airPressureHpa: 1005,
      oxygenLevelPercent: 21,
      terrainType: "Ice-free polar desert",
      elevationM: 1100,
      soilType: "Permafrost, gravel"
    }
  },
  {
    id: "mauna-kea",
    name: "Mauna Kea",
    country: "USA (Hawaii)",
    flag: "🇺🇸",
    lat: 19.82,
    lng: -155.47,
    target: "moon",
    description: "Volcanic, basaltic terrain with fine regolith-like dust. Site of the HI-SEAS long-duration isolation habitat.",
    whyItMatches: "Basaltic volcanic rock and fine dust closely resemble lunar mare regolith.",
    scores: {
      aridity: 6,
      temperatureExtreme: 5,
      terrainSimilarity: 9,
      isolation: 7,
      geologicalRelevance: 9
    },
    mock: {
      thumbnailGradient: "from-stone-500 to-stone-800",
      currentWeather: "Clear",
      tempC: 4,
      humidityPercent: 20,
      airPressureHpa: 975,
      oxygenLevelPercent: 21,
      terrainType: "Volcanic highland",
      elevationM: 4200,
      soilType: "Basaltic regolith"
    }
  },
  {
    id: "rio-tinto",
    name: "Rio Tinto",
    country: "Spain",
    flag: "🇪🇸",
    lat: 37.7,
    lng: -6.57,
    target: "mars",
    description: "Highly acidic, iron-rich river system. Mineralogy closely matches iron oxide deposits found on Mars.",
    whyItMatches: "Iron-oxide-rich, acidic water chemistry mirrors mineral deposits identified on the Martian surface.",
    scores: {
      aridity: 4,
      temperatureExtreme: 3,
      terrainSimilarity: 7,
      isolation: 3,
      geologicalRelevance: 9
    },
    mock: {
      thumbnailGradient: "from-red-400 to-orange-700",
      currentWeather: "Clear",
      tempC: 22,
      humidityPercent: 40,
      airPressureHpa: 1015,
      oxygenLevelPercent: 21,
      terrainType: "River basin",
      elevationM: 350,
      soilType: "Iron-oxide rich sediment"
    }
  }
];
