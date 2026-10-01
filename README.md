# TeraMatch

Identifying Earth locations that serve as analogs for permanent Moon and Mars base sites.

Built for NASA Space Apps Challenge 2026 — Rajshahi, Bangladesh.

## Tech stack

- React 18 + React Router (multi-page: Dashboard, Explore Map, Saved Locations, Compare, Data Sources, About)
- Tailwind CSS (dark/light mode via `darkMode: 'class'`, color tokens in `tailwind.config.js` match the design system)
- Vite (build tool / dev server)
- Leaflet + React-Leaflet (interactive map)
- lucide-react (icons)
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
    ├── main.jsx                 React root — wraps App in ThemeProvider, SavedLocationsProvider, BrowserRouter
    ├── App.jsx                  Sidebar + route table
    ├── index.css                Tailwind directives, Inter font import, map sizing fix
    ├── context/
    │   ├── ThemeContext.jsx         dark/light mode, persisted to localStorage
    │   └── SavedLocationsContext.jsx "Save location" state, persisted to localStorage (basic — swap for an API later)
    ├── data/
    │   ├── sites.js             the 5 candidate Earth analog sites — scores + mock display fields (weather, elevation, etc.)
    │   └── targets.js           searchable off-Earth targets: Mars, Moon, named craters/features
    ├── utils/
    │   ├── scoring.js           overallScore(), overallScorePercent(), matchColor(), bestMatchesFor()
    │   └── nasaPower.js         fetch real climate data from NASA POWER (see below)
    ├── components/
    │   ├── Sidebar.jsx              nav + theme toggle
    │   ├── SearchPanel.jsx          search input, autocomplete, example chips
    │   ├── ReferenceLocationCard.jsx  off-Earth target stats (Mars/Moon/crater)
    │   ├── EarthLocationCard.jsx     selected site detail: similarity bar, conditions, save/compare buttons
    │   ├── MapView.jsx              Leaflet map, match-colored markers, pan-to-selected
    │   ├── MapLegend.jsx            High/Medium/Low match legend overlay
    │   ├── CriteriaFilterPanel.jsx  humidity/temperature/weather/terrain inputs (Explore Map)
    │   └── MatchResultsList.jsx     ranked results list for the criteria search (Explore Map)
    └── pages/
        ├── Dashboard.jsx         map + search BY TARGET NAME (Mars, Moon, a crater) — the default landing screen
        ├── ExploreMap.jsx        map + search BY CONDITIONS (humidity, temperature, weather, terrain)
        ├── SavedLocations.jsx    list of saved sites
        ├── Compare.jsx           pick 2 sites, compare scores side by side
        ├── DataSourcesPage.jsx   real NASA APIs used/planned, with links
        └── About.jsx             project description
```

**Dashboard vs. Explore Map — two different search modes, both map + a proper right-hand panel:**
- **Dashboard** (`/`): type a target name ("Mars", "Jezero Crater", "Moon") and get its best-matching Earth site, plus a reference card with the target's own stats (temp, gravity, atmosphere).
- **Explore Map** (`/explore`): instead specify *conditions* you want (temperature, humidity, weather, terrain type) and get a ranked list of Earth sites scored against those conditions — e.g. "I need somewhere cold and dry, what matches?" See `utils/criteriaMatch.js` for the scoring logic.

Both pages use a full-height right-hand `<aside>` panel (not an absolutely-positioned overlay), so clicking a map marker or a result always shows its details and scrolls if needed instead of getting clipped off-screen.

## What's mock vs. real right now

- **Real**: the 5 sites' `aridity`/`temperatureExtreme` scores can be computed from live NASA POWER data via `fetchClimatology()` in `utils/nasaPower.js` (see "Today's plan" — this still needs to be wired into the UI).
- **Mock/placeholder, for your backend dev to replace**: everything under each site's `mock` field in `sites.js` (current weather, humidity, air pressure, oxygen level) — these are hardcoded sample values so the UI has something to render. Same field names should be kept so the components don't need changes.
- **"Best match" logic on Dashboard** is currently just "highest `overallScorePercent` among sites with matching `target`" — not a real similarity computation against the searched target's actual stats.
- **Criteria matching on Explore Map** (`utils/criteriaMatch.js`) is a simple distance-based formula, intentionally basic — a good placeholder, not a real climate-matching model.
- **Saved Locations** is `localStorage`-only (see `SavedLocationsContext.jsx`) — fine for a demo, but won't sync across devices. Swap for a real endpoint when there's one.

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
