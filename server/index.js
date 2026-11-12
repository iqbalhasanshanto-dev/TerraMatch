import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ============================================================================
// 1. Environment & Path Resolution Setup
// ============================================================================
// Resolve directory paths for ES modules to locate local JSON seeds and env files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Automatically load environment variables from server/.env if supported by runtime
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(path.resolve(__dirname, '.env'));
  } catch {
    try {
      process.loadEnvFile();
    } catch {
      // Fallback to existing environment variables if .env file is omitted
    }
  }
}

// Initialize Express application instance
const app = express();
// Default port 3000 or custom port from environment
const port = process.env.PORT || 3000;

// Enable Cross-Origin Resource Sharing (CORS) for all client requests
app.use(cors());
// Parse incoming JSON payloads with body-parser
app.use(express.json());

// MongoDB connection string loaded strictly from server/.env
const mongoUri = process.env.MONGODB_URI;
// Target database name in MongoDB Atlas
const dbName = process.env.DB_NAME || "TerraMatch";

if (!mongoUri) {
  console.error("CRITICAL: MONGODB_URI is not defined in server/.env");
  process.exit(1);
}

// MongoClient client instance with connection pooling
const client = new MongoClient(mongoUri);

// ============================================================================
// 2. Global Database & Collection References
// ============================================================================
// Database instance handle
let db;
// 1. Location Collection: 50 base planetary analog locations
let modelCollection;
// 2. RecentSearches Collection: user search and exploration history
let recentSearches;
// 3. Saved Collection: user bookmarked candidate analog locations
let savedLocs;
// 4. DataSources Collection: curated planetary mission archives & DEM sources
let dataSourcesCollection;

// ============================================================================
// 3. Curated Planetary Mission Archives (Official 10-Dataset Seed Catalog)
// ============================================================================
// Legacy placeholder seed IDs superseded by the official NASA Earthdata & PDS catalog
const LEGACY_DATA_SOURCE_IDS = [
  "hirise-crism",
  "srtm-elevation",
  "mro-sharad",
  "sentinel-2",
  "kaguya-selene",
  "usgs-astrogeology",
];

