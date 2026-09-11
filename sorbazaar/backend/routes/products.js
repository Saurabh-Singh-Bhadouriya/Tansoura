const express = require('express');
const prisma = require('../prismaClient');
const { auth, adminAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { importFromCSV, getExportHeaders, productToExportRow } = require('../utils/importExport');
const { cacheProducts, invalidateProductCache } = require('../middleware/cache');
const { toApiDoc } = require('../config/db');

const router = express.Router();

function orWhere(conds) {
  return conds.length > 0 ? { OR: conds } : {};
}

function andWhere(conds) {
  return conds.length > 0 ? { AND: conds } : {};
}

// Build Mongo filter from Prisma-style product filters
function buildUserFilter(query) {
  const { navPage, category, subcategory, search, priceRange, featured } = query;
  const filter = {
    published: true,
    NOT: { status: { in: ['draft', 'archived'] } }
  };
  const orConditions = [];
  const andConditions = [];

  if (navPage && navPage !== 'home') filter.navPage = navPage;

  if (category && category !== navPage) {
    andConditions.push({ productCategory: { equals: category, mode: 'insensitive' } });
  }

  if (subcategory) {
    andConditions.push({ type: { equals: subcategory, mode: 'insensitive' } });
  }

  if (search) {
    andConditions.push({
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
        { vendor: { contains: search, mode: 'insensitive' } },
        { bodyHtml: { contains: search, mode: 'insensitive' } }
      ]
    });
  }

  if (featured) {
    andConditions.push({
      OR: [
        { badge: { in: ['Best Seller', 'Trending', 'New Launch', 'featured', 'popular'] } },
        { badge: { not: null } }
      ]
    });
  }

  return {
    filter: {
      ...filter,
      ...andWhere(andConditions),
      ...orWhere(orConditions)
    },
    priceRange: priceRange
  };
}

// Apply price-range filter against embedded variants array using the raw collection
async function applyPriceRange(result, priceRange) {
  if (!priceRange) return result;
  const [min, max] = priceRange.split('-').map(Number);
  const filtered = result.filter((p) => {
    const variants = p.variants || [];
    return variants.some((v) => {
      if (min && v.price < min) return false;
      if (max && max < 999999 && v.price > max) return false;
      return true;
    });
  });
  return filtered;
}

const LIST_SELECT = {
  id: true, title: true, handle: true, variants: true, images: { select: { src: true }, take: 1 },
  badge: true, productCategory: true, navPage: true, rating: true, reviewCount: true
};

const ADMIN_SELECT = {
  id: true, title: true, handle: true, variants: true, images: true, badge: true,
  productCategory: true, navPage: true, rating: true, reviewCount: true,
  published: true, status: true, vendor: true, platform: true, createdAt: true, updatedAt: true
};

