# TerraMatch — Planetary Analog Discovery & Telemetry Platform

> Built for the **2026 NASA Space Apps Challenge**: [Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars](https://www.spaceappschallenge.org/2026/challenges/permanent-moon-base-locations-and-mars/?tab=details)

[![Live App](https://img.shields.io/badge/Live_Web_App-terramatch--vu--nexus.vercel.app-83CAD8?style=for-the-badge&logo=vercel&logoColor=07090E)](https://terramatch-vu-nexus.vercel.app)
[![Demo Video](https://img.shields.io/badge/60s_Demo_Video-YouTube-D67051?style=for-the-badge&logo=youtube&logoColor=white)](https://youtu.be/DVrCYjQ2fG4)
[![NASA Space Apps](https://img.shields.io/badge/NASA_Space_Apps-2026_Challenge-0B3A60?style=for-the-badge&logo=nasa&logoColor=white)](https://www.spaceappschallenge.org/2026/challenges/permanent-moon-base-locations-and-mars/?tab=details)

---

## 📌 Quick Links

- **🌐 Live Web Application:** [https://terramatch-ve-nasas.vercel.app](https://terramatch-vu-nexus.vercel.app)
- **🎬 60-Second Video Demonstration:** [https://youtu.be/DVrCYjQ2fG4](https://youtu.be/DVrCYjQ2fG4)
- **🚀 Official NASA Challenge:** [Permanent Moon Base Locations and Mars](https://www.spaceappschallenge.org/2026/challenges/permanent-moon-base-locations-and-mars/?tab=details)

---

## 🌌 Challenge Overview & Our Solution

### The Challenge Problem
Selecting future **Permanent Moon Base (Artemis)** habitats and **Mars landing sites** demands testing rovers, drilling rigs, spacesuits, life-support hardware, and autonomous navigation in terrestrial environments that replicate extraterrestrial extremes. However, **no single Earth site is an identical match for another world**:
- High-latitude permafrost mimics polar crater ground ice but has a dense, 1-bar breathable atmosphere.
- Hyper-arid salt flats mirror Martian evaporites and perchlorate soil chemistry, but experience Earth gravity ($9.81\ \text{m/s}^2$).
- Basaltic lava tubes shield against radiation and simulate volcanic voids on the Moon and Mars, yet lack hard vacuum ($10^{-12}\ \text{mbar}$) or galactic cosmic radiation bombardment.

As highlighted in the NASA Space Apps Challenge guidelines:
> *"An analog does not have to match everything... Identify what is similar, how similar it is, and what is different. Remember Earth's limits as an analog (gravity, vacuum, thin atmosphere, radiation)."*

### How TerraMatch Solves It
**TerraMatch** is a planetary science discovery platform and satellite telemetry engine. It bridges terrestrial planetary analogs with open Earth and space agency observation archives:
1. **Curated 51-Site Planetary Analog Catalog:** Pre-indexed with peer-reviewed geological, mineralogical, and historical mission testbed data (Apollo, Curiosity, Perseverance, ExoMars).
2. **Live "Probe Any Coordinate" & Whole-Earth Telemetry:** Integrates real-time **NASA POWER** climatology and **Open-Meteo** elevation APIs to inspect any coordinate on the globe for analog viability.
3. **Multi-Dimensional Scientific Fidelity Analysis:** Evaluates four key scientific dimensions—*Geomorphology & Mineralogy*, *Topography & Terrain*, *Thermal & Climate*, and *Volatiles, Ice & ISRU*.
4. **Explicit "Where the Analogy Breaks Down" Engine:** Directly contrasts terrestrial physical limits (Earth's $1.0\ g$ gravity, $1,013\ \text{mbar}$ atmosphere, geomagnetic shielding, and biological contamination) against lunar and Martian conditions.
5. **Interactive Mission Comparison & Cloud Sync:** Allows mission architects to compare sites against Moon and Mars orbital baselines, deep-link into **NASA Worldview**, and sync candidate sites across devices.

---

## 🛰️ Core Features

### 1. Interactive Global Satellite Map & 51+ Verified Analog Catalog
- **Multi-Body Color Coding:** Instant visual discrimination between **Moon analogs** (`#83CAD8` Cyan), **Mars analogs** (`#D67051` Terracotta), and **Dual Moon/Mars sites** (`#CEB882` Gold).
- **Esri World Imagery Satellite Tiles:** Seamless high-resolution global base layer framed to eliminate grey tile loading issues while maintaining smooth multi-directional pan and zoom.
- **Rich Analog Diversity:** Covers polar impact craters (Haughton, Devon Island), hyper-arid regolith (Atacama, Qaidam Basin), basaltic shield volcanism (Mauna Kea, Kilauea), volcanic voids & lava tubes (Lanzarote, Craters of the Moon), and acidic iron-sulfate rivers (Río Tinto).

### 2. Live "Probe Any Earth Coordinate" & Whole-Earth Scan
- **Click-to-Probe Any Location:** Click anywhere on the global map to instantly extract latitude, longitude, reverse-geocoded place names, and live satellite parameters.
- **Real-Time NASA POWER Telemetry:** Fetches 30-year solar and meteorological climatology:
  - `T2M`: Mean annual surface temperature (°C)
  - `RH2M`: Relative humidity (%)
  - `PRECTOTCORR`: Mean precipitation rate (mm/day)
  - `ALLSKY_SFC_SW_DWN`: All-sky insolation incident on a horizontal surface ($\text{MJ/m}^2/\text{day}$)
- **Open-Meteo Precision Elevation:** Retrieves digital terrain elevation above sea level ($m$).
- **Autonomous Whole-Earth Scan:** Scans planetary biomes across Earth matching custom climate and elevation constraints to surface novel candidate analogs beyond known literature.

### 3. Mission Preset & Environmental Search Console
- **Target Body Selection:** Filter by Moon, Mars, or Dual targets.
- **Mission Presets:** One-click configurations for specific spaceflight objectives:
  - *Permanent Moon Base & Habitation Site* (Cryogenic polar regolith, lava tubes, ISRU shielding)
  - *Subsurface Caves & Lava Tube Exploration* (Volcanic conduits, skylight collapses, radiation protection)
  - *Water-Ice Prospecting & ISRU Extraction* (Subsurface ice tables, permafrost polygons)
  - *Mars Rover Mobility & Sand Dune Navigation* (High wheel slip, aeolian ripples, megadunes)
  - *Astrobiology & Extreme Biosignatures* (Endoliths, acidic iron-rich gossans, hyper-saline basins)
- **Granular Scientific Sliders:**
  - Surface Temperature Range: Dual-thumb slider from $-60^\circ\text{C}$ to $+50^\circ\text{C}$.
  - Minimum Elevation Threshold: Continuous slider up to $4,800\ \text{m}$.
  - Geological Terrain & Aridity Filter: Filter by volcanic basalt, impact craters, caves/tubes, sand dunes, and desiccation levels.

### 4. 4-Dimension Fidelity Breakdown & "Where the Analogy Breaks Down"
Each analog location card and detail view features an automated, evidence-based scientific breakdown:
- **Dimension 1 — Geology & Mineralogy:** Evaluates mineral matches (plagioclase, olivine, pyroxene, jarosite, perchlorates, smectite clays).
- **Dimension 2 — Topography & Terrain:** Assesses crater geometry, dune slopes, boulder fields, and lava flow morphology.
- **Dimension 3 — Thermal & Climate Regime:** Benchmarks diurnal temperature swings and freeze-thaw cycles against $-63^\circ\text{C}$ (Mars mean) and cryogenic lunar permanently shadowed regions (PSRs).
- **Dimension 4 — Water, Ice & ISRU Resources:** Assesses volatile extraction feasibility, bound mineral water, and permafrost tables.
- **Earth's Physical Limits:** Highlights why Earth diverges from target bodies:
  - **Gravity:** Earth $1.0\ g$ ($9.81\ \text{m/s}^2$) vs. Moon $0.16\ g$ ($1.62\ \text{m/s}^2$) vs. Mars $0.38\ g$ ($3.71\ \text{m/s}^2$).
  - **Atmosphere & Pressure:** Earth $1,013\ \text{mbar}$ $\text{N}_2/\text{O}_2$ vs. Moon hard vacuum ($\sim 10^{-12}\ \text{mbar}$) vs. Mars thin $\text{CO}_2$ ($6.1\ \text{mbar}$).
  - **Radiation:** Earth's magnetosphere and thick atmosphere vs. unshielded Galactic Cosmic Rays (GCR) and Solar Particle Events (SPE).
  - **Biological Background:** Ubiquitous terrestrial microbes vs. sterile, oxidizing extraterrestrial regolith.

### 5. Side-by-Side Comparison & Cloud-Synced Saved Sites
- **Dual Site Matrix Comparison:** Compares two analog candidates head-to-head alongside official Moon and Mars baseline metrics.
- **Pure SVG Polar Radar Chart:** Visualizes multi-axial fidelity (Geology, Topography, Thermal, Aridity, ISRU).
- **Cloud-Synced Bookmark Engine:** Persistent bookmark management powered by MongoDB Atlas and Firebase Google Authentication, with seamless offline guest fallback.
- **NASA Worldview Deep Links:** Direct, bounding-box deep-links into NASA Worldview for daily true-color and thermal satellite verification.

---

## 📡 Space Agency & Open Datasets Used

TerraMatch integrates **11 official 2026 NASA Space Apps Challenge resources** spanning NASA, CSA, ESA, and JAXA, alongside live geospatial services:

### NASA Earth & Planetary Data
| Dataset / Source | Agency / Node | Parameter & Scientific Application | Link |
| :--- | :--- | :--- | :--- |
| **NASA POWER Climatology** | NASA LaRC | 30-year diurnal surface temperature, relative humidity, precipitation rates, and solar insolation. | [POWER API](https://power.larc.nasa.gov/api/temporal/climatology/point) |
| **NASA Earthdata Search** | NASA EOSDIS | NASADEM 30m global topography, MODIS Land Surface Temperature (MOD11), SMAP L3 Soil Moisture, and GPM IMERG Precipitation. | [Earthdata Search](https://search.earthdata.nasa.gov/) |
| **NASA Worldview** | NASA EOSDIS / GIBS | Full-resolution daily satellite imagery layers (VIIRS SNPP, MODIS Terra/Aqua Corrected Reflectance). | [NASA Worldview](https://worldview.earthdata.nasa.gov/index.html) |
| **NASA Planetary Data System (PDS)** | NASA GSFC | Central archive federating lunar and Martian orbital, rover, and lander geosciences data. | [NASA PDS](https://pds.nasa.gov/) |
| **LRO LOLA Laser Altimeter** | NASA PDS / WUSTL | Lunar crater topography, slope distribution, and polar permanently shadowed relief. | [LRO LOLA](https://pds-geosciences.wustl.edu/missions/lro/lola.htm) |
| **LRO Diviner Radiometer** | NASA PDS / UCLA | Lunar thermal brightness temperatures, polar cryogenic cold traps, and rock abundance. | [LRO Diviner](https://pds-geosciences.wustl.edu/missions/lro/diviner.htm) |
| **MGS MOLA Laser Altimeter** | NASA PDS / GSFC | Martian topographic datum baseline, global slope relief, and surface roughness. | [MGS MOLA](https://pds-geosciences.wustl.edu/missions/mgs/mola.html) |
| **Mars Orbital Data Explorer (ODE)** | NASA PDS Geosciences | Spatial cross-querying for MRO HiRISE, CRISM hyperspectral cubes, and CTX context imagery. | [Mars ODE](https://ode.rsl.wustl.edu/mars/mapsearch) |

### Partner Space Agency Data
| Dataset / Source | Agency | Parameter & Scientific Application | Link |
| :--- | :--- | :--- | :--- |
| **Chandrayaan-1 M3** | ISRO / NASA PDS | Moon Mineralogy Mapper VNIR hyperspectral imagery detecting pyroxene, anorthosite, and polar hydroxyl/water-ice absorption. | [M3 Archive](https://pds.nasa.gov/ds-view/pds/viewCollection.jsp?identifier=urn:nasa:pds:ch1_m3:data) |
| **RADARSAT Constellation (RCM)** | Canadian Space Agency (CSA) | C-band Synthetic Aperture Radar (SAR) for Arctic permafrost, ice dynamics, and micro-relief surface roughness. | [CSA RCM](https://donnees-data.asc-csa.gc.ca/en/dataset/rcm) |
| **RADARSAT-1 Open Archive** | Canadian Space Agency (CSA) | 17-year historical SAR baseline capturing Arctic cryospheric changes and structural geology. | [CSA RADARSAT-1](https://donnees-data.asc-csa.gc.ca/en/dataset/radarsat1) |
| **CSA SAR Tutorial Series** | Canadian Space Agency (CSA) | Official Python and QGIS workflow guides for SAR polarimetry, surface roughness, and terrain analysis. | [CSA SAR GitHub](https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial) |
| **Copernicus Data Space Ecosystem** | European Space Agency (ESA) | Sentinel-1 C-SAR interferometry and Sentinel-2 13-band multispectral mineralogy over terrestrial volcanic analogs. | [Copernicus](https://dataspace.copernicus.eu/) / [ESA Open Science](https://opensciencedata.esa.int/) |
| **JAXA G-Portal** | Japan Aerospace Exploration Agency | ALOS PALSAR L-band penetrating radar mapping buried bedrock and paleochannels beneath sand dunes; GCOM-C cryosphere imagery. | [JAXA G-Portal](https://gportal.jaxa.jp/gpr/index/index) |

### Geospatial & Historical Field-Test Sources
- **[Open-Meteo Elevation & Weather API](https://api.open-meteo.com/):** High-precision digital terrain elevation modeling.
- **[OpenStreetMap Nominatim API](https://nominatim.openstreetmap.org/):** Global reverse geocoding for coordinates and place names.
- **[Esri World Imagery](https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer):** Global true-color satellite imagery layer.
- **[USGS Terrestrial Analog & Apollo Archives](https://www.usgs.gov/volcanoes/craters-of-the-moon-volcanic-field):** Field deployment records from Apollo astronaut training and USGS testing.

---

## 🛠️ Tech Stack & System Architecture

```
                                  +-------------------------------------------------------+
                                  |                     TerraMatch UI                     |
                                  |          React 19 + Vite 8 + Tailwind CSS v4          |
                                  +---------------------------+---------------------------+
                                                              |
                               +------------------------------+-------------------------------+
                               |                                                              |
                               v                                                              v
                 +---------------------------+                                  +---------------------------+
                 |    Interactive Map View   |                                  |   Search & Telemetry UI   |
                 |  Leaflet + React-Leaflet  |                                  | Sliders, Presets & Modals |
                 +-------------+-------------+                                  +-------------+-------------+
                               |                                                              |
                               +------------------------------+-------------------------------+
                                                              |
                                                              v
                                             +----------------------------------+
                                             |     Telemetry & Client State     |
                                             |  Context API, Hooks & Cache      |
                                             +----------------+-----------------+
                                                              |
                               +------------------------------+-------------------------------+
                               |                                                              |
                               v                                                              v
                 +---------------------------+                                  +---------------------------+
                 |  Live Scientific APIs     |                                  |   Express 5 REST API      |
                 | - NASA POWER Climatology  |                                  | - Node.js ES Modules      |
                 | - Open-Meteo Elevation    |                                  | - Reseed & Sync Routines  |
                 | - Nominatim Geocoding     |                                  +-------------+-------------+
                 +---------------------------+                                                |
                                                                                              v
                                                                                +---------------------------+
                                                                                |    MongoDB Atlas Cloud    |
                                                                                | - Location (51 sites)     |
                                                                                | - DataSources (10 archives|
                                                                                | - RecentSearches          |
                                                                                | - Saved (Bookmarks)       |
                                                                                +---------------------------+
```

### Frontend Architecture
- **Framework & Tooling:** [React 19](https://react.dev/), [Vite 8](https://vitejs.dev/) with Hot Module Replacement (HMR).
- **Styling & Design System:** [Tailwind CSS v4](https://tailwindcss.com/) using modern `@theme` token variables and [DaisyUI v5](https://daisyui.com/) components. Custom deep-space color palette (`#07090E` void, `#0B0E13` card, `#83CAD8` cyan primary, `#D67051` terracotta).
- **Mapping & Spatial Visualization:** [Leaflet 1.9](https://leafletjs.com/) and [React-Leaflet 5](https://react-leaflet.js.org/) configured with strict single-world bounding (`-180°` to `+180°`) and Esri satellite imagery.
- **Routing & Navigation:** [React Router v7](https://reactrouter.com/) with declarative sub-routes and dynamic query string synchronization (`?ids=`).
- **Icons & Visual Indicators:** [Lucide React](https://lucide.dev/).
- **Authentication:** [Firebase v13](https://firebase.google.com/) Google OAuth popup flow with automatic guest fallback.

### Backend & Database Architecture
- **Runtime & Server Framework:** [Node.js](https://nodejs.org/) (ES Modules) and [Express v5](https://expressjs.com/).
- **Database:** [MongoDB Atlas](https://www.mongodb.com/atlas) with the official MongoDB Node.js Driver (`mongodb` v7).
- **Auto-Seeding & Schema Sync:** Initializes and updates four core collections automatically on connection:
  - `Location`: 51 validated planetary analog sites with full mineralogical and operational attributes.
  - `DataSources`: 10 official space agency mission archives with portal links and dataset descriptions.
  - `RecentSearches`: User exploration history with duplicate-prevention upsert logic.
  - `Saved`: User-bookmarked candidate sites with compound user/site indexing.

### Deployment & Cloud Infrastructure
- **Hosting:** [Vercel](https://vercel.com/) with single-page application (SPA) rewrite rules and Cross-Origin Opener Policy (`COOP: unsafe-none`) headers for smooth Google OAuth redirects.

---

## 💻 Local Installation & Setup Guide

Follow these steps to run TerraMatch locally on your machine.

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- `npm` (v9.0.0 or higher)
- A MongoDB Atlas connection string (or a local MongoDB instance)
- A Firebase project with Google Authentication enabled (optional for guest mode)

### 1. Clone the Repository
```bash
git clone https://github.com/YourUsername/TerraMatch.git
cd TerraMatch
```

### 2. Configure Client Environment Variables
Create a `.env` file in the project root based on `.env.example`:
```bash
cp .env.example .env
```
Edit `.env` with your settings:
```env
# Client Environment Configuration
VITE_API_URL=http://localhost:3000

# Firebase Configuration (for Google Sign-In)
VITE_apiKey=your_firebase_api_key
VITE_authDomain=your_project.firebaseapp.com
VITE_projectId=your_project_id
VITE_storageBucket=your_project.appspot.com
VITE_messagingSenderId=your_messaging_sender_id
VITE_appId=your_firebase_app_id
```
*(Note: If Firebase credentials are not provided, TerraMatch runs smoothly in guest mode with local caching!)*

### 3. Install Frontend Dependencies
```bash
npm install
```

### 4. Configure Backend Server Environment Variables
Navigate to the `server/` directory and configure `server/.env`:
```bash
cd server
cp .env.example .env
```
Edit `server/.env` with your MongoDB connection string:
```env
PORT=3000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/?appName=TerraMatch
DB_NAME=TerraMatch
```

### 5. Install Backend Dependencies
```bash
npm install
```

### 6. Start the Backend Server
From the `server/` directory:
```bash
npm start
# or for auto-reloading during development:
npm run dev
```
You will see:
```text
Connected successfully to MongoDB Database: "TerraMatch"
Seeded 51 enriched analog locations into 'Location' collection.
Synchronized all 10 official planetary datasets into 'DataSources'.
TerraMatch backend server is running on port 3000
```

### 7. Start the Frontend Development Server
In a new terminal, from the root `TerraMatch` directory:
```bash
npm run dev
```
Open your browser and navigate to:
```text
http://localhost:5173
```

### 8. Production Build & Linting Verification
To verify the application passes code quality standards and builds cleanly:
```bash
# Run ESLint check
npm run lint

# Build production bundle
npm run build
```

---

## 👥 Team TerraMatch

We are proud participants in the **2026 NASA Space Apps Challenge**:

| Name | Role | Responsibilities |
| :--- | :--- | :--- |
| **Md. Iqbal Hasan** | **Team Lead & Frontend Developer** | Project architecture, React 19 / Leaflet map integration, and search console development |
| **Md Tajbin Ahmed Ovie** | **Backend Developer** | Express API design, MongoDB Atlas pipeline, and dataset auto-seeding routines |
| **Mohd Abdullah Al Mahmood** | **UI/UX Developer** | Deep-space aesthetic design system, Tailwind CSS v4 token system, and SVG radar chart |
| **Mst. Jihan Jimi Joty** | **Research Lead** | Planetary analog literature curation, Apollo/Artemis baseline correlation, and scientific validation |
| **Nusrat Jahan Sumiya** | **Story Teller** | Mission narrative, challenge documentation, video script, and presentation design |
| **Md. Asmaul Islam** | **Scope Keeper** | Requirements alignment with NASA Space Apps criteria, timeline management, and quality assurance |

---

## 📄 License & Attribution

- Built as an open-source project for educational and scientific research purposes during the **2026 NASA Space Apps Challenge**.
- Grounded in open public datasets from **NASA**, **CSA**, **ESA**, **JAXA**, and **ISRO**. Satellite imagery courtesy of **Esri**, **NASA EOSDIS GIBS**, and **USGS**.
