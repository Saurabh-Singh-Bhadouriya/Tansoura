import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Link, useNavigate } from 'react-router-dom';
import { profile as profileApi, orders as ordersApi, imgUrl, formatPrice } from '../api';
import SEO from '../components/SEO';

const SIDEBAR_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'personal-info', label: 'Personal Information', icon: '👤' },
  { id: 'login-security', label: 'Login & Security', icon: '🔒' },
  { id: 'addresses', label: 'Address Book', icon: '📍' },
  { id: 'orders', label: 'My Orders', icon: '📋' },
  { id: 'wishlist', label: 'Wishlist', icon: '❤️' },
  { id: 'cart', label: 'Shopping Cart', icon: '🛒' },
  { id: 'payment', label: 'Payment Methods', icon: '💳' },
  { id: 'coupons', label: 'Coupons & Offers', icon: '🏷️' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'reviews', label: 'Reviews & Ratings', icon: '⭐' },
  { id: 'support', label: 'Support', icon: '🎧' },
  { id: 'settings', label: 'Account Settings', icon: '⚙️' },
  { id: 'privacy', label: 'Privacy', icon: '🔒' },
  { id: 'referral', label: 'Referral Program', icon: '🤝' },
  { id: 'recently-viewed', label: 'Recently Viewed', icon: '🕐' },
];

const emptyAddress = { label: 'Home', fullName: '', phone: '', pincode: '', addressLine1: '', addressLine2: '', city: '', state: '', isDefault: false };

