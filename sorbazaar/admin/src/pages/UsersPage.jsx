import { useState, useEffect } from 'react';
import { apiFetch } from '../api';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    username: '',
    email: '',
    phone: '',
    fullName: '',
    role: 'user',
    password: '',
    addresses: []
  });

  const load = () => {
    setLoading(true);
    apiFetch('/users')
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ username: '', email: '', phone: '', fullName: '', role: 'user', password: '', addresses: [] });
    setShowForm(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({
      username: u.username,
      email: u.email || '',
      phone: u.phone || '',
      fullName: u.fullName || '',
      role: u.role || 'user',
      password: '',
      addresses: u.addresses || []
    });
    setShowForm(true);
  };

  const update = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      if (editing) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await apiFetch(`/users/${editing._id}`, { method: 'PUT', body: JSON.stringify(payload) });
        setMessage('User updated successfully!');
      } else {
        if (!form.password) {
          setMessage('Password is required for new user');
          return;
        }
        await apiFetch('/users', { method: 'POST', body: JSON.stringify(form) });
        setMessage('User created successfully!');
      }
      setShowForm(false);
      load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleBan = async (id) => {
    if (!confirm('Toggle ban status for this user?')) return;
    try {
      await apiFetch(`/users/${id}/ban`, { method: 'PUT' });
      load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this user permanently?')) return;
    try {
      await apiFetch(`/users/${id}`, { method: 'DELETE' });
      setMessage('User deleted successfully');
      load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>Users</h1>
        <button className="btn btn-primary" onClick={openAdd}>
          + Add New User
        </button>
      </div>

      {message && <div className={message.includes('success') ? 'success' : 'error'}>{message}</div>}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8}>Loading...</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <strong>{u.fullName || 'N/A'}</strong>
                    </td>
                    <td>{u.username}</td>
                    <td>{u.email || '-'}</td>
                    <td>{u.phone || '-'}</td>
                    <td>{u.role}</td>
                    <td>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 700,
                          background: u.status === 'banned' ? 'var(--danger)' : 'var(--success)',
                          color: 'white'
                        }}
                      >
                        {u.status === 'banned' ? 'Banned' : 'Active'}
                      </span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                    <td>
                      <button className="btn btn-sm btn-outline" onClick={() => openEdit(u)}>
                        Edit
                      </button>{' '}
                      <button className="btn btn-sm btn-outline" onClick={() => handleBan(u._id)}>
                        {u.status === 'banned' ? 'Unban' : 'Ban'}
                      </button>{' '}
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u._id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit User' : 'Add New User'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Username *</label>
                  <input
                    value={form.username}
                    onChange={(e) => update('username', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    value={form.fullName}
                    onChange={(e) => update('fullName', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Password {editing ? '(leave blank to keep)' : '*'}</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                    required={!editing}
                  />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => update('role', e.target.value)}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}