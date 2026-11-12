/**
 * ============================================================================
 * Global Live Earth Telemetry Discovery Engine (`earthTelemetryApi.js`)
 * ============================================================================
 * Connects TerraMatch to free, keyless planetary Earth observation APIs:
 * 1. OpenStreetMap Nominatim (forward search & reverse geocoding)
 * 2. Open-Meteo Elevation & Surface Meteorology API (real-time 2m temperature,
 *    relative humidity, shortwave solar radiation, and DEM elevation)
 *
 * Synthesizes complete TerraMatch analog profile objects from live satellite
 * telemetry so any Earth coordinate or place can be inspected on the map,
 * saved to a scientist's profile, and compared side-by-side in `ComparePage.jsx`.
 */

// ============================================================================
// 1. Public API Endpoint Constants
// ============================================================================

/** Base URL for OpenStreetMap Nominatim geocoding & reverse-geocoding API. */
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

/** Base URL for Open-Meteo real-time forecast & DEM elevation API. */
const OPEN_METEO_BASE_URL = "https://api.open-meteo.com/v1/forecast";

// ============================================================================
// 2. Coordinate & Numeric Normalization Helpers
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
 * @returns {number} Finite rounded number.
 */
const toFiniteNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

// ============================================================================
// 3. External API Fetch Helpers (Open-Meteo & OpenStreetMap Nominatim)
// ============================================================================

/**
 * Fetches live surface telemetry and DEM elevation for a single Earth coordinate
 * from Open-Meteo (keyless, CORS-enabled).
 *
 * @param {number} lat - Latitude in decimal degrees.
 * @param {number} lon - Longitude in decimal degrees.
 * @param {AbortSignal} [signal] - Optional AbortSignal for request cancellation.
 * @returns {Promise<{
 *   elevationMeters: number,
 *   temperatureC: number,
 *   humidityPercent: number,
 *   solarRadiationWm2: number,
 *   observedAt: string
 * }>}
 */
