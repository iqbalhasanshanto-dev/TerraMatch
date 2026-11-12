/**
 * ============================================================================
 * Global Live Earth Telemetry Discovery Engine (`earthTelemetryApi.js`)
 * ============================================================================
 * Connects TerraMatch to official keyless planetary Earth observation APIs:
 * 1. NASA POWER Climatology / Point API (`power.larc.nasa.gov`) — real satellite
 *    climatology averages for:
 *    - `T2M` (Surface Temperature °C — analogous to MODIS LST)
 *    - `RH2M` (Relative Humidity % — analogous to SMAP Soil Moisture)
 *    - `PRECTOTCORR` (Precipitation mm/day — analogous to GPM IMERG)
 *    - `ALLSKY_SFC_SW_DWN` (Solar Irradiance kWh/m²/day — analogous to MODIS MOD09)
 * 2. Open-Meteo Elevation API (`api.open-meteo.com/v1/elevation`) — fast
 *    NASADEM / SRTM digital elevation model (DEM) elevation lookup.
 * 3. Open-Meteo Forecast API (`api.open-meteo.com/v1/forecast`) — graceful
 *    fallback meteorological source whenever NASA POWER times out or fails.
 * 4. OpenStreetMap Nominatim (`nominatim.openstreetmap.org`) — forward place
 *    search and reverse geocoding for human-readable site & country labels.
 *
 * Synthesizes complete TerraMatch analog profile objects tagged with
 * `dataSource: "NASA POWER + NASADEM/SRTM"` so any Earth coordinate or place
 * can be inspected on the map, saved to a scientist's profile, and compared
 * side-by-side in `ComparePage.jsx`.
 */

// ============================================================================
// 1. Public API Endpoint & Telemetry Timeout Constants
// ============================================================================

/** Base URL for OpenStreetMap Nominatim geocoding & reverse-geocoding API. */
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

/** Base URL for NASA POWER Temporal Climatology Point API (keyless, CORS-enabled). */
const NASA_POWER_CLIMATOLOGY_URL =
    "https://power.larc.nasa.gov/api/temporal/climatology/point";

/** Comma-separated NASA POWER parameters mapped to TerraMatch Earthdata analogs. */
const NASA_POWER_PARAMETERS = "T2M,RH2M,PRECTOTCORR,ALLSKY_SFC_SW_DWN";

/** Base URL for Open-Meteo fast NASADEM / SRTM elevation lookup API. */
const OPEN_METEO_ELEVATION_URL = "https://api.open-meteo.com/v1/elevation";

/** Base URL for Open-Meteo real-time forecast API (graceful fallback if NASA POWER times out). */
const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

/** Maximum wait time (ms) for NASA POWER before gracefully falling back to Open-Meteo Forecast. */
const NASA_POWER_TIMEOUT_MS = 7000;

/** Canonical missing/fill sentinel used by NASA POWER API payloads. */
const NASA_POWER_FILL_SENTINEL = -900;

/** Canonical dataset attribution tag attached to every single-point Earth telemetry probe. */
const TELEMETRY_DATA_SOURCE_TAG = "NASA POWER + NASADEM/SRTM";

/** Canonical dataset attribution tag attached to Whole-Earth Batch Scan discoveries. */
const WHOLE_EARTH_SCAN_DATA_SOURCE = "Whole-Earth Satellite Scan (NASADEM + Open-Meteo)";

/**
 * Curated 45-point Global Remote Earth Exploration Grid spanning all 7 continents.
 * Every site is intentionally distinct from the 50 pre-listed NASA catalog sites
 * in `analogLocations.json`, enabling scientists to discover unexplored Earth
 * analogs matching custom Moon ("Grey Zone") or Mars Highland criteria.
 */
