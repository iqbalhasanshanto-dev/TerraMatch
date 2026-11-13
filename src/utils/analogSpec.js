// Planetary analog specification, recognition, and telemetry utilities.

// Resolves mean surface temperature (°C) from location data or climate.
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

// Formats mean surface temperature as a °C string.
export const formatSurfaceTemp = (loc) => `${getSurfaceTemperature(loc)}°C`;

// Derives target planetary body classification, styling, and specification labels.
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

// Returns primary scientific fidelity focus category for a location.
export const getAnalogCategory = (loc) => {
    if (loc?.analogCategory) return loc.analogCategory;
    if (Array.isArray(loc?.terrain) && loc.terrain.length > 0) {
        const first = loc.terrain[0];
        return first.charAt(0).toUpperCase() + first.slice(1);
    }
    return "Planetary Surface Analog";
};

// Returns historical rovers, field robotics, or missions tested at site.
export const getRoversTested = (loc) =>
    loc?.roversTested ||
    "Planetary Analog Field Campaigns & Orbital Calibration";

// Returns primary rock, evaporite, or regolith mineralogy for site.
export const getMineralogy = (loc) => {
    if (loc?.mineralogy) return loc.mineralogy;
    if (Array.isArray(loc?.terrain) && loc.terrain.length > 0) {
        const first = loc.terrain[0];
        return first.charAt(0).toUpperCase() + first.slice(1);
    }
    return "Basaltic & Silicate Regolith";
};

// Established canonical planetary analog keywords.
const ESTABLISHED_ANALOG_KEYWORDS = [
    "atacama desert",
    "mcmurdo dry valleys",
    "devon island",
    "haughton crater",
    "mauna kea",
    "mojave desert",
    "río tinto",
    "rio tinto",
    "icelandic highlands",
    "reykjanes",
    "mývatn",
    "myvatn",
    "svalbard",
    "kīlauea",
    "kilauea",
    "death valley",
    "lanzarote",
    "painted desert",
    "san rafael swell",
    "wadi rum",
    "pāhoehoe",
    "pahoehoe",
    "white sands",
    "craters of the moon",
];

// Distinguishes established analogs from emerging or under-studied candidates.
export const getAnalogRecognitionStatus = (loc) => {
    // Whole-Earth grid batch scans and live coordinate probes are always emerging discoveries
    if (loc?.isGlobalDiscovery || loc?.isLiveTelemetry) {
        return {
            label: "Emerging Analog",
            isEmerging: true,
            badgeClass: "bg-[#CEB882]/15 border border-[#CEB882]/40 text-[#CEB882]",
            description: "Newly scanned Earth region exhibiting quantitative orbital fidelity to lunar or Martian environments.",
        };
    }

    const nameLower = (loc?.name || "").toLowerCase();
    const isEstablished = ESTABLISHED_ANALOG_KEYWORDS.some((kw) =>
        nameLower.includes(kw)
    );

    if (isEstablished) {
        return {
            label: "Established Analog",
            isEmerging: false,
            badgeClass: "bg-[#8891A0]/15 border border-[#21242C] text-[#8891A0]",
            description: "Widely documented analog with published NASA, ESA, or space agency mission test history.",
        };
    }

    return {
        label: "Emerging Analog",
        isEmerging: true,
        badgeClass: "bg-[#CEB882]/15 border border-[#CEB882]/40 text-[#CEB882]",
        description: "Under-studied planetary analog identified by TerraMatch for high geomorphic, mineralogical, and habitability relevance.",
    };
};

