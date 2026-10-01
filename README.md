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

- **Real, live**: Aridity & Temperature Extreme scoring is backed by a live call to NASA's POWER API. Select any site and the "Live NASA POWER data" panel at the bottom of its detail card fetches real annual temperature/precipitation for that exact coordinate (see `hooks/useClimatology.js` + `utils/nasaPower.js`). Results are cached in memory per site for the session.
- **Mock/placeholder, for your backend dev to replace**: everything under each site's `mock` field in `sites.js` (current weather, humidity, air pressure, oxygen level) — hardcoded sample values so the UI has something to render. Same field names throughout, so swapping the data source doesn't require touching any component.
- **"Best match" logic on Dashboard** is "highest `overallScorePercent` among sites with matching `target`" — not a real similarity computation against the searched target's actual stats yet.
- **Criteria matching on Explore Map** (`utils/criteriaMatch.js`) is a simple distance-based formula, intentionally basic — a good placeholder, not a real climate-matching model.
- **Saved Locations** is `localStorage`-only (see `SavedLocationsContext.jsx`) — fine for a demo, won't sync across devices.

## What it does right now

- **Dashboard** (`/`) — search by target name (Mars, Moon, a named crater), see the best-matching Earth site plus a reference card with the target's own stats. Click the ✕ on the detail card to clear the selection.
- **Explore Map** (`/explore`) — search by condition: target (Any/Mars/Moon), terrain type, weather, temperature, humidity. Results list updates live and is labeled honestly — "Matching locations" once you've set a filter, "All candidate sites (ranked by overall score)" before you have. Click the ✕ to deselect.
- **Saved Locations** — bookmark sites from either search page; persisted locally.
- **Compare** — pick any two sites and see them side by side: real conditions (terrain, weather, humidity, elevation, soil type) *and* the five analog scores *and* each site's "why it matches" text — not just abstract numbers.
- **Data Sources** — all 7 sources this project uses, each honestly labeled: Live (NASA POWER), Catalogued on data.nasa.gov (MODIS), Reference (Mars Trek, Moon Trek, HMP, HI-SEAS), or Map tiles / not NASA (OpenStreetMap) — with what each one actually feeds.
- **About** — project description.
- **Dark/light mode** — toggle in the sidebar, persisted across sessions.

## Data sources used (final list)

| Source | Status | Link |
|---|---|---|
| NASA POWER (Prediction Of Worldwide Energy Resources) | Live — wired in | https://power.larc.nasa.gov/ |
| MODIS (Moderate Resolution Imaging Spectroradiometer) | Catalogued on data.nasa.gov | https://modis.gsfc.nasa.gov/ |
| NASA Mars Trek | Reference | https://trek.nasa.gov/mars/ |
| NASA Moon Trek | Reference | https://trek.nasa.gov/moon/ |
| NASA Haughton-Mars Project (HMP) | Research reference | https://www.marsonearth.org/ |
| HI-SEAS (Hawaii Space Exploration Analog and Simulation) | Research reference | https://hi-seas.org/ |
| OpenStreetMap | Map tiles, not NASA | https://www.openstreetmap.org/ |

Only NASA POWER and MODIS are confirmed indexed dataset entries on NASA's official Open Data Portal (data.nasa.gov) — verified directly. The rest are real, directly relevant NASA tools/programs, labeled by actual current use rather than overclaimed as "integrated."

## Next steps

- Wire Mars Trek / Moon Trek real surface data into target reference stats (currently published averages)
- Use MODIS vegetation/land-surface-temperature data to strengthen the Terrain Similarity score
- Grow past 5 hardcoded sites — the biggest lever left for impact/creativity scoring
- Replace the criteria-match formula in `utils/criteriaMatch.js` with something more rigorous once there's more real per-site data to match against