export const GLOBAL_EXPLORATION_GRID = [
    // --- Arctic & North America ---
    {
        name: "Ellesmere Island",
        country: "Canada",
        lat: 81.8,
        lon: -71.3,
        geologyHint: "Arctic polar bedrock, glacial till & cryogenic permafrost",
    },
    {
        name: "Baffin Island",
        country: "Canada",
        lat: 69.0,
        lon: -72.5,
        geologyHint: "Precambrian granite-gneiss highlands & polar regolith",
    },
    {
        name: "Axel Heiberg Island",
        country: "Canada",
        lat: 79.4,
        lon: -90.8,
        geologyHint: "Cold saline springs, evaporite diapirs & permafrost",
    },
    {
        name: "Brooks Range",
        country: "United States",
        lat: 68.1,
        lon: -152.2,
        geologyHint: "Subarctic alpine limestone, slate scree & permafrost",
    },
    {
        name: "Chihuahuan Gypsum Plains",
        country: "United States / Mexico",
        lat: 31.8,
        lon: -105.1,
        geologyHint: "Gypsum-carbonate evaporites & arid alluvial desert fans",
    },
    {
        name: "Craters of the Moon",
        country: "United States",
        lat: 43.416,
        lon: -113.516,
        geologyHint: "Holocene flood basaltic lava flows, spatter cones & tephra",
    },
    {
        name: "Owyhee Badlands",
        country: "United States",
        lat: 42.6,
        lon: -117.2,
        geologyHint: "Rhyolitic ash-flow tuffs, ferric claystone & arid canyons",
    },
    {
        name: "Desierto de Altar",
        country: "Mexico",
        lat: 31.95,
        lon: -114.2,
        geologyHint: "Hyper-arid granodiorite sand seas & basaltic cinder cones",
    },
    {
        name: "Torngat Mountains",
        country: "Canada",
        lat: 58.9,
        lon: -63.8,
        geologyHint: "Frost-shattered anorthosite & subarctic coastal fjords",
    },
    {
        name: "Lake Hazen Polar Plateau",
        country: "Canada",
        lat: 81.82,
        lon: -71.0,
        geologyHint: "High-arctic thermal oasis & glacio-lacustrine permafrost silt",
    },

    // --- South America ---
    {
        name: "Ojos del Salado",
        country: "Chile / Argentina",
        lat: -27.109,
        lon: -68.541,
        geologyHint: "Hyper-arid volcanic andesite, sulfur fumaroles & cryogenic scree",
    },
    {
        name: "Altiplano Volcanic Arc",
        country: "Bolivia / Chile",
        lat: -21.45,
        lon: -67.85,
        geologyHint: "High-altitude ignimbrite sheets, basaltic-dacite domes & salt lakes",
    },
    {
        name: "Patagonian Ice Field Edge",
        country: "Chile / Argentina",
        lat: -49.3,
        lon: -73.1,
        geologyHint: "Glacio-fluvial basalt moraines & subpolar wind-scoured rock",
    },
    {
        name: "Sechura Desert",
        country: "Peru",
        lat: -5.85,
        lon: -80.65,
        geologyHint: "Hyper-arid coastal phosphate-evaporite dunes & gravel plains",
    },
    {
        name: "Payunia Volcanic Field",
        country: "Argentina",
        lat: -36.4,
        lon: -69.2,
        geologyHint: "Quaternary basaltic scoria cones, tephra & pahoehoe lava plains",
    },
    {
        name: "Cordillera Real Highlands",
        country: "Bolivia",
        lat: -16.15,
        lon: -68.15,
        geologyHint: "High-elevation cryogenic metamorphic slate & glacial moraine",
    },

    // --- Europe & North Atlantic ---
    {
        name: "Jan Mayen Volcanic Ridge",
        country: "Norway",
        lat: 71.03,
        lon: -8.29,
        geologyHint: "Subarctic alkali-basalt stratovolcano & frozen glacial tephra",
    },
    {
        name: "Askja Caldera Flanks",
        country: "Iceland",
        lat: 65.03,
        lon: -16.75,
        geologyHint: "Rhyolitic pumice, basaltic lava & glaciovolcanic hyaloclastite",
    },
    {
        name: "Tabernas Badlands",
        country: "Spain",
        lat: 37.01,
        lon: -2.45,
        geologyHint: "Semi-arid gypsum marls, mudstone gullies & iron-rich crust",
    },
    {
        name: "Sarek Alpine Plateau",
        country: "Sweden",
        lat: 67.28,
        lon: 17.7,
        geologyHint: "Subarctic gabbro-anorthosite massif & periglacial blockfields",
    },
    {
        name: "Stromboli Basalt Flanks",
        country: "Italy",
        lat: 38.79,
        lon: 15.21,
        geologyHint: "Basaltic-andesite scoria, volcanic tephra & pyroclastic slopes",
    },

    // --- Africa ---
    {
        name: "Tibesti Mountains",
        country: "Chad",
        lat: 20.78,
        lon: 17.95,
        geologyHint: "Hyper-arid Saharan shield volcano, ignimbrite & basalt calderas",
    },
    {
        name: "Hoggar Mountains",
        country: "Algeria",
        lat: 23.29,
        lon: 5.53,
        geologyHint: "Precambrian basement granite, volcanic plugs & arid regolith",
    },
    {
        name: "Aïr Mountains",
        country: "Niger",
        lat: 18.6,
        lon: 8.8,
        geologyHint: "Hyper-arid granitic ring complexes & Saharan desert plains",
    },
    {
        name: "Ennedi Sandstone Plateau",
        country: "Chad",
        lat: 17.05,
        lon: 21.8,
        geologyHint: "Wind-carved Paleozoic ferric quartz sandstone pillars & dry wadis",
    },
    {
        name: "Erta Ale Basalt Shield",
        country: "Ethiopia",
        lat: 13.6,
        lon: 40.67,
        geologyHint: "Hyper-arid rift basaltic lava shield & sulfur-halite crust",
    },
    {
        name: "Richat Structure",
        country: "Mauritania",
        lat: 21.124,
        lon: -11.402,
        geologyHint: "Concentric impact-like dome of quartzite, gabbro & breccia",
    },

    // --- Asia ---
    {
        name: "Wrangel Island",
        country: "Russia",
        lat: 71.23,
        lon: -179.4,
        geologyHint: "High-Arctic unglaciated permafrost tundra & frost-sorted stone",
    },
    {
        name: "Putorana Plateau",
        country: "Russia",
        lat: 69.0,
        lon: 94.0,
        geologyHint: "Siberian flood basalt trap terraces & subarctic cryosphere",
    },
    {
        name: "Kamchatka Volcanic Plateau",
        country: "Russia",
        lat: 55.8,
        lon: 160.3,
        geologyHint: "Subarctic basaltic cinder cones, volcanic ash & ice-clad tephra",
    },
    {
        name: "Yakutia Permafrost Basin",
        country: "Russia",
        lat: 67.5,
        lon: 134.0,
        geologyHint: "Continuous deep ice-rich permafrost & cryogenic yedoma silt",
    },
    {
        name: "Kunlun Mountains",
        country: "China",
        lat: 36.2,
        lon: 82.0,
        geologyHint: "High-altitude Tibetan cryogenic gravel & arid alpine bedrock",
    },
    {
        name: "Karakoram High Passes",
        country: "Pakistan / China",
        lat: 35.88,
        lon: 76.51,
        geologyHint: "Extreme-elevation granite-gneiss peaks, glacial scree & thin air",
    },
    {
        name: "Dasht-e Lut",
        country: "Iran",
        lat: 30.5,
        lon: 58.8,
        geologyHint: "Hyper-arid salt-encrusted yardangs, ferric sand & desert pavement",
    },
    {
        name: "Changtang Plateau",
        country: "China",
        lat: 33.5,
        lon: 86.5,
        geologyHint: "Cold high-altitude endorheic salt lakes & windswept permafrost",
    },
    {
        name: "Ustyurt Plateau",
        country: "Uzbekistan / Kazakhstan",
        lat: 43.2,
        lon: 56.5,
        geologyHint: "Arid gypsum-limestone desert escarpments & saline takyr flats",
    },
    {
        name: "Aso Caldera Pyroclastic Plain",
        country: "Japan",
        lat: 32.88,
        lon: 131.1,
        geologyHint: "Basaltic-andesitic volcanic caldera & pyroclastic ash slopes",
    },
    {
        name: "Wahiba Sands",
        country: "Oman",
        lat: 21.8,
        lon: 58.7,
        geologyHint: "Hyper-arid aeolian ferric dune ridges & desert gravel plains",
    },

    // --- Oceania & Sub-Antarctic ---
    {
        name: "Kerguelen Basalt Plateau",
        country: "French Southern Territories",
        lat: -49.35,
        lon: 69.35,
        geologyHint: "Sub-Antarctic flood basalt plateaus & cold wind-swept scoria",
    },
    {
        name: "Nullarbor Karst Plain",
        country: "Australia",
        lat: -31.1,
        lon: 129.0,
        geologyHint: "Arid treeless limestone karst, ferric soils & meteorite plains",
    },
    {
        name: "Gibson Desert",
        country: "Australia",
        lat: -24.5,
        lon: 125.0,
        geologyHint: "Hyper-arid iron-oxide laterite gravel plains & sand dunes",
    },

    // --- Antarctica ---
    {
        name: "Dronning Maud Land",
        country: "Antarctica",
        lat: -71.8,
        lon: 9.5,
        geologyHint: "Antarctic nunatak granite-charnockite peaks & blue-ice sublimation",
    },
    {
        name: "Ellsworth Mountains",
        country: "Antarctica",
        lat: -78.75,
        lon: -85.0,
        geologyHint: "Cryogenic folded quartzite, marble ridges & polar ice fields",
    },
    {
        name: "Mount Erebus Flank",
        country: "Antarctica",
        lat: -77.53,
        lon: 167.15,
        geologyHint: "Polar phonolitic volcano, fumarolic ice towers & frozen tephra",
    },
    {
        name: "Vinson Massif Foothills",
        country: "Antarctica",
        lat: -78.52,
        lon: -85.61,
        geologyHint: "Extreme cryogenic high-altitude polar bedrock & dry katabatic snow",
    },
];

/**
 * Shared terrain keyword mapping used when filtering Whole-Earth Scan discoveries
 * against the user's selected Terrain & Geology filter pill.
 */