// The 10 official NASA Earthdata, Moon PDS, and Mars PDS planetary archives
// used for initial MongoDB seeding and catalog synchronization
const INITIAL_PLANETARY_ARCHIVES = [
  // --------------------------------------------------------------------------
  // Earth Datasets (Category: "earth") — NASA Earthdata
  // --------------------------------------------------------------------------
  {
    id: "nasadem",
    name: "NASADEM (NASA Digital Elevation Model)",
    provider: "NASA Earthdata",
    targetBody: "Earth",
    category: "earth",
    dataTypes: ["Elevation & Slope", "Topographic DEM"],
    resolution: "30 m/px (1 arc-sec)",
    volumeGigabytes: 1200,
    volumeDisplay: "1.2 TB",
    status: "Live & Synced",
    feed: true,
    portalUrl: "https://search.earthdata.nasa.gov/search?q=NASADEM",
    description: "Reprocessed global SRTM radar elevation and slope dataset providing high-accuracy terrain relief for Earth analog site characterization.",
    created_at: new Date()
  },
  {
    id: "modis-mod11",
    name: "MODIS Land Surface Temperature (MOD11)",
    provider: "NASA Earthdata",
    targetBody: "Earth",
    category: "earth",
    dataTypes: ["Thermal & Temperature", "Land Surface Temp"],
    resolution: "1 km Daily / 8-Day",
    volumeGigabytes: 1850,
    volumeDisplay: "1.85 TB",
    status: "Live & Synced",
    feed: true,
    portalUrl: "https://search.earthdata.nasa.gov/search?q=MODIS%20Land%20Surface%20Temperature",
    description: "Terra and Aqua MODIS thermal infrared land surface temperature and emissivity observations benchmarking diurnal thermal extremes.",
    created_at: new Date()
  },
  {
    id: "smap-l3",
    name: "SMAP L3 Soil Moisture",
    provider: "NASA Earthdata",
    targetBody: "Earth",
    category: "earth",
    dataTypes: ["Soil Moisture & Aridity", "L-Band Radiometry"],
    resolution: "36 km / 9 km Daily",
    volumeGigabytes: 640,
    volumeDisplay: "640 GB",
    status: "Live & Synced",
    feed: true,
    portalUrl: "https://search.earthdata.nasa.gov/search?q=SMAP%20L3%20Soil%20Moisture",
    description: "Soil Moisture Active Passive L-band radiometer volumetric soil moisture retrievals quantifying hyper-arid desert desiccation.",
    created_at: new Date()
  },
  {
    id: "gpm-imerg",
    name: "GPM IMERG Precipitation",
    provider: "NASA Earthdata",
    targetBody: "Earth",
    category: "earth",
    dataTypes: ["Rainfall & Moisture", "Multi-Satellite Precip"],
    resolution: "0.1° (~10 km) Half-Hourly",
    volumeGigabytes: 1450,
    volumeDisplay: "1.45 TB",
    status: "Live & Synced",
    feed: true,
    portalUrl: "https://search.earthdata.nasa.gov/search?q=GPM%20IMERG",
    description: "Integrated Multi-satellitE Retrievals for GPM delivering global precipitation rates to evaluate hydrologic weathering analog limits.",
    created_at: new Date()
  },
  {
    id: "modis-mod09",
    name: "MODIS Surface Reflectance (MOD09)",
    provider: "NASA Earthdata",
    targetBody: "Earth",
    category: "earth",
    dataTypes: ["Surface Albedo & Characteristics", "Multispectral"],
    resolution: "250 m - 500 m",
    volumeGigabytes: 2100,
    volumeDisplay: "2.1 TB",
    status: "Live & Synced",
    feed: true,
    portalUrl: "https://search.earthdata.nasa.gov/search?q=MODIS%20Surface%20Reflectance",
    description: "Atmospherically corrected multispectral surface reflectance and albedo characteristics across barren regolith and basaltic testbeds.",
    created_at: new Date()
  },

  // --------------------------------------------------------------------------
  // Moon Datasets (Category: "moon") — NASA PDS Lunar Archives
  // --------------------------------------------------------------------------
  {
    id: "lro-lola",
    name: "LRO LOLA Lunar Elevation (LRO-L-LOLA-4-GDR-V1.0)",
    provider: "NASA PDS / WUSTL",
    targetBody: "Moon",
    category: "moon",
    dataTypes: ["Lunar Topography & DEM", "Laser Altimetry"],
    resolution: "5 m/px Polar / 118 m Global",
    volumeGigabytes: 820,
    volumeDisplay: "820 GB",
    status: "Live & Synced",
    feed: true,
    portalUrl: "https://pds.nasa.gov/ds-view/pds/viewDataset.jsp?dsid=LRO-L-LOLA-4-GDR-V1.0",
    description: "Lunar Reconnaissance Orbiter Laser Altimeter gridded data records mapping crater slopes, permanently shadowed regions, and polar relief.",
    created_at: new Date()
  },
  {
    id: "lro-diviner",
    name: "LRO Diviner Lunar Radiometer (LRO-L-DLRE-4-RDR-V1.0)",
    provider: "NASA PDS / UCLA",
    targetBody: "Moon",
    category: "moon",
    dataTypes: ["Lunar Surface Temperature", "Thermal Radiometry"],
    resolution: "128 px/deg (~237 m)",
    volumeGigabytes: 960,
    volumeDisplay: "960 GB",
    status: "Live & Synced",
    feed: true,
    portalUrl: "https://data.nasa.gov/dataset/?q=LRO-L-DLRE-4-RDR-V1.0",
    description: "Nine-channel infrared radiometer measuring lunar diurnal bolometric brightness temperatures from equatorial noon to cryogenic polar traps.",
    created_at: new Date()
  },
  {
    id: "ch1-m3",
    name: "Chandrayaan-1 Moon Mineralogy Mapper (urn:nasa:pds:ch1_m3)",
    provider: "NASA PDS / ISRO",
    targetBody: "Moon",
    category: "moon",
    dataTypes: ["Lunar Mineralogy & OH/Water", "Imaging Spectroscopy"],
    resolution: "140 m/px (85-260 Spectral Bands)",
    volumeGigabytes: 740,
    volumeDisplay: "740 GB",
    status: "Live & Synced",
    feed: true,
    portalUrl: "https://pds.nasa.gov/ds-view/pds/viewBundle.jsp?identifier=urn:nasa:pds:ch1_m3",
    description: "Visible-to-near-infrared imaging spectrometer bundle identifying highland anorthosite, mare basalt, and polar OH/H2O absorption features.",
    created_at: new Date()
  },

  // --------------------------------------------------------------------------
  // Mars Datasets (Category: "mars") — NASA PDS Geosciences / GSFC
  // --------------------------------------------------------------------------
  {
    id: "mars-ode",
    name: "Mars Orbital Data Explorer (ODE)",
    provider: "NASA PDS Geosciences / WUSTL",
    targetBody: "Mars",
    category: "mars",
    dataTypes: ["Mars Orbital Map & Mission Archive", "PDS Query Index"],
    resolution: "Multi-Instrument Coverage",
    volumeGigabytes: 2800,
    volumeDisplay: "2.8 TB",
    status: "Live & Synced",
    feed: true,
    portalUrl: "https://ode.rsl.wustl.edu/mars/mapsearch",
    description: "Integrated PDS Geosciences Node spatial search portal indexing MRO HiRISE, CRISM, CTX, Mars Express, and Viking orbital observations.",
    created_at: new Date()
  },
  {
    id: "mgs-mola",
    name: "Mars Global Surveyor MOLA (MGS MOLA)",
    provider: "NASA PDS / GSFC",
    targetBody: "Mars",
    category: "mars",
    dataTypes: ["Mars Elevation & Slope Profiles", "Laser Altimetry"],
    resolution: "128 px/deg (463 m)",
    volumeGigabytes: 1400,
    volumeDisplay: "1.4 TB",
    status: "Live & Synced",
    feed: true,
    portalUrl: "https://pds-geosciences.wustl.edu/missions/mgs/mola.html",
    description: "Mars Orbiter Laser Altimeter precision global topographic datum and slope profiles used as the reference elevation baseline for Martian analogs.",
    created_at: new Date()
  }
];

