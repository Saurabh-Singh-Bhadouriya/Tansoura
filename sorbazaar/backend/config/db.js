require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { MongoClient, ObjectId } = require('mongodb');

let client = null;
let db = null;

// Credentials never printed. Connection string read from env only.
const DB_URL = process.env.DATABASE_URL || process.env.MONGODB_URI || '';

async function connectDB() {
  if (client && db) return db;

  if (!DB_URL) {
    throw new Error('MongoDB connection string missing. Set DATABASE_URL/MONGODB_URI in backend/.env');
  }
  if (!DB_URL.startsWith('mongodb')) {
    throw new Error('DATABASE_URL must start with mongodb:// or mongodb+srv://');
  }

  client = new MongoClient(DB_URL, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    retryWrites: true,
  });

  await client.connect();
  db = client.db(); // db name from URI path (e.g. /sorbazaar) or default
  console.log('MongoDB connected successfully');
  return db;
}

function getDB() {
  if (!db) throw new Error('Database not connected. Call connectDB() first.');
  return db;
}

function getClient() {
  return client;
}

async function disconnectDB() {
  if (client) await client.close();
  client = null;
  db = null;
}

// Convert a string id (from routes) to Mongo ObjectId when valid.
function toId(id) {
  if (id === undefined || id === null) return id;
  const s = String(id);
  if (ObjectId.isValid(s) && s.length === 24 && /^[a-f0-9]{24}$/i.test(s)) return new ObjectId(s);
  return s;
}

// Convert a Mongo doc to the API shape: _id => id (string), drop nothing else.
function toApiDoc(doc) {
  if (!doc) return doc;
  const d = { ...doc };
  if (d._id) d.id = String(d._id);
  delete d._id;
  return d;
}

function toApiDocs(docs) { return docs.map(toApiDoc); }

// Pick only the requested fields incl. nested (select: { key: true }).
function pickFields(doc, select) {
  if (!doc || !select) return doc;
  const out = {};
  for (const key of Object.keys(select || {})) {
    if (select[key] === true && key in doc) out[key] = doc[key];
  }
  return out;
}

module.exports = { connectDB, getDB, getClient, disconnectDB, toId, toApiDoc, toApiDocs, pickFields, ObjectId };
