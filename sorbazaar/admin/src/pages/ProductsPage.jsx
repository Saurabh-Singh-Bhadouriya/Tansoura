import { useState, useEffect } from 'react';
import { products as productsApi, NAV_PAGES, PLATFORMS, imgUrl, mediaUrl, apiFetch } from '../api';

const emptyProduct = {
  title: '', handle: '', bodyHtml: '', vendor: '', productCategory: '', type: '',
  tags: '', navPage: 'home', published: true, status: 'active', platform: 'manual',
  option1Name: 'Size', option2Name: 'Color', option3Name: '',
  seoTitle: '', seoDescription: '', badge: '', rating: 4.5, reviewCount: 0,
  benefits: '', suitableFor: '', ingredients: '', howToUse: '', specifications: '',
  productDetailsHtml: '',
  variants: [{ sku: '', price: '', compareAtPrice: '', inventoryQty: 100, option1: 'Default', grams: 0 }],
  faqs: []
};

export default function ProductsPage() {
  const [productList, setProductList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProduct);
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  
  // Bulk selection
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Image viewer
  const [imageViewer, setImageViewer] = useState({ show: false, images: [], currentIndex: 0 });

  const [bulkPlatform, setBulkPlatform] = useState('shopify');
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkUrl, setBulkUrl] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [amazonForm, setAmazonForm] = useState({
    id: '', asin: '', brand: '', title: '', url: '', currency: 'INR',
    price: '', original_price: '', rating: '', review_count: '',
    has_prime_shipping: false, has_deal: false, deal_text: '',
    is_sponsored: false, options_count: '1', img_url: '', position: '',
    source_url: '', extracted_at: ''
  });
  const [amazonFormSaving, setAmazonFormSaving] = useState(false);
  const [amazonFormMessage, setAmazonFormMessage] = useState('');
  const [amazonFormMultiple, setAmazonFormMultiple] = useState('');
  const [amazonFormMultipleSaving, setAmazonFormMultipleSaving] = useState(false);
  const [amazonFormMultipleMessage, setAmazonFormMultipleMessage] = useState('');

  const load = () => {
    setLoading(true);
    productsApi.list().then(data => setProductList(Array.isArray(data) ? data : (data.products || []))).catch(() => setProductList([])).finally(() => setLoading(false))
  };

  useEffect(load, []);

  // Reset selection when component mounts
  useEffect(() => {
    setSelectedProducts([]);
    setSelectAll(false);
  }, [productList]);

  const openAdd = () => { setEditing(null); setForm(emptyProduct); setImages([]); setVideos([]); setShowForm(true); setSaveError(''); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({
      ...p,
      tags: (p.tags || []).join(', '),
      benefits: p.benefits || '',
      suitableFor: p.suitableFor || '',
      ingredients: p.ingredients || '',
      howToUse: p.howToUse || '',
      specifications: p.specifications || '',
      productDetailsHtml: p.productDetailsHtml || p.bodyHtml || '',
      variants: p.variants?.length ? p.variants : emptyProduct.variants,
      faqs: p.faqs?.length ? p.faqs : []
    });
    setImages([]);
    setVideos([]);
    setShowForm(true);
    setSaveError('');
  };

  const update = (field, val) => setForm(f => ({ ...f, [field]: val }));

  // Bulk selection handlers
  const toggleSelectProduct = (id) => {
    setSelectedProducts(prev => 
      prev.includes(id) ? prev.filter(productId => productId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedProducts([]);
      setSelectAll(false);
    } else {
      setSelectedProducts(productList.map(p => p.id));
      setSelectAll(true);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) {
      alert('Please select products to delete');
      return;
    }
    if (!confirm(`⚠️ Delete ${selectedProducts.length} selected products? This cannot be undone!`)) return;
    if (!confirm('⚠️ FINAL WARNING: Are you sure?')) return;
    
    setLoading(true);
    try {
      const res = await apiFetch('/products/admin/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedProducts })
      });
      setMessage(res.message);
      setSelectedProducts([]);
      setSelectAll(false);
      load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setSaveError('');
    try {
      const productData = {
        ...form,
        published: form.published === true || form.published === 'true',
        status: form.status || 'active',
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        benefits: form.benefits,
        suitableFor: form.suitableFor,
        ingredients: form.ingredients,
        howToUse: form.howToUse,
        specifications: form.specifications,
        bodyHtml: form.bodyHtml || form.productDetailsHtml,
        productDetailsHtml: form.productDetailsHtml || form.bodyHtml,
        variants: form.variants.map(v => ({
          ...v, price: parseFloat(v.price) || 0, compareAtPrice: parseFloat(v.compareAtPrice) || 0,
          inventoryQty: parseInt(v.inventoryQty) || 0, grams: parseFloat(v.grams) || 0
        })),
        images: form.images || [],
        videos: form.videos || [],
        faqs: form.faqs || []
      };

      const fd = new FormData();
      fd.append('productData', JSON.stringify(productData));
      images.forEach(f => fd.append('images', f));
      if (videos.length) {
        videos.forEach(f => fd.append('videos', f));
      }

      if (editing) await productsApi.update(editing.id, fd);
      else await productsApi.create(fd);

      setMessage('Product saved successfully!');
      setShowForm(false);
      load();
    } catch (err) {
      setSaveError(err.message);
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    await productsApi.delete(id);
    setSelectedProducts(prev => prev.filter(productId => productId !== id));
    load();
  };

  // Image viewer functions
  const openImageViewer = (images, currentIndex) => {
    setImageViewer({ show: true, images, currentIndex });
  };

  const closeImageViewer = () => {
    setImageViewer({ show: false, images: [], currentIndex: 0 });
  };

  const nextImage = () => {
    setImageViewer(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % prev.images.length
    }));
  };

  const prevImage = () => {
    setImageViewer(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length
    }));
  };

  // FAQ handlers
  const addFaq = () => {
    setForm(f => ({
      ...f,
      faqs: [...(f.faqs || []), { question: '', answer: '' }]
    }));
  };

  const updateFaq = (index, field, value) => {
    setForm(f => ({
      ...f,
      faqs: f.faqs.map((faq, i) => i === index ? { ...faq, [field]: value } : faq)
    }));
  };

  const removeFaq = (index) => {
    setForm(f => ({
      ...f,
      faqs: f.faqs.filter((_, i) => i !== index)
    }));
  };

  // Remove an existing image from the form
  const removeExistingImage = (index) => {
    setForm(f => ({
      ...f,
      images: f.images.filter((_, i) => i !== index)
    }));
  };

  // Remove an existing video from the form
  const removeExistingVideo = (index) => {
    setForm(f => ({
      ...f,
      videos: f.videos.filter((_, i) => i !== index)
    }));
  };

  const handleDeleteAll = async () => {
    if (!confirm('⚠️ Are you sure you want to DELETE ALL products? This cannot be undone!')) return;
    if (!confirm('⚠️ FINAL WARNING: All products will be permanently deleted. Continue?')) return;
    setLoading(true);
    try {
      const res = await productsApi.deleteAll();
      setMessage(res.message);
      setSelectedProducts([]);
      setSelectAll(false);
      load();
    } catch (err) {
      setMessage(err.message);
      setLoading(false);
    }
  };

  const handleFixData = async () => {
    if (!confirm('This will fix published/status fields on all products to ensure they appear on the User Panel. Continue?')) return;
    setLoading(true);
    try {
      const res = await apiFetch('/products/admin/fix-data', { method: 'POST' });
      setMessage(res.message);
      load();
    } catch (err) {
      setMessage(err.message);
      setLoading(false);
    }
  };

  const handleBulkImport = async () => {
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const fd = new FormData();
      fd.append('platform', bulkPlatform);
      if (bulkFile) fd.append('file', bulkFile);
      if (bulkUrl) fd.append('importUrl', bulkUrl);
      const result = await productsApi.bulkImport(fd);
      setBulkResult(result);
      load();
    } catch (err) {
      setBulkResult({ error: err.message });
    } finally {
      setBulkLoading(false);
    }
  };

  const selectedPlatform = PLATFORMS.find(p => p.id === bulkPlatform);

  return (
    <>
      <div className="page-header">
        <h1>Products</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {selectedProducts.length > 0 && (
            <button className="btn btn-danger" onClick={handleBulkDelete} style={{ background: 'var(--danger)', color: 'white' }}>
              🗑️ Delete Selected ({selectedProducts.length})
            </button>
          )}
          <button className="btn btn-outline" onClick={handleFixData}>🔧 Fix Data</button>
          <button className="btn btn-outline" onClick={() => setShowBulk(true)}>📤 Bulk Upload</button>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Product</button>
          <button className="btn btn-danger" onClick={handleDeleteAll} style={{ background: 'var(--danger)', color: 'white' }}>🗑️ Delete All</button>
        </div>
      </div>

      {message && <div className={message.includes('success') ? 'success' : 'error'}>{message}</div>}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} />
                </th>
                <th>Preview</th>
                <th>Title</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Platform</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={9}>Loading...</td></tr> :
                productList.map(p => (
                  <tr key={p.id}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedProducts.includes(p.id)} 
                        onChange={() => toggleSelectProduct(p.id)}
                      />
                    </td>
                    <td>
                      {p.videos?.length > 0 ? (
                        <video 
                          src={mediaUrl(p.videos[0])} 
                          style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6 }}
                          muted
                          preload="metadata"
                        />
                      ) : (
                        <img 
                          className="table-img" 
                          src={imgUrl(p.images?.[0]?.src)} 
                          alt="" 
                          style={{ cursor: p.images?.length > 0 ? 'pointer' : 'default' }}
                          onClick={() => p.images?.length > 0 && openImageViewer(p.images, 0)}
                        />
                      )}
                    </td>
                    <td><strong>{p.title}</strong><br /><small style={{ color: 'var(--text-muted)' }}>{p.handle}</small></td>
                    <td>{p.navPage}</td>
                    <td>₹{p.variants?.[0]?.price}</td>
                    <td>{p.variants?.[0]?.inventoryQty}</td>
                    <td>{p.platform}</td>
                    <td><span style={{ color: p.status === 'active' ? 'var(--success)' : 'var(--text-muted)' }}>{p.status}</span></td>
                    <td>
                      <button className="btn btn-sm btn-outline" onClick={() => openEdit(p)}>Edit</button>{' '}
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {imageViewer.show && (
        <div className="modal-overlay" onClick={closeImageViewer}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '95vw', padding: 16 }}>
            <div className="modal-header" style={{ marginBottom: 16 }}>
              <h2>Image Viewer ({imageViewer.currentIndex + 1} / {imageViewer.images.length})</h2>
              <button className="modal-close" onClick={closeImageViewer}>×</button>
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
              <button 
                onClick={prevImage}
                style={{ 
                  position: 'absolute', left: 10, background: 'rgba(0,0,0,0.5)', color: 'white', 
                  border: 'none', borderRadius: '50%', width: 40, height: 40, fontSize: 20, cursor: 'pointer', zIndex: 10 
                }}
              >‹</button>
              
              <img 
                src={imgUrl(imageViewer.images[imageViewer.currentIndex]?.src)} 
                alt="Product"
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '70vh', 
                  objectFit: 'contain',
                  borderRadius: 8,
                  cursor: 'zoom-in'
                }}
                onClick={(e) => {
                  const img = e.target;
                  if (img.style.transform === 'scale(2)') {
                    img.style.transform = 'scale(1)';
                    img.style.cursor = 'zoom-in';
                  } else {
                    img.style.transform = 'scale(2)';
                    img.style.cursor = 'zoom-out';
                  }
                }}
              />
              
              <button 
                onClick={nextImage}
                style={{ 
                  position: 'absolute', right: 10, background: 'rgba(0,0,0,0.5)', color: 'white', 
                  border: 'none', borderRadius: '50%', width: 40, height: 40, fontSize: 20, cursor: 'pointer', zIndex: 10 
                }}
              >›</button>
            </div>
            <div style={{ textAlign: 'center', marginTop: 12, color: 'var(--text-muted)', fontSize: 13 }}>
              Click image to zoom • Use arrows to navigate
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Product' : 'Add Product'} — Amazon-style Listing</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              {saveError && (
                <div className="error" style={{ marginBottom: 12, padding: 10, background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: 6, fontSize: 13 }}>
                  {saveError}
                </div>
              )}
              <div className="form-grid">
                <div className="form-group full"><label>Product Title *</label><input value={form.title} onChange={e => update('title', e.target.value)} required /></div>
                <div className="form-group"><label>Handle (URL)</label><input value={form.handle} onChange={e => update('handle', e.target.value)} placeholder="auto-generated if empty" /></div>
                <div className="form-group"><label>Vendor / Brand</label><input value={form.vendor} onChange={e => update('vendor', e.target.value)} /></div>
                <div className="form-group"><label>Product Category</label><input value={form.productCategory} onChange={e => update('productCategory', e.target.value)} /></div>
                <div className="form-group"><label>Product Type</label><input value={form.type} onChange={e => update('type', e.target.value)} /></div>
                <div className="form-group"><label>Nav Page</label>
                  <select value={form.navPage} onChange={e => update('navPage', e.target.value)}>
                    {NAV_PAGES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group full">
                  <label>Product Details (HTML + CSS)</label>
                  <textarea 
                    value={form.productDetailsHtml || form.bodyHtml} 
                    onChange={e => {
                      update('productDetailsHtml', e.target.value);
                      update('bodyHtml', e.target.value);
                    }} 
                    rows={10}
                    placeholder="<div style='padding:20px; background:#f5f5f5;'><h2>Product Details</h2><p>Write full product information here with HTML and inline CSS</p></div>"
                    style={{ fontFamily: 'monospace', fontSize: 13, minHeight: 200 }}
                  />
                </div>
                <div className="form-group"><label>Tags (comma separated)</label><input value={form.tags} onChange={e => update('tags', e.target.value)} /></div>
                <div className="form-group"><label>Badge</label>
                  <select value={form.badge} onChange={e => update('badge', e.target.value)}>
                    <option value="">None</option>
                    <option>Best Seller</option><option>Trending</option><option>New Launch</option>
                  </select>
                </div>
                <div className="form-group"><label>Status</label>
                  <select value={form.status} onChange={e => update('status', e.target.value)}>
                    <option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option>
                  </select>
                </div>
                <div className="form-group"><label>Published</label>
                  <select value={form.published} onChange={e => update('published', e.target.value === 'true')}>
                    <option value="true">Yes</option><option value="false">No</option>
                  </select>
                </div>

                <div className="form-group full"><h3 style={{ fontSize: 14, marginBottom: 8 }}>Variant / Pricing (Shopify Structure)</h3></div>
                <div className="form-group"><label>Option1 Name</label><input value={form.option1Name} onChange={e => update('option1Name', e.target.value)} /></div>
                <div className="form-group"><label>Option1 Value</label><input value={form.variants[0]?.option1 || ''} onChange={e => { const v = [...form.variants]; v[0] = { ...v[0], option1: e.target.value }; update('variants', v); }} /></div>
                <div className="form-group"><label>Variant SKU</label><input value={form.variants[0]?.sku || ''} onChange={e => { const v = [...form.variants]; v[0] = { ...v[0], sku: e.target.value }; update('variants', v); }} /></div>
                <div className="form-group"><label>Variant Price (₹) *</label><input type="number" value={form.variants[0]?.price || ''} onChange={e => { const v = [...form.variants]; v[0] = { ...v[0], price: e.target.value }; update('variants', v); }} required /></div>
                <div className="form-group"><label>Compare At Price (₹)</label><input type="number" value={form.variants[0]?.compareAtPrice || ''} onChange={e => { const v = [...form.variants]; v[0] = { ...v[0], compareAtPrice: e.target.value }; update('variants', v); }} /></div>
                <div className="form-group"><label>Inventory Qty</label><input type="number" value={form.variants[0]?.inventoryQty || ''} onChange={e => { const v = [...form.variants]; v[0] = { ...v[0], inventoryQty: e.target.value }; update('variants', v); }} /></div>
                <div className="form-group"><label>Variant Grams</label><input type="number" value={form.variants[0]?.grams || ''} onChange={e => { const v = [...form.variants]; v[0] = { ...v[0], grams: e.target.value }; update('variants', v); }} /></div>
                <div className="form-group"><label>Barcode</label><input value={form.variants[0]?.barcode || ''} onChange={e => { const v = [...form.variants]; v[0] = { ...v[0], barcode: e.target.value }; update('variants', v); }} /></div>

                <div className="form-group full">
                  <label>Benefits (HTML supported)</label>
                  <textarea value={form.benefits} onChange={e => update('benefits', e.target.value)} rows={4} placeholder='<div style="background:#e8f5e9; padding:12px; border-radius:6px;"><ul><li>Natural Ingredients</li><li>Dermatologist Tested</li></ul></div>' style={{ fontFamily: 'monospace', fontSize: 13 }} />
                </div>
                <div className="form-group full">
                  <label>Suitable For (HTML supported)</label>
                  <textarea value={form.suitableFor} onChange={e => update('suitableFor', e.target.value)} rows={3} placeholder='<p style="color:#4A90D9;">All skin types including sensitive skin</p>' style={{ fontFamily: 'monospace', fontSize: 13 }} />
                </div>
                <div className="form-group full">
                  <label>Ingredients (HTML supported)</label>
                  <textarea value={form.ingredients} onChange={e => update('ingredients', e.target.value)} rows={5} placeholder='<h4>Key Ingredients:</h4><ul><li><strong>Vitamin C</strong> - 10% concentration</li><li><strong>Hyaluronic Acid</strong> - Deep hydration</li></ul>' style={{ fontFamily: 'monospace', fontSize: 13 }} />
                </div>
                <div className="form-group full">
                  <label>How to Use (HTML supported)</label>
                  <textarea value={form.howToUse} onChange={e => update('howToUse', e.target.value)} rows={5} placeholder='<ol style="line-height:1.8;"><li>Cleanse your face thoroughly</li><li>Apply a small amount</li><li>Massage gently until absorbed</li></ol>' style={{ fontFamily: 'monospace', fontSize: 13 }} />
                </div>
                <div className="form-group full">
                  <label>Specifications (HTML supported)</label>
                  <textarea value={form.specifications} onChange={e => update('specifications', e.target.value)} rows={4} placeholder='<table style="width:100%; border-collapse:collapse;"><tr><td style="padding:8px; border:1px solid #ddd;"><strong>Weight</strong></td><td style="padding:8px; border:1px solid #ddd;">100ml</td></tr></table>' style={{ fontFamily: 'monospace', fontSize: 13 }} />
                </div>
                <div className="form-group"><label>SEO Title</label><input value={form.seoTitle} onChange={e => update('seoTitle', e.target.value)} /></div>
                <div className="form-group"><label>SEO Description</label><input value={form.seoDescription} onChange={e => update('seoDescription', e.target.value)} /></div>

                <div className="form-group"><label>Product Images</label><input type="file" accept="image/*" multiple onChange={e => setImages([...e.target.files])} /></div>
                <div className="form-group"><label>Product Videos (MP4, WebM, MOV)</label><input type="file" accept="video/*" multiple onChange={e => setVideos([...e.target.files])} /></div>
                
                {/* Existing images preview */}
                {(images.length > 0 || (editing && form.images?.length > 0)) && (
                  <div className="form-group full preview-images">
                    {editing && form.images?.map((img, i) => (
                      <div key={i} style={{ position: 'relative' }}>
                        <button 
                          type="button"
                          onClick={() => removeExistingImage(i)}
                          style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(192,73,90,0.9)', color: '#fff', border: 'none', fontSize: 14, lineHeight: '22px', textAlign: 'center', cursor: 'pointer', zIndex: 5, padding: 0 }}
                          title="Remove this image"
                        >×</button>
                        <img 
                          src={imgUrl(img.src)} 
                          alt="" 
                          style={{ cursor: 'pointer' }}
                          onClick={() => openImageViewer(form.images, i)}
                        />
                      </div>
                    ))}
                    {images.map((img, i) => (
                      <div key={`new-${i}`} style={{ position: 'relative' }}>
                        <img src={URL.createObjectURL(img)} alt="" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Existing videos preview when editing */}
                {(editing && form.videos?.length > 0) && (
                  <div className="form-group full">
                    <label>Existing Videos</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {form.videos.map((vid, i) => (
                        <div key={i} style={{ position: 'relative', width: 160, height: 100, borderRadius: 6, overflow: 'hidden', background: '#000' }}>
                          <button 
                            type="button"
                            onClick={() => removeExistingVideo(i)}
                            style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: '50%', background: 'rgba(192,73,90,0.9)', color: '#fff', border: 'none', fontSize: 16, lineHeight: '24px', textAlign: 'center', cursor: 'pointer', zIndex: 5, padding: 0 }}
                            title="Remove this video"
                          >×</button>
                          <video 
                            src={mediaUrl(vid)} 
                            controls 
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New video previews */}
                {videos.length > 0 && (
                  <div className="form-group full">
                    <label>New Videos to Upload</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {videos.map((vid, i) => (
                        <div key={i} style={{ position: 'relative', width: 160, height: 100, borderRadius: 6, overflow: 'hidden', background: '#000' }}>
                          <video 
                            src={URL.createObjectURL(vid)} 
                            controls 
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FAQ Section */}
                <div className="form-group full" style={{ marginTop: 24, paddingTop: 24, borderTop: '2px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>Frequently Asked Questions (FAQ)</h3>
                    <button type="button" className="btn btn-sm btn-primary" onClick={addFaq}>+ Add FAQ</button>
                  </div>
                  
                  {(form.faqs || []).length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>
                      No FAQs added yet. Click "Add FAQ" to create one.
                    </p>
                  )}

                  {(form.faqs || []).map((faq, index) => (
                    <div key={index} style={{ background: 'var(--bg)', padding: 16, borderRadius: 8, marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <strong style={{ fontSize: 14 }}>FAQ #{index + 1}</strong>
                        <button 
                          type="button" 
                          className="btn btn-sm btn-danger"
                          onClick={() => removeFaq(index)}
                          style={{ padding: '4px 8px' }}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        <label>Question</label>
                        <input 
                          value={faq.question} 
                          onChange={e => updateFaq(index, 'question', e.target.value)}
                          placeholder="Enter question"
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Answer</label>
                        <textarea 
                          value={faq.answer} 
                          onChange={e => updateFaq(index, 'answer', e.target.value)}
                          rows={3}
                          placeholder="Enter answer (HTML supported)"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulk && (
        <div className="modal-overlay" onClick={() => setShowBulk(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Bulk Upload / Import Products</h2>
              <button className="modal-close" onClick={() => setShowBulk(false)}>×</button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>Select platform — form fields auto-update based on platform CSV format</p>

            <div className="platform-grid">
              {PLATFORMS.map(p => (
                <div key={p.id} className={`platform-card ${bulkPlatform === p.id ? 'selected' : ''}`} onClick={() => setBulkPlatform(p.id)}>
                  {p.name}
                </div>
              ))}
            </div>

            {selectedPlatform && (
              <div className="platform-fields">
                <h4>{selectedPlatform.name} CSV Fields:</h4>
                <div className="fields">
                  {selectedPlatform.fields.map(f => <span key={f} className="field-tag">{f}</span>)}
                </div>
              </div>
            )}

            {bulkPlatform === 'amazon' && (
              <div style={{ borderTop: '2px solid var(--border)', marginTop: 16, paddingTop: 16 }}>
                <h3 style={{ marginBottom: 12 }}>📦 Amazon Product Form</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                  Fill in the details below to import a single Amazon product, or paste multiple JSON objects to bulk-import.
                </p>

                {amazonFormMessage && (
                  <div className={amazonFormMessage.includes('success') ? 'success' : 'error'} style={{ marginBottom: 12 }}>
                    {amazonFormMessage}
                  </div>
                )}

                <div className="form-grid">
                  <div className="form-group full"><label>id / ASIN</label>
                    <input value={amazonForm.id} onChange={e => setAmazonForm(f => ({ ...f, id: e.target.value, asin: e.target.value }))} placeholder="B0XXXXXXXX" />
                  </div>
                  <div className="form-group full"><label>Title *</label>
                    <input value={amazonForm.title} onChange={e => setAmazonForm(f => ({ ...f, title: e.target.value }))} required placeholder="Product name" />
                  </div>
                  <div className="form-group"><label>Brand</label>
                    <input value={amazonForm.brand} onChange={e => setAmazonForm(f => ({ ...f, brand: e.target.value }))} placeholder="Brand name" />
                  </div>
                  <div className="form-group"><label>URL</label>
                    <input value={amazonForm.url} onChange={e => setAmazonForm(f => ({ ...f, url: e.target.value }))} placeholder="https://amazon.in/dp/..." />
                  </div>
                  <div className="form-group"><label>Currency</label>
                    <input value={amazonForm.currency} onChange={e => setAmazonForm(f => ({ ...f, currency: e.target.value }))} placeholder="INR" />
                  </div>
                  <div className="form-group"><label>Price *</label>
                    <input type="number" step="0.01" value={amazonForm.price} onChange={e => setAmazonForm(f => ({ ...f, price: e.target.value }))} placeholder="999" />
                  </div>
                  <div className="form-group"><label>Original Price</label>
                    <input type="number" step="0.01" value={amazonForm.original_price} onChange={e => setAmazonForm(f => ({ ...f, original_price: e.target.value }))} placeholder="1299" />
                  </div>
                  <div className="form-group"><label>Rating</label>
                    <input type="number" step="0.1" min="0" max="5" value={amazonForm.rating} onChange={e => setAmazonForm(f => ({ ...f, rating: e.target.value }))} placeholder="4.5" />
                  </div>
                  <div className="form-group"><label>Review Count</label>
                    <input type="number" value={amazonForm.review_count} onChange={e => setAmazonForm(f => ({ ...f, review_count: e.target.value }))} placeholder="1250" />
                  </div>
                  <div className="form-group"><label>Options Count</label>
                    <input type="number" value={amazonForm.options_count} onChange={e => setAmazonForm(f => ({ ...f, options_count: e.target.value }))} placeholder="1" />
                  </div>
                  <div className="form-group">
                    <label><input type="checkbox" checked={amazonForm.has_prime_shipping} onChange={e => setAmazonForm(f => ({ ...f, has_prime_shipping: e.target.checked }))} /> Has Prime Shipping</label>
                  </div>
                  <div className="form-group">
                    <label><input type="checkbox" checked={amazonForm.has_deal} onChange={e => setAmazonForm(f => ({ ...f, has_deal: e.target.checked }))} /> Has Deal</label>
                  </div>
                  <div className="form-group">
                    <label><input type="checkbox" checked={amazonForm.is_sponsored} onChange={e => setAmazonForm(f => ({ ...f, is_sponsored: e.target.checked }))} /> Is Sponsored</label>
                  </div>
                  <div className="form-group"><label>Deal Text</label>
                    <input value={amazonForm.deal_text} onChange={e => setAmazonForm(f => ({ ...f, deal_text: e.target.value }))} placeholder="Limited time deal" />
                  </div>
                  <div className="form-group full"><label>Image URL</label>
                    <input value={amazonForm.img_url} onChange={e => setAmazonForm(f => ({ ...f, img_url: e.target.value }))} placeholder="https://m.media-amazon.com/images/..." />
                  </div>
                  <div className="form-group"><label>Position</label>
                    <input type="number" value={amazonForm.position} onChange={e => setAmazonForm(f => ({ ...f, position: e.target.value }))} placeholder="1" />
                  </div>
                  <div className="form-group"><label>Source URL</label>
                    <input value={amazonForm.source_url} onChange={e => setAmazonForm(f => ({ ...f, source_url: e.target.value }))} placeholder="https://amazon.in/..." />
                  </div>
                  <div className="form-group"><label>Extracted At</label>
                    <input type="datetime-local" value={amazonForm.extracted_at} onChange={e => setAmazonForm(f => ({ ...f, extracted_at: e.target.value }))} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 16, marginBottom: 24 }}>
                  <button className="btn btn-primary" onClick={async () => {
                    if (!amazonForm.title) { setAmazonFormMessage('Title is required'); return; }
                    if (!amazonForm.price) { setAmazonFormMessage('Price is required'); return; }
                    setAmazonFormSaving(true);
                    setAmazonFormMessage('');
                    try {
                      const result = await productsApi.amazonImport(amazonForm);
                      setAmazonFormMessage(`✅ Product "${result.product?.title || amazonForm.title}" imported successfully!`);
                      setAmazonForm({ id: '', asin: '', brand: '', title: '', url: '', currency: 'INR', price: '', original_price: '', rating: '', review_count: '', has_prime_shipping: false, has_deal: false, deal_text: '', is_sponsored: false, options_count: '1', img_url: '', position: '', source_url: '', extracted_at: '' });
                      load();
                    } catch (err) {
                      setAmazonFormMessage(`❌ ${err.message}`);
                    } finally {
                      setAmazonFormSaving(false);
                    }
                  }} disabled={amazonFormSaving}>
                    {amazonFormSaving ? 'Importing...' : 'Import Amazon Product'}
                  </button>
                </div>

                <h4 style={{ margin: '12px 0 8px' }}>Or Paste Multiple Amazon Products (JSON)</h4>
                {amazonFormMultipleMessage && (
                  <div className={amazonFormMultipleMessage.includes('success') ? 'success' : 'error'} style={{ marginBottom: 8 }}>
                    {amazonFormMultipleMessage}
                  </div>
                )}
                <textarea
                  rows={6}
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'monospace' }}
                  value={amazonFormMultiple}
                  onChange={e => setAmazonFormMultiple(e.target.value)}
                  placeholder={`[\n  { "id": "B0XXX", "title": "Product 1", "price": "999", ... },\n  { "id": "B0YYY", "title": "Product 2", "price": "1499", ... }\n]`}
                />
                <div style={{ display: 'flex', gap: 12, marginTop: 8, marginBottom: 16 }}>
                  <button className="btn btn-primary" onClick={async () => {
                    if (!amazonFormMultiple.trim()) { setAmazonFormMultipleMessage('Paste JSON array first'); return; }
                    setAmazonFormMultipleSaving(true);
                    setAmazonFormMultipleMessage('');
                    try {
                      const items = JSON.parse(amazonFormMultiple);
                      if (!Array.isArray(items)) throw new Error('Must be a JSON array');
                      let success = 0, errors = [];
                      for (const item of items) {
                        try {
                          await productsApi.amazonImport(item);
                          success++;
                        } catch (err) {
                          errors.push(`${item.title || item.id || 'unknown'}: ${err.message}`);
                        }
                      }
                      setAmazonFormMultipleMessage(`✅ Imported ${success} products. ${errors.length ? 'Errors: ' + errors.join('; ') : ''}`);
                      load();
                    } catch (err) {
                      setAmazonFormMultipleMessage(`❌ ${err.message}`);
                    } finally {
                      setAmazonFormMultipleSaving(false);
                    }
                  }} disabled={amazonFormMultipleSaving}>
                    {amazonFormMultipleSaving ? 'Importing...' : 'Import Multiple from JSON'}
                  </button>
                </div>
              </div>
            )}

            <h4 style={{ margin: '16px 0 8px' }}>Or Upload CSV / Import by URL</h4>

            <div className="form-group">
              <label>Choose CSV File from Device</label>
              <input type="file" accept=".csv,.xlsx,.xls" onChange={e => setBulkFile(e.target.files[0])} />
            </div>
            <div className="form-group">
              <label>Or Import Link (URL)</label>
              <input value={bulkUrl} onChange={e => setBulkUrl(e.target.value)} placeholder="https://example.com/products.csv" />
            </div>

            {bulkResult && (
              <div className={bulkResult.error ? 'error' : 'success'} style={{ marginBottom: 16 }}>
                {bulkResult.error || `Import complete: ${bulkResult.created || 0} created, ${bulkResult.updated || 0} updated`}
                {bulkResult.errors?.length > 0 && <div>Errors: {bulkResult.errors.length}</div>}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={handleBulkImport} disabled={bulkLoading || (!bulkFile && !bulkUrl)}>
                {bulkLoading ? 'Importing...' : 'Import Products'}
              </button>
              <button className="btn btn-outline" onClick={() => productsApi.bulkExport(bulkPlatform)}>
                Export as {selectedPlatform?.name} CSV
              </button>
              <button className="btn btn-outline" onClick={() => setShowBulk(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}  
