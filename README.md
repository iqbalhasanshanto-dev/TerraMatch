# TerraMatch

Identifying Earth locations that serve as analogs for permanent Moon and Mars base sites, using a simple geospatial comparison tool.

## Problem

Choosing a location for a future lunar or Martian outpost requires understanding how well Earth environments simulate the target conditions — terrain, climate, isolation, and geology. Space agencies already use specific Earth sites (like Devon Island and Mauna Kea) for astronaut training and technology testing. This project visualizes and scores those candidate analog sites.

## What it does

- Displays known Earth analog sites on an interactive map
- Scores each site (1–10) across five criteria: aridity, temperature extremes, terrain similarity, isolation, and geological relevance
- Shows an overall match score per site, tagged by whether it's a Moon or Mars analog

## Data

Site data (`data.js`) is based on publicly documented analog research programs, including:
- NASA's Haughton-Mars Project (Devon Island)
- HI-SEAS long-duration isolation studies (Mauna Kea)
- Atacama Desert astrobiology research
- McMurdo Dry Valleys polar desert studies
- Rio Tinto extremophile/mineralogy research

Scores are estimated from published descriptions of each site's environmental conditions relative to Mars/Moon surface conditions — not derived from a formal remote sensing dataset. Next step: replace with real datasets (NASA Earthdata, USGS) for automated scoring.

## Running it

No build step required.

1. Clone the repo
2. Open `index.html` in a browser (or serve the folder with any static server)

## Team

Built for NASA Space Apps Challenge 2026 — Rajshahi, Bangladesh.

## Next steps

- Pull real environmental data (temperature, precipitation, radiation) from NASA/USGS APIs instead of manual scores
- Add a "target profile" selector (Moon vs Mars) that reweights scoring criteria
- Add more candidate sites