// Evaluates multi-dimensional scientific fidelity and terrestrial limitations.
export const getScientificFidelityAnalysis = (loc) => {
    const { hasMoon, hasMars, isDual } = getTargetBodyInfo(loc);
    const targetBodyName = isDual ? "Moon & Mars" : hasMoon ? "Moon" : "Mars";
    const temp = getSurfaceTemperature(loc);
    const climate = (loc?.environment?.climate || "").toLowerCase();
    const terrainList = Array.isArray(loc?.terrain)
        ? loc.terrain.map((t) => t.toLowerCase())
        : [];
    const description = (loc?.description || "").toLowerCase();
    const mineralogy = (loc?.mineralogy || "").toLowerCase();
    const nameLower = (loc?.name || "").toLowerCase();

    // Geology & mineralogy dimension.
    let geologyScore;
    let geologyPercent;
    let geologyReason;

    if (
        mineralogy.includes("perchlorate") ||
        mineralogy.includes("sulfate") ||
        description.includes("perchlorate") ||
        description.includes("halite")
    ) {
        geologyScore = "High Match";
        geologyPercent = 94;
        geologyReason =
            "Perchlorate-bearing evaporites, halite crusts, and sulfates match Martian chloride basins and Jezero lacustrine beds.";
    } else if (
        mineralogy.includes("lava tube") ||
        terrainList.some((t) => t.includes("tube") || t.includes("cave")) ||
        description.includes("lava tube")
    ) {
        geologyScore = "High Match";
        geologyPercent = 93;
        geologyReason =
            "Intact subterranean basaltic lava tubes and pyroxene/plagioclase walls provide structural analogs for lunar and Martian volcanic voids.";
    } else if (
        mineralogy.includes("iron") ||
        mineralogy.includes("hematite") ||
        mineralogy.includes("jarosite")
    ) {
        geologyScore = "High Match";
        geologyPercent = 91;
        geologyReason =
            "Acidic iron sulfates, jarosite, and ferric concretions mirror Martian Opportunity/Curiosity rover outcrop mineralogy.";
    } else if (
        mineralogy.includes("anorthosite") ||
        mineralogy.includes("basalt") ||
        nameLower.includes("kea") ||
        nameLower.includes("lanzarote") ||
        nameLower.includes("craters of the moon")
    ) {
        geologyScore = "High Match";
        geologyPercent = 89;
        geologyReason =
            "Vesicular basalt, pyroxene phenocrysts, and unweathered scoria parallel lunar mare basalt and highland plagioclase.";
    } else {
        geologyScore = "Moderate Match";
        geologyPercent = 82;
        geologyReason =
            "Silicate-rich bedrock and rocky scree provide suitable geomechanical analogs for surface rover trafficability.";
    }

    // Topography & terrain dimension.
    let terrainScore;
    let terrainPercent;
    let terrainReason;

    if (
        terrainList.some((t) => t.includes("tube") || t.includes("cave")) ||
        description.includes("lava tube") ||
        description.includes("cave")
    ) {
        terrainScore = "High Match";
        terrainPercent = 95;
        terrainReason =
            "Subterranean lava tube conduits, skylight collapses, and basaltic benches match Marius Hills and Pavonis Mons cave structures.";
    } else if (
        terrainList.some((t) => t.includes("dune") || t.includes("sand")) ||
        description.includes("dune") ||
        description.includes("aeolian")
    ) {
        terrainScore = "High Match";
        terrainPercent = 91;
        terrainReason =
            "Aeolian dune morphologies, megaripples, and slip-faces recreate Martian sand mobility and rover wheel slip dynamics.";
    } else if (
        terrainList.some((t) => t.includes("crater") || t.includes("caldera")) ||
        description.includes("crater")
    ) {
        terrainScore = "High Match";
        terrainPercent = 89;
        terrainReason =
            "Impact crater rims, central uplifts, and shock breccia recreate complex topography for landing site certification.";
    } else if (
        terrainList.some((t) => t.includes("polar") || t.includes("ice") || t.includes("glacial")) ||
        climate.includes("polar")
    ) {
        terrainScore = "High Match";
        terrainPercent = 92;
        terrainReason =
            "Patterned permafrost polygons and ice-wedge networks mirror Martian high-latitude and lunar polar crater floors.";
    } else {
        terrainScore = "Moderate Match";
        terrainPercent = 80;
        terrainReason =
            "Rugged desert terrain and scree slopes provide obstacle navigation tests for robotic chassis.";
    }

    // Thermal & climate regime dimension.
    let thermalScore;
    let thermalPercent;
    let thermalReason;

    if (temp <= -15) {
        thermalScore = "High Match";
        thermalPercent = 92;
        thermalReason = `Cryogenic sub-zero environment (${temp}°C) mirrors polar permafrost and Martian winter ground ice preservation.`;
    } else if (temp <= 0) {
        thermalScore = "High Match";
        thermalPercent = 84;
        thermalReason = `Freezing sub-polar regime (${temp}°C) tests freeze-thaw mechanics and cryogenic electronics resilience.`;
    } else if (climate.includes("extremely dry") || climate.includes("hyper-arid")) {
        thermalScore = "Moderate Match";
        thermalPercent = 65;
        thermalReason = `Diurnal solar flux is intense, but terrestrial temperature (${temp}°C) is warmer than the Martian global mean (-63°C).`;
    } else {
        thermalScore = "Low to Moderate Match";
        thermalPercent = 52;
        thermalReason = `Temperate climate (${temp}°C) diverges from lunar thermal cycling (+120°C day / -130°C night) and Martian cold.`;
    }

    // Water, ice & ISRU resources dimension.
    let waterScore;
    let waterPercent;
    let waterReason;

    if (
        climate.includes("dry") ||
        climate.includes("arid") ||
        description.includes("arid") ||
        description.includes("perchlorate")
    ) {
        waterScore = "High Match";
        waterPercent = 95;
        waterReason =
            "Desiccation-tolerant endoliths and hyper-arid regolith benchmark the absolute boundary conditions for habitability.";
    } else if (
        climate.includes("polar") ||
        climate.includes("cold") ||
        description.includes("permafrost") ||
        description.includes("ice")
    ) {
        waterScore = "High Match";
        waterPercent = 93;
        waterReason =
            "Permafrost ice tables and subsurface brine veins serve as primary analogs for lunar polar ice and Martian ground ice mining.";
    } else if (
        description.includes("isru") ||
        description.includes("extraction") ||
        description.includes("regolith")
    ) {
        waterScore = "High Match";
        waterPercent = 88;
        waterReason =
            "Basaltic regolith and volatile-bearing minerals support ISRU oxygen, water, and structural simulant testing.";
    } else {
        waterScore = "Moderate Match";
        waterPercent = 75;
        waterReason =
            "Low-moisture substrate allows testing of volatile prospecting sensors and regolith excavation tools.";
    }

    // Matching analog strengths.
    const whatMatches = [
        `Primary planetary geomorphology directly mimics ${targetBodyName} surface features (${getAnalogCategory(loc)}).`,
        `Extensive mineralogical overlap in ${getMineralogy(loc)}, critical for in-situ resource utilization (ISRU) and spectral library calibration.`,
        `Proven track record as a proving ground for field robotics, rover mobility drills, and astronaut training (${getRoversTested(loc)}).`,
    ];

    // Terrestrial physical limits where analogy breaks down.
    const gravityDifference =
        hasMoon && !hasMars
            ? "Earth 1.0 g (9.81 m/s²) vs. Moon 0.16 g (1.62 m/s²). Lunar gravity is 1/6th of Earth's; regolith shear strength, electrostatic dust levitation, and structural load calculations for base modules differ substantially."
            : !hasMoon && hasMars
            ? "Earth 1.0 g (9.81 m/s²) vs. Mars 0.38 g (3.72 m/s²). Martian gravity is ~38% of Earth's; aeolian grain saltation trajectories, slope slip-faces, and rover wheel traction physics behave differently."
            : "Earth 1.0 g vs. Moon (0.16 g) & Mars (0.38 g). Terrestrial gravity fundamentally alters sediment transport, rover rollover thresholds, and excavation energy requirements compared to low-gravity extraterrestrial environments.";

    const atmosphereDifference =
        hasMoon && !hasMars
            ? "Earth 1,013 mbar N₂/O₂ atmosphere vs. Lunar hard vacuum (~10⁻¹² mbar). The Moon has zero atmospheric pressure and zero convective cooling; volatiles exposed to vacuum instantly sublime."
            : !hasMoon && hasMars
            ? "Earth 1,013 mbar breathable N₂/O₂ vs. Martian thin 6.1 mbar CO₂ atmosphere. Liquid water on Mars is thermodynamically metastable at the triple point; aerodynamic drag and parachute braking require Martian-specific atmospheric tuning."
            : "Earth 1,013 mbar atmosphere vs. Lunar vacuum (~0 mbar) and Martian thin CO₂ (~6 mbar). Gas thermodynamics, plume impingement, and spacesuit pressure differentials cannot be physically simulated under Earth's dense ambient atmosphere.";

    const radiationDifference =
        "Protected by Earth's geomagnetic dipole field and thick ozone/atmosphere layers. In contrast, the Moon and Mars lack global intrinsic magnetic fields, subjecting surface installations to unshielded Galactic Cosmic Rays (GCR) and lethal Solar Particle Events (SPEs), requiring 2+ meters of regolith shielding or subterranean lava tubes.";

    let siteSpecificLimitation;
    if (temp >= 15) {
        siteSpecificLimitation = `Thermal discrepancy: Terrestrial ambient temperature (${temp}°C) is vastly warmer than the Martian global mean (-63°C) or cryogenic lunar shadowed polar craters (-240°C to -130°C). Active cooling is needed on Earth where heaters are required on Moon/Mars.`;
    } else if (
        climate.includes("tropical") ||
        climate.includes("maritime") ||
        climate.includes("subtropical")
    ) {
        siteSpecificLimitation =
            "Atmospheric moisture & biology: Terrestrial precipitation and maritime humidity produce clay weathering, biological biofilms, and lichens that do not exist on the sterile, desiccated lunar and Martian surfaces.";
    } else if (climate.includes("polar")) {
        siteSpecificLimitation =
            "Atmospheric pressure buffering: Even in Earth's polar cold, atmospheric oxygen and 1 bar pressure prevent the sublimation-dominated ice retreat characteristic of the Martian 6 mbar environment.";
    } else {
        siteSpecificLimitation =
            "Hydrologic & biotic background: Even hyper-arid Earth testbeds contain trace biological contamination and atmospheric water vapor cycles absent in the ultra-sterile vacuum and oxidizing perchlorate regolith of the Moon and Mars.";
    }

    return {
        targetBodyName,
        overallFidelityScore: Math.round(
            (geologyPercent + terrainPercent + thermalPercent + waterPercent) / 4
        ),
        dimensions: [
            {
                id: "geology",
                title: "Geology & Mineralogy",
                score: geologyScore,
                percent: geologyPercent,
                reason: geologyReason,
            },
            {
                id: "topography",
                title: "Topography & Terrain",
                score: terrainScore,
                percent: terrainPercent,
                reason: terrainReason,
            },
            {
                id: "thermal",
                title: "Thermal & Climate Regime",
                score: thermalScore,
                percent: thermalPercent,
                reason: thermalReason,
            },
            {
                id: "water_isru",
                title: "Water, Ice & ISRU Resources",
                score: waterScore,
                percent: waterPercent,
                reason: waterReason,
            },
        ],
        whatMatches,
        whereAnalogyBreaksDown: [
            {
                id: "gravity",
                factor: "Gravity Discrepancy",
                earthValue: "1.0 g (9.81 m/s²)",
                targetValue:
                    hasMoon && !hasMars
                        ? "0.16 g (Moon)"
                        : !hasMoon && hasMars
                        ? "0.38 g (Mars)"
                        : "0.16 g (Moon) / 0.38 g (Mars)",
                explanation: gravityDifference,
            },
            {
                id: "atmosphere",
                factor: "Atmosphere & Pressure",
                earthValue: "1,013 mbar (N₂ / O₂)",
                targetValue:
                    hasMoon && !hasMars
                        ? "~10⁻¹² mbar (Hard Vacuum)"
                        : !hasMoon && hasMars
                        ? "6.1 mbar (Thin CO₂)"
                        : "Vacuum (Moon) / 6.1 mbar (Mars)",
                explanation: atmosphereDifference,
            },
            {
                id: "radiation",
                factor: "Radiation & Magnetosphere Shielding",
                earthValue: "Shielded by Magnetosphere & Ozone",
                targetValue: "Unshielded GCR & Solar Cosmic Rays",
                explanation: radiationDifference,
            },
            {
                id: "site_specific",
                factor: "Site-Specific Environmental Boundary",
                earthValue: `Local Earth (${temp}°C, ${loc.environment?.climate || "terrestrial"})`,
                targetValue: `${targetBodyName} Environment`,
                explanation: siteSpecificLimitation,
            },
        ],
    };
};

