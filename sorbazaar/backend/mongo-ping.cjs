require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const uri = process.env.DATABASE_URL || process.env.MONGODB_URI || '';

async function main() {
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 8000,
      appName: 'Cluster0'
    });
    await client.connect();
    const db = client.db();
    await db.command({ ping: 1 });
    console.log('MONGO_PING_OK: MongoDB Atlas is reachable');
    console.log('DB_NAME:', db.databaseName || '(default)');
    await client.close();
    process.exit(0);
  } catch (e) {
    console.log('MONGO_PING_FAIL:', e.message.split('\n')[0]);
    process.exit(1);
  }
}

main();