/**
 * ============================================================================
 * Planetary Analog Specification & Telemetry Helpers (`analogSpec.js`)
 * ============================================================================
 * Shared formatting and derivation utilities replacing legacy simulated
 * `similarityScore` percentages with scientifically grounded target body
 * specifications, real mean surface temperatures (°C), primary testing foci,
 * mineralogy, and historical rover/mission campaign summaries.
 */

/**
 * Resolves a real or climate-derived mean surface temperature (°C) for any
 * planetary analog location document.
 *
 * @param {Object} loc - Planetary analog location object.
 * @returns {number} Mean surface temperature in degrees Celsius.
 */
export const getSurfaceTemperature = (loc) => {
    if (typeof loc?.temperature === "number" && !Number.isNaN(loc.temperature)) {
        return loc.temperature;
    }

    const climate = (loc?.environment?.climate || "").toLowerCase();
    const lat = Math.abs(loc?.coordinates?.latitude || 0);

    if (
        climate.includes("polar") ||
        climate.includes("extremely cold") ||
        lat > 70
    ) {
        return -20;
    }
    if (climate.includes("cold") || climate.includes("subarctic") || lat > 55) {
        return -4;
    }
    if (
        climate.includes("temperate") ||
        climate.includes("mediterranean") ||
        climate.includes("cool")
    ) {
        return 14;
    }
    if (
        climate.includes("hot") ||
        climate.includes("hyper-arid") ||
        climate.includes("extremely hot")
    ) {
        return 30;
    }
    return 18;
};

/**
 * Formats a location's mean surface temperature as a compact `°C` string.
 *
 * @param {Object} loc - Planetary analog location object.
 * @returns {string} Formatted temperature string (e.g. `"-30°C"` or `"18°C"`).
 */
export const formatSurfaceTemp = (loc) => `${getSurfaceTemperature(loc)}°C`;

/**
 * Derives target planetary body flags, color-coded badge classes, and canonical
 * specification labels (`Mars Analog`, `Moon Analog`, or `Moon & Mars Analog`).
 *
 * @param {Object} loc - Planetary analog location object.
 * @returns {Object} Target body classification and Tailwind styling metadata.
 */
export const getTargetBodyInfo = (loc) => {
    const types = Array.isArray(loc?.analogType)
        ? loc.analogType.map((t) => String(t).toLowerCase())
        : [];
    const specText = String(loc?.targetSpec || "").toLowerCase();

    const hasMoon = types.includes("moon") || specText.includes("moon");
    const hasMars =
        types.includes("mars") || specText.includes("mars") || !hasMoon;
    const isDual = hasMoon && hasMars;

    // Compact badge text for search, recent, and saved cards
    const pillLabel = isDual ? "MOON / MARS" : hasMoon ? "MOON" : "MARS";

    // Short readable planetary body label for tables
    const bodySummary = isDual ? "Moon & Mars" : hasMoon ? "Moon" : "Mars";

    // Canonical specification label
    const specLabel =
        loc?.targetSpec ||
        (isDual
            ? "Moon & Mars Analog"
            : hasMoon
            ? "Moon Analog"
            : "Mars Analog");

    // Full descriptive label for detail cards
    const longSpecLabel = isDual
        ? "Dual Moon & Mars Analog"
        : hasMoon
        ? "Moon Analog"
        : "Mars Analog";

    // Color-coded pill styling matching TerraMatch's cyan (Moon) & terracotta (Mars) palette
    const pillClassName = isDual
        ? "bg-[#1A1D23] border border-[#21242C] text-[#F1EEE9]"
        : hasMoon
        ? "bg-[#83CAD8]/15 border border-[#83CAD8]/40 text-[#83CAD8]"
        : "bg-[#D67051]/15 border border-[#D67051]/40 text-[#D67051]";

    // Color-coded popup badges (`MARS ANALOG` in #D67051, `MOON ANALOG` in #83CAD8)
    const popupBadges = [];
    if (hasMoon) {
        popupBadges.push({
            label: "MOON ANALOG",
            className:
                "bg-[#83CAD8]/15 border border-[#83CAD8]/45 text-[#83CAD8]",
        });
    }
    if (hasMars) {
        popupBadges.push({
            label: "MARS ANALOG",
            className:
                "bg-[#D67051]/15 border border-[#D67051]/45 text-[#D67051]",
        });
    }

    return {
        hasMoon,
        hasMars,
        isDual,
        pillLabel,
        bodySummary,
        specLabel,
        longSpecLabel,
        pillClassName,
        popupBadges,
    };
};

/**
 * Returns the primary scientific fidelity focus (`analogCategory`) for a site.
 *
 * @param {Object} loc - Planetary analog location object.
 * @returns {string} Scientific analog testing category.
 */
export const getAnalogCategory = (loc) => {
    if (loc?.analogCategory) return loc.analogCategory;
    if (Array.isArray(loc?.terrain) && loc.terrain.length > 0) {
        const first = loc.terrain[0];
        return first.charAt(0).toUpperCase() + first.slice(1);
    }
    return "Planetary Surface Analog";
};

/**
 * Returns historical rovers, field robotics, or orbital missions tested/correlated
 * at the analog site.
 *
 * @param {Object} loc - Planetary analog location object.
 * @returns {string} Rovers and analog mission campaigns.
 */
export const getRoversTested = (loc) =>
    loc?.roversTested ||
    "Planetary Analog Field Campaigns & Orbital Calibration";

/**
 * Returns the primary rock, evaporite, or regolith mineralogy for the site.
 *
 * @param {Object} loc - Planetary analog location object.
 * @returns {string} Mineralogy and regolith composition summary.
 */
export const getMineralogy = (loc) => {
    if (loc?.mineralogy) return loc.mineralogy;
    if (Array.isArray(loc?.terrain) && loc.terrain.length > 0) {
        const first = loc.terrain[0];
        return first.charAt(0).toUpperCase() + first.slice(1);
    }
    return "Basaltic & Silicate Regolith";
};