router.get('/', cacheProducts, async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const { where, priceRange } = buildUserFilter(req.query);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    let products = await prisma.product.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, select: LIST_SELECT });
    const total = await prisma.product.count({ where });

    if (priceRange) {
      products = await applyPriceRange(products, priceRange);
    }

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    res.json({ products, total, page: parseInt(page), pages: Math.ceil(total / take) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [products, total] = await Promise.all([
      prisma.product.findMany({ skip, take, orderBy: { updatedAt: 'desc' }, select: ADMIN_SELECT }),
      prisma.product.count()
    ]);

    res.json({ products, total, page: parseInt(page), pages: Math.ceil(total / take) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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
      tags: Array.isArray(data.tags) ? data.tags : (data.tags ? String(data.tags).split(',').map(t => t.trim()).filter(Boolean) : []),
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
        originalPrice: parseFloat(data.original_price) || 0,
        hasPrimeShipping: data.has_prime_shipping === 'true' || data.has_prime_shipping === true,
        hasDeal: data.has_deal === 'true' || data.has_deal === true,
        dealText: data.deal_text || '',
        isSponsored: data.is_sponsored === 'true' || data.is_sponsored === true,
        optionsCount: parseInt(data.options_count) || 1,
        sourceUrl: data.source_url || ''
      }
    };

    const existing = await prisma.product.findFirst({
      where: {
        OR: [
          { amazonMeta: { is: { asin: data.asin || '' } } },
          { title: data.title }
        ]
      }
    });

    let product;
    if (existing) {
      if (data.asin) {
        await prisma.product.update({
          where: { id: existing.id },
          data: { ...productData, amazonMeta: productData.amazonMeta }
        });
      } else {
        await prisma.product.update({ where: { id: existing.id }, data: productData });
      }
      product = await prisma.product.findFirst({ where: { id: existing.id } });
    } else {
      product = await prisma.product.create({ data: productData });
    }

    if (global.bumpDataVersion) global.bumpDataVersion();
    invalidateProductCache();
    res.status(201).json({ message: 'Product imported successfully', product });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/admin/bulk-delete', adminAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No product IDs provided' });
    }
    // deleteMany uses buildFilter which auto-converts valid 24-char hex ids to ObjectId
    const result = await prisma.product.deleteMany({ where: { id: { in: ids } } });
    if (global.bumpDataVersion) global.bumpDataVersion();
    invalidateProductCache();
    res.json({ message: `${result.count} products deleted successfully`, deletedCount: result.count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/bulk-import', adminAuth, upload.single('file'), async (req, res) => {
  try {
    const { platform, importUrl } = req.body;
    if (!platform) return res.status(400).json({ message: 'Platform required' });
    if (importUrl) return res.json({ message: 'URL import queued', platform, url: importUrl, status: 'pending' });
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
    const products = await prisma.product.findMany();
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

router.get('/recommendations/:id', cacheProducts, async (req, res) => {
  try {
    const product = await prisma.product.findFirst({ where: { id: req.params.id } });
    const where = product
      ? { id: { not: product.id }, nav: product.navPage || 'home', published: true, status: { not: 'archived' } }
      : { published: true, status: { not: 'archived' } };
    const recommendations = await prisma.product.findMany({ where, take: 10, select: LIST_SELECT });
    res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=120');
    res.json(recommendations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:handle', cacheProducts, async (req, res) => {
  try {
    const handle = req.params.handle;
    const product = await prisma.product.findFirst({
      where: {
        ...(handle.startsWith('_')
          ? { id: handle.slice(1) }
          : { OR: [{ handle }, { id: handle }] }),
        published: true,
        status: { not: 'archived' }
      }
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });
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
    const data = JSON.parse(req.body.productData || '{}');
    data.published = data.published === true || data.published === 'true' || data.published === '1';
    if (!data.status || data.status === 'undefined') data.status = 'active';

    const images = req.files?.images
      ? req.files.images.map((f, i) => ({ src: `/uploads/${f.filename}`, position: i + 1, altText: data.title }))
      : [];
    const videos = req.files?.videos ? req.files.videos.map(f => `/uploads/${f.filename}`) : [];
    if (!data.handle && data.title) {
      data.handle = String(data.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    const product = await prisma.product.create({
      data: {
        ...data,
        images,
        variants: data.variants || [],
        videos,
        updatedAt: new Date()
      }
    });
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
    const data = JSON.parse(req.body.productData || '{}');
    data.published = data.published === true || data.published === 'true' || data.published === '1';
    if (!data.status || data.status === 'undefined') data.status = 'active';

    const existing = await prisma.product.findFirst({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Product not found' });

    if (req.files?.images) {
      const newImages = req.files.images.map((f, i) => ({
        src: `/uploads/${f.filename}`, position: (existing.images?.length || 0) + i + 1, altText: data.title
      }));
      data.images = [...(existing.images || []), ...newImages];
    }
    if (req.files?.videos && req.files.videos.length > 0) {
      const newVideos = req.files.videos.map(f => `/uploads/${f.filename}`);
      data.videos = [...(existing.videos || []), ...newVideos];
    }
    if (!data.handle && data.title) {
      data.handle = String(data.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    data.updatedAt = new Date();

    const product = await prisma.product.update({ where: { id: req.params.id }, data });
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
    await prisma.product.delete({ where: { id: req.params.id } });
    if (global.bumpDataVersion) global.bumpDataVersion();
    invalidateProductCache();
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/admin/delete-all', adminAuth, async (req, res) => {
  try {
    const result = await prisma.product.deleteMany({});
    if (global.bumpDataVersion) global.bumpDataVersion();
    invalidateProductCache();
    res.json({ message: `All ${result.count} products deleted successfully`, deletedCount: result.count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/admin/fix-data', adminAuth, async (req, res) => {
  try {
    const total = await prisma.product.count();
    const updated = await prisma.product.updateMany({
      where: { OR: [{ status: 'draft' }, { status: 'archived' }] },
      data: { status: 'active' }
    });
    if (global.bumpDataVersion) global.bumpDataVersion();
    invalidateProductCache();
    res.json({ message: `Fixed ${updated.count} products`, matchedCount: updated.matchedCount, modifiedCount: updated.count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/admin/stats', adminAuth, async (req, res) => {
  try {
    const total = await prisma.product.count();
    const visible = await prisma.product.count({ where: { published: true, status: { not: 'archived' } } });
    const hidden = total - visible;
    const samples = await prisma.product.findMany({ take: 5, select: { id: true, title: true, published: true, status: true, navPage: true, productCategory: true } });
    res.json({ total, visible, hidden, samples });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;