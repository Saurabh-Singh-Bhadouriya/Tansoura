import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { imgUrl } from '../api';

export default function UserDropdown() {
  const { user, logout, setAuthModal } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [hoverOpen, setHoverOpen] = useState(false);
  const ref = useRef(null);
  const closeTimer = useRef(null);

  const isOpen = open || hoverOpen;

  const handleMouseEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setHoverOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => {
      setHoverOpen(false);
    }, 200);
  };

  const handleClick = (e) => {
    if (!user) {
      e.preventDefault();
      setAuthModal('login');
      return;
    }
    setOpen(prev => !prev);
  };

  const handleLogout = () => {
    logout();
    setOpen(false);
    setHoverOpen(false);
    navigate('/');
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setHoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') { setOpen(false); setHoverOpen(false); }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  if (!user) {
    return (
      <button className="nav-profile-btn" onClick={() => setAuthModal('login')} title="Sign In">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ color: '#333' }}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="7" r="4" strokeWidth="2" />
        </svg>
        <span className="nav-profile-name">Sign In</span>
      </button>
    );
  }

  const initials = (user.fullName || user.username || 'U').charAt(0).toUpperCase();
  const displayName = user.fullName || user.username || 'User';
  const email = user.email || '';

  const menuItems = [
    { label: 'My Profile', icon: String.fromCodePoint(0x1F464), path: '/profile' },
    { label: 'Tansoura Club', icon: String.fromCodePoint(0x2B50), path: '/profile?section=referral', badge: 'VIP' },
    { label: 'My Orders', icon: String.fromCodePoint(0x1F4CB), path: '/profile?section=orders' },
    { label: 'My Wishlist', icon: String.fromCodePoint(0x2764, 0xFE0F), path: '/profile?section=wishlist' },
    { label: 'My Wallet', icon: String.fromCodePoint(0x1F4B3), path: '/profile?section=payment' },
    { label: 'My Rewards', icon: String.fromCodePoint(0x1F3C6), path: '/profile?section=coupons' },
    { label: 'Gift Cards', icon: String.fromCodePoint(0x1F3AF), path: '/profile?section=payment' },
    { label: 'Notifications', icon: String.fromCodePoint(0x1F514), path: '/profile?section=notifications' },
  ];

  return (
    <div
      className="user-dropdown"
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button className="nav-profile-btn" onClick={handleClick} title="My Account">
        <div className="nav-avatar-circle">
          {user.profilePhoto ? (
            <img src={imgUrl(user.profilePhoto)} alt="" />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <span className="nav-profile-name">{displayName}</span>
        <svg className={`nav-chevron ${isOpen ? 'rotated' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="user-dropdown-menu"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Hello Greeting */}
          <div className="user-dropdown-header">
            <div className="user-dropdown-avatar">
            {user.profilePhoto ? (
                <img src={imgUrl(user.profilePhoto)} alt="" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="user-dropdown-info">
              <span className="user-dropdown-hello">Hello,</span>
              <span className="user-dropdown-name">{displayName}</span>
              <span className="user-dropdown-email">{email}</span>
            </div>
          </div>

          {/* Tansoura Club Banner */}
          <Link to="/profile?section=referral" className="user-dropdown-club" onClick={() => { setOpen(false); setHoverOpen(false); }}>
            <span className="club-badge">{String.fromCodePoint(0x2728)}</span>
            <span className="club-text">
              <strong>Join Tansoura Club</strong>
              <span className="club-sub">VIP Rewards & Benefits</span>
            </span>
            <span className="club-arrow">{String.fromCodePoint(0x203A)}</span>
          </Link>

          {/* Menu Items */}
          <div className="user-dropdown-items">
            {menuItems.map((item, i) => (
              <Link
                key={i}
                to={item.path}
                className="user-dropdown-item"
                onClick={() => { setOpen(false); setHoverOpen(false); }}
              >
                <span className="user-dropdown-item-icon">{item.icon}</span>
                <span className="user-dropdown-item-label">{item.label}</span>
                {item.badge && <span className="user-dropdown-badge">{item.badge}</span>}
              </Link>
            ))}
          </div>

          {/* Sign Out */}
          <div className="user-dropdown-footer">
            <button className="user-dropdown-logout" onClick={handleLogout}>
              <span className="logout-icon">&#x238B;</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}