// Builds official bounding-box deep-link into NASA Worldview.
export const getNasaWorldviewUrl = (lat, lon) => {
    const parsedLat = typeof lat === "number" ? lat : parseFloat(lat) || 0;
    const parsedLon = typeof lon === "number" ? lon : parseFloat(lon) || 0;

    // Calculate a 3° x 2° bounding box centered on the target coordinate
    const minLon = (parsedLon - 1.5).toFixed(4);
    const minLat = (parsedLat - 1.0).toFixed(4);
    const maxLon = (parsedLon + 1.5).toFixed(4);
    const maxLat = (parsedLat + 1.0).toFixed(4);

    return `https://worldview.earthdata.nasa.gov/?v=${minLon},${minLat},${maxLon},${maxLat}&l=Reference_Labels_15m,Coastlines_15m,VIIRS_SNPP_CorrectedReflectance_TrueColor,MODIS_Terra_CorrectedReflectance_TrueColor`;
};

// Maps candidate analog locations to NASA, CSA, ESA, and JAXA dataset sources.
export const getAgencyDatasetProvenance = (loc) => {
    if (!loc) return [];

    const country = (loc.country || "").toLowerCase();
    const name = (loc.name || "").toLowerCase();
    const terrain = Array.isArray(loc.terrain)
        ? loc.terrain.map((t) => String(t).toLowerCase()).join(" ")
        : String(loc.terrain || "").toLowerCase();
    const climate = (loc.environment?.climate || "").toLowerCase();
    const lat = loc.coordinates?.latitude || 0;
    const { hasMoon, hasMars } = getTargetBodyInfo(loc);

    const datasets = [];

    // NASA Earthdata Core.
    datasets.push({
        agency: "NASA",
        agencyFullName: "National Aeronautics and Space Administration",
        name: "NASA Earthdata (NASADEM, MODIS LST, SMAP L3, GPM)",
        parameter: "30m Elevation Topography, Surface Temperature & Soil Moisture",
        resolution: "30m Global DEM / 1 km Daily Thermal / 9 km Soil Moisture",
        portalUrl: "https://search.earthdata.nasa.gov/",
        badgeClass: "bg-[#0B3A60]/30 border-[#0B3A60] text-[#83CAD8]",
        description:
            "Authoritative Earth observation suite providing calibrated topography, thermal diurnal curves, and volumetric soil moisture.",
    });

    // NASA Planetary Data System (PDS) archives.
    if (hasMoon) {
        datasets.push({
            agency: "NASA",
            agencyFullName: "NASA Planetary Data System (PDS) Lunar Archive",
            name: "NASA LRO Diviner Radiometer & LOLA Altimeter",
            parameter: "Lunar Bolometric Surface Temperature & Laser Elevation",
            resolution: "100m Lunar Grid / 5m Polar Altimetry DEM",
            portalUrl: "https://pds-geosciences.wustl.edu/missions/lro/diviner.htm",
            badgeClass: "bg-[#0B3A60]/30 border-[#0B3A60] text-[#83CAD8]",
            description:
                "LRO Diviner and LOLA PDS archives benchmarking extreme cryogenic thermal inertia and crater wall slope fidelity.",
        });
    }

    if (hasMars) {
        datasets.push({
            agency: "NASA",
            agencyFullName: "NASA Planetary Data System (PDS) Geosciences",
            name: "NASA Mars Global Surveyor MOLA & Mars ODE Archive",
            parameter: "Martian Topographic Relief, Slope & Surface Roughness",
            resolution: "128 px/deg MOLA Topographic Precision Grid",
            portalUrl: "https://pds-geosciences.wustl.edu/missions/mgs/mola.html",
            badgeClass: "bg-[#4A1D13]/40 border-[#D67051]/60 text-[#D67051]",
            description:
                "Precision laser altimeter and orbital data records documenting Martian geomorphology and landing site slopes.",
        });
    }

    // CSA RADARSAT Constellation & RADARSAT-1.
    const isPolarOrCryo =
        country.includes("canada") ||
        country.includes("norway") ||
        country.includes("antarctica") ||
        country.includes("greenland") ||
        country.includes("iceland") ||
        name.includes("devon") ||
        name.includes("axel") ||
        name.includes("haughton") ||
        name.includes("svalbard") ||
        name.includes("mcmurdo") ||
        climate.includes("polar") ||
        climate.includes("subarctic") ||
        climate.includes("ice") ||
        terrain.includes("ice") ||
        terrain.includes("glacier") ||
        terrain.includes("permafrost") ||
        Math.abs(lat) > 55;

    if (isPolarOrCryo) {
        datasets.push({
            agency: "CSA",
            agencyFullName: "Canadian Space Agency / Agence spatiale canadienne",
            name: "CSA RADARSAT Constellation Mission (RCM) & RADARSAT-1",
            parameter: "C-Band Synthetic Aperture Radar (SAR Cryosphere & Surface Roughness)",
            resolution: "1m – 100m Multi-Polarization All-Weather C-Band Radar",
            portalUrl: "https://donnees-data.asc-csa.gc.ca/en/dataset/rcm",
            badgeClass: "bg-[#451818]/40 border-[#EF4444]/60 text-[#FCA5A5]",
            description:
                "Open CSA SAR satellite constellation tracking sub-surface permafrost, glacial ice flow, and polar regolith roughness.",
        });
    }

    // ESA Copernicus Open Science Data.
    const isEsaRegion =
        country.includes("spain") ||
        country.includes("iceland") ||
        country.includes("italy") ||
        country.includes("ethiopia") ||
        country.includes("oman") ||
        country.includes("jordan") ||
        country.includes("namibia") ||
        country.includes("algeria") ||
        country.includes("egypt") ||
        name.includes("lanzarote") ||
        name.includes("tinto") ||
        name.includes("danakil") ||
        terrain.includes("volcanic") ||
        terrain.includes("basalt") ||
        terrain.includes("crater") ||
        terrain.includes("iron") ||
        terrain.includes("acid");

    if (isEsaRegion) {
        datasets.push({
            agency: "ESA",
            agencyFullName: "European Space Agency",
            name: "ESA Copernicus Sentinel-1 (C-SAR) & Sentinel-2 (MSI)",
            parameter: "Multispectral Regolith Reflectance & C-Band Surface Roughness",
            resolution: "10m Multispectral Bands / 5m SAR Interferometry",
            portalUrl: "https://dataspace.copernicus.eu/",
            badgeClass: "bg-[#1E1B4B]/40 border-[#6366F1]/60 text-[#A5B4FC]",
            description:
                "Copernicus constellation providing calibrated 13-band multispectral mineralogy and radar backscatter for volcanic analogs.",
        });
    }

    // JAXA G-Portal.
    const isJaxaRegion =
        country.includes("china") ||
        country.includes("tibet") ||
        country.includes("mongolia") ||
        country.includes("japan") ||
        country.includes("chile") ||
        country.includes("argentina") ||
        country.includes("united states") ||
        name.includes("qaidam") ||
        name.includes("badain") ||
        name.includes("pamir") ||
        name.includes("gobi") ||
        name.includes("atacama") ||
        name.includes("mauna kea") ||
        terrain.includes("dune") ||
        terrain.includes("sandy") ||
        terrain.includes("plateau");

    if (isJaxaRegion) {
        datasets.push({
            agency: "JAXA",
            agencyFullName: "Japan Aerospace Exploration Agency",
            name: "JAXA G-Portal (ALOS PALSAR & GCOM-C Cryosphere)",
            parameter: "L-Band Polarimetric Radar Penetration & Ocean/Land Color",
            resolution: "10m L-Band Penetrating SAR / 250m Cryosphere Grid",
            portalUrl: "https://gportal.jaxa.jp/gpr/index/index",
            badgeClass: "bg-[#3B1F4B]/40 border-[#A855F7]/60 text-[#D8B4FE]",
            description:
                "JAXA orbital PALSAR L-band radar penetrating hyper-arid sand sheets to map buried planetary bedrock and paleochannels.",
        });
    }

    return datasets;
};
