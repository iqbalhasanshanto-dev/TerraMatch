// Candidate Earth locations used as analogs for Moon/Mars base sites.
// Scores are 1-10 (10 = strongest match) based on published analog research.
// Sources: NASA HMP (Devon Island), HI-SEAS (Mauna Kea), Atacama astrobiology
// studies, McMurdo Dry Valleys research, Rio Tinto extremophile studies.

const SITES = [
  {
    id: "devon-island",
    name: "Devon Island, Canada",
    lat: 75.33,
    lng: -89.0,
    target: "mars",
    description: "Cold, dry polar desert with an impact crater (Haughton). Used by NASA's Haughton-Mars Project since 2000.",
    scores: {
      aridity: 8,
      temperatureExtreme: 9,
      terrainSimilarity: 9,
      isolation: 9,
      geologicalRelevance: 9
    }
  },
  {
    id: "atacama-desert",
    name: "Atacama Desert, Chile",
    lat: -24.5,
    lng: -69.25,
    target: "mars",
    description: "Driest non-polar desert on Earth. Soil chemistry and extreme UV exposure closely resemble Martian surface conditions.",
    scores: {
      aridity: 10,
      temperatureExtreme: 6,
      terrainSimilarity: 8,
      isolation: 6,
      geologicalRelevance: 8
    }
  },
  {
    id: "mcmurdo-dry-valleys",
    name: "McMurdo Dry Valleys, Antarctica",
    lat: -77.5,
    lng: 162.0,
    target: "mars",
    description: "Ice-free polar desert with permafrost and extreme cold. One of the closest terrestrial matches to Martian cryogenic conditions.",
    scores: {
      aridity: 9,
      temperatureExtreme: 10,
      terrainSimilarity: 8,
      isolation: 10,
      geologicalRelevance: 8
    }
  },
  {
    id: "mauna-kea",
    name: "Mauna Kea, Hawaii, USA",
    lat: 19.82,
    lng: -155.47,
    target: "moon",
    description: "Volcanic, basaltic terrain with fine regolith-like dust. Site of the HI-SEAS long-duration isolation habitat.",
    scores: {
      aridity: 6,
      temperatureExtreme: 5,
      terrainSimilarity: 9,
      isolation: 7,
      geologicalRelevance: 9
    }
  },
  {
    id: "rio-tinto",
    name: "Rio Tinto, Spain",
    lat: 37.7,
    lng: -6.57,
    target: "mars",
    description: "Highly acidic, iron-rich river system. Mineralogy closely matches iron oxide deposits found on Mars.",
    scores: {
      aridity: 4,
      temperatureExtreme: 3,
      terrainSimilarity: 7,
      isolation: 3,
      geologicalRelevance: 9
    }
  }
];
