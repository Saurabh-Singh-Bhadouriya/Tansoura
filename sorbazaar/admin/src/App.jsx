import { useState, useEffect, useRef, useCallback } from 'react';
import { auth, apiFetch } from './api';
import LoginPage from './pages/LoginPage';
import ProductsPage from './pages/ProductsPage';
import SlidersPage from './pages/SlidersPage';
import OffersPage from './pages/OffersPage';
import OrdersPage from './pages/OrdersPage';
import UsersPage from './pages/UsersPage';
import PromoCodesPage from './pages/PromoCodesPage';
import CategoriesPage from './pages/CategoriesPage';
import './index.css';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [page, setPage] = useState('products');
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const inactivityTimer = useRef(null);
  const warningTimer = useRef(null);
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem('adminToken');
    setUser(null);
    setShowTimeoutWarning(false);
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);
    setShowTimeoutWarning(false);

    warningTimer.current = setTimeout(() => {
      setShowTimeoutWarning(true);
    }, INACTIVITY_TIMEOUT - 30000);

    inactivityTimer.current = setTimeout(() => {
      logout();
    }, INACTIVITY_TIMEOUT);
  }, [logout]);

  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'keydown', 'mousemove', 'scroll', 'touchstart', 'click'];
    const handleActivity = () => resetInactivityTimer();

    events.forEach(event => window.addEventListener(event, handleActivity));
    resetInactivityTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (warningTimer.current) clearTimeout(warningTimer.current);
    };
  }, [user, resetInactivityTimer]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { setChecking(false); return; }
    auth.me()
      .then(d => { if (d.user?.role === 'admin') setUser(d.user); else localStorage.removeItem('adminToken'); })
      .catch(() => localStorage.removeItem('adminToken'))
      .finally(() => setChecking(false));
  }, []);

  const loadAdminNotifications = async () => {
    try {
      const data = await apiFetch('/notifications/admin/all');
      setAdminNotifications(data);
    } catch (err) {
      console.error('Failed to load admin notifications:', err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await apiFetch(`/notifications/admin/${id}`, { method: 'DELETE' });
      setAdminNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadAdminNotifications();
      const interval = setInterval(loadAdminNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (checking) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>Loading...</div>;
  if (!user) return <LoginPage onLogin={setUser} />;

  const navItems = [
    { id: 'products', label: '📦 Products', icon: '📦' },
    { id: 'users', label: '👥 Users', icon: '👥' },
    { id: 'orders', label: '📋 Orders', icon: '📋' },
    { id: 'sliders', label: '🖼️ Sliders', icon: '🖼️' },
    { id: 'offers', label: '🏷️ Offers & Banners', icon: '🏷️' },
    { id: 'promo', label: '🎟️ Promo Codes', icon: '🎟️' },
    { id: 'categories', label: '📂 Categories', icon: '📂' }
  ];

  return (
    <div className="admin-layout">
      {showTimeoutWarning && (
        <div className="session-timeout-warning">
          <div className="timeout-warning-content">
            <span>⚠️</span>
            <span>Your session will expire in 30 seconds due to inactivity.</span>
            <button className="btn btn-sm btn-primary" onClick={resetInactivityTimer}>Stay Logged In</button>
          </div>
        </div>
      )}
      
      {/* Mobile sidebar toggle */}
      <button className="sidebar-mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Notification Bell - Top Right Corner */}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 999 }}>
        <button className="nav-icon admin-notif-bell" onClick={() => setShowNotifPanel(!showNotifPanel)}>
          🔔
          {adminNotifications.filter(n => !n.read).length > 0 && (
            <span className="notification-badge">
              {adminNotifications.filter(n => !n.read).length > 99 ? '99+' : adminNotifications.filter(n => !n.read).length}
            </span>
          )}
        </button>
        
        {showNotifPanel && (
          <div className="notification-panel">
            <div className="notification-header">
              <h3>Notifications</h3>
              <button className="notification-mark-all" onClick={() => { setShowNotifPanel(false); loadAdminNotifications(); }}>Refresh</button>
            </div>
            <div className="notification-list">
              {adminNotifications.length === 0 ? (
                <div className="notification-empty"><p>No notifications</p></div>
              ) : (
                adminNotifications.slice(0, 20).map(notif => (
                  <div key={notif._id} className={`notification-item ${!notif.read ? 'notification-unread' : ''}`}>
                    <div className="notification-icon">
                      {notif.type === 'upi_payment_pending' ? '💳' : '🔔'}
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">{notif.title}</div>
                      <div className="notification-message">{notif.message}</div>
                      <div className="notification-time">{new Date(notif.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                      {notif.actions && (
                        <div className="notification-actions">
                          {notif.actions.map((action, idx) => (
                            <button
                              key={idx}
                              className={`btn btn-xs ${action.style === 'danger' ? 'btn-danger' : action.style === 'outline' ? 'btn-outline' : 'btn-primary'}`}
                              onClick={() => {
                                setShowNotifPanel(false);
                                setPage('orders');
                              }}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      className="notification-remove"
                      onClick={() => deleteNotification(notif._id)}
                      title="Delete notification"
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, padding: 4 }}
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <aside className={`sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">Tan<span>soura</span> Admin</div>
        <ul className="sidebar-nav">
          {navItems.map(item => (
            <li key={item.id}>
              <button className={page === item.id ? 'active' : ''} onClick={() => setPage(item.id)}>
                {item.label}
                {item.id === 'orders' && adminNotifications.filter(n => n.type === 'upi_payment_pending').length > 0 && (
                  <span style={{ marginLeft: 8, background: 'var(--danger)', color: 'white', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                    {adminNotifications.filter(n => n.type === 'upi_payment_pending').length}
                  </span>
                )}
              </button>
            </li>
          ))}
          <li><button onClick={logout} style={{ marginTop: 20, color: 'var(--danger)' }}>🚪 Logout</button></li>
        </ul>
      </aside>
      <main className="main-content">
        {page === 'products' && <ProductsPage />}
        {page === 'users' && <UsersPage />}
        {page === 'orders' && <OrdersPage />}
        {page === 'sliders' && <SlidersPage />}
        {page === 'offers' && <OffersPage />}
          {page === 'promo' && <PromoCodesPage />}
          {page === 'categories' && <CategoriesPage />}
      </main>
    </div>
  );
}