export default function ProfilePage() {
  const { user, setUser, logout } = useApp();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form states
  const [infoForm, setInfoForm] = useState({ fullName: '', email: '', phone: '', dateOfBirth: '', gender: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [editingAddress, setEditingAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [notifPrefs, setNotifPrefs] = useState({ orderUpdates: true, offers: true, promotional: true });
  const [settings, setSettings] = useState({ language: 'en', theme: 'light' });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savedData, setSavedData] = useState(null);

  useEffect(() => {
    if (!user) return;
    loadProfile();
    loadOrders();
  }, [user]);

  const loadProfile = async () => {
    try {
      const data = await profileApi.get();
      setProfile(data.user);
      setInfoForm({
        fullName: data.user.fullName || '',
        email: data.user.email || '',
        phone: data.user.phone || '',
        dateOfBirth: data.user.dateOfBirth || '',
        gender: data.user.gender || ''
      });
      setNotifPrefs(data.user.notificationPreferences || { orderUpdates: true, offers: true, promotional: true });
      setSettings({ language: data.user.language || 'en', theme: data.user.theme || 'light' });
    } catch (err) { console.error(err); }
  };

  const loadOrders = async () => {
    try {
      const data = await ordersApi.my();
      setOrders(Array.isArray(data) ? data : (data.orders || []));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadWishlist = async () => {
    try {
      const data = await profileApi.getWishlist();
      setWishlist(data.wishlist || []);
    } catch (err) { console.error(err); }
  };

  const loadReviews = async () => {
    try {
      const data = await profileApi.getReviews();
      setReviews(data.reviews || []);
    } catch (err) { console.error(err); }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleSectionChange = (section) => {
    setActiveSection(section);
    setMessage({ type: '', text: '' });
    if (section === 'wishlist') loadWishlist();
    if (section === 'reviews') loadReviews();
  };

  // Personal Info
  const handleInfoUpdate = async (e) => {
    e.preventDefault();
    try {
      const data = await profileApi.updatePersonalInfo(infoForm);
      setProfile(data.user);
      setUser({ ...user, ...data.user });
      showMessage('success', 'Personal information updated successfully!');
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  // Password
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showMessage('error', 'Passwords do not match');
      return;
    }
    try {
      await profileApi.changePassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showMessage('success', 'Password changed successfully!');
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  // Photo
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showMessage('error', 'Please upload a valid image (JPG, PNG, GIF, WebP)');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showMessage('error', 'Image too large. Maximum size is 5MB.');
      return;
    }

    const fd = new FormData();
    fd.append('photo', file);
    
    try {
      const data = await profileApi.uploadPhoto(fd);
      if (data?.user) {
        setProfile(data.user);
        setUser(prev => ({ ...prev, ...data.user }));
        showMessage('success', 'Profile photo updated!');
      } else {
        throw new Error('Failed to update photo');
      }
    } catch (err) {
      console.error('Photo upload error:', err);
      showMessage('error', err.message || 'Failed to upload photo. Please try again.');
    }
    
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  // Addresses
  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAddress !== null) {
        await profileApi.updateAddress(editingAddress, addressForm);
      } else {
        await profileApi.addAddress(addressForm);
      }
      const data = await profileApi.getAddresses();
      setProfile(prev => ({ ...prev, addresses: data.addresses }));
      setShowAddressForm(false);
      setEditingAddress(null);
      setAddressForm(emptyAddress);
      showMessage('success', 'Address saved!');
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  const editAddress = (addr, index) => {
    setAddressForm(addr);
    setEditingAddress(index);
    setShowAddressForm(true);
  };

  const deleteAddress = async (index) => {
    try {
      await profileApi.deleteAddress(index);
      const data = await profileApi.getAddresses();
      setProfile(prev => ({ ...prev, addresses: data.addresses }));
      showMessage('success', 'Address deleted');
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  const setDefaultAddress = async (index) => {
    try {
      await profileApi.updateAddress(index, { isDefault: true });
      const data = await profileApi.getAddresses();
      setProfile(prev => ({ ...prev, addresses: data.addresses }));
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  // Wishlist
  const removeWishlist = async (productId) => {
    try {
      await profileApi.removeFromWishlist(productId);
      setWishlist(prev => prev.filter(p => p.id !== productId));
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  // Notification Preferences
  const handleNotifUpdate = async (prefs) => {
    try {
      await profileApi.updateNotificationPrefs(prefs);
      setNotifPrefs(prefs);
      showMessage('success', 'Notification preferences updated');
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  // Settings
  const handleSettingsUpdate = async (s) => {
    try {
      await profileApi.updateSettings(s);
      setSettings(s);
      showMessage('success', 'Settings updated');
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  // Delete Account
  const handleDeleteAccount = async () => {
    try {
      await profileApi.deleteAccount();
      logout();
      navigate('/');
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  // Logout all devices
  const handleLogoutAll = () => {
    localStorage.removeItem('token');
    logout();
    navigate('/');
  };

  const getOrderStatus = (status) => {
    const statuses = ['pending', 'confirmed', 'shipped', 'outForDelivery', 'delivered', 'cancelled', 'returned'];
    const currentIdx = statuses.indexOf(status);
    return {
      current: status,
      steps: statuses.slice(0, 5).map((s, i) => ({
        label: s.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
        done: i <= currentIdx && status !== 'cancelled' && status !== 'returned',
        cancelled: status === 'cancelled' || status === 'returned',
        current: s === status
      }))
    };
  };

  if (!user) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <h2>Please sign in to view your profile</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>You need to be logged in to access this page.</p>
        <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/')}>Go Home</button>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      // 1. DASHBOARD
      case 'dashboard':
        return (
          <div className="profile-dashboard">
            <h2>Welcome, {profile?.fullName || user?.username || 'User'}! 👋</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Manage your account, orders, and preferences from one place.</p>
            <div className="profile-stats-grid">
              <div className="profile-stat-card">
                <span className="stat-icon">📋</span>
                <span className="stat-value">{orders.length}</span>
                <span className="stat-label">Total Orders</span>
              </div>
              <div className="profile-stat-card">
                <span className="stat-icon">❤️</span>
                <span className="stat-value">{wishlist.length || (profile?.wishlist?.length || 0)}</span>
                <span className="stat-label">Wishlist</span>
              </div>
              <div className="profile-stat-card">
                <span className="stat-icon">📍</span>
                <span className="stat-value">{profile?.addresses?.length || 0}</span>
                <span className="stat-label">Addresses</span>
              </div>
              <div className="profile-stat-card">
                <span className="stat-icon">⭐</span>
                <span className="stat-value">{profile?.reviews?.length || 0}</span>
                <span className="stat-label">Reviews</span>
              </div>
            </div>
            <div className="profile-recent-orders" style={{ marginTop: 32 }}>
              <h3 style={{ marginBottom: 16 }}>Recent Orders</h3>
              {orders.slice(0, 3).map(order => (
                <div key={order.id} className="profile-mini-order">
                  <span className="order-id-mini">#{order.id?.slice(-8)}</span>
                  <span className={`order-status-badge status-${order.orderStatus}`}>{order.orderStatus}</span>
                  <span className="order-total-mini">{formatPrice(order.total)}</span>
                  <Link to={`/order/${order.id}/track`} className="btn btn-sm btn-outline">Track</Link>
                </div>
              ))}
              {orders.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No orders yet.</p>}
            </div>
          </div>
        );

      // 2. PERSONAL INFORMATION
      case 'personal-info':
        return (
          <div className="profile-section-content profile-slide-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <button className="btn btn-outline btn-sm" onClick={() => handleSectionChange('dashboard')}>← Back</button>
              <h2 style={{ margin: 0 }}>Personal Information</h2>
            </div>
            <form onSubmit={handleInfoUpdate}>
              <div className="profile-photo-section">
                <div className="profile-photo-wrap">
                  {profile?.profilePhoto ? (
                    <img src={imgUrl(profile.profilePhoto)} alt="Profile" className="profile-photo" />
                  ) : (
                    <div className="profile-avatar-lg">{infoForm.fullName?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || 'U'}</div>
                  )}
                </div>
                <div className="profile-photo-upload">
                  <label className="btn btn-sm btn-outline">Change Photo
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                  </label>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>JPG, PNG or GIF. Max 2MB.</span>
                </div>
              </div>
              <div className="profile-info-grid">
                <div className="profile-info-item">
                  <label>Full Name</label>
                  <input value={infoForm.fullName} onChange={e => setInfoForm({ ...infoForm, fullName: e.target.value })} placeholder="Your full name" />
                </div>
                <div className="profile-info-item">
                  <label>Username</label>
                  <input value={user?.username || ''} disabled style={{ opacity: 0.6 }} />
                </div>
                <div className="profile-info-item">
                  <label>Email Address</label>
                  <input type="email" value={infoForm.email} onChange={e => setInfoForm({ ...infoForm, email: e.target.value })} placeholder="your@email.com" />
                </div>
                <div className="profile-info-item">
                  <label>Mobile Number</label>
                  <input type="tel" value={infoForm.phone} onChange={e => setInfoForm({ ...infoForm, phone: e.target.value })} placeholder="Phone number" />
                </div>
                <div className="profile-info-item">
                  <label>Date of Birth (Optional)</label>
                  <input type="date" value={infoForm.dateOfBirth} onChange={e => setInfoForm({ ...infoForm, dateOfBirth: e.target.value })} />
                </div>
                <div className="profile-info-item">
                  <label>Gender (Optional)</label>
                  <select value={infoForm.gender} onChange={e => setInfoForm({ ...infoForm, gender: e.target.value })}>
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not">Prefer not to say</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button type="button" className="btn btn-outline" onClick={() => handleSectionChange('dashboard')}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        );

      // 3. LOGIN & SECURITY
      case 'login-security':
        return (
          <div className="profile-section-content">
            <h2>Login & Security</h2>

            <div className="profile-subsection">
              <h3>Change Password</h3>
              <form onSubmit={handlePasswordChange}>
                <div className="profile-info-grid">
                  <div className="profile-info-item">
                    <label>Current Password</label>
                    <input type="password" value={passwordForm.currentPassword} onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required />
                  </div>
                  <div className="profile-info-item">
                    <label>New Password</label>
                    <input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} required minLength={6} />
                  </div>
                  <div className="profile-info-item">
                    <label>Confirm New Password</label>
                    <input type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} required />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop: 12 }}>Update Password</button>
              </form>
            </div>

            <div className="profile-subsection">
              <h3>Forgot Password?</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 12 }}>Reset your password using your registered email or phone number.</p>
              <Link to="/forgot-password" className="btn btn-outline btn-sm">Reset Password</Link>
            </div>

            <div className="profile-subsection">
              <h3>Active Sessions</h3>
              <div className="profile-session-item">
                <span className="session-device">💻 Current Device (This browser)</span>
                <span className="session-status-badge">Active Now</span>
              </div>
              <button className="btn btn-danger btn-sm" style={{ marginTop: 12 }} onClick={handleLogoutAll}>🚪 Logout All Devices</button>
            </div>
          </div>
        );

      // 4. ADDRESS BOOK
      case 'addresses':
        return (
          <div className="profile-section-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <h2 style={{ border: 'none', margin: 0, padding: 0 }}>Address Book</h2>
              <button className="btn btn-primary btn-sm" onClick={() => { setAddressForm(emptyAddress); setEditingAddress(null); setShowAddressForm(true); }}>+ Add New Address</button>
            </div>

            {showAddressForm && (
              <div className="profile-address-form">
                <h3>{editingAddress !== null ? 'Edit Address' : 'Add New Address'}</h3>
                <form onSubmit={handleAddressSubmit}>
                  <div className="profile-info-grid">
                    <div className="profile-info-item">
                      <label>Label</label>
                      <select value={addressForm.label} onChange={e => setAddressForm({ ...addressForm, label: e.target.value })}>
                        <option value="Home">🏠 Home</option>
                        <option value="Office">💼 Office</option>
                        <option value="Other">📍 Other</option>
                      </select>
                    </div>
                    <div className="profile-info-item">
                      <label>Full Name</label>
                      <input value={addressForm.fullName} onChange={e => setAddressForm({ ...addressForm, fullName: e.target.value })} required />
                    </div>
                    <div className="profile-info-item">
                      <label>Phone Number</label>
                      <input value={addressForm.phone} onChange={e => setAddressForm({ ...addressForm, phone: e.target.value })} required />
                    </div>
                    <div className="profile-info-item">
                      <label>Pincode</label>
                      <input value={addressForm.pincode} onChange={e => setAddressForm({ ...addressForm, pincode: e.target.value })} required />
                    </div>
                    <div className="profile-info-item full-width">
                      <label>Address Line 1</label>
                      <input value={addressForm.addressLine1} onChange={e => setAddressForm({ ...addressForm, addressLine1: e.target.value })} placeholder="House/Flat No., Building" required />
                    </div>
                    <div className="profile-info-item full-width">
                      <label>Address Line 2 (Optional)</label>
                      <input value={addressForm.addressLine2} onChange={e => setAddressForm({ ...addressForm, addressLine2: e.target.value })} placeholder="Street, Area" />
                    </div>
                    <div className="profile-info-item">
                      <label>City</label>
                      <input value={addressForm.city} onChange={e => setAddressForm({ ...addressForm, city: e.target.value })} required />
                    </div>
                    <div className="profile-info-item">
                      <label>State</label>
                      <input value={addressForm.state} onChange={e => setAddressForm({ ...addressForm, state: e.target.value })} required />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                    <button type="submit" className="btn btn-primary">Save Address</button>
                    <button type="button" className="btn btn-outline" onClick={() => { setShowAddressForm(false); setEditingAddress(null); }}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            <div className="profile-address-list">
              {profile?.addresses?.map((addr, i) => (
                <div key={i} className={`profile-address-card ${addr.isDefault ? 'default-address' : ''}`}>
                  <div className="address-header">
                    <span className="address-label">{addr.label === 'Home' ? '🏠' : addr.label === 'Office' ? '💼' : '📍'} {addr.label}</span>
                    {addr.isDefault && <span className="default-badge">Default</span>}
                  </div>
                  <p><strong>{addr.fullName}</strong></p>
                  <p>{addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}</p>
                  <p>{addr.city}, {addr.state} - {addr.pincode}</p>
                  <p>📞 {addr.phone}</p>
                  <div className="address-actions">
                    <button className="btn btn-sm btn-outline" onClick={() => editAddress(addr, i)}>Edit</button>
                    <button className="btn btn-sm btn-outline" onClick={() => deleteAddress(i)} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>Delete</button>
                    {!addr.isDefault && <button className="btn btn-sm btn-outline" onClick={() => setDefaultAddress(i)}>Set as Default</button>}
                  </div>
                </div>
              ))}
              {(!profile?.addresses || profile.addresses.length === 0) && !showAddressForm && (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>No addresses saved yet. Click "Add New Address" to get started.</p>
              )}
            </div>
          </div>
        );

      // 5. MY ORDERS
      case 'orders':
        return (
          <div className="profile-section-content">
            <h2>My Orders</h2>
            <div className="order-filter-tabs">
              {['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'].map(status => (
                <button key={status} className="order-filter-btn" onClick={() => {
                  const filtered = status === 'all' ? orders : orders.filter(o => o.orderStatus === status);
                  setOrders(prev => prev);
                  document.querySelectorAll('.order-filter-btn').forEach(b => b.classList.remove('active'));
                  document.querySelector(`.order-filter-btn[data-status="${status}"]`)?.classList.add('active');
                }} data-status={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</button>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              {orders.map(order => (
                <div key={order.id} className="order-card">
                  <div className="order-card-header">
                    <div>
                      <span className="order-id">Order #{order.id?.slice(-8)}</span>
                      <span className="order-date">{new Date(order.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                    <span className={`order-status-badge status-${order.orderStatus}`}>{order.orderStatus}</span>
                  </div>
                  <div className="order-card-items">
                    {order.items?.slice(0, 3).map((item, idx) => (
                      <img key={idx} src={imgUrl(item.image)} alt={item.title} className="order-item-thumb" />
                    ))}
                    {order.items?.length > 3 && <div className="order-more-items">+{order.items.length - 3}</div>}
                  </div>
                  <div className="order-card-footer">
                    <span className="order-total">{formatPrice(order.total)}</span>
                    <div className="order-card-actions">
                      <Link to={`/order/${order.id}/track`} className="btn btn-sm btn-outline">Track Order</Link>
                      <Link to={`/order/${order.id}/track`} className="btn btn-sm btn-outline">Download Invoice</Link>
                      <button className="btn btn-sm btn-primary">Buy Again</button>
                    </div>
                  </div>
                </div>
              ))}
              {orders.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>No orders yet. Start shopping!</p>}
            </div>
          </div>
        );

      // 6. WISHLIST
      case 'wishlist':
        return (
          <div className="profile-section-content">
            <h2>Wishlist ❤️</h2>
            <div className="wishlist-grid">
              {wishlist.map(product => (
                <div key={product.id} className="wishlist-item">
                  <img src={imgUrl(product.images?.[0]?.src)} alt={product.title} />
                  <div className="wishlist-item-info">
                    <h4>{product.title}</h4>
                    <span className="wishlist-price">{formatPrice(product.variants?.[0]?.price)}</span>
                  </div>
                  <div className="wishlist-actions">
                    <button className="btn btn-sm btn-primary" onClick={() => { /* Add to cart */ }}>Move to Cart</button>
                    <button className="btn btn-sm btn-outline" style={{ color: 'var(--danger)' }} onClick={() => removeWishlist(product.id)}>Remove</button>
                  </div>
                </div>
              ))}
              {wishlist.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40, gridColumn: '1 / -1' }}>Your wishlist is empty.</p>}
            </div>
          </div>
        );

      // 7. SHOPPING CART
      case 'cart':
        return (
          <div className="profile-section-content">
            <h2>Shopping Cart</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>View and manage items in your shopping cart.</p>
            <Link to="/checkout" className="btn btn-primary">View Cart →</Link>
          </div>
        );

      // 8. PAYMENT METHODS
      case 'payment':
        return (
          <div className="profile-section-content">
            <h2>Payment Methods</h2>
            <div className="payment-method-card">
              <span className="payment-icon">💵</span>
              <div><strong>Cash on Delivery</strong><p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Pay when your order arrives</p></div>
              <span className="payment-status">Active</span>
            </div>
            <div className="payment-method-card">
              <span className="payment-icon">📱</span>
              <div><strong>UPI</strong><p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Pay via Google Pay, PhonePe, Paytm</p></div>
              <span className="payment-status">Available</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 16, fontStyle: 'italic' }}>More payment methods coming soon.</p>
          </div>
        );

      // 9. COUPONS & OFFERS
      case 'coupons':
        return (
          <div className="profile-section-content">
            <h2>Coupons & Offers</h2>
            <div className="coupon-card">
              <div className="coupon-code">WELCOME50</div>
              <div className="coupon-details">
                <strong>50% Off on First Order</strong>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Use code WELCOME50 on your first purchase. Min. order ₹299.</p>
              </div>
              <span className="coupon-valid">Valid</span>
            </div>
            <div className="coupon-card used">
              <div className="coupon-code">FREESHIP</div>
              <div className="coupon-details">
                <strong>Free Shipping</strong>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Free shipping on orders above ₹299</p>
              </div>
              <span className="coupon-valid used">Used</span>
            </div>
          </div>
        );

      // 10. NOTIFICATIONS
      case 'notifications':
        return (
          <div className="profile-section-content">
            <h2>Notification Preferences</h2>
            {[
              { key: 'orderUpdates', label: 'Order Updates', desc: 'Get notified about your order status changes' },
              { key: 'offers', label: 'Offers & Deals', desc: 'Receive exclusive offers and discount alerts' },
              { key: 'promotional', label: 'Promotional Emails', desc: 'Weekly newsletters and promotional content' },
            ].map(item => (
              <div key={item.key} className="notif-toggle-item">
                <div className="notif-toggle-info">
                  <strong>{item.label}</strong>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.desc}</p>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={notifPrefs[item.key]} onChange={() => {
                    const newPrefs = { ...notifPrefs, [item.key]: !notifPrefs[item.key] };
                    handleNotifUpdate(newPrefs);
                  }} />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            ))}
          </div>
        );

      // 11. REVIEWS & RATINGS
      case 'reviews':
        return (
          <div className="profile-section-content">
            <h2>Reviews & Ratings</h2>
            {reviews.map(review => (
              <div key={review.id} className="review-card">
                <div className="review-product-info">
                  <img src={imgUrl(review.product?.images?.[0]?.src)} alt={review.product?.title} />
                  <div>
                    <strong>{review.product?.title || 'Product'}</strong>
                    <div className="review-stars">{'⭐'.repeat(review.rating || 5)}</div>
                  </div>
                </div>
                {review.title && <h4 style={{ margin: '8px 0 4px' }}>{review.title}</h4>}
                <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>{review.comment}</p>
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <button className="btn btn-sm btn-outline">Edit</button>
                  <button className="btn btn-sm btn-outline" style={{ color: 'var(--danger)' }}>Delete</button>
                </div>
              </div>
            ))}
            {reviews.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>You haven't reviewed any products yet.</p>}
          </div>
        );

      // 12. SUPPORT
      case 'support':
        return (
          <div className="profile-section-content">
            <h2>Support & Help</h2>
            <div className="support-grid">
              <Link to="/help" className="support-card">📖 Help Center</Link>
              <a href="mailto:support@tansoura.com" className="support-card">📧 Contact Us via Email</a>
              <a href="tel:+919285471138" className="support-card">📞 Call Us: +91 9285471138</a>
              <Link to="/returns" className="support-card">📦 Return Request</Link>
              <Link to="/complaints" className="support-card">⚠️ Raise a Complaint</Link>
            </div>
          </div>
        );

      // 13. ACCOUNT SETTINGS
      case 'settings':
        return (
          <div className="profile-section-content">
            <h2>Account Settings</h2>
            <div className="profile-info-grid">
              <div className="profile-info-item">
                <label>Language</label>
                <select value={settings.language} onChange={e => handleSettingsUpdate({ ...settings, language: e.target.value })}>
                  <option value="en">English</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                </select>
              </div>
              <div className="profile-info-item">
                <label>Theme</label>
                <select value={settings.theme} onChange={e => handleSettingsUpdate({ ...settings, theme: e.target.value })}>
                  <option value="light">☀️ Light</option>
                  <option value="dark">🌙 Dark</option>
                </select>
              </div>
            </div>
          </div>
        );

      // 14. PRIVACY
      case 'privacy':
        return (
          <div className="profile-section-content">
            <h2>Privacy</h2>
            <div className="privacy-actions">
              <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 12 }}>📥 Download My Data</button>
              <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 12 }}>🔒 Privacy Settings</button>
              {!confirmDelete ? (
                <button className="btn btn-danger" style={{ width: '100%' }} onClick={() => setConfirmDelete(true)}>🗑️ Delete Account</button>
              ) : (
                <div className="delete-confirm">
                  <p style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: 12 }}>⚠️ Are you sure you want to delete your account? This action cannot be undone.</p>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-danger" onClick={handleDeleteAccount}>Yes, Delete My Account</button>
                    <button className="btn btn-outline" onClick={() => setConfirmDelete(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      // 15. REFERRAL PROGRAM
      case 'referral':
        return (
          <div className="profile-section-content">
            <h2>Referral Program</h2>
            <div className="referral-box">
              <div className="referral-code-section">
                <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>Your Referral Code</p>
                <div className="referral-code">{user?.username?.toUpperCase() || 'TANSOURA'}</div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>📋 Copy Code</button>
              </div>
              <div className="referral-stats">
                <div className="referral-stat"><strong>0</strong><span>Friends Referred</span></div>
                <div className="referral-stat"><strong>₹0</strong><span>Rewards Earned</span></div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 16 }}>Share your code with friends. You both get ₹50 off! (Coming soon)</p>
            </div>
          </div>
        );

      // 16. RECENTLY VIEWED
      case 'recently-viewed':
        return (
          <div className="profile-section-content">
            <h2>Recently Viewed Products</h2>
            {profile?.recentlyViewed?.length > 0 ? (
              <div className="recently-viewed-grid">
                {profile.recentlyViewed.map((id, i) => (
                  <div key={i} className="recent-item">
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Product ID: {id}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>No recently viewed products.</p>
            )}
          </div>
        );

      default:
        return <p>Select a section from the sidebar.</p>;
    }
  };

  return (
    <>
      <SEO title="My Profile - Tansoura" description="Manage your account, orders, wishlist, addresses and more on Tansoura." />

      {message.text && (
        <div className={`profile-message ${message.type}`}>
          {message.type === 'success' ? '✅ ' : '⚠️ '}{message.text}
        </div>
      )}

      <div className="profile-page container">
        <div className="profile-sidebar">
          <div className="profile-sidebar-header">
            <div className="profile-avatar">
              {profile?.profilePhoto ? (
                <img src={imgUrl(profile.profilePhoto)} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                profile?.fullName?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || 'U'
              )}
            </div>
            <h3>{profile?.fullName || user?.username || 'User'}</h3>
            <p>{user?.email || ''}</p>
          </div>
          <nav className="profile-sidebar-nav">
            {SIDEBAR_ITEMS.map(item => (
              <button
                key={item.id}
                className={`profile-nav-item ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => handleSectionChange(item.id)}
              >
                <span className="profile-nav-icon">{item.icon}</span>
                <span className="profile-nav-label">{item.label}</span>
              </button>
            ))}
            <button className="profile-nav-item profile-nav-logout" onClick={() => { logout(); navigate('/'); }}>
              <span className="profile-nav-icon">🚪</span>
              <span className="profile-nav-label">Logout</span>
            </button>
          </nav>
        </div>
        <div className="profile-content">{renderContent()}</div>
      </div>
    </>
  );
}