import { useState, useEffect } from 'react';
import { sliders as slidersApi, NAV_PAGES, imgUrl, mediaUrl } from '../api';

const emptySlider = { title: '', subtitle: '', link: '', buttonText: 'Shop Now', navPage: 'home', position: 0, active: true };

export default function SlidersPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySlider);
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [filterPage, setFilterPage] = useState('all');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const load = () => {
    setLoading(true);
    slidersApi.list().then(setList).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = filterPage === 'all' ? list : list.filter(s => s.navPage === filterPage);

  const openAdd = () => { setEditing(null); setForm(emptySlider); setImage(null); setVideo(null); setShowForm(true); setSaveError(''); };
  const openEdit = (s) => { setEditing(s); setForm(s); setImage(null); setVideo(null); setShowForm(true); setSaveError(''); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      const fd = new FormData();
      fd.append('sliderData', JSON.stringify(form));
      if (image) fd.append('image', image);
      if (video) fd.append('video', video);
      if (editing) await slidersApi.update(editing._id, fd);
      else await slidersApi.create(fd);
      setShowForm(false);
      load();
    } catch (err) {
      setSaveError(err.message || 'Failed to save slider. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete slider?')) return;
    await slidersApi.delete(id);
    load();
  };

  return (
    <>
      <div className="page-header">
        <h1>Sliders</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Slider</button>
      </div>

      <div className="card">
        <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className={`btn btn-sm ${filterPage === 'all' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilterPage('all')}>All Pages</button>
          {NAV_PAGES.map(p => (
            <button key={p} className={`btn btn-sm ${filterPage === p ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilterPage(p)}>{p}</button>
          ))}
        </div>

        <div className="table-wrap">
          <table>
            <thead><tr><th>Media</th><th>Type</th><th>Title</th><th>Nav Page</th><th>Position</th><th>Active</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7}>Loading...</td></tr> :
                filtered.map(s => (
                  <tr key={s._id}>
                    <td>
                      {s.video ? (
                        <video src={mediaUrl(s.video)} alt="" style={{ width: 80, height: 40, objectFit: 'cover', borderRadius: 6 }} />
                      ) : s.image ? (
                        <img className="table-img" src={imgUrl(s.image)} alt="" style={{ width: 80, height: 40 }} />
                      ) : (
                        <span style={{ color: '#999', fontSize: 12 }}>No media</span>
                      )}
                    </td>
                    <td>{s.video ? '🎬 Video' : '🖼️ Image'}</td>
                    <td><strong>{s.title}</strong><br /><small>{s.subtitle}</small></td>
                    <td>{s.navPage}</td>
                    <td>{s.position}</td>
                    <td>{s.active ? '✅' : '❌'}</td>
                    <td>
                      <button className="btn btn-sm btn-outline" onClick={() => openEdit(s)}>Edit</button>{' '}
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s._id)}>Delete</button>
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
              <h2>{editing ? 'Edit Slider' : 'Add Slider'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              {saveError && (
                <div className="error" style={{ marginBottom: 12, padding: 10, background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: 6, fontSize: 13 }}>
                  {saveError}
                </div>
              )}
              <div className="form-group"><label>Title</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
              <div className="form-group"><label>Subtitle</label><input value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} /></div>
              <div className="form-group"><label>Nav Page</label>
                <select value={form.navPage} onChange={e => setForm({ ...form, navPage: e.target.value })}>
                  {NAV_PAGES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Link URL</label><input value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} /></div>
              <div className="form-group"><label>Button Text</label><input value={form.buttonText} onChange={e => setForm({ ...form, buttonText: e.target.value })} /></div>
              <div className="form-group"><label>Position</label><input type="number" value={form.position} onChange={e => setForm({ ...form, position: parseInt(e.target.value) })} /></div>

              <div className="form-group">
                <label>Slider Image</label>
                <input type="file" accept="image/*" onChange={e => setImage(e.target.files[0])} />
                {form.image && !image && !form.video && (
                  <img src={imgUrl(form.image)} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginTop: 16 }} />
                )}
              </div>

              <div className="form-group">
                <label>Slider Video (mp4, webm, mov)</label>
                <input type="file" accept="video/*" onChange={e => setVideo(e.target.files[0])} />
                {form.video && !video && (
                  <video src={mediaUrl(form.video)} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginTop: 16 }} />
                )}
                {video && (
                  <video src={URL.createObjectURL(video)} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginTop: 16 }} />
                )}
                <small style={{ display: 'block', marginTop: 4, color: '#718096' }}>
                  Note: Adding a video will replace the image as the slide media.
                </small>
              </div>

              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Saving...' : (editing ? 'Update Slider' : 'Save Slider')}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
