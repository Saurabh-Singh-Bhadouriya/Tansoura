const express = require('express');
const Product = require('../models/Product');
const { auth, adminAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { importFromCSV, getExportHeaders, productToExportRow } = require('../utils/importExport');
const { cacheProducts, invalidateProductCache } = require('../middleware/cache');

const router = express.Router();

// Helper to normalize product query filters for user-facing endpoints
function buildUserFilter(query) {
  const { navPage, category, subcategory, search, priceRange, featured } = query;
  
  // Match published: true (boolean) OR published: 'true' (string) to handle data inconsistencies
  // Also match if published field is missing entirely
  const filter = {
    published: { $ne: false },
    status: { $nin: ['draft', 'archived'] }
  };
  const orConditions = [];
  const andConditions = [];

  // Nav page filter
  if (navPage && navPage !== 'home') {
    filter.navPage = navPage;
  } else if (navPage === 'home') {
    filter.navPage = 'home';
  }
  
  if (category && category !== navPage) {
    orConditions.push({ productCategory: new RegExp(category.replace(/-/g, '[- ]?'), 'i') });
  }
  
  if (subcategory) {
    andConditions.push({ type: new RegExp(subcategory, 'i') });
  }
  if (search) {
    andConditions.push({
      $or: [
        { title: new RegExp(search, 'i') },
        { tags: new RegExp(search, 'i') },
        { vendor: new RegExp(search, 'i') },
        { bodyHtml: new RegExp(search, 'i') }
      ]
    });
  }
  if (featured) {
    andConditions.push({
      $or: [
        { badge: { $in: ['Best Seller', 'Trending', 'New Launch', 'featured', 'popular'] } },
        { featured: true },
        { isFeatured: true }
      ]
    });
  }
  if (priceRange) {
    const [min, max] = priceRange.split('-').map(Number);
    const priceFilter = {};
    if (min) priceFilter.$gte = min;
    if (max && max < 999999) priceFilter.$lte = max;
    andConditions.push({ 'variants.price': priceFilter });
  }

  if (orConditions.length > 0) {
    filter.$or = orConditions;
  }
  
  if (andConditions.length > 0) {
    filter.$and = andConditions;
  }

  return filter;
}

// Ultra-fast product listing with cache headers
router.get('/', cacheProducts, async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const filter = buildUserFilter(req.query);
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Ultra-fast query with minimal fields
    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean()
        .select('title handle price images variants badge productCategory navPage rating reviewCount'),
      Product.countDocuments(filter)
    ]);
    
    // Add cache headers for CDN/cloudflare - 5 minutes
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    res.json({ products, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Ultra-fast admin listing with pagination and minimal fields
    const [products, total] = await Promise.all([
      Product.find()
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean()
        .select('title handle price images variants badge productCategory navPage rating reviewCount published status vendor platform createdAt updatedAt'),
      Product.countDocuments({})
    ]);
    
    res.json({ 
      products, 
      total, 
      page: parseInt(page), 
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Import a single Amazon product via JSON form data
router.post('/amazon-import', adminAuth, async (req, res) => {
  try {
    const data = req.body;
    if (!data.title) return res.status(400).json({ message: 'Product title is required' });

    const productData = {
      title: data.title,
      vendor: data.brand || data.vendor || '',
      bodyHtml: data.description || '',
      productCategory: data.productCategory || '',
      navPage: data.navPage || 'home',
      type: data.type || '',
      tags: data.tags ? (Array.isArray(data.tags) ? data.tags : data.tags.split(',').map(t => t.trim()).filter(Boolean)) : [],
      published: true,
      status: 'active',
      platform: 'amazon',
      rating: parseFloat(data.rating) || 4.5,
      reviewCount: parseInt(data.review_count) || 0,
      option1Name: 'Size',
      variants: [{
        sku: data.asin || data.sku || '',
        price: parseFloat(data.price) || 0,
        compareAtPrice: parseFloat(data.original_price) || parseFloat(data.compareAtPrice) || 0,
        inventoryQty: parseInt(data.quantity) || 100,
        option1: 'Default'
      }],
      images: data.img_url ? [{ src: data.img_url, position: 1, altText: data.title }] : [],
      amazonMeta: {
        asin: data.asin || data.id || '',
        url: data.url || '',
        currency: data.currency || 'INR',
        original_price: parseFloat(data.original_price) || 0,
        has_prime_shipping: data.has_prime_shipping === 'true' || data.has_prime_shipping === true,
        has_deal: data.has_deal === 'true' || data.has_deal === true,
        deal_text: data.deal_text || '',
        is_sponsored: data.is_sponsored === 'true' || data.is_sponsored === true,
        options_count: parseInt(data.options_count) || 1,
        source_url: data.source_url || '',
        extracted_at: data.extracted_at ? new Date(data.extracted_at) : undefined
      }
    };

    const existing = await Product.findOne({
      $or: [
        { 'amazonMeta.asin': data.asin },
        { title: data.title }
      ]
    });

    let product;
    if (existing) {
      Object.assign(existing, productData);
      product = await existing.save();
    } else {
      product = await Product.create(productData);
    }

    if (global.bumpDataVersion) global.bumpDataVersion();
    invalidateProductCache();
    res.status(201).json({ message: 'Product imported successfully', product });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Bulk delete selected products
router.post('/admin/bulk-delete', adminAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No product IDs provided' });
    }
    const result = await Product.deleteMany({ _id: { $in: ids } });
    if (global.bumpDataVersion) global.bumpDataVersion();
    invalidateProductCache();
    res.json({ message: `${result.deletedCount} products deleted successfully`, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/bulk-import', adminAuth, upload.single('file'), async (req, res) => {
  try {
    const { platform, importUrl } = req.body;
    if (!platform) return res.status(400).json({ message: 'Platform required' });

    if (importUrl) {
      return res.json({ message: 'URL import queued', platform, url: importUrl, status: 'pending' });
    }
    if (!req.file) return res.status(400).json({ message: 'File required' });

    const results = await importFromCSV(req.file.path, platform);
    if (global.bumpDataVersion) global.bumpDataVersion();
    invalidateProductCache();
    res.json({ message: 'Import complete', ...results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/bulk-export/:platform', adminAuth, async (req, res) => {
  try {
    const { platform } = req.params;
    // Use lean() for faster export
    const products = await Product.find().lean().select('title handle price images variants badge productCategory vendor');
    const headers = getExportHeaders(platform);
    const rows = products.map(p => productToExportRow(p, platform));

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=sorbazaar-${platform}-export.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Ultra-fast recommendations with lean query
router.get('/recommendations/:id', cacheProducts, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean().select('navPage');
    const filter = product
      ? { 
          _id: { $ne: product._id }, 
          navPage: product.navPage || 'home',
          $or: [
            { published: true, status: 'active' },
            { published: 'true', status: 'active' }
          ]
        }
      : { $or: [
          { published: true, status: 'active' },
          { published: 'true', status: 'active' }
        ]};
    
    const recommendations = await Product.find(filter)
      .limit(10)
      .lean()
      .select('title handle price images variants badge productCategory');
    
    res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=120');
    res.json(recommendations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Ultra-fast product detail with optimizations
router.get('/:handle', cacheProducts, async (req, res) => {
  try {
    const product = await Product.findOne({
      $and: [
        {
          $or: [
            { handle: req.params.handle },
            { _id: req.params.handle.match(/^[0-9a-fA-F]{24}$/) ? req.params.handle : null }
          ]
        },
        {
          $or: [
            { published: true, status: 'active' },
            { published: 'true', status: 'active' }
          ]
        }
      ]
    })
      .lean()
      .select('-__v'); // Exclude version key for smaller payload
    
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    // Cache product detail for 2 minutes
    res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=120');
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', adminAuth, upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'videos', maxCount: 5 }
]), async (req, res) => {
  try {
    console.log('POST /products - Files received:', {
      images: req.files?.images?.length || 0,
      videos: req.files?.videos?.length || 0,
      videoFiles: req.files?.videos?.map(f => ({ name: f.originalname, size: f.size, mimetype: f.mimetype }))
    });
    
    const data = JSON.parse(req.body.productData || '{}');
    data.published = data.published === true || data.published === 'true' || data.published === '1';
    if (!data.status || data.status === 'undefined') data.status = 'active';
    
    if (req.files?.images) {
      data.images = req.files.images.map((f, i) => ({
        src: `/uploads/${f.filename}`, position: i + 1, altText: data.title
      }));
    }
    if (req.files?.videos) {
      data.videos = req.files.videos.map(f => `/uploads/${f.filename}`);
      console.log('Video paths saved:', data.videos);
    }
    const product = await Product.create(data);
    if (global.bumpDataVersion) global.bumpDataVersion();
    invalidateProductCache();
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', adminAuth, upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'videos', maxCount: 5 }
]), async (req, res) => {
  try {
    console.log('PUT /products/:id - Files received:', {
      id: req.params.id,
      images: req.files?.images?.length || 0,
      videos: req.files?.videos?.length || 0,
      videoFiles: req.files?.videos?.map(f => ({ name: f.originalname, size: f.size, mimetype: f.mimetype }))
    });
    
    const data = JSON.parse(req.body.productData || '{}');
    data.published = data.published === true || data.published === 'true' || data.published === '1';
    if (!data.status || data.status === 'undefined') data.status = 'active';
    
    if (req.files?.images) {
      const newImages = req.files.images.map((f, i) => ({
        src: `/uploads/${f.filename}`, position: i + 1, altText: data.title
      }));
      data.images = [...(data.images || []), ...newImages];
    }
    if (req.files?.videos && req.files.videos.length > 0) {
      const existingVideos = data.videos || [];
      const newVideos = req.files.videos.map(f => `/uploads/${f.filename}`);
      data.videos = [...existingVideos, ...newVideos];
      console.log('Video paths updated:', data.videos);
    }
    if (!data.handle && data.title) {
      data.handle = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    data.updatedAt = Date.now();
    
    const product = await Product.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (global.bumpDataVersion) global.bumpDataVersion();
    invalidateProductCache();
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    if (global.bumpDataVersion) global.bumpDataVersion();
    invalidateProductCache();
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/admin/delete-all', adminAuth, async (req, res) => {
  try {
    const result = await Product.deleteMany({});
    if (global.bumpDataVersion) global.bumpDataVersion();
    invalidateProductCache();
    res.json({ message: `All ${result.deletedCount} products deleted successfully`, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Bulk delete selected products
router.post('/admin/bulk-delete', adminAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No product IDs provided' });
    }
    const result = await Product.deleteMany({ _id: { $in: ids } });
    if (global.bumpDataVersion) global.bumpDataVersion();
    invalidateProductCache();
    res.json({ message: `${result.deletedCount} products deleted successfully`, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Duplicate entry removed - bulk-delete already added above

// Admin fix endpoint: fix published/status fields on existing products
router.post('/admin/fix-data', adminAuth, async (req, res) => {
  try {
    const result = await Product.updateMany(
      {},
      [
        {
          $set: {
            published: { $cond: { if: { $in: ['$published', [true, 'true', '1', 1]] }, then: true, else: false } },
            status: { $ifNull: ['$status', 'active'] }
          }
        }
      ]
    );
    if (global.bumpDataVersion) global.bumpDataVersion();
    invalidateProductCache();
    res.json({ 
      message: `Fixed ${result.modifiedCount} products`, 
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin endpoint: get count of products visible to users vs total
router.get('/admin/stats', adminAuth, async (req, res) => {
  try {
    const total = await Product.countDocuments({});
    const visible = await Product.countDocuments({ published: { $ne: false }, status: { $nin: ['draft', 'archived'] } });
    const hidden = total - visible;
    
    // Sample a few products to show their published/status values
    const samples = await Product.find({}).limit(5).select('title published status navPage productCategory');
    
    res.json({ 
      total, 
      visible, 
      hidden,
      samples: samples.map(s => ({
        title: s.title,
        published: s.published,
        status: s.status,
        navPage: s.navPage,
        productCategory: s.productCategory
      }))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Debug endpoint: test a specific navPage query
router.get('/admin/debug/:navPage', adminAuth, async (req, res) => {
  try {
    const { navPage } = req.params;
    const filter = buildUserFilter({ navPage });
    const products = await Product.find(filter).limit(10).select('title published status navPage productCategory');
    const total = await Product.countDocuments(filter);
    
    const navPageValues = await Product.distinct('navPage');
    const statusValues = await Product.distinct('status');
    const publishedValues = await Product.distinct('published');
    
    res.json({
      navPage,
      filter,
      count: total,
      products: products.map(p => ({
        title: p.title,
        published: p.published,
        status: p.status,
        navPage: p.navPage,
        productCategory: p.productCategory
      })),
      stats: {
        navPageValues,
        statusValues,
        publishedValues
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;