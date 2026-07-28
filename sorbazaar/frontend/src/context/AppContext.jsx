import { createContext, useContext, useState, useEffect } from 'react';
import { auth as authApi, categories as categoriesApi } from '../api';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [authModal, setAuthModal] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authApi.me()
        .then(d => setUser(d.user))
        .catch(() => { localStorage.removeItem('token'); })
        .finally(() => setAuthChecked(true));
    } else {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    categoriesApi.list().then(setCategories).catch(console.error);

    // Poll for data version changes (e.g., when admin updates categories/products)
    let currentVersion = Date.now();
    fetch(`${API_BASE}/version`)
      .then(r => r.json())
      .then(d => { currentVersion = d.version; })
      .catch(() => {});

    const interval = setInterval(() => {
      fetch(`${API_BASE}/version?_cb=${Date.now()}`)
        .then(r => r.json())
        .then(d => {
          if (d.version !== currentVersion) {
            currentVersion = d.version;
            categoriesApi.list().then(setCategories).catch(console.error);
          }
        })
        .catch(() => {});
    }, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  }, []);

  const login = async (loginVal, password) => {
    const data = await authApi.login({ login: loginVal, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setAuthModal(null);
    return data;
  };

  const signup = async (form) => {
    const data = await authApi.signup(form);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setAuthModal(null);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const forgotPassword = (loginVal) => authApi.forgotPassword({ login: loginVal });

  const resetPassword = async (loginVal, otp, password) => {
    const data = await authApi.resetPassword({ login: loginVal, otp, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setAuthModal(null);
    return data;
  };

  const addToCart = (product, variant, qty = 1) => {
    setCart(prev => {
      const key = `${product._id}-${variant?.option1 || 'default'}`;
      const existing = prev.find(i => i.key === key);
      if (existing) {
        return prev.map(i => i.key === key ? { ...i, quantity: i.quantity + qty } : i);
      }
      const v = variant || product.variants?.[0];
      return [...prev, {
        key,
        productId: product._id,
        title: product.title,
        price: v?.price || 0,
        compareAtPrice: v?.compareAtPrice,
        image: product.images?.[0]?.src,
        variant: v?.option1,
        quantity: qty,
        handle: product.handle
      }];
    });
    setCartOpen(true);
  };

  const updateQty = (key, quantity) => {
    if (quantity <= 0) setCart(prev => prev.filter(i => i.key !== key));
    else setCart(prev => prev.map(i => i.key === key ? { ...i, quantity } : i));
  };

  const removeFromCart = (key) => setCart(prev => prev.filter(i => i.key !== key));

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <AppContext.Provider value={{
      user, login, signup, logout, setUser, authChecked, forgotPassword, resetPassword,
      cart, setCart, addToCart, updateQty, removeFromCart, cartTotal, cartCount,
      cartOpen, setCartOpen, authModal, setAuthModal,
      categories
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