// ============================================================================
// 4. Database Connection & Auto-Seeding Handler
// ============================================================================
export async function connectToMongoDB() {
  try {
    await client.connect();

    // Select the TerraMatch database
    db = client.db(dbName);

    // Initialize all 4 MongoDB collections
    modelCollection = db.collection('Location');
    recentSearches = db.collection('RecentSearches');
    savedLocs = db.collection('Saved');
    dataSourcesCollection = db.collection('DataSources');

    console.log(`Connected successfully to MongoDB Database: "${dbName}"`);

    // ------------------------------------------------------------------------
    // Shared Helper & Auto-Seeding Collection 1: Location Collection (50 sites)
    // ------------------------------------------------------------------------
    // Resolves candidate paths to public/analogLocations.json, clears any stale
    // Location documents, and inserts the enriched scientific dataset.
    async function reseedLocationCollection() {
      // Candidate filesystem paths covering local dev, cwd, and built dist assets
      const candidatePaths = [
        path.resolve(__dirname, '../public/analogLocations.json'),
        path.resolve(process.cwd(), 'public/analogLocations.json'),
        path.resolve(__dirname, '../dist/analogLocations.json'),
      ];
      const jsonPath = candidatePaths.find((candidate) => fs.existsSync(candidate));

      if (!jsonPath) {
        console.warn("Seed file 'analogLocations.json' not found at resolved paths.");
        return { seeded: false, insertedCount: 0, message: "Seed file 'analogLocations.json' not found." };
      }

      const rawJson = fs.readFileSync(jsonPath, 'utf8');
      const parsed = JSON.parse(rawJson);
      const locationsToSeed = Array.isArray(parsed.locations) ? parsed.locations : [];

      if (locationsToSeed.length === 0) {
        return { seeded: false, insertedCount: 0, message: "No locations found in analogLocations.json." };
      }

      // Remove legacy documents first so stale similarityScore records do not persist
      await modelCollection.deleteMany({});
      const insertResult = await modelCollection.insertMany(locationsToSeed);
      console.log(`Seeded ${insertResult.insertedCount} enriched analog locations into 'Location' collection.`);
      return {
        seeded: true,
        insertedCount: insertResult.insertedCount,
        message: `Successfully reseeded ${insertResult.insertedCount} analog locations.`,
      };
    }

    // Store reseed helper on app.locals so POST /location/reseed shares identical logic
    app.locals.reseedLocationCollection = reseedLocationCollection;

    const locationCount = await modelCollection.countDocuments();
    const firstLocation = locationCount > 0 ? await modelCollection.findOne({}) : null;
    // Detect legacy MongoDB documents missing enriched scientific fields
    const needsEnrichmentReseed =
      locationCount === 0 ||
      !firstLocation?.roversTested ||
      typeof firstLocation?.temperature !== 'number';

    if (needsEnrichmentReseed) {
      const reason = locationCount === 0
        ? "Location collection is empty."
        : "Legacy Location schema detected (missing roversTested or numeric temperature).";
      console.log(`${reason} Running enriched auto-seeding from analogLocations.json...`);
      await reseedLocationCollection();
    } else {
      console.log(`'Location' collection active with ${locationCount} enriched documents.`);
    }

    // ------------------------------------------------------------------------
    // Auto-Seeding Collection 2: DataSources Collection (10 official archives)
    // ------------------------------------------------------------------------
    // Detect empty collection, legacy placeholder seed items, or missing portalUrl
    // fields so existing MongoDB instances upgrade cleanly to the 10 official
    // NASA Earthdata / Moon PDS / Mars PDS datasets without erasing custom sources.
    const dataSourcesCount = await dataSourcesCollection.countDocuments();
    const hasLegacySeedDocs =
      dataSourcesCount > 0 &&
      (await dataSourcesCollection.countDocuments({
        $or: [
          { id: { $in: LEGACY_DATA_SOURCE_IDS } },
          { portalUrl: { $exists: false }, id: { $in: INITIAL_PLANETARY_ARCHIVES.map((d) => d.id) } },
        ],
      })) > 0;
    const officialCount = await dataSourcesCollection.countDocuments({
      id: { $in: INITIAL_PLANETARY_ARCHIVES.map((d) => d.id) },
    });

    if (dataSourcesCount === 0) {
      console.log("DataSources collection is empty. Auto-seeding 10 official NASA/PDS planetary archives...");
      const insertArchivesResult = await dataSourcesCollection.insertMany(INITIAL_PLANETARY_ARCHIVES);
      console.log(`Auto-seeded ${insertArchivesResult.insertedCount} planetary datasets into 'DataSources'.`);
    } else if (hasLegacySeedDocs || officialCount < INITIAL_PLANETARY_ARCHIVES.length) {
      console.log("Synchronizing 'DataSources' collection with the 10 official NASA/PDS datasets...");
      // Remove legacy placeholder seed documents while keeping custom user sources intact
      await dataSourcesCollection.deleteMany({ id: { $in: LEGACY_DATA_SOURCE_IDS } });
      // Upsert each of the 10 official datasets by canonical `id`
      for (const archive of INITIAL_PLANETARY_ARCHIVES) {
        await dataSourcesCollection.updateOne(
          { id: archive.id },
          { $set: archive },
          { upsert: true }
        );
      }
      console.log("Synchronized all 10 official planetary datasets into 'DataSources'.");
    } else {
      console.log(`'DataSources' collection active with ${dataSourcesCount} documents.`);
    }

    return client;
  } catch (err) {
    console.error("MongoDB connection or auto-seeding error:", err);
    throw err;
  }
}

