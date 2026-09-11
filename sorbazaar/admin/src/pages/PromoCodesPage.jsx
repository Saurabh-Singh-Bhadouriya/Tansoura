import { useState, useEffect } from 'react';
import { apiFetch } from '../api';

const emptyPromo = {
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: '',
  minOrderAmount: 0,
  maxDiscountAmount: '',
  usageLimit: 0,
  perUserLimit: 1,
  isActive: true,
  validFrom: new Date().toISOString().split('T')[0],
  validUntil: ''
};

export default function PromoCodesPage() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyPromo);
  const [message, setMessage] = useState('');

  const load = () => {
    setLoading(true);
    apiFetch('/promo/admin/all')
      .then(setCodes)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyPromo, validFrom: new Date().toISOString().split('T')[0] });
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      ...c,
      validFrom: c.validFrom ? new Date(c.validFrom).toISOString().split('T')[0] : '',
      validUntil: c.validUntil ? new Date(c.validUntil).toISOString().split('T')[0] : ''
    });
    setShowForm(true);
  };

  const update = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const payload = {
        ...form,
        code: form.code.toUpperCase(),
        discountValue: parseFloat(form.discountValue),
        minOrderAmount: parseFloat(form.minOrderAmount) || 0,
        maxDiscountAmount: form.maxDiscountAmount ? parseFloat(form.maxDiscountAmount) : undefined
      };
      if (editing) {
        await apiFetch(`/promo/admin/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        setMessage('Promo code updated successfully!');
      } else {
        await apiFetch('/promo/admin/create', { method: 'POST', body: JSON.stringify(payload) });
        setMessage('Promo code created successfully!');
      }
      setShowForm(false);
      load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this promo code?')) return;
    try {
      await apiFetch(`/promo/admin/${id}`, { method: 'DELETE' });
      setMessage('Promo code deleted');
      load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>Promo Codes</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Promo Code</button>
      </div>

      {message && <div className={message.includes('success') ? 'success' : 'error'}>{message}</div>}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Description</th>
                <th>Type</th>
                <th>Value</th>
                <th>Min Order</th>
                <th>Usage</th>
                <th>Valid Until</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9}>Loading...</td></tr>
              ) : codes.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center' }}>No promo codes found</td></tr>
              ) : (
                codes.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.code}</strong></td>
                    <td>{c.description || '-'}</td>
                    <td>{c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`}</td>
                    <td>{c.discountType === 'percentage' ? c.discountValue + '%' : '₹' + c.discountValue}</td>
                    <td>₹{c.minOrderAmount}</td>
                    <td>{c.usageLimit === 0 ? '∞' : `${c.usageCount}/${c.usageLimit}`}</td>
                    <td>{c.validUntil ? new Date(c.validUntil).toLocaleDateString('en-IN') : 'No expiry'}</td>
                    <td>{c.isActive ? '✅' : '❌'}</td>
                    <td>
                      <button className="btn btn-sm btn-outline" onClick={() => openEdit(c)}>Edit</button>{' '}
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id)}>Delete</button>
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
              <h2>{editing ? 'Edit' : 'Add'} Promo Code</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Promo Code *</label>
                  <input
                    value={form.code}
                    onChange={(e) => update('code', e.target.value.toUpperCase())}
                    required
                    placeholder="e.g., SAVE20"
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input
                    value={form.description}
                    onChange={(e) => update('description', e.target.value)}
                    placeholder="e.g., 20% off on all products"
                  />
                </div>
                <div className="form-group">
                  <label>Discount Type *</label>
                  <select
                    value={form.discountType}
                    onChange={(e) => update('discountType', e.target.value)}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Discount Value *</label>
                  <input
                    type="number"
                    value={form.discountValue}
                    onChange={(e) => update('discountValue', e.target.value)}
                    required
                    placeholder={form.discountType === 'percentage' ? 'e.g., 20' : 'e.g., 100'}
                  />
                </div>
                <div className="form-group">
                  <label>Minimum Order Amount (₹)</label>
                  <input
                    type="number"
                    value={form.minOrderAmount}
                    onChange={(e) => update('minOrderAmount', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label>Max Discount (₹) - Optional for %</label>
                  <input
                    type="number"
                    value={form.maxDiscountAmount || ''}
                    onChange={(e) => update('maxDiscountAmount', e.target.value)}
                    placeholder="No limit"
                  />
                </div>
                <div className="form-group">
                  <label>Usage Limit (0 = unlimited)</label>
                  <input
                    type="number"
                    value={form.usageLimit}
                    onChange={(e) => update('usageLimit', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Per User Limit</label>
                  <input
                    type="number"
                    value={form.perUserLimit}
                    onChange={(e) => update('perUserLimit', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Valid From</label>
                  <input
                    type="date"
                    value={form.validFrom}
                    onChange={(e) => update('validFrom', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Valid Until (optional)</label>
                  <input
                    type="date"
                    value={form.validUntil}
                    onChange={(e) => update('validUntil', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={form.isActive}
                    onChange={(e) => update('isActive', e.target.value === 'true')}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
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
                  Save Promo Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}