const SCAN_TERRAIN_KEYWORDS = {
    "Volcanic Basalt": [
        "volcanic",
        "volcano",
        "basalt",
        "basaltic",
        "lava",
        "caldera",
        "tephra",
        "scoria",
        "ash",
        "tuff",
        "ignimbrite",
        "hyaloclastite",
    ],
    "Impact Crater": ["impact", "crater", "breccia", "shock", "dome"],
    "Hyper-Arid Desert": [
        "arid",
        "desert",
        "dune",
        "sand",
        "wadi",
        "yardang",
        "badlands",
        "gravel",
        "alluvial",
    ],
    "Polar & Ice": [
        "polar",
        "ice",
        "glacial",
        "glacier",
        "permafrost",
        "cryo",
        "frozen",
        "subarctic",
        "arctic",
        "antarctic",
        "nunatak",
    ],
    "Salt / Evaporites": [
        "salt",
        "evaporite",
        "halite",
        "gypsum",
        "sulfate",
        "saline",
        "takyr",
        "carbonate",
    ],
    "Acidic / Iron": [
        "acidic",
        "iron",
        "hematite",
        "ferric",
        "sulfur",
        "fumarol",
        "laterite",
        "oxidized",
    ],
};

/**
 * Shared aridity & moisture keyword mapping used when filtering Whole-Earth Scan
 * discoveries against the user's selected Aridity & Moisture Regime pill.
 */
const SCAN_HUMIDITY_KEYWORDS = {
    "Hyper-Arid": ["hyper-arid", "extremely dry", "very dry"],
    "Very dry": ["hyper-arid", "extremely dry", "very dry"],
    "Arid / Dry": ["arid", "dry", "semi-arid", "desert"],
    "Cryogenic / Frozen": [
        "polar",
        "extremely cold",
        "cold",
        "subarctic",
        "cryo",
        "frozen",
        "permafrost",
        "glacial",
    ],
    Hydrothermal: ["hydrothermal", "geothermal", "fumarol", "spring", "humid"],
};

// ============================================================================
// 2. Coordinate, Numeric & Timeout Normalization Helpers
// ============================================================================

/**
 * Wraps any longitude value (including Leaflet antimeridian wrap-arounds like
 * `210°` or `-200°`) into the canonical `[-180, 180]` geographic range.
 *
 * @param {number} lon - Raw longitude in decimal degrees.
 * @returns {number} Normalized longitude within `[-180, 180]`.
 */
const normalizeLongitude = (lon) => {
    const wrapped = (((lon + 180) % 360) + 360) % 360 - 180;
    return Number(wrapped.toFixed(4));
};

/**
 * Clamps and rounds latitude to 4 decimal places within `[-90, 90]`.
 *
 * @param {number} lat - Raw latitude in decimal degrees.
 * @returns {number} Clamped latitude within `[-90, 90]`.
 */
const normalizeLatitude = (lat) => {
    const clamped = Math.max(-90, Math.min(90, lat));
    return Number(clamped.toFixed(4));
};

/**
 * Safely coerces a numeric telemetry field or falls back to a default value.
 *
 * @param {unknown} value - Candidate numeric value from an API payload.
 * @param {number} fallback - Safe fallback if `value` is null, NaN, or non-finite.
 * @returns {number} Finite number or `fallback`.
 */
const toFiniteNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * Extracts the annual (`ANN`) mean from a NASA POWER parameter map, filtering
 * out NASA POWER's `-999` fill values and averaging valid monthly readings
 * (`JAN`–`DEC`) when `ANN` is unavailable.
 *
 * @param {Record<string, number> | undefined} paramSeries - NASA POWER monthly/annual dictionary.
 * @returns {number | null} Valid finite parameter value or `null` if missing.
 */
const extractNasaPowerAnnualValue = (paramSeries) => {
    if (!paramSeries || typeof paramSeries !== "object") {
        return null;
    }

    const annual = Number(paramSeries.ANN);
    if (Number.isFinite(annual) && annual > NASA_POWER_FILL_SENTINEL) {
        return annual;
    }

    // Fallback: average valid monthly climatology values when ANN is flagged as fill
    const monthlyValues = Object.entries(paramSeries)
        .filter(([key]) => key !== "ANN")
        .map(([, val]) => Number(val))
        .filter((val) => Number.isFinite(val) && val > NASA_POWER_FILL_SENTINEL);

    if (monthlyValues.length === 0) {
        return null;
    }

    const sum = monthlyValues.reduce((acc, val) => acc + val, 0);
    return sum / monthlyValues.length;
};

/**
 * Creates a combined `AbortController` that aborts either after `timeoutMs`
 * elapses or immediately when the caller's optional `externalSignal` aborts.
 *
 * @param {number} timeoutMs - Timeout duration in milliseconds.
 * @param {AbortSignal} [externalSignal] - Optional caller AbortSignal.
 * @returns {{ signal: AbortSignal, cleanup: () => void, didTimeout: () => boolean }}
 */
const createTimeoutController = (timeoutMs, externalSignal) => {
    const controller = new AbortController();
    let timedOut = false;

    const handleExternalAbort = () => {
        controller.abort(externalSignal?.reason);
    };

    if (externalSignal) {
        if (externalSignal.aborted) {
            controller.abort(externalSignal.reason);
        } else {
            externalSignal.addEventListener("abort", handleExternalAbort, { once: true });
        }
    }

    const timerId = setTimeout(() => {
        timedOut = true;
        controller.abort(new Error("NASA POWER request timed out."));
    }, timeoutMs);

    const cleanup = () => {
        clearTimeout(timerId);
        if (externalSignal) {
            externalSignal.removeEventListener("abort", handleExternalAbort);
        }
    };

    return {
        signal: controller.signal,
        cleanup,
        didTimeout: () => timedOut,
    };
};

// ============================================================================
// 3. External Satellite & DEM API Fetch Helpers
// ============================================================================

/**
 * Fetches fast NASADEM / SRTM elevation (meters above sea level) for a single
 * Earth coordinate from the Open-Meteo Elevation API.
 *
 * @param {number} lat - Normalized decimal latitude.
 * @param {number} lon - Normalized decimal longitude.
 * @param {AbortSignal} [signal] - Optional AbortSignal for request cancellation.
 * @returns {Promise<number | null>} Elevation in meters, or `null` if unavailable.
 */
const fetchOpenMeteoElevation = async (lat, lon, signal) => {
    const elevationUrl = `${OPEN_METEO_ELEVATION_URL}?latitude=${lat}&longitude=${lon}`;

    const response = await fetch(elevationUrl, {
        headers: { Accept: "application/json" },
        signal,
    });

    if (!response.ok) {
        throw new Error(`Open-Meteo Elevation request failed (HTTP ${response.status}).`);
    }

    const data = await response.json();
    // `/v1/elevation` returns `{ elevation: [meters] }`; handle scalar or array safely
    const rawElevation = Array.isArray(data?.elevation)
        ? data.elevation[0]
        : data?.elevation;

    const parsed = Number(rawElevation);
    return Number.isFinite(parsed) ? Math.round(parsed) : null;
};

/**
 * Fetches real NASA satellite climatology averages from the NASA POWER
 * Climatology/Point API for `T2M`, `RH2M`, `PRECTOTCORR`, and `ALLSKY_SFC_SW_DWN`.
 * Applies a strict timeout guard so slow responses fall back cleanly.
 *
 * @param {number} lat - Normalized decimal latitude.
 * @param {number} lon - Normalized decimal longitude.
 * @param {AbortSignal} [signal] - Optional caller AbortSignal for cancellation.
 * @returns {Promise<{
 *   temperatureC: number,
 *   humidityPercent: number,
 *   precipitationMmDay: number,
 *   solarIrradianceKwh: number,
 *   solarRadiationWm2: number,
 *   geometryElevationMeters: number | null,
 *   observedAt: string
 * }>}
 */