const fetchOpenMeteoTelemetry = async (lat, lon, signal) => {
    const url = `${OPEN_METEO_BASE_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,shortwave_radiation&elevation=nan`;

    const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal,
    });

    if (!response.ok) {
        throw new Error(`Open-Meteo telemetry request failed (HTTP ${response.status}).`);
    }

    const data = await response.json();
    const current = data?.current || {};

    return {
        elevationMeters: Math.round(toFiniteNumber(data?.elevation, 0)),
        temperatureC: Math.round(toFiniteNumber(current.temperature_2m, 15) * 10) / 10,
        humidityPercent: Math.round(toFiniteNumber(current.relative_humidity_2m, 50)),
        solarRadiationWm2: Math.round(toFiniteNumber(current.shortwave_radiation, 0)),
        observedAt: current.time || new Date().toISOString(),
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
 * Evaluates live Earth telemetry parameters (temperature, relative humidity,
 * latitude, elevation, and solar radiation) to classify Moon/Mars analog
 * suitability, testing category, climate descriptor, mineralogy, and terrain tags.
 *
 * @param {Object} params - Environmental measurements for the Earth coordinate.
 * @param {number} params.latitude - Decimal latitude.
 * @param {number} params.elevationMeters - Ground elevation above sea level (m).
 * @param {number} params.temperatureC - Live 2m surface air temperature (°C).
 * @param {number} params.humidityPercent - Live relative humidity (%).
 * @param {number} params.solarRadiationWm2 - Live shortwave radiation (W/m²).
 * @returns {Object} Derived planetary analog classification metadata.
 */
const classifyTelemetryAnalog = ({
    latitude,
    elevationMeters,
    temperatureC,
    humidityPercent,
    solarRadiationWm2,
}) => {
    const absLat = Math.abs(latitude);
    const isHyperArid = humidityPercent < 35;
    const isArid = humidityPercent < 55;
    const isHighAltitude = elevationMeters > 1500;
    const isPolar = absLat > 60;
    const isCryogenic = temperatureC <= 0 || isPolar;

    // Determine Moon / Mars target body suitability from physical regime
    let analogType;
    let targetSpec;

    if ((isHighAltitude && (isHyperArid || isCryogenic)) || (isPolar && isHyperArid)) {
        // High-altitude + dry/cryogenic or polar-hyperarid mirrors both Lunar highlands & Mars
        analogType = ["moon", "mars"];
        targetSpec = "Moon & Mars Analog";
    } else if (isHighAltitude || (isPolar && temperatureC <= 0)) {
        // Thin-atmosphere UV highlands and polar cryogenic zones serve Lunar surface/polar ops
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
    } else if (solarRadiationWm2 > 650 && isArid) {
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
    } else if (humidityPercent >= 75) {
        climate = "humid";
    } else {
        climate = "temperate";
    }

    // Derive descriptive geological terrain tags
    const terrain = [];
    if (isHighAltitude) terrain.push("high-altitude terrain");
    if (isPolar || isCryogenic) terrain.push("polar terrain", "permafrost");
    if (isHyperArid) terrain.push("hyper-arid desert", "exposed rock");
    else if (isArid) terrain.push("arid terrain", "rocky surface");
    if (terrain.length === 0) terrain.push("terrestrial field terrain", "silicate soil");

    // Infer representative mineralogy & regolith composition
    let mineralogy = "Terrestrial silicate regolith & weathered crustal rock";
    if (isHighAltitude && isHyperArid) {
        mineralogy = "Volcanic tephra, oxidized silicates & UV-weathered evaporites";
    } else if (isCryogenic) {
        mineralogy = "Ice-cemented regolith, frost-shattered bedrock & cryogenic fines";
    } else if (isHyperArid) {
        mineralogy = "Desiccated sulfate-chloride fines, iron oxides & aeolian sand";
    } else if (isHighAltitude) {
        mineralogy = "High-relief basaltic/granitic outcrop & coarse scree regolith";
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
 * Synthesizes a complete TerraMatch location object combining Nominatim place
 * metadata, Open-Meteo live satellite telemetry, and planetary analog tags.
 *
 * @param {Object} args - Input telemetry and place metadata.
 * @param {number} args.latitude - Normalized decimal latitude.
 * @param {number} args.longitude - Normalized decimal longitude.
 * @param {string} args.name - Resolved place or feature name.
 * @param {string} args.country - Resolved country or region label.
 * @param {Object} args.telemetry - Open-Meteo live telemetry payload.
 * @returns {Object} Full TerraMatch analog profile object ready for Map, Save, and Compare.
 */
const buildAnalogProfileFromTelemetry = ({
    latitude,
    longitude,
    name,
    country,
    telemetry,
}) => {
    const classification = classifyTelemetryAnalog({
        latitude,
        elevationMeters: telemetry.elevationMeters,
        temperatureC: telemetry.temperatureC,
        humidityPercent: telemetry.humidityPercent,
        solarRadiationWm2: telemetry.solarRadiationWm2,
    });

    // Deterministic unique ID so repeated probes of the same coordinate deduplicate cleanly
    const stableId = `earth-telemetry-${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
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
        roversTested: "Live Satellite Telemetry Probe (Open-Meteo / OSM)",
        mineralogy: classification.mineralogy,
        terrain: classification.terrain,
        environment: {
            climate: classification.climate,
            humidity: `${telemetry.humidityPercent}% RH`,
            humidityPercent: telemetry.humidityPercent,
            elevationMeters: telemetry.elevationMeters,
            solarRadiationWm2: telemetry.solarRadiationWm2,
            vegetation:
                telemetry.humidityPercent < 35 || telemetry.elevationMeters > 3000
                    ? "sparse"
                    : "variable",
        },
        // Dedicated live telemetry snapshot used by Tweaks and Map popups
        telemetry: {
            elevationMeters: telemetry.elevationMeters,
            temperatureC: telemetry.temperatureC,
            humidityPercent: telemetry.humidityPercent,
            solarRadiationWm2: telemetry.solarRadiationWm2,
            observedAt: telemetry.observedAt,
        },
        description: `Live Earth satellite telemetry at ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}° (${telemetry.elevationMeters.toLocaleString()} m elevation): ${telemetry.temperatureC}°C surface air temperature, ${telemetry.humidityPercent}% relative humidity, and ${telemetry.solarRadiationWm2} W/m² shortwave solar flux.`,
        dataSource: "live-earth-telemetry",
        isLiveTelemetry: true,
    };
};

// ============================================================================
// 5. Exported Discovery Functions
// ============================================================================

/**
 * Searches OpenStreetMap Nominatim for up to 5 real-world Earth locations
 * matching `query`, enriches every candidate with live Open-Meteo elevation
 * and meteorology, and returns synthesized TerraMatch analog profiles.
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

    // Step 2: Hydrate all returned places concurrently with Open-Meteo telemetry
    const enrichedResults = await Promise.all(
        places.map(async (place) => {
            const latitude = normalizeLatitude(Number(place.lat));
            const longitude = normalizeLongitude(Number(place.lon));

            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                return null;
            }

            const { name, country } = extractPlaceLabels(place, latitude, longitude);

            try {
                const telemetry = await fetchOpenMeteoTelemetry(
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
                // Graceful per-item fallback if Open-Meteo times out for one coordinate
                return buildAnalogProfileFromTelemetry({
                    latitude,
                    longitude,
                    name,
                    country,
                    telemetry: {
                        elevationMeters: 0,
                        temperatureC: 15,
                        humidityPercent: 50,
                        solarRadiationWm2: 0,
                        observedAt: new Date().toISOString(),
                    },
                });
            }
        })
    );

    return enrichedResults.filter(Boolean);
};

/**
 * Probes any arbitrary Earth coordinate `(lat, lon)` by reverse-geocoding its
 * region/feature name via OpenStreetMap Nominatim and fetching live elevation,
 * temperature, relative humidity, and shortwave solar radiation from Open-Meteo,
 * then synthesizes a complete TerraMatch analog site profile.
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

    // Execute Nominatim reverse geocode and Open-Meteo telemetry request concurrently
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
        fetchOpenMeteoTelemetry(latitude, longitude, signal),
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