// Graceful disconnection helper for tests and shutdown signals
export async function disconnectFromMongoDB() {
  try {
    await client.close();
    console.log("Disconnected from MongoDB.");
  } catch (err) {
    console.error("Error closing MongoDB connection:", err);
  }
}

// Helper to convert string ID to MongoDB ObjectId safely without crashing
const toMongoId = (id) => {
  try {
    return ObjectId.isValid(id) ? new ObjectId(id) : id;
  } catch {
    return id;
  }
};

// ============================================================================
// 5. API Routes: Locations Collection
// ============================================================================

// GET /location - Fetch all candidate planetary analog locations
app.get('/location', async (req, res) => {
  try {
    const result = await modelCollection.find().toArray();
    res.send(result);
  } catch (error) {
    console.error("Error fetching locations:", error);
    res.status(500).send({ success: false, message: "Failed to fetch locations", error: error.message });
  }
});

// Case-insensitive alias for backward compatibility
app.get('/Location', async (req, res) => {
  try {
    const result = await modelCollection.find().toArray();
    res.send(result);
  } catch (error) {
    console.error("Error fetching locations:", error);
    res.status(500).send({ success: false, message: "Failed to fetch locations", error: error.message });
  }
});

// POST /location/reseed - Manually refresh Location collection from analogLocations.json
app.post('/location/reseed', async (req, res) => {
  try {
    if (typeof app.locals.reseedLocationCollection !== 'function') {
      return res.status(503).send({
        success: false,
        message: "Database not initialized yet; reseed helper unavailable.",
      });
    }
    const result = await app.locals.reseedLocationCollection();
    if (!result.seeded) {
      return res.status(404).send({
        success: false,
        message: result.message,
        count: 0,
      });
    }
    res.send({
      success: true,
      message: result.message,
      count: result.insertedCount,
    });
  } catch (error) {
    console.error("Error reseeding locations:", error);
    res.status(500).send({ success: false, message: "Failed to reseed locations", error: error.message });
  }
});

