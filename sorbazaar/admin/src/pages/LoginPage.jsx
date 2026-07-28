import { useState } from 'react';
import { auth, wakeBackend } from '../api';

export default function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ login: 'Sourabh01', password: 'Sourabh123' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [wakingUp, setWakingUp] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // First, try to wake up the backend (Render free tier sleeps after inactivity)
    setWakingUp(true);
    setError('⏳ Waking up the backend server... Please wait.');
    await wakeBackend();
    setWakingUp(false);
    
    try {
      const data = await auth.login(form);
      if (data.user.role !== 'admin') throw new Error('Admin access required');
      localStorage.setItem('adminToken', data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Decorative shapes */}
      <div className="login-shape login-shape-1"></div>
      <div className="login-shape login-shape-2"></div>
      <div className="login-shape login-shape-3"></div>
      
      <div className="login-container">
        {/* Left - Brand Side */}
        <div className="login-brand">
          <div className="login-brand-content">
            <div className="login-brand-icon">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <h1 className="login-brand-title">Tansoura</h1>
            <p className="login-brand-subtitle">Admin Dashboard</p>
            <div className="login-brand-features">
              <div className="login-feature">
                <span className="login-feature-icon">📦</span>
                <span>Manage Products</span>
              </div>
              <div className="login-feature">
                <span className="login-feature-icon">🖼️</span>
                <span>Control Sliders</span>
              </div>
              <div className="login-feature">
                <span className="login-feature-icon">🏷️</span>
                <span>Create Offers</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Login Form */}
        <div className="login-form-side">
          <div className="login-form-box">
            <div className="login-form-header">
              <h2>Welcome Back</h2>
              <p>Sign in to continue to admin panel</p>
            </div>

            {error && (
              <div className="login-error">
                <span className="login-error-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="login-input-group">
                <label className="login-label">Username or Email</label>
                <div className="login-input-wrapper">
                  <span className="login-input-icon">👤</span>
                  <input
                    type="text"
                    value={form.login}
                    onChange={e => setForm({ ...form, login: e.target.value })}
                    placeholder="Enter your username"
                    required
                    className="login-input"
                  />
                  {form.login && <span className="login-input-check">✓</span>}
                </div>
              </div>

              <div className="login-input-group">
                <label className="login-label">Password</label>
                <div className="login-input-wrapper">
                  <span className="login-input-icon">🔒</span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="Enter your password"
                    required
                    className="login-input"
                  />
                </div>
              </div>

              <button
                type="submit"
                className={`login-btn ${loading ? 'login-btn-loading' : ''}`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="login-spinner"></span>
                    Verifying...
                  </>
                ) : (
                  <>
                    Sign In
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="login-footer-text">
              <span>🔐 Secure admin access only</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}