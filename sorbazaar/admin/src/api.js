const API = import.meta.env.VITE_API_URL || '/api';
const UPLOADS_BASE = import.meta.env.VITE_UPLOADS_URL || '';

let requestCounter = 0;

// Wake up the backend server - call this before any critical API call
export async function wakeBackend() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    await fetch(`${API}/health`, { 
      method: 'GET',
      signal: controller.signal,
      cache: 'no-cache'
    });
    clearTimeout(timeoutId);
    return true;
  } catch (err) {
    console.warn('[wake] Backend wake attempt:', err.message);
    // Even if it fails (still sleeping), proceed - next call might work
    return false;
  }
}

// Enhanced fetch with timeout and better error messages
export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('adminToken');
  const headers = { ...options.headers };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  // Add cache-busting for all requests to ensure fresh data
  requestCounter++;
  let url = `${API}${endpoint}`;
  const separator = endpoint.includes('?') ? '&' : '?';
  url += `${separator}_cb=${Date.now()}_${requestCounter}`;
  
  // Add timeout to prevent infinite hanging (especially when Render backend is sleeping)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
  
  try {
    const res = await fetch(url, { 
      ...options, 
      headers, 
      cache: 'no-cache',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    const data = await res.json().catch(async () => {
      const txt = await res.text().catch(() => '');
      return { message: txt || res.statusText };
    });
    if (!res.ok) {
      const msg = data?.message || `Request failed with ${res.status}`;
      console.error('[admin api]', endpoint, res.status, data);
      throw new Error(msg);
    }
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. The backend server may be starting up. Please try again in 30 seconds.');
    }
    if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
      throw new Error('Cannot connect to the backend server. It may be starting up. Please try again in 30 seconds.');
    }
    throw err;
  }
}

export const auth = {
  login: (body) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => apiFetch('/auth/me')
};

export const products = {
  list: () => apiFetch('/products/admin/all'),
  create: (formData) => apiFetch('/products', { method: 'POST', body: formData }),
  update: (id, formData) => apiFetch(`/products/${id}`, { method: 'PUT', body: formData }),
  delete: (id) => apiFetch(`/products/${id}`, { method: 'DELETE' }),
  deleteAll: () => apiFetch('/products/admin/delete-all', { method: 'DELETE' }),
  bulkDelete: (ids) => apiFetch('/products/admin/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
  amazonImport: (data) => apiFetch('/products/amazon-import', { method: 'POST', body: JSON.stringify(data) }),
  bulkImport: (formData) => apiFetch('/products/bulk-import', { method: 'POST', body: formData }),
  bulkExport: async (platform) => {
    const token = localStorage.getItem('adminToken');
    // Use fetch with Authorization header (secure, no token in URL)
    const res = await fetch(`${API}/products/bulk-export/${platform}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Export failed');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sorbazaar-${platform}-export.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};

export const sliders = {
  list: () => apiFetch('/sliders/admin/all'),
  create: (formData) => apiFetch('/sliders', { method: 'POST', body: formData }),
  update: (id, formData) => apiFetch(`/sliders/${id}`, { method: 'PUT', body: formData }),
  delete: (id) => apiFetch(`/sliders/${id}`, { method: 'DELETE' })
};

export const offers = {
  list: () => apiFetch('/offers/admin/all'),
  create: (formData) => apiFetch('/offers', { method: 'POST', body: formData }),
  update: (id, formData) => apiFetch(`/offers/${id}`, { method: 'PUT', body: formData }),
  delete: (id) => apiFetch(`/offers/${id}`, { method: 'DELETE' })
};

export const NAV_PAGES = [
  'home', 'skincare', 'haircare', 'bath-care', 'makeup', 'natural', 'men',
  'face-wash', 'fragrance', 'deals', 'new-arrivals'
];

export const categories = {
  list: () => apiFetch('/categories/admin/all'),
  create: (formData) => apiFetch('/categories', { method: 'POST', body: formData }),
  update: (id, formData) => apiFetch(`/categories/${id}`, { method: 'PUT', body: formData }),
  delete: (id) => apiFetch(`/categories/${id}`, { method: 'DELETE' })
};

export const PLATFORMS = [
  { id: 'shopify', name: 'Shopify', fields: ['Handle','Title','Body (HTML)','Vendor','Product Category','Type','Tags','Published','Option1 Name','Option1 Value','Option2 Name','Option2 Value','Option3 Name','Option3 Value','Variant SKU','Variant Grams','Variant Inventory Tracker','Variant Inventory Qty','Variant Inventory Policy','Variant Fulfillment Service','Variant Price','Variant Compare At Price','Variant Requires Shipping','Variant Taxable','Variant Barcode','Image Src','Image Position','Image Alt Text','Gift Card','SEO Title','SEO Description','Variant Image','Variant Weight Unit','Variant Tax Code','Cost per item','Price / International','Compare At Price / International','Status'] },
  { id: 'amazon', name: 'Amazon', fields: ['id','asin','brand','title','url','currency','price','original_price','rating','review_count','has_prime_shipping','has_deal','deal_text','is_sponsored','options_count','img_url','position','source_url','extracted_at'] },
  { id: 'flipkart', name: 'Flipkart', fields: ['Product Title','Brand','Description','Category','SKU ID','MRP','Selling Price','Stock','Primary Image URL','Size','Color'] },
  { id: 'aliexpress', name: 'AliExpress', fields: ['Product Name','Description','Brand Name','Category','Price','Original Price','Stock','Image URL','SKU'] },
  { id: 'wix', name: 'Wix', fields: ['name','description','brand','collection','price','comparePrice','inventory','media','sku'] },
  { id: 'wordpress', name: 'WordPress', fields: ['Name','Description','Type','Tags','Regular price','Sale price','Stock','Images','SKU','Categories'] },
  { id: 'meesho', name: 'Meesho', fields: ['Product Name','Description','Brand','Category','Selling Price','MRP','Inventory','Image Link','Product Code'] }
];

export function imgUrl(src) {
  if (!src) return '';
  if (src.startsWith('http')) return src;
  if (UPLOADS_BASE && src.startsWith('/uploads/')) {
    return `${UPLOADS_BASE}${src}`;
  }
  return src.startsWith('/') ? src : `/uploads/${src}`;
}

// Resolve any uploaded media (image or video) to a full URL
export function mediaUrl(src) {
  if (!src) return '';
  if (src.startsWith('http')) return src;
  if (UPLOADS_BASE && src.startsWith('/uploads/')) {
    return `${UPLOADS_BASE}${src}`;
  }
  return src.startsWith('/') ? src : `/uploads/${src}`;
}
