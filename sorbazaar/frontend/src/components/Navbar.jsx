import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { categories as categoriesApi, NAV_ITEMS } from '../api';
import SearchBar from './SearchBar';
import NotificationDropdown from './NotificationDropdown';
import UserDropdown from './UserDropdown';

export default function Navbar() {
  const { user, cartCount, setCartOpen, setAuthModal, logout, categories } = useApp();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Scroll effect for navbar fade – smooth, throttled with requestAnimationFrame
  const scrollRAF = useRef(null);
  const handleScroll = useCallback(() => {
    if (scrollRAF.current) return;
    scrollRAF.current = requestAnimationFrame(() => {
      scrollRAF.current = null;
      // Small dead zone at 50px to prevent rapid flickering
      const threshold = 50;
      const deadZone = 10;
      const scrollY = window.scrollY;
      if (!scrolled && scrollY > threshold + deadZone) {
        setScrolled(true);
      } else if (scrolled && scrollY < threshold - deadZone) {
        setScrolled(false);
      }
    });
  }, [scrolled]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollRAF.current) {
        cancelAnimationFrame(scrollRAF.current);
      }
    };
  }, [handleScroll]);

  // Build category links dynamically; fallback to NAV_ITEMS if API returns none
  const categoryLinks = categories.length > 0
    ? categories
        .filter(c => c.active)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(c => ({ label: c.name, path: `/category/${c.handle || c._id}`, page: c.handle }))
    : NAV_ITEMS.map(item => ({ label: item.label, path: item.path, page: item.page }));

  // Top menu items (shown after logo)
  const topMenuItems = [
    { label: 'Categories', path: '/categories' },
    { label: 'Brands', path: '/brands' },
    { label: 'Luxe', path: '/luxe' },
    { label: 'Fashion', path: '/fashion' },
    { label: 'Beauty Advice', path: '/beauty-advice' },
  ];

  const [menuTab, setMenuTab] = useState('categories');

  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      {/* Top utility row */}
      <div className="navbar-utility">
        <div className="navbar-utility-inner">
          <span className="utility-left">Free shipping on orders above ₹299 · 5% extra off on prepaid</span>
          <div className="utility-right">
            {user ? (
              <span className="utility-user">Hi, {user.username}</span>
            ) : (
              <button className="utility-link" onClick={() => setAuthModal('login')}>Sign in</button>
            )}
          </div>
        </div>
      </div>

      {/* Main bar - Nykaa Style */}
      <div className="navbar-inner">
        <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">☰</button>

        <Link to="/" className="logo" onClick={() => setMobileOpen(false)}>
          <img src="/logo.png" alt="Tansoura" />
        </Link>

        {/* Menu Items - fades on scroll (locked for now) */}
        <div className={`nav-top-menu ${mobileOpen ? 'mobile-open' : ''} ${scrolled && !mobileOpen ? 'nav-menu-items-hidden' : ''}`}>
          {topMenuItems.map(item => (
            <span
              key={item.label}
              className={`nav-top-link nav-top-link-locked`}
            >
              {item.label}
            </span>
          ))}
        </div>

        {/* Search Bar - Right side in main row - Exact Nykaa Style */}
        <div className="nav-search-inline">
          <SearchBar compact />
        </div>

        {/* Action Buttons - Exact Nykaa Style */}
        <div className="nav-actions">
          <UserDropdown />
          <button className="nav-icon cart-icon" onClick={() => setCartOpen(true)} title="Cart" aria-label="Cart">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ color: '#333' }}>
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" strokeWidth="2" strokeLinejoin="round" />
              <line x1="3" y1="6" x2="21" y2="6" strokeWidth="2" />
              <path d="M16 10a4 4 0 0 1-8 0" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
          <button className="nav-icon mobile-search-toggle" onClick={() => setSearchOpen(!searchOpen)} title="Search" aria-label="Search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ color: '#333' }}>
              <circle cx="11" cy="11" r="8" strokeWidth="2" />
              <path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Category Links Bar - Scrollable, fades on scroll */}
      <div className={`navbar-categories ${scrolled ? 'navbar-categories-hidden' : ''}`}>
        <div className="navbar-categories-inner">
          {categoryLinks.map(item => (
            <Link
              key={item.page}
              to={item.path}
              className={`category-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
          <Link to="/offers" className="category-link category-link-offers">
            OFFERS
          </Link>
        </div>
      </div>

      {/* Mobile search */}
      {searchOpen && (
        <div className="navbar-mobile-search">
          <SearchBar compact />
        </div>
      )}

      {/* Mobile Menu Drawer */}
      <div className={`mobile-menu-drawer ${mobileOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <span>Menu</span>
          <button onClick={() => setMobileOpen(false)}>✕</button>
        </div>
        <div className="mobile-menu-tabs">
          <button className={`mobile-tab ${menuTab === 'categories' ? 'active' : ''}`} onClick={() => setMenuTab('categories')}>Categories</button>
          <button className={`mobile-tab ${menuTab === 'brands' ? 'active' : ''}`} onClick={() => setMenuTab('brands')}>Brands</button>
        </div>
        <div className="mobile-menu-content">
          {menuTab === 'categories' && (
            <div className="mobile-menu-list">
              <Link to="/offers" className="mobile-menu-item" onClick={() => setMobileOpen(false)}>
                <span>OFFERS</span>
              </Link>
              {categoryLinks.map(item => (
                <Link key={item.page} to={item.path} className="mobile-menu-item" onClick={() => setMobileOpen(false)}>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  <span className="mobile-menu-plus">+</span>
                </Link>
              ))}
            </div>
          )}
          {menuTab === 'brands' && (
            <div className="mobile-menu-list">
              <p style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Brands coming soon</p>
            </div>
          )}
        </div>
      </div>

      {/* Overlay */}
      {mobileOpen && <div className="mobile-menu-overlay" onClick={() => setMobileOpen(false)} />}
    </nav>
  );
}
