# TeraMatch

Identifying Earth locations that serve as analogs for permanent Moon and Mars base sites, using a simple geospatial comparison tool.

## Problem

Choosing a location for a future lunar or Martian outpost requires understanding how well Earth environments simulate the target conditions — terrain, climate, isolation, and geology. Space agencies already use specific Earth sites (like Devon Island and Mauna Kea) for astronaut training and technology testing. TeraMatch visualizes and scores those candidate analog sites side by side.

## What it does

- Displays known Earth analog sites on an interactive map, color-coded by target (Mars = red, Moon = gray)
- Filter sites by target: All / Mars / Moon
- Scores each site (1–10) across five criteria: aridity, temperature extremes, terrain similarity, isolation, and geological relevance
- Ranks sites by overall match score
- Click any marker or list item to see the full score breakdown

## Data

Site data (`data.js`) is based on publicly documented analog research programs, including:
- NASA's Haughton-Mars Project (Devon Island)
- HI-SEAS long-duration isolation studies (Mauna Kea)
- Atacama Desert astrobiology research
- McMurdo Dry Valleys polar desert studies
- Rio Tinto extremophile/mineralogy research

Scores are estimated from published descriptions of each site's environmental conditions relative to Mars/Moon surface conditions — not derived from a formal remote sensing pipeline yet. See "Next steps" below.

## Running it

No build step required.

1. Clone the repo
2. Open `index.html` in a browser (or serve the folder with any static server, e.g. `python3 -m http.server`)

## Project structure

```
index.html   → page structure and layout
style.css    → styling
script.js    → map rendering, filtering, and scoring logic
data.js      → the analog site dataset (add more sites here)
```

## Demo script (for the presenter)

1. Open the app — map loads with all 5 candidate sites plotted worldwide.
2. Point out the color coding: red = Mars analog, gray = Moon analog.
3. Click "Mars Analogs" filter — map narrows to just those 3 sites.
4. Click on Devon Island (highest scorer) — show the score breakdown in the sidebar.
5. Explain the five scoring criteria and why Devon Island scores highest (cold, dry, crater terrain, extreme isolation).
6. Mention the roadmap: swapping manual scores for real NASA/USGS environmental data.

## Team

Built for NASA Space Apps Challenge 2026 — Rajshahi, Bangladesh.

## Next steps

- Pull real environmental data (temperature, precipitation, radiation) from NASA Earthdata / USGS APIs instead of manual scores
- Add a "target profile" selector that reweights scoring criteria based on mission type
- Add more candidate sites
- Add a side-by-side comparison view for 2-3 selected sites