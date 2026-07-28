import { useState, useEffect } from 'react';
import { offers as offersApi, NAV_PAGES, imgUrl, mediaUrl } from '../api';

const emptyOffer = { title: '', description: '', link: '', type: 'banner', navPage: 'home', position: 0, active: true };

export default function OffersPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyOffer);
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);

  const load = () => {
    setLoading(true);
    offersApi.list().then(setList).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openAdd = () => { setEditing(null); setForm(emptyOffer); setImage(null); setVideo(null); setShowForm(true); };
  const openEdit = (o) => { setEditing(o); setForm(o); setImage(null); setVideo(null); setShowForm(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('offerData', JSON.stringify(form));
    if (image) fd.append('image', image);
    if (video) fd.append('video', video);
    if (editing) await offersApi.update(editing._id, fd);
    else await offersApi.create(fd);
    setShowForm(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this offer/banner?')) return;
    await offersApi.delete(id);
    load();
  };

  return (
    <>
      <div className="page-header">
        <h1>Offers & Banners</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Offer/Banner</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Preview</th><th>Title</th><th>Type</th><th>Nav Page</th><th>Active</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6}>Loading...</td></tr> :
                list.map(o => (
                  <tr key={o._id}>
                    <td>
                      {o.video ? (
                        <video src={mediaUrl(o.video)} style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6 }} muted preload="metadata" />
                      ) : o.image ? (
                        <img className="table-img" src={imgUrl(o.image)} alt="" style={{ width: 80, height: 40 }} />
                      ) : '—'}
                    </td>
                    <td><strong>{o.title}</strong><br /><small>{o.description}</small></td>
                    <td>{o.type}</td>
                    <td>{o.navPage}</td>
                    <td>{o.active ? '✅' : '❌'}</td>
                    <td>
                      <button className="btn btn-sm btn-outline" onClick={() => openEdit(o)}>Edit</button>{' '}
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(o._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit' : 'Add'} Offer / Banner</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-group"><label>Title</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
              <div className="form-group"><label>Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="form-group"><label>Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="banner">Banner</option><option value="offer">Offer</option><option value="promo">Promo</option>
                </select>
              </div>
              <div className="form-group"><label>Nav Page</label>
                <select value={form.navPage} onChange={e => setForm({ ...form, navPage: e.target.value })}>
                  {NAV_PAGES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Link URL</label><input value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} /></div>
              <div className="form-group"><label>Position</label><input type="number" value={form.position} onChange={e => setForm({ ...form, position: parseInt(e.target.value) })} /></div>
              <div className="form-group"><label>Banner Image</label><input type="file" accept="image/*" onChange={e => setImage(e.target.files[0])} /></div>
              <div className="form-group"><label>Banner Video (MP4, WebM, MOV)</label><input type="file" accept="video/*" onChange={e => setVideo(e.target.files[0])} /></div>
              {form.video && !video && (
                <video src={mediaUrl(form.video)} controls style={{ width: '100%', height: 120, objectFit: 'contain', borderRadius: 8, marginBottom: 16, background: '#000' }} />
              )}
              {form.image && !image && !form.video && <img src={imgUrl(form.image)} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 16 }} />}
              {video && (
                <video src={URL.createObjectURL(video)} controls style={{ width: '100%', height: 120, objectFit: 'contain', borderRadius: 8, marginBottom: 16, background: '#000' }} />
              )}
              <button className="btn btn-primary" type="submit">Save</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
