// Run this script manually once OR ensure it runs on app startup to create MongoDB indexes
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const Product = require('./models/Product');

async function createIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      family: 4,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      retryWrites: true,
      w: 'majority'
    });

    console.log('Connected to MongoDB. Creating indexes...');
    
    const indexes = [
      { key: { navPage: 1, published: 1, status: 1, createdAt: -1 }, name: 'nav_pub_stat_created_idx' },
      { key: { productCategory: 1, published: 1, status: 1 }, name: 'cat_pub_stat_idx' },
      { key: { published: 1, status: 1, createdAt: -1 }, name: 'pub_stat_created_idx' },
      { key: { handle: 1 }, name: 'handle_idx', unique: true, sparse: true },
      { key: { badge: 1, published: 1, status: 1 }, name: 'badge_pub_stat_idx' },
      { key: { featured: 1, published: 1, status: 1 }, name: 'featured_pub_stat_idx' },
      { key: { isFeatured: 1, published: 1, status: 1 }, name: 'isfeatured_pub_stat_idx' },
      { key: { createdAt: -1 }, name: 'created_idx' }
    ];

    for (const idx of indexes) {
      try {
        await Product.collection.createIndex(idx.key, {
          name: idx.name,
          unique: idx.unique || false,
          sparse: idx.sparse || false,
          background: true
        });
        console.log(`✓ Created index: ${idx.name}`);
      } catch (err) {
        if (err.code === 85) {
          console.log(`= Index ${idx.name} already exists`);
        } else {
          console.error(`✗ Error creating index ${idx.name}:`, err.message);
        }
      }
    }

    console.log('\n✓ Index creation complete');
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

createIndexes();