const fetchNasaPowerClimatology = async (lat, lon, signal) => {
    const nasaPowerUrl = `${NASA_POWER_CLIMATOLOGY_URL}?parameters=${NASA_POWER_PARAMETERS}&community=RE&longitude=${lon}&latitude=${lat}&format=JSON`;
    const timeoutGuard = createTimeoutController(NASA_POWER_TIMEOUT_MS, signal);

    try {
        const response = await fetch(nasaPowerUrl, {
            headers: { Accept: "application/json" },
            signal: timeoutGuard.signal,
        });

        if (!response.ok) {
            throw new Error(`NASA POWER request failed (HTTP ${response.status}).`);
        }

        const payload = await response.json();
        const params = payload?.properties?.parameter || {};

        // Extract annual climatology means for all 4 requested NASA POWER parameters
        const t2m = extractNasaPowerAnnualValue(params.T2M);
        const rh2m = extractNasaPowerAnnualValue(params.RH2M);
        const prectotcorr = extractNasaPowerAnnualValue(params.PRECTOTCORR);
        const allSkyKwh = extractNasaPowerAnnualValue(params.ALLSKY_SFC_SW_DWN);

        if (t2m === null || rh2m === null || prectotcorr === null || allSkyKwh === null) {
            throw new Error("NASA POWER returned incomplete climatology parameters.");
        }

        // NASA POWER GeoJSON geometry may include `[lon, lat, elevation]` as secondary fallback
        const geomElev = Number(payload?.geometry?.coordinates?.[2]);
        const geometryElevationMeters =
            Number.isFinite(geomElev) && geomElev > NASA_POWER_FILL_SENTINEL
                ? Math.round(geomElev)
                : null;

        // Convert daily solar irradiance (kWh/m²/day) to 24h mean flux (W/m²) for UI gauges
        const solarIrradianceKwh = Math.round(allSkyKwh * 100) / 100;
        const solarRadiationWm2 = Math.round((solarIrradianceKwh * 1000) / 24);

        return {
            temperatureC: Math.round(t2m * 10) / 10,
            humidityPercent: Math.round(Math.max(0, Math.min(100, rh2m))),
            precipitationMmDay: Math.round(Math.max(0, prectotcorr) * 100) / 100,
            solarIrradianceKwh,
            solarRadiationWm2,
            geometryElevationMeters,
            observedAt: new Date().toISOString(),
        };
    } catch (error) {
        // Re-throw caller-initiated aborts so stale UI searches still cancel immediately
        if (signal?.aborted) {
            throw error;
        }
        if (timeoutGuard.didTimeout()) {
            throw new Error("NASA POWER Climatology API timed out.", {
                cause: error,
            });
        }
        throw error;
    } finally {
        timeoutGuard.cleanup();
    }
};

/**
 * Graceful fallback meteorological fetch using Open-Meteo Forecast API whenever
 * NASA POWER Climatology times out or returns an error.
 *
 * @param {number} lat - Normalized decimal latitude.
 * @param {number} lon - Normalized decimal longitude.
 * @param {AbortSignal} [signal] - Optional AbortSignal for request cancellation.
 * @returns {Promise<{
 *   elevationMeters: number,
 *   temperatureC: number,
 *   humidityPercent: number,
 *   precipitationMmDay: number,
 *   solarIrradianceKwh: number,
 *   solarRadiationWm2: number,
 *   observedAt: string
 * }>}
 */
const fetchOpenMeteoForecastFallback = async (lat, lon, signal) => {
    // Note: We omit `&elevation=nan` because Open-Meteo returns NASADEM/SRTM elevation by default
    const forecastUrl = `${OPEN_METEO_FORECAST_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,shortwave_radiation`;

    const response = await fetch(forecastUrl, {
        headers: { Accept: "application/json" },
        signal,
    });

    if (!response.ok) {
        throw new Error(`Open-Meteo fallback request failed (HTTP ${response.status}).`);
    }

    const data = await response.json();
    const current = data?.current || {};
    const solarRadiationWm2 = Math.round(toFiniteNumber(current.shortwave_radiation, 0));
    const precipMmHour = Math.max(0, toFiniteNumber(current.precipitation, 0));

    return {
        elevationMeters: Math.round(toFiniteNumber(data?.elevation, 0)),
        temperatureC: Math.round(toFiniteNumber(current.temperature_2m, 15) * 10) / 10,
        humidityPercent: Math.round(toFiniteNumber(current.relative_humidity_2m, 50)),
        // Approximate daily rate from instantaneous mm/hr if NASA POWER timed out
        precipitationMmDay: Math.round(precipMmHour * 24 * 100) / 100,
        // Convert W/m² back to kWh/m²/day for consistent NASA POWER display units
        solarIrradianceKwh: Math.round(((solarRadiationWm2 * 24) / 1000) * 100) / 100,
        solarRadiationWm2,
        observedAt: current.time || new Date().toISOString(),
    };
};

/**
 * Coordinates concurrent telemetry acquisition from NASA POWER Climatology/Point
 * API and Open-Meteo NASADEM/SRTM Elevation API, falling back gracefully to
 * Open-Meteo Forecast if NASA POWER times out or fails.
 *
 * @param {number} lat - Normalized decimal latitude.
 * @param {number} lon - Normalized decimal longitude.
 * @param {AbortSignal} [signal] - Optional AbortSignal for request cancellation.
 * @returns {Promise<{
 *   elevationMeters: number,
 *   temperatureC: number,
 *   humidityPercent: number,
 *   precipitationMmDay: number,
 *   solarIrradianceKwh: number,
 *   solarRadiationWm2: number,
 *   observedAt: string,
 *   usedFallback: boolean
 * }>}
 */
const fetchSatellitePointTelemetry = async (lat, lon, signal) => {
    // Run NASA POWER climatology and Open-Meteo NASADEM/SRTM elevation queries in parallel
    const [nasaPowerSettled, elevationSettled] = await Promise.allSettled([
        fetchNasaPowerClimatology(lat, lon, signal),
        fetchOpenMeteoElevation(lat, lon, signal),
    ]);

    // Propagate explicit caller cancellation immediately
    if (signal?.aborted) {
        throw new DOMException("Telemetry request aborted.", "AbortError");
    }

    const nasademElevation =
        elevationSettled.status === "fulfilled" ? elevationSettled.value : null;

    if (nasaPowerSettled.status === "fulfilled") {
        const nasa = nasaPowerSettled.value;
        return {
            elevationMeters: nasademElevation ?? nasa.geometryElevationMeters ?? 0,
            temperatureC: nasa.temperatureC,
            humidityPercent: nasa.humidityPercent,
            precipitationMmDay: nasa.precipitationMmDay,
            solarIrradianceKwh: nasa.solarIrradianceKwh,
            solarRadiationWm2: nasa.solarRadiationWm2,
            observedAt: nasa.observedAt,
            usedFallback: false,
        };
    }

    // NASA POWER timed out or failed: fall back gracefully to Open-Meteo Forecast
    console.warn(
        "NASA POWER unavailable or timed out, falling back to Open-Meteo Forecast:",
        nasaPowerSettled.reason?.message || nasaPowerSettled.reason
    );

    const fallback = await fetchOpenMeteoForecastFallback(lat, lon, signal);
    return {
        ...fallback,
        elevationMeters: nasademElevation ?? fallback.elevationMeters,
        usedFallback: true,
    };
};

