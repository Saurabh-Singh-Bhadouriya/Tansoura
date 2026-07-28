import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';

export default function AuthModal() {
  const { authModal, setAuthModal, login, signup, forgotPassword, resetPassword } = useApp();
  const [tab, setTab] = useState('login');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    login: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (!authModal) return;
    setTab(authModal === 'signup' ? 'signup' : 'login');
    setError('');
    setNotice('');
  }, [authModal]);

  if (!authModal) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      if (tab === 'login') {
        await login(form.login, form.password);
      } else if (tab === 'signup') {
        await signup({ username: form.username, email: form.email, phone: form.phone, password: form.password });
      } else if (tab === 'forgot') {
        const data = await forgotPassword(form.login);
        setNotice(data.otp ? `OTP sent. Dev OTP: ${data.otp}` : data.message);
        setTab('reset');
      } else {
        if (form.newPassword !== form.confirmPassword) throw new Error('Passwords do not match');
        await resetPassword(form.login, form.otp, form.newPassword);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const switchTab = (nextTab) => {
    setTab(nextTab);
    setError('');
    setNotice('');
  };

  const title = {
    login: 'Welcome Back',
    signup: 'Create Account',
    forgot: 'Reset Password',
    reset: 'Enter OTP'
  }[tab];

  const subtitle = {
    login: 'Login to continue checkout',
    signup: 'Sign up to start shopping',
    forgot: 'Enter your email or phone number',
    reset: 'Enter OTP 1234 and create a new password'
  }[tab];

  return (
    <div className="modal-overlay" onClick={() => setAuthModal(null)}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={() => setAuthModal(null)}>&times;</button>
        <h2>{title}</h2>
        <p className="sub">{subtitle}</p>

        <div className="form-tabs">
          <button className={`form-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => switchTab('login')}>Login</button>
          <button className={`form-tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => switchTab('signup')}>Sign Up</button>
        </div>

        {error && <div className="form-error">{error}</div>}
        {notice && <div className="form-success">{notice}</div>}

        <form onSubmit={handleSubmit}>
          {tab === 'login' ? (
            <>
              <div className="form-group">
                <label>Username / Email / Phone</label>
                <input value={form.login} onChange={update('login')} required placeholder="user01" />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" value={form.password} onChange={update('password')} required placeholder="********" />
              </div>
            </>
          ) : tab === 'signup' ? (
            <>
              <div className="form-group">
                <label>Username</label>
                <input value={form.username} onChange={update('username')} required placeholder="your_username" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.email} onChange={update('email')} placeholder="email@example.com" />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input value={form.phone} onChange={update('phone')} placeholder="9876543210" />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" value={form.password} onChange={update('password')} required placeholder="********" />
              </div>
            </>
          ) : tab === 'forgot' ? (
            <div className="form-group">
              <label>Email / Phone</label>
              <input value={form.login} onChange={update('login')} required placeholder="email@example.com or 9876543210" />
            </div>
          ) : (
            <>
              <div className="form-group">
                <label>OTP</label>
                <input value={form.otp} onChange={update('otp')} required placeholder="1234" inputMode="numeric" />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" value={form.newPassword} onChange={update('newPassword')} required placeholder="********" />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input type="password" value={form.confirmPassword} onChange={update('confirmPassword')} required placeholder="********" />
              </div>
            </>
          )}
          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : tab === 'login' ? 'Login' : tab === 'signup' ? 'Create Account' : tab === 'forgot' ? 'Send OTP' : 'Reset Password'}
          </button>
        </form>

        <div className="form-switch">
          {tab === 'login' ? (
            <>
              <button onClick={() => switchTab('forgot')}>Forgot password?</button>
              <span> | </span>
              Don't have an account? <button onClick={() => switchTab('signup')}>Sign Up</button>
            </>
          ) : tab === 'signup' ? (
            <>Already have an account? <button onClick={() => switchTab('login')}>Login</button></>
          ) : tab === 'reset' ? (
            <>Wrong account? <button onClick={() => switchTab('forgot')}>Start again</button></>
          ) : (
            <>Remembered it? <button onClick={() => switchTab('login')}>Login</button></>
          )}
        </div>
      </div>
    </div>
  );
}
