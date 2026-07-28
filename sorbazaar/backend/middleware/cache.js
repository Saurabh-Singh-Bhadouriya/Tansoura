// In-memory API response cache for high-traffic read endpoints
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Cache keys by endpoint and params
function makeCacheKey(req) {
  const url = req.originalUrl || req.url;
  const method = req.method;
  return `api:${method}:${url}`;
}

// Cache middleware for product listings (GET requests only)
function cacheProducts(req, res, next) {
  if (req.method !== 'GET') return next();
  
  const key = makeCacheKey(req);
  const cached = cache.get(key);
  
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }
  
  // Override res.json to cache the response
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    cache.set(key, body);
    res.setHeader('X-Cache', 'MISS');
    return originalJson(body);
  };
  
  next();
}

// Invalidate product-related caches when data changes
function invalidateProductCache() {
  const keys = cache.keys();
  const productKeys = keys.filter(k => k.includes('/products') || k.includes('/offers') || k.includes('/sliders'));
  productKeys.forEach(k => cache.del(k));
}

module.exports = { cacheProducts, invalidateProductCache };