/**
 * Extracts a concise human-readable site name and country/region label from a
 * Nominatim search or reverse-geocoding record.
 *
 * @param {Object | null} nominatimRecord - Raw Nominatim place object.
 * @param {number} lat - Latitude for fallback sector naming.
 * @param {number} lon - Longitude for fallback sector naming.
 * @param {string} [customName] - Optional scientist-provided override label.
 * @returns {{ name: string, country: string }}
 */
const extractPlaceLabels = (nominatimRecord, lat, lon, customName) => {
    const address = nominatimRecord?.address || {};

    // Prefer natural features, peaks, locality names, or explicit place title
    const primaryFeature =
        customName?.trim() ||
        nominatimRecord?.name ||
        address.peak ||
        address.volcano ||
        address.desert ||
        address.natural ||
        address.city ||
        address.town ||
        address.village ||
        address.county ||
        address.state_district ||
        address.state ||
        nominatimRecord?.display_name?.split(",")[0]?.trim() ||
        `Coordinate ${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;

    // Build a clean regional/country subtitle without duplicating the primary name
    const regionParts = [
        address.state || address.region || address.county,
        address.country,
    ]
        .filter(Boolean)
        .filter((part, idx, arr) => arr.indexOf(part) === idx)
        .filter((part) => part.toLowerCase() !== primaryFeature.toLowerCase());

    const country =
        regionParts.join(", ") ||
        address.country ||
        (nominatimRecord?.error ? "International / Marine Sector" : "Global Earth Sector");

    return {
        name: primaryFeature,
        country,
    };
};

// ============================================================================
// 4. Planetary Analog Profile Synthesis Engine
// ============================================================================

/**
 * Evaluates NASA POWER & NASADEM/SRTM telemetry parameters (temperature,
 * relative humidity, precipitation, latitude, elevation, and solar irradiance)
 * to classify Moon/Mars analog suitability, testing category, climate
 * descriptor, mineralogy, and terrain tags.
 *
 * @param {Object} params - Environmental measurements for the Earth coordinate.
 * @param {number} params.latitude - Decimal latitude.
 * @param {number} params.elevationMeters - NASADEM/SRTM elevation above sea level (m).
 * @param {number} params.temperatureC - NASA POWER `T2M` surface temperature (°C).
 * @param {number} params.humidityPercent - NASA POWER `RH2M` relative humidity (%).
 * @param {number} params.precipitationMmDay - NASA POWER `PRECTOTCORR` precipitation (mm/day).
 * @param {number} params.solarIrradianceKwh - NASA POWER `ALLSKY_SFC_SW_DWN` irradiance (kWh/m²/day).
 * @returns {Object} Derived planetary analog classification metadata.
 */
const classifyTelemetryAnalog = ({
    latitude,
    elevationMeters,
    temperatureC,
    humidityPercent,
    precipitationMmDay,
    solarIrradianceKwh,
    geologyHint = "",
}) => {
    const absLat = Math.abs(latitude);
    const isHyperArid = humidityPercent < 35 || precipitationMmDay < 0.35;
    const isArid = humidityPercent < 55 || precipitationMmDay < 1.2;
    const isHighAltitude = elevationMeters > 1500;
    const isModerateHighland = elevationMeters >= 500;
    const isPolar = absLat > 60;
    const isCryogenic = temperatureC <= 0 || isPolar;
    const isHighSolar = solarIrradianceKwh >= 5.5;
    const hintLower = geologyHint.toLowerCase();

    // Determine Moon / Mars target body suitability from physical regime
    let analogType;
    let targetSpec;

    if (
        (isHighAltitude && (isArid || isCryogenic)) ||
        (isModerateHighland && isCryogenic && (isArid || isPolar)) ||
        (isPolar && isHyperArid)
    ) {
        // High-altitude or cold highland + dry/cryogenic mirrors both Lunar highlands & Mars
        analogType = ["moon", "mars"];
        targetSpec = "Moon & Mars Analog";
    } else if (
        isHighAltitude ||
        (isModerateHighland && temperatureC <= 0) ||
        (isPolar && temperatureC <= 0)
    ) {
        // Thin-atmosphere UV highlands, cold Grey Zone plateaus, and polar traps serve Lunar ops
        analogType = ["moon"];
        targetSpec = "Moon Analog";
    } else if (isHyperArid || temperatureC <= 5) {
        // Low-moisture desert or sub-zero terrain aligns closely with Martian regolith regimes
        analogType = ["mars"];
        targetSpec = "Mars Analog";
    } else {
        // Baseline terrestrial coordinate suitable for general Mars rover mobility/sensor calibration
        analogType = ["mars"];
        targetSpec = "Mars Analog";
    }

    // Assign scientific analog testing category based on dominant environmental stressors
    let analogCategory = "Custom Field Analog Coordinate";
    if (isHighAltitude && isCryogenic) {
        analogCategory = "High-Altitude Cryogenic Testbed";
    } else if (isPolar) {
        analogCategory = "Polar Cryosphere & Sublimation Analog";
    } else if (isHighAltitude && isHyperArid) {
        analogCategory = "High-Altitude Hyper-Arid UV Testbed";
    } else if (isHyperArid) {
        analogCategory = "Hyper-Arid Surface Telemetry";
    } else if (isCryogenic) {
        analogCategory = "Cryogenic Regolith & Thermal Stress";
    } else if (isHighAltitude) {
        analogCategory = "High-Altitude Thin-Atmosphere Analog";
    } else if (isHighSolar && isArid) {
        analogCategory = "High-UV Arid Rover Mobility Analog";
    }

    // Build climate label compatible with TerraMatch's ComparePage & analogSpec helpers
    let climate;
    if (isPolar || temperatureC <= -10) {
        climate = isHyperArid ? "extremely cold and dry" : "polar and cold";
    } else if (temperatureC <= 5) {
        climate = isHyperArid ? "cold and arid" : "cold";
    } else if (isHyperArid) {
        climate = temperatureC > 25 ? "extremely hot and hyper-arid" : "hyper-arid";
    } else if (isArid) {
        climate = temperatureC > 25 ? "hot and arid" : "arid";
    } else if (humidityPercent >= 75 || precipitationMmDay >= 4.0) {
        climate = "humid";
    } else {
        climate = "temperate";
    }

    // Derive descriptive geological terrain tags (enriched with regional geologyHint)
    const terrain = [];
    if (isHighAltitude || isModerateHighland) terrain.push("high-altitude terrain");
    if (isPolar || isCryogenic) terrain.push("polar terrain", "permafrost");
    if (isHyperArid) terrain.push("hyper-arid desert", "exposed rock");
    else if (isArid) terrain.push("arid terrain", "rocky surface");
    if (hintLower.includes("basalt") || hintLower.includes("volcan")) {
        terrain.push("volcanic basalt");
    }
    if (hintLower.includes("gypsum") || hintLower.includes("salt") || hintLower.includes("evaporite")) {
        terrain.push("evaporite flats");
    }
    if (hintLower.includes("fumarol") || hintLower.includes("sulfur")) {
        terrain.push("hydrothermal terrain");
    }
    if (terrain.length === 0) terrain.push("terrestrial field terrain", "silicate soil");

    // Infer representative mineralogy & regolith composition
    let mineralogy =
        geologyHint || "Terrestrial silicate regolith & weathered crustal rock";
    if (!geologyHint) {
        if (isHighAltitude && isHyperArid) {
            mineralogy =
                "Volcanic tephra, oxidized silicates & UV-weathered evaporites";
        } else if (isCryogenic) {
            mineralogy =
                "Ice-cemented regolith, frost-shattered bedrock & cryogenic fines";
        } else if (isHyperArid) {
            mineralogy =
                "Desiccated sulfate-chloride fines, iron oxides & aeolian sand";
        } else if (isHighAltitude) {
            mineralogy =
                "High-relief basaltic/granitic outcrop & coarse scree regolith";
        }
    }

    return {
        analogType,
        targetSpec,
        analogCategory,
        climate,
        terrain: [...new Set(terrain)],
        mineralogy,
    };
};

/**
 * Synthesizes a complete TerraMatch location object combining Nominatim or
 * Global Exploration Grid metadata, satellite climatology/meteorology,
 * NASADEM/SRTM elevation, and planetary analog tags.
 *
 * @param {Object} args - Input telemetry and place metadata.
 * @param {number} args.latitude - Normalized decimal latitude.
 * @param {number} args.longitude - Normalized decimal longitude.
 * @param {string} args.name - Resolved place or feature name.
 * @param {string} args.country - Resolved country or region label.
 * @param {Object} args.telemetry - Combined telemetry payload.
 * @param {string} [args.geologyHint] - Regional mineralogy hint for Whole-Earth Grid sites.
 * @param {boolean} [args.isGlobalDiscovery] - Flags non-NASA Whole-Earth Scan discoveries.
 * @param {string} [args.dataSource] - Dataset provenance label.
 * @param {string} [args.roversTested] - Campaign or scan provenance note.
 * @returns {Object} Full TerraMatch analog profile object ready for Map, Save, and Compare.
 */
const buildAnalogProfileFromTelemetry = ({
    latitude,
    longitude,
    name,
    country,
    telemetry,
    geologyHint = "",
    isGlobalDiscovery = false,
    dataSource = TELEMETRY_DATA_SOURCE_TAG,
    roversTested = "NASA POWER Climatology + NASADEM/SRTM Telemetry Probe",
}) => {
    const classification = classifyTelemetryAnalog({
        latitude,
        elevationMeters: telemetry.elevationMeters,
        temperatureC: telemetry.temperatureC,
        humidityPercent: telemetry.humidityPercent,
        precipitationMmDay: telemetry.precipitationMmDay,
        solarIrradianceKwh: telemetry.solarIrradianceKwh,
        geologyHint,
    });

    // Deterministic unique ID so repeated probes/scans deduplicate cleanly
    const stableId = isGlobalDiscovery
        ? `global-discovery-${latitude.toFixed(4)}_${longitude.toFixed(4)}`
        : `earth-telemetry-${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
    const roundedTemp = Math.round(telemetry.temperatureC);

    return {
        _id: stableId,
        id: stableId,
        locationId: stableId,
        name,
        country,
        coordinates: {
            latitude,
            longitude,
        },
        analogType: classification.analogType,
        temperature: roundedTemp,
        targetSpec: classification.targetSpec,
        analogCategory: classification.analogCategory,
        roversTested,
        mineralogy: classification.mineralogy,
        terrain: classification.terrain,
        environment: {
            climate: classification.climate,
            humidity: `${telemetry.humidityPercent}% RH`,
            humidityPercent: telemetry.humidityPercent,
            precipitationMmDay: telemetry.precipitationMmDay,
            elevationMeters: telemetry.elevationMeters,
            solarIrradianceKwh: telemetry.solarIrradianceKwh,
            solarRadiationWm2: telemetry.solarRadiationWm2,
            vegetation:
                telemetry.humidityPercent < 35 || telemetry.elevationMeters > 3000
                    ? "sparse"
                    : "variable",
        },
        // Dedicated satellite telemetry snapshot consumed by Map popups and Tweaks search cards
        telemetry: {
            elevationMeters: telemetry.elevationMeters,
            temperatureC: telemetry.temperatureC,
            humidityPercent: telemetry.humidityPercent,
            precipitationMmDay: telemetry.precipitationMmDay,
            solarIrradianceKwh: telemetry.solarIrradianceKwh,
            solarRadiationWm2: telemetry.solarRadiationWm2,
            observedAt: telemetry.observedAt,
            usedFallback: Boolean(telemetry.usedFallback),
            nasaParameters: {
                T2M: telemetry.temperatureC,
                RH2M: telemetry.humidityPercent,
                PRECTOTCORR: telemetry.precipitationMmDay,
                ALLSKY_SFC_SW_DWN: telemetry.solarIrradianceKwh,
            },
        },
        description: isGlobalDiscovery
            ? `Whole-Earth Satellite Scan candidate at ${latitude.toFixed(2)}°, ${longitude.toFixed(2)}° (${telemetry.elevationMeters.toLocaleString()} m NASADEM/SRTM elevation): ${telemetry.temperatureC}°C surface temperature, ${telemetry.humidityPercent}% RH, and ${telemetry.solarRadiationWm2} W/m² solar flux. Geology: ${classification.mineralogy}.`
            : `NASA POWER + NASADEM/SRTM telemetry at ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}° (${telemetry.elevationMeters.toLocaleString()} m elevation): ${telemetry.temperatureC}°C surface temp (T2M), ${telemetry.humidityPercent}% relative humidity (RH2M), ${telemetry.precipitationMmDay} mm/day precipitation (PRECTOTCORR), and ${telemetry.solarIrradianceKwh} kWh/m²/day solar irradiance (ALLSKY_SFC_SW_DWN).`,
        // Explicit dataset provenance tag requested for researcher inspection
        dataSource,
        isLiveTelemetry: true,
        isGlobalDiscovery: Boolean(isGlobalDiscovery),
    };
};

// ============================================================================
// 5. Exported Discovery Functions
// ============================================================================

/**
 * Searches OpenStreetMap Nominatim for up to 5 real-world Earth locations
 * matching `query`, enriches every candidate concurrently with NASA POWER
 * climatology (`T2M`, `RH2M`, `PRECTOTCORR`, `ALLSKY_SFC_SW_DWN`) and
 * Open-Meteo NASADEM/SRTM elevation, and returns synthesized analog profiles.
 *
 * @param {string} query - Free-text geographic place or landform query.
 * @param {AbortSignal} [signal] - Optional AbortSignal for canceling stale requests.
 * @returns {Promise<Array<Object>>} Array of synthesized Earth telemetry analog sites.
 */
export const searchGlobalEarthLocation = async (query, signal) => {
    const trimmedQuery = (query || "").trim();
    if (!trimmedQuery) {
        return [];
    }

    // Step 1: Forward-geocode up to 5 global Earth matches via OpenStreetMap Nominatim
    const nominatimUrl = `${NOMINATIM_BASE_URL}/search?format=json&q=${encodeURIComponent(
        trimmedQuery
    )}&limit=5&addressdetails=1`;

    const nominatimResponse = await fetch(nominatimUrl, {
        headers: { Accept: "application/json" },
        signal,
    });

    if (!nominatimResponse.ok) {
        throw new Error(
            `Global Earth search failed (Nominatim HTTP ${nominatimResponse.status}).`
        );
    }

    const places = await nominatimResponse.json();
    if (!Array.isArray(places) || places.length === 0) {
        return [];
    }

    // Step 2: Hydrate all returned places concurrently with NASA POWER + NASADEM/SRTM telemetry
    const enrichedResults = await Promise.all(
        places.map(async (place) => {
            const latitude = normalizeLatitude(Number(place.lat));
            const longitude = normalizeLongitude(Number(place.lon));

            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                return null;
            }

            const { name, country } = extractPlaceLabels(place, latitude, longitude);

            try {
                const telemetry = await fetchSatellitePointTelemetry(
                    latitude,
                    longitude,
                    signal
                );
                return buildAnalogProfileFromTelemetry({
                    latitude,
                    longitude,
                    name,
                    country,
                    telemetry,
                });
            } catch (error) {
                if (error?.name === "AbortError") {
                    throw error;
                }
                // Graceful per-item fallback if both NASA POWER and Open-Meteo fail for one point
                return buildAnalogProfileFromTelemetry({
                    latitude,
                    longitude,
                    name,
                    country,
                    telemetry: {
                        elevationMeters: 0,
                        temperatureC: 15,
                        humidityPercent: 50,
                        precipitationMmDay: 1.0,
                        solarIrradianceKwh: 4.5,
                        solarRadiationWm2: 188,
                        observedAt: new Date().toISOString(),
                        usedFallback: true,
                    },
                });
            }
        })
    );

    return enrichedResults.filter(Boolean);
};

