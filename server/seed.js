import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables if supported
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch {}
}

const mongoUri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'TerraMatch';

if (!mongoUri) {
  console.error('CRITICAL: MONGODB_URI not found in server/.env');
  process.exit(1);
}

async function seedData() {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log(`Connected to MongoDB Atlas: ${dbName}`);

    const db = client.db(dbName);
    const collection = db.collection('Location');

    // Read analogLocations.json
    const jsonPath = path.resolve(__dirname, '../dist/analogLocations.json');
    if (!fs.existsSync(jsonPath)) {
      console.error(`Cannot find seed data file at: ${jsonPath}`);
      process.exit(1);
    }

    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const parsed = JSON.parse(rawData);
    const locations = parsed.locations || [];

    if (locations.length === 0) {
      console.log('No locations found in file to seed.');
      return;
    }

    // Check existing count
    const existingCount = await collection.countDocuments();
    if (existingCount > 0) {
      console.log(`Location collection already has ${existingCount} documents.`);
    } else {
      const result = await collection.insertMany(locations);
      console.log(`Successfully seeded ${result.insertedCount} planetary analog locations!`);
    }

  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed.');
  }
}

seedData();
