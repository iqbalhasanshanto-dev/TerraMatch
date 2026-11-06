import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';

// ==========================================
// 1. Environment & Configuration Setup
// ==========================================

// Automatically load environment variables from .env if supported by Node runtime
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch {
    // If .env file is missing, fallback to defaults or system environment variables
  }
}

const app = express();
const port = process.env.PORT || 3000;

// Middleware configuration
app.use(cors());
app.use(express.json());

// MongoDB connection string loaded strictly from environment variables
const mongoUri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || "TerraMatch";

if (!mongoUri) {
  console.error("CRITICAL CONFIGURATION ERROR: MONGODB_URI is not set in server/.env");
  process.exit(1);
}

const client = new MongoClient(mongoUri);

// Database and Collection references
let db;
let modelCollection;
let recentSearches;
let savedLocs;

// ==========================================
// 2. Database Connection Function
// ==========================================
export async function connectToMongoDB() {
  try {
    await client.connect();

    db = client.db(dbName);
    modelCollection = db.collection('Location');
    recentSearches = db.collection('RecentSearches');
    savedLocs = db.collection('Saved');

    console.log(`Connected successfully to MongoDB Database: "${dbName}"`);
    return client;
  } catch (err) {
    console.error("MongoDB connection error:", err);
    throw err;
  }
}

// Graceful disconnection helper
export async function disconnectFromMongoDB() {
  try {
    await client.close();
    console.log("Disconnected from MongoDB.");
  } catch (err) {
    console.error("Error closing MongoDB connection:", err);
  }
}

// Helper to convert string ID to MongoDB ObjectId safely
const toMongoId = (id) => {
  try {
    return ObjectId.isValid(id) ? new ObjectId(id) : id;
  } catch {
    return id;
  }
};

// ==========================================
// 3. API Routes: Locations
// ==========================================

// GET /location - Fetch all candidate analog locations
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

// ==========================================
// 4. API Routes: Recent Searches
// ==========================================

// POST /recent-searches - Record a new recent search item
app.post('/recent-searches', async (req, res) => {
  try {
    const data = req.body;
    const result = await recentSearches.insertOne(data);
    res.status(201).send({
      success: true,
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
      .sort({ created_at: -1 })
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
        { _id: id }
      ]
    };

    const result = await recentSearches.deleteOne(filter);
    res.send({
      success: true,
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
      result
    });
  } catch (error) {
    console.error("Error clearing user recent searches:", error);
    res.status(500).send({ success: false, message: "Failed to clear recent searches", error: error.message });
  }
});

// ==========================================
// 5. API Routes: Saved Locations
// ==========================
// POST /savedLocs - Save a candidate location to the user's saved list
app.post('/savedLocs', async (req, res) => {
  try {
    const data = req.body;
    const result = await savedLocs.insertOne(data);
    res.status(201).send({
      success: true,
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
      .sort({ created_at: -1 })
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
        { _id: id }
      ]
    };

    const result = await savedLocs.deleteOne(filter);
    res.send({
      success: true,
      result
    });
  } catch (error) {
    console.error("Error deleting saved location:", error);
    res.status(500).send({ success: false, message: "Failed to delete saved location", error: error.message });
  }
});

// ==========================================
// 6. Root & Health Check Endpoints
// ==========================================
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

// ==========================================
// 7. Server Initialization
// ==========================================
async function startServer() {
  try {
    await connectToMongoDB();

    app.listen(port, () => {
      console.log(`TerraMatch backend server is running on port ${port}`);
    });
  } catch (err) {
    console.error("Failed to start server due to database connection error:", err);
  }
}

startServer();
