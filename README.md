# TeraMatch

Identifying Earth locations that serve as analogs for permanent Moon and Mars base sites.

Built for NASA Space Apps Challenge 2026 — Rajshahi, Bangladesh.

## Tech stack

- React 18
- Tailwind CSS
- Vite (build tool / dev server)
- Leaflet + React-Leaflet (interactive map)
- NASA POWER API (real climate data — see "Today's plan" below)

## Getting started

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. Hot-reloads on save.

To build a production bundle (useful if you want to deploy it, e.g. to Netlify/Vercel/GitHub Pages):

```bash
npm run build
npm run preview   # preview the production build locally
```

## Project structure

```
teramatch/
├── index.html                  entry HTML, mounts React
├── package.json                dependencies + npm scripts
├── vite.config.js              Vite build config
├── tailwind.config.js          Tailwind theme (mars/moon/base colors defined here)
├── postcss.config.js           required by Tailwind
├── .env.example                copy to .env for the NASA API key
├── .gitignore
├── .eslintrc.cjs
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx                React root, imports Leaflet CSS + Tailwind
    ├── App.jsx                 top-level layout, holds filter/selection state
    ├── index.css               Tailwind directives + map sizing fix
    ├── data/
    │   └── sites.js            the 5 candidate analog sites + scores
    ├── utils/
    │   ├── scoring.js          overallScore(), markerColor(), scoreLabel()
    │   └── nasaPower.js        fetch real climate data from NASA (see below)
    └── components/
        ├── Header.jsx
        ├── FilterBar.jsx       All / Mars / Moon toggle
        ├── MapView.jsx         Leaflet map, colored markers, pan-to-selected
        ├── SiteList.jsx        ranked sidebar list
        └── SiteDetails.jsx     score breakdown panel
```

## What it does right now

- Interactive world map with 5 candidate analog sites, color-coded (Mars = red, Moon = gray)
- Filter by target: All / Mars / Moon
- Each site scored 1–10 across 5 criteria: aridity, temperature extremes, terrain similarity, isolation, geological relevance
- Sites ranked by overall match score
- Click any marker or list item to see the full breakdown

Current scores in `src/data/sites.js` are estimated from published analog research (see file comments for sources) — not yet pulled from live data. That's today's upgrade.

---

## Today's plan (you have ~1 day)

### Morning: get real data in
This is the single highest-value thing you can do — judges notice when a Space Apps project actually pulls NASA data instead of hardcoding numbers.

1. `npm install` and confirm the app runs (`npm run dev`).
2. Open `src/utils/nasaPower.js` — it already has a working `fetchClimatology(lat, lng)` function that calls NASA's POWER API (no key needed, it's public).
3. In `src/App.jsx`, on load, loop through `SITES` and call `fetchClimatology` for each site's lat/lng, then merge the real temperature/precipitation numbers into each site's `scores` using `scoreFromClimatology()`.
4. Tune the thresholds in `scoreFromClimatology()` once you see real numbers — they're a starting formula, not final.

This alone upgrades your submission from "plausible estimates" to "actually uses NASA open data," which is the core ask of most Space Apps challenges.

### Midday: add 3-5 more candidate sites
More sites = more compelling comparison. Good next candidates (same format as `sites.js`):
- **La Silla / Atacama high plateau** (if you want a second Chile site with different characteristics)
- **Kilauea lava tubes, Hawaii** (Moon analog — lava tube habitats are a real NASA research interest)
- **Erta Ale, Ethiopia** (Mars analog — active volcanism, extreme heat)
- **Deception Island, Antarctica** (Moon/Mars analog — volcanic + polar)

Get lat/lng from Google Maps, write a 1-sentence description, and let `nasaPower.js` fill in the climate scores automatically once you've done the App.jsx wiring above.

### Afternoon: polish for judging
- Add a **side-by-side comparison view**: let the user select 2-3 sites and see their scores in a table instead of one at a time. This is the most common "wow, that's a real feature" ask from judges.
- Add a short **About** section or modal explaining your methodology (what the 5 scoring criteria mean and why).
- Test on mobile — Space Apps judges often check on their phones.

### Evening: submission prep
- Write/finalize your pitch using the demo script below.
- Record a 2-3 minute demo video as backup in case live judging has technical issues.
- Double check your GitHub repo has this full structure committed, plus a clear README (this one).

---

## NASA POWER API — quick reference

No signup, no API key, free and immediate. Docs: https://power.larc.nasa.gov/docs/services/api/

Example request for Devon Island's climatology:
```
https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M,T2M_MAX,T2M_MIN,PRECTOTCORR&community=RE&longitude=-89.0&latitude=75.33&format=JSON
```

Returns monthly and annual averages for temperature and precipitation — exactly what you need to replace the manual `aridity` and `temperatureExtreme` scores with real measurements.

If you also want a NASA API key for other endpoints (imagery, Earth observation, etc.), get one instantly at https://api.nasa.gov — it's free, no waiting period, and `.env.example` already has a placeholder for it (`VITE_NASA_API_KEY`).

## Demo script (for the presenter)

1. Open the app — map loads with all candidate sites plotted worldwide.
2. Point out the color coding: red = Mars analog, gray = Moon analog.
3. Click "Mars Analogs" filter — map narrows to just those sites.
4. Click the highest-scoring site — show the score breakdown in the sidebar.
5. Explain the scoring criteria and mention the scores are pulled from NASA's POWER API, not guessed.
6. If you built the comparison view, show 2-3 sites side by side as the closing feature.

## Next steps (post-submission)

- Add the side-by-side comparison view if not done during judging prep
- Expand beyond climate: pull elevation/terrain data (e.g., USGS or NASA SRTM) for the `terrainSimilarity` score
- Add a "target profile" selector that reweights scoring criteria based on mission type (Moon vs Mars have different priority environmental factors)