/**
 * Probes any arbitrary Earth coordinate `(lat, lon)` by reverse-geocoding its
 * region/feature name via OpenStreetMap Nominatim while concurrently fetching
 * NASA POWER climatology (`T2M`, `RH2M`, `PRECTOTCORR`, `ALLSKY_SFC_SW_DWN`)
 * and Open-Meteo NASADEM/SRTM elevation, then synthesizes a complete
 * TerraMatch analog site profile tagged with `dataSource: "NASA POWER + NASADEM/SRTM"`.
 *
 * @param {number} lat - Target latitude in decimal degrees.
 * @param {number} lon - Target longitude in decimal degrees.
 * @param {string} [customName] - Optional scientist-provided override name.
 * @param {AbortSignal} [signal] - Optional AbortSignal for cancellation.
 * @returns {Promise<Object>} Synthesized TerraMatch analog profile object.
 */
export const analyzeCoordinateTelemetry = async (
    lat,
    lon,
    customName,
    signal
) => {
    const latitude = normalizeLatitude(Number(lat));
    const longitude = normalizeLongitude(Number(lon));

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error("Invalid coordinates supplied to telemetry probe.");
    }

    const reverseUrl = `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${latitude}&lon=${longitude}`;

    // Execute Nominatim reverse geocode and NASA POWER + NASADEM/SRTM telemetry concurrently
    const [reverseSettled, telemetry] = await Promise.all([
        fetch(reverseUrl, {
            headers: { Accept: "application/json" },
            signal,
        })
            .then((res) => (res.ok ? res.json() : null))
            .catch((err) => {
                if (err?.name === "AbortError") throw err;
                return null;
            }),
        fetchSatellitePointTelemetry(latitude, longitude, signal),
    ]);

    const { name, country } = extractPlaceLabels(
        reverseSettled,
        latitude,
        longitude,
        customName
    );

    return buildAnalogProfileFromTelemetry({
        latitude,
        longitude,
        name,
        country,
        telemetry,
    });
};

