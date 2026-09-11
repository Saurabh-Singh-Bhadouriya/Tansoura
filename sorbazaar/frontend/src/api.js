const API = import.meta.env.VITE_API_URL || '/api';
const UPLOADS_BASE = import.meta.env.VITE_UPLOADS_URL || '';

// Simple in-memory GET cache so returning users/visitors see products instantly
const GET_CACHE = new Map();
const CACHE_TTL = 10 * 1000; // 10 seconds - short so admin updates show quickly

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };
  const method = options.method || 'GET';
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = `${API}${endpoint}`;

  // Cache only GET API responses for a short period to speed up repeat views
  if (method === 'GET') {
    const cached = GET_CACHE.get(url);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return cached.data;
    }
  }

  const res = await fetch(url, { 
    ...options, 
    headers,
    cache: 'no-cache'
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  if (method === 'GET') {
    GET_CACHE.set(url, { data, ts: Date.now() });
    // Keep cache small
    if (GET_CACHE.size > 200) {
      const firstKey = GET_CACHE.keys().next().value;
      GET_CACHE.delete(firstKey);
    }
  }
  return data;
}

export const auth = {
  signup: (body) => apiFetch('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => apiFetch('/auth/me'),
  saveAddress: (body) => apiFetch('/auth/address', { method: 'PUT', body: JSON.stringify(body) }),
  forgotPassword: (body) => apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }),
  resetPassword: (body) => apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) })
};

export const products = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/products?${q}`);
  },
  get: (handle) => apiFetch(`/products/${handle}`),
  recommendations: (id) => apiFetch(`/products/recommendations/${id}`)
};

export const sliders = {
  list: (navPage) => apiFetch(`/sliders?navPage=${navPage}`)
};

export const offers = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/offers?${q}`);
  }
};

export const profile = {
  get: () => apiFetch('/profile'),
  updatePersonalInfo: (body) => apiFetch('/profile/personal-info', { method: 'PUT', body: JSON.stringify(body) }),
  changePassword: (body) => apiFetch('/profile/change-password', { method: 'PUT', body: JSON.stringify(body) }),
  uploadPhoto: (formData) => apiFetch('/profile/photo', { method: 'PUT', body: formData }),
  getAddresses: () => apiFetch('/profile/addresses'),
  addAddress: (body) => apiFetch('/profile/addresses', { method: 'POST', body: JSON.stringify(body) }),
  updateAddress: (index, body) => apiFetch(`/profile/addresses/${index}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteAddress: (index) => apiFetch(`/profile/addresses/${index}`, { method: 'DELETE' }),
  getWishlist: () => apiFetch('/profile/wishlist'),
  toggleWishlist: (productId) => apiFetch(`/profile/wishlist/${productId}`, { method: 'POST' }),
  removeFromWishlist: (productId) => apiFetch(`/profile/wishlist/${productId}`, { method: 'DELETE' }),
  addRecentlyViewed: (productId) => apiFetch('/profile/recently-viewed', { method: 'POST', body: JSON.stringify({ productId }) }),
  getReviews: () => apiFetch('/profile/reviews'),
  updateNotificationPrefs: (body) => apiFetch('/profile/notification-preferences', { method: 'PUT', body: JSON.stringify(body) }),
  updateSettings: (body) => apiFetch('/profile/settings', { method: 'PUT', body: JSON.stringify(body) }),
  deleteAccount: () => apiFetch('/profile/account', { method: 'DELETE' })
};

export const orders = {
  create: (body) => apiFetch('/orders', { method: 'POST', body: JSON.stringify(body) }),
  my: () => apiFetch('/orders/my'),
  get: (id) => apiFetch(`/orders/${id}`),
  cancel: (id, reason) => apiFetch(`/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  uploadScreenshot: (formData) => apiFetch('/orders/upload-screenshot', { method: 'POST', body: formData }),
  createRazorpayOrder: (total) => apiFetch('/orders/create-razorpay-order', { method: 'POST', body: JSON.stringify({ total }) }),
  createOrder: (payload) => apiFetch('/orders/create-order', { method: 'POST', body: JSON.stringify(payload) }),
  verifyPayment: (payload) => apiFetch('/orders/verify-payment', { method: 'POST', body: JSON.stringify(payload) })
};

export const notifications = {
  my: () => apiFetch('/notifications/my'),
  markRead: (id) => apiFetch(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllRead: () => apiFetch('/notifications/read-all', { method: 'PUT' })
};

export const promo = {
  validate: (code, orderAmount, cartItems) => apiFetch('/promo/validate', { method: 'POST', body: JSON.stringify({ code, orderAmount, cartItems }) })
};

export const categories = {
  list: () => apiFetch('/categories'),
  get: (handle) => apiFetch(`/categories/${handle}`)
};

export function imgUrl(src) {
  if (!src) return 'https://via.placeholder.com/400x400?text=No+Image';
  if (src.startsWith('http')) return src;
  
  // Get the backend base URL from VITE_API_URL (works in both dev and prod)
  const apiUrl = import.meta.env.VITE_API_URL || '';
  const backendBase = apiUrl.replace(/\/api\/?$/, '');
  
  // For uploaded images, always use the backend URL
  if (src.startsWith('/uploads/')) {
    // Use UPLOADS_BASE if explicitly set
    if (UPLOADS_BASE) return `${UPLOADS_BASE}${src}`;
    // Otherwise derive from the API URL that's already configured
    if (backendBase) return `${backendBase}${src}`;
    return src;
  }
  
  return src.startsWith('/') ? src : `/uploads/${src}`;
}

// Resolve any uploaded media (image or video) to a full URL
export function mediaUrl(src) {
  if (!src) return '';
  if (src.startsWith('http')) return src;
  const apiUrl = import.meta.env.VITE_API_URL || '';
  const backendBase = apiUrl.replace(/\/api\/?$/, '');
  if (src.startsWith('/uploads/')) {
    if (UPLOADS_BASE) return `${UPLOADS_BASE}${src}`;
    if (backendBase) return `${backendBase}${src}`;
    return src;
  }
  return src.startsWith('/') ? src : `/uploads/${src}`;
}

export function formatPrice(price) {
  return `₹${Number(price || 0).toLocaleString('en-IN')}`;
}

export const NAV_ITEMS = [
  { label: 'Skincare', path: '/category/skincare', page: 'skincare' },
  { label: 'Haircare', path: '/category/haircare', page: 'haircare' },
  { label: 'Bath & Care', path: '/category/bath-care', page: 'bath-care' },
  { label: 'Makeup', path: '/category/makeup', page: 'makeup' },
  { label: 'Natural', path: '/category/natural', page: 'natural' },
  { label: 'Men', path: '/category/men', page: 'men' },
  { label: 'Face Wash', path: '/category/face-wash', page: 'face-wash' },
  { label: 'Fragrance', path: '/category/fragrance', page: 'fragrance' },
  { label: 'Deals', path: '/category/deals', page: 'deals' },
  { label: 'New Arrivals', path: '/category/new-arrivals', page: 'new-arrivals' }
];
