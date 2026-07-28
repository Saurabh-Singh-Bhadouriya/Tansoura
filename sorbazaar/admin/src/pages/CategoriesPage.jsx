import { useState, useEffect } from 'react';
import { categories as categoriesApi, imgUrl } from '../api';

const emptyCategory = {
  name: '',
  handle: '',
  description: '',
  active: true,
  order: 0
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyCategory);
  const [image, setImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = () => {
    setLoading(true);
    categoriesApi.list()
      .then(setCategories)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAdd = () => { setEditing(null); setForm(emptyCategory); setImage(null); setShowForm(true); };
  const openEdit = (cat) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      handle: cat.handle || '',
      description: cat.description || '',
      active: cat.active,
      order: cat.order || 0
    });
    setImage(null);
    setShowForm(true);
  };

  const update = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('handle', form.handle);
      fd.append('description', form.description);
      fd.append('active', form.active);
      fd.append('order', form.order);
      if (image) fd.append('image', image);

      if (editing) await categoriesApi.update(editing._id, fd);
      else await categoriesApi.create(fd);

      setMessage('Category saved successfully!');
      setShowForm(false);
      load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this category?')) return;
    await categoriesApi.delete(id);
    load();
  };

  return (
    <>
      <div className="page-header">
        <h1>Categories</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Category</button>
        </div>
      </div>

      {message && <div className={message.includes('success') ? 'success' : 'error'}>{message}</div>}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Image</th><th>Name</th><th>Handle</th><th>Description</th><th>Order</th><th>Active</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={7}>Loading...</td></tr> :
                categories.map(cat => (
                  <tr key={cat._id}>
                    <td>
                      {cat.image ? (
                        <img className="table-img" src={imgUrl(cat.image)} alt="" />
                      ) : (
                        <div className="table-img" style={{ background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📁</div>
                      )}
                    </td>
                    <td><strong>{cat.name}</strong></td>
                    <td><span style={{ color: 'var(--text-muted)' }}>{cat.handle}</span></td>
                    <td><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{cat.description?.slice(0, 50)}</span></td>
                    <td>{cat.order}</td>
                    <td>
                      <span style={{
                        color: cat.active ? 'var(--success)' : 'var(--text-muted)',
                        fontWeight: 600
                      }}>
                        {cat.active ? '✓ Active' : '✗ Hidden'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline" onClick={() => openEdit(cat)}>Edit</button>{' '}
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(cat._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Category' : 'Add Category'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-grid">
                <div className="form-group"><label>Category Name *</label><input value={form.name} onChange={e => update('name', e.target.value)} required /></div>
                <div className="form-group"><label>Handle (URL)</label><input value={form.handle} onChange={e => update('handle', e.target.value)} placeholder="auto-generated if empty" /></div>
                <div className="form-group full"><label>Description</label><textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3} /></div>
                <div className="form-group"><label>Display Order</label><input type="number" value={form.order} onChange={e => update('order', parseInt(e.target.value) || 0)} /></div>
                <div className="form-group"><label>Active</label>
                  <select value={form.active} onChange={e => update('active', e.target.value === 'true')}>
                    <option value="true">Yes</option><option value="false">No</option>
                  </select>
                </div>
                <div className="form-group"><label>Category Image</label>
                  <input type="file" accept="image/*" onChange={e => setImage(e.target.files[0])} />
                  {editing?.image && (
                    <div className="preview-images"><img src={imgUrl(editing.image)} alt="" /></div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Category'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}