// ============================================================================
// 6. API Routes: Recent Searches Collection
// ============================================================================

// POST /recent-searches - Record or update a recent search item (prevents duplicate entries)
app.post('/recent-searches', async (req, res) => {
  try {
    // Strip incoming _id from request body to prevent immutable field or duplicate key error
    const { _id, ...cleanData } = req.body;

    // Validate payload and format data document
    const data = {
      ...cleanData,
      locationId: cleanData.locationId || _id || cleanData.id,
      created_at: cleanData.created_at ? new Date(cleanData.created_at) : new Date(),
      updated_at: new Date()
    };

    // Match criteria: same user and location name
    const filter = {
      created_by: data.created_by,
      name: data.name
    };

    // Upsert entry: update timestamp and metadata if exists, otherwise insert cleanly
    const result = await recentSearches.updateOne(
      filter,
      { $set: data },
      { upsert: true }
    );

    res.status(200).send({
      success: true,
      message: "Recent search updated/upserted successfully",
      result
    });
  } catch (error) {
    console.error("Error saving recent search:", error);
    res.status(500).send({ success: false, message: "Failed to save recent search", error: error.message });
  }
});

// GET /recent-searches/:email - Fetch recent searches for a specific user ordered by latest first
app.get('/recent-searches/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const result = await recentSearches
      .find({ created_by: email })
      .sort({ updated_at: -1, created_at: -1 })
      .toArray();
    res.send(result);
  } catch (error) {
    console.error("Error fetching recent searches:", error);
    res.status(500).send({ success: false, message: "Failed to fetch recent searches", error: error.message });
  }
});

// DELETE /recent-searches/:id - Delete a specific recent search item by its ID (ObjectId or string)
app.delete('/recent-searches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const filter = {
      $or: [
        { _id: toMongoId(id) },
        { _id: id },
        { locationId: id }
      ]
    };

    const result = await recentSearches.deleteOne(filter);
    res.send({
      success: true,
      message: "Recent search removed",
      result
    });
  } catch (error) {
    console.error("Error deleting recent search item:", error);
    res.status(500).send({ success: false, message: "Failed to delete recent search", error: error.message });
  }
});

// DELETE /recent-searches/user/:email - Clear all recent searches for a given user
app.delete('/recent-searches/user/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const result = await recentSearches.deleteMany({ created_by: email });
    res.send({
      success: true,
      message: "All recent searches cleared for user",
      result
    });
  } catch (error) {
    console.error("Error clearing user recent searches:", error);
    res.status(500).send({ success: false, message: "Failed to clear recent searches", error: error.message });
  }
});

// ============================================================================
// 7. API Routes: Saved Locations Collection
// ============================================================================

// POST /savedLocs - Save or update a candidate analog location for a user
app.post('/savedLocs', async (req, res) => {
  try {
    // Strip incoming _id from request body to prevent immutable field or duplicate key error
    const { _id, ...cleanData } = req.body;

    // Preserve original location identifier in locationId field
    const data = {
      ...cleanData,
      locationId: cleanData.locationId || _id || cleanData.id,
      created_at: cleanData.created_at ? new Date(cleanData.created_at) : new Date(),
      updated_at: new Date()
    };

    // Unique compound filter for user and location name to avoid duplicates
    const filter = {
      created_by: data.created_by,
      name: data.name
    };

    // Upsert into Saved collection
    const result = await savedLocs.updateOne(
      filter,
      { $set: data },
      { upsert: true }
    );

    res.status(200).send({
      success: true,
      message: "Location saved/upserted successfully",
      result
    });
  } catch (error) {
    console.error("Error saving location:", error);
    res.status(500).send({ success: false, message: "Failed to save location", error: error.message });
  }
});

// GET /savedLocs/:email - Get all saved locations for a specific user ordered by latest first
app.get('/savedLocs/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const result = await savedLocs
      .find({ created_by: email })
      .sort({ updated_at: -1, created_at: -1 })
      .toArray();
    res.send(result);
  } catch (error) {
    console.error("Error fetching saved locations:", error);
    res.status(500).send({ success: false, message: "Failed to fetch saved locations", error: error.message });
  }
});

// DELETE /savedLocs/:id - Delete a saved location by its ID (ObjectId or string)
app.delete('/savedLocs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const filter = {
      $or: [
        { _id: toMongoId(id) },
        { _id: id },
        { locationId: id }
      ]
    };

    const result = await savedLocs.deleteOne(filter);
    res.send({
      success: true,
      message: "Saved location removed",
      result
    });
  } catch (error) {
    console.error("Error deleting saved location:", error);
    res.status(500).send({ success: false, message: "Failed to delete saved location", error: error.message });
  }
});

// ============================================================================
// 8. API Routes: DataSources Collection (Planetary Datasets)
// ============================================================================

// GET /data-sources - Fetch all planetary datasets and mission archives from MongoDB
app.get('/data-sources', async (req, res) => {
  try {
    const result = await dataSourcesCollection.find().toArray();
    res.send(result);
  } catch (error) {
    console.error("Error fetching data sources:", error);
    res.status(500).send({ success: false, message: "Failed to fetch data sources", error: error.message });
  }
});

// POST /data-sources - Register a new custom planetary archive source
app.post('/data-sources', async (req, res) => {
  try {
    const body = req.body;
    const targetBody = body.targetBody || "Mars";
    
    // Construct standardized dataset document
    const newSource = {
      name: body.name,
      provider: body.provider || "Custom Ingestion Provider",
      targetBody: targetBody,
      category: body.category || targetBody.toLowerCase(),
      dataTypes: Array.isArray(body.dataTypes) && body.dataTypes.length > 0 
        ? body.dataTypes 
        : ["Orbital Telemetry", "Planetary DEM"],
      resolution: body.resolution || "Variable / High-Res",
      volumeGigabytes: Number(body.volumeGigabytes) || 250,
      volumeDisplay: body.volumeDisplay || "250 GB",
      status: body.status || "Live & Synced",
      feed: body.feed !== undefined ? Boolean(body.feed) : true,
      description: body.description || `User-connected planetary archive for ${targetBody} exploration via ${body.endpoint || "direct STAC feed"}.`,
      endpoint: body.endpoint || "",
      portalUrl: body.portalUrl || body.endpoint || "",
      created_at: new Date()
    };

    const result = await dataSourcesCollection.insertOne(newSource);
    res.status(201).send({
      success: true,
      message: "Custom data source connected successfully",
      insertedId: result.insertedId,
      data: { ...newSource, _id: result.insertedId }
    });
  } catch (error) {
    console.error("Error creating custom data source:", error);
    res.status(500).send({ success: false, message: "Failed to create data source", error: error.message });
  }
});

// DELETE /data-sources/:id - Remove a data source document by its ID
app.delete('/data-sources/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const filter = {
      $or: [
        { _id: toMongoId(id) },
        { _id: id },
        { id: id }
      ]
    };

    const result = await dataSourcesCollection.deleteOne(filter);
    res.send({
      success: true,
      message: "Data source deleted successfully",
      result
    });
  } catch (error) {
    console.error("Error deleting data source:", error);
    res.status(500).send({ success: false, message: "Failed to delete data source", error: error.message });
  }
});

// ============================================================================
// 9. Root & Health Check Endpoints
// ============================================================================
app.get('/', (req, res) => {
  res.send({
    status: "ok",
    service: "TerraMatch API Server",
    version: "1.0.0"
  });
});

app.get('/health', (req, res) => {
  res.send({
    status: "healthy",
    database: db ? "connected" : "disconnected",
    uptime: process.uptime()
  });
});

// ============================================================================
// 10. Server Initialization Routine
// ============================================================================
async function startServer() {
  try {
    // Connect to database and seed baseline collections
    await connectToMongoDB();

    // Start Express HTTP listener
    app.listen(port, () => {
      console.log(`TerraMatch backend server is running on port ${port}`);
    });
  } catch (err) {
    console.error("Failed to start server due to database connection error:", err);
  }
}

startServer();