// ============================================================================
// 6. Batch Whole-Earth Discovery Scanner (`scanWholeEarthAnalogs`)
// ============================================================================

/**
 * Evaluates a synthesized Whole-Earth Grid analog profile against the scientist's
 * active environmental & mission filter criteria.
 *
 * @param {Object} profile - Synthesized TerraMatch analog profile from `GLOBAL_EXPLORATION_GRID`.
 * @param {Object} criteria - Active search filters from `Tweaks.jsx`.
 * @returns {boolean} `true` if the non-NASA Earth candidate satisfies all criteria.
 */
const matchesWholeEarthCriteria = (profile, criteria = {}) => {
    const {
        searchQuery = "",
        targetBody = "",
        terrain = "Any",
        humidity = "Any",
        temperature = "Any",
        tempMin = -60,
        tempMax = 50,
        minElevation = 0,
    } = criteria;

    // 1. Optional text filter across site name, country, category, or mineralogy
    const trimmedQuery = (searchQuery || "").trim().toLowerCase();
    if (trimmedQuery) {
        const textCorpus = [
            profile.name,
            profile.country,
            profile.analogCategory,
            profile.mineralogy,
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
        if (!textCorpus.includes(trimmedQuery)) {
            return false;
        }
    }

    // 2. Target Planetary Body ("moon" or "mars")
    if (targetBody && targetBody !== "Any") {
        const matchesBody = profile.analogType?.some(
            (type) => type.toLowerCase() === targetBody.toLowerCase()
        );
        if (!matchesBody) {
            return false;
        }
    }

    // 3. Terrain & Geology filter pill
    if (terrain && terrain !== "Any") {
        const keywords = SCAN_TERRAIN_KEYWORDS[terrain] || [terrain.toLowerCase()];
        const geologyCorpus = [
            ...(Array.isArray(profile.terrain) ? profile.terrain : []),
            profile.mineralogy || "",
            profile.analogCategory || "",
            profile.description || "",
        ]
            .join(" ")
            .toLowerCase();

        if (!keywords.some((kw) => geologyCorpus.includes(kw))) {
            return false;
        }
    }

    // 4. Aridity & Moisture Regime filter pill (supports "Hyper-Arid", "Very dry", etc.)
    if (humidity && humidity !== "Any") {
        const keywords = SCAN_HUMIDITY_KEYWORDS[humidity] || [humidity.toLowerCase()];
        const moistureCorpus = [
            profile.environment?.climate || "",
            profile.environment?.humidity || "",
            profile.analogCategory || "",
            ...(Array.isArray(profile.terrain) ? profile.terrain : []),
        ]
            .join(" ")
            .toLowerCase();

        const matchesKeyword = keywords.some((kw) => moistureCorpus.includes(kw));
        // Also evaluate numeric RH% directly when scanning dry/hyper-arid thresholds
        const rh = profile.telemetry?.humidityPercent ?? 50;
        const matchesDryNumeric =
            (humidity === "Hyper-Arid" || humidity === "Very dry") && rh < 45;
        const matchesAridNumeric = humidity === "Arid / Dry" && rh < 60;

        if (!matchesKeyword && !matchesDryNumeric && !matchesAridNumeric) {
            return false;
        }
    }

    // 5. Surface Temperature Tier & Numeric Bounds (-60°C to 50°C)
    const tempVal =
        typeof profile.telemetry?.temperatureC === "number"
            ? profile.telemetry.temperatureC
            : profile.temperature;

    if (temperature && temperature !== "Any") {
        if (temperature === "Cryogenic (< -10°C)" && !(tempVal < -10)) {
            return false;
        }
        if (
            temperature === "Cold (-10 to 10°C)" &&
            !(tempVal >= -10 && tempVal <= 10)
        ) {
            return false;
        }
        if (
            temperature === "Temperate (10 to 25°C)" &&
            !(tempVal > 10 && tempVal <= 25)
        ) {
            return false;
        }
        if (temperature === "Extreme Hot (> 25°C)" && !(tempVal > 25)) {
            return false;
        }
    }

    if (tempVal < tempMin || tempVal > tempMax) {
        return false;
    }

    // 6. Minimum Elevation cutoff (m)
    const elevationMeters = profile.environment?.elevationMeters ?? 0;
    if (minElevation > 0 && elevationMeters < minElevation) {
        return false;
    }

    return true;
};

/**
 * Number of coordinate points queried per batch HTTP request to Open-Meteo.
 *
 * WHY CHUNK INTO BATCHES OF 15?
 * 1. URL Length Limits: Building a single URL with 45+ coordinates (each containing
 *    floating-point latitudes and longitudes) creates an excessively long query string
 *    that can exceed browser or proxy URL character limits and trigger HTTP 414 / HTTP 400.
 * 2. API Stability: Open-Meteo processes multi-location queries efficiently in smaller
 *    parallel batches. Querying in chunks of 15 ensures each batch stays well within
 *    recommended bounds without overloading a single request.
 * 3. Concurrency: Fetching the chunks in parallel via Promise.all(...) keeps total latency
 *    minimal (~equal to a single request) while eliminating payload dropouts or HTTP 400 errors.
 */
const WHOLE_EARTH_BATCH_CHUNK_SIZE = 15;

/**
 * Scans the entire 45-point `GLOBAL_EXPLORATION_GRID` in parallel batches of 15
 * coordinates via Open-Meteo API requests (`latitude=...&longitude=...`), synthesizes
 * full TerraMatch analog profiles with real NASADEM/SRTM elevation, temperature,
 * relative humidity, precipitation, and solar radiation, and filters them against
 * the scientist's environmental criteria.
 *
 * @param {Object} [criteria={}] - Mission and environmental search criteria.
 * @param {AbortSignal} [signal] - Optional AbortSignal for request cancellation.
 * @returns {Promise<Array<Object>>} Matching non-NASA Earth discovery profiles.
 */
export const scanWholeEarthAnalogs = async (criteria = {}, signal) => {
    // ------------------------------------------------------------------------
    // 1. Chunk Global Grid into Batches of 15 Coordinates
    // ------------------------------------------------------------------------
    // WHY WE CHUNK:
    // Querying all 45+ exploration sites in a single query string results in a very
    // long URL that is prone to HTTP 400 Bad Request or server timeouts.
    // Slicing the grid into smaller chunks of 15 allows us to dispatch manageable,
    // lightweight requests concurrently.
    const gridChunks = [];
    for (
        let i = 0;
        i < GLOBAL_EXPLORATION_GRID.length;
        i += WHOLE_EARTH_BATCH_CHUNK_SIZE
    ) {
        gridChunks.push(
            GLOBAL_EXPLORATION_GRID.slice(i, i + WHOLE_EARTH_BATCH_CHUNK_SIZE)
        );
    }

    // ------------------------------------------------------------------------
    // 2. Fetch All Chunks Concurrently via Promise.all
    // ------------------------------------------------------------------------
    const chunkResponses = await Promise.all(
        gridChunks.map(async (chunk, chunkIndex) => {
            // Build comma-separated latitude & longitude vectors for this chunk
            const lats = chunk
                .map((pt) => normalizeLatitude(pt.lat))
                .join(",");
            const lons = chunk
                .map((pt) => normalizeLongitude(pt.lon))
                .join(",");

            // WHY &elevation=nan WAS REMOVED:
            // In Open-Meteo, the `elevation` query parameter is an optional manual
            // altitude override. By default, Open-Meteo automatically uses high-resolution
            // 90m NASADEM / SRTM data and returns the correct `elevation` (in meters)
            // for EVERY coordinate in the output JSON.
            // When querying multiple coordinates, passing `&elevation=nan` as a single scalar
            // value triggers an HTTP 400 Bad Request from Open-Meteo because the server
            // cannot match a single NaN to an array of coordinate pairs.
            // Omitting `elevation` completely allows Open-Meteo to provide authentic,
            // automated DEM elevations without errors.
            const batchUrl = `${OPEN_METEO_FORECAST_URL}?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,precipitation,shortwave_radiation`;

            const response = await fetch(batchUrl, {
                headers: { Accept: "application/json" },
                signal,
            });

            if (!response.ok) {
                throw new Error(
                    `Whole-Earth satellite scan chunk ${chunkIndex + 1} failed (Open-Meteo HTTP ${response.status}).`
                );
            }

            const rawPayload = await response.json();
            // Open-Meteo returns an array of response objects for multi-coordinate queries,
            // or a single object if only one coordinate was queried.
            return Array.isArray(rawPayload) ? rawPayload : [rawPayload];
        })
    );

    // ------------------------------------------------------------------------
    // 3. Flatten Parallel Results
    // ------------------------------------------------------------------------
    // Promise.all guarantees result ordering matching `gridChunks`, so flattening
    // yields a clean array strictly aligned 1:1 with `GLOBAL_EXPLORATION_GRID`.
    const entries = chunkResponses.flat();

    // ------------------------------------------------------------------------
    // 4. Synthesize Analog Profiles from Live Satellite Telemetry
    // ------------------------------------------------------------------------
    const synthesizedSites = GLOBAL_EXPLORATION_GRID.map((gridPoint, index) => {
        const entry = entries[index] || {};
        const current = entry?.current || {};

        const solarRadiationWm2 = Math.round(
            toFiniteNumber(current.shortwave_radiation, 0)
        );
        const precipMmHour = Math.max(0, toFiniteNumber(current.precipitation, 0));

        const telemetry = {
            elevationMeters: Math.round(toFiniteNumber(entry?.elevation, 0)),
            temperatureC:
                Math.round(toFiniteNumber(current.temperature_2m, 10) * 10) / 10,
            humidityPercent: Math.round(
                Math.max(0, Math.min(100, toFiniteNumber(current.relative_humidity_2m, 45)))
            ),
            precipitationMmDay: Math.round(precipMmHour * 24 * 100) / 100,
            solarIrradianceKwh:
                Math.round(((solarRadiationWm2 * 24) / 1000) * 100) / 100,
            solarRadiationWm2,
            observedAt: current.time || new Date().toISOString(),
            usedFallback: false,
        };

        return buildAnalogProfileFromTelemetry({
            latitude: normalizeLatitude(gridPoint.lat),
            longitude: normalizeLongitude(gridPoint.lon),
            name: gridPoint.name,
            country: gridPoint.country,
            telemetry,
            geologyHint: gridPoint.geologyHint,
            isGlobalDiscovery: true,
            dataSource: WHOLE_EARTH_SCAN_DATA_SOURCE,
            roversTested:
                "Whole-Earth Satellite Scan (Unexplored Non-NASA Candidate)",
        });
    });

    // ------------------------------------------------------------------------
    // 5. Filter Candidates Against Scientist Criteria
    // ------------------------------------------------------------------------
    return synthesizedSites.filter((site) =>
        matchesWholeEarthCriteria(site, criteria)
    );
};
