import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import SearchBar from '../components/SearchBar';
import SEO from '../components/SEO';
import { products as productsApi, imgUrl, mediaUrl, formatPrice } from '../api';
import { ProductGrid } from '../components/ProductCard';
import { useRefreshKey } from '../context/DataRefreshContext';

export default function ProductDetailPage() {
  const { handle } = useParams();
  const navigate = useNavigate();
  const refreshKey = useRefreshKey();
  const { addToCart, setCartOpen } = useApp();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState('benefits');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    productsApi.get(handle)
      .then(p => {
        setProduct(p);
        setSelectedVariant(0);
        setSelectedImage(0);
        return productsApi.recommendations(p._id);
      })
      .then(setRelated)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [handle, refreshKey]);

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}>Loading...</div>;
  if (!product) return <div style={{ textAlign: 'center', padding: 80 }}>Product not found</div>;

  const variant = product.variants?.[selectedVariant] || product.variants?.[0];
  const price = variant?.price || 0;
  const compareAt = variant?.compareAtPrice || 0;
  const discount = compareAt > price ? Math.round((1 - price / compareAt) * 100) : 0;

  const handleBuyNow = () => {
    addToCart(product, variant);
    setCartOpen(false);
    navigate('/checkout');
  };

  const tabs = [
    { id: 'benefits', label: 'Benefits' },
    { id: 'ingredients', label: 'Ingredients' },
    { id: 'howto', label: 'How to Use' },
    { id: 'faqs', label: 'FAQs' },
    { id: 'specs', label: 'Specifications' }
  ];

  const productImage = imgUrl(product.images?.[0]?.src);
  const productDesc = product.bodyHtml?.replace(/<[^>]+>/g, '').slice(0, 200) || `Buy ${product.title} at best price on Tansoura. 100% authentic product. Free shipping. Easy returns.`;

  return (
    <>
      <SEO
        title={product.title}
        description={productDesc}
        keywords={`${product.title}, buy ${product.title} online, ${product.title} price, ${product.vendor || 'Tansoura'}, ${product.productCategory || 'skincare'}, best price, authentic products`}
        canonical={`https://tansoura.in/products/${handle}`}
        ogImage={productImage}
        ogType="product"
        breadcrumbs={[
          { name: 'Home', item: 'https://tansoura.in/' },
          { name: product.productCategory ? product.productCategory.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Products', item: `https://tansoura.in/category/${product.productCategory || 'skincare'}` },
          { name: product.title, item: `https://tansoura.in/products/${handle}` }
        ]}
        product={{
          name: product.title,
          description: productDesc,
          image: productImage,
          sku: product._id,
          price: price,
          brand: product.vendor || 'Tansoura',
          inStock: true,
          rating: product.rating || 4.5,
          reviewCount: product.reviewCount || 0,
        }}
      />

      <div className="container">
        {/* Search bar above product detail - professional */}
        <div className="product-detail-search">
          <SearchBar compact />
        </div>
        <div className="page-search-divider"></div>
        
        <div className="product-detail">
        <div className="product-detail-grid">
          <div className="product-gallery">
            <div className="product-main-image">
              {product.videos?.length > 0 && selectedImage === 0 ? (
                <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 400, background: '#000', borderRadius: 12, overflow: 'hidden' }}>
                  <video
                    src={mediaUrl(product.videos[0])}
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '70vh' }}
                  />
                </div>
              ) : (
                <img src={imgUrl(product.images?.[selectedImage]?.src || product.images?.[0]?.src)} alt={product.title} />
              )}
            </div>
            {(product.images?.length > 1 || product.videos?.length > 0) && (
              <div className="product-thumbs">
                {product.videos?.length > 0 && (
                  <div 
                    className={`thumb-video ${selectedImage === 0 ? 'active' : ''}`} 
                    onClick={() => setSelectedImage(0)}
                    style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', border: selectedImage === 0 ? '2px solid var(--primary)' : '2px solid transparent' }}
                  >
                    <video src={mediaUrl(product.videos[0])} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted preload="metadata" />
                  </div>
                )}
                {product.images.map((img, i) => (
                  <img key={i} src={imgUrl(img.src)} alt="" className={i === (product.videos?.length > 0 ? selectedImage - 1 : selectedImage) ? 'active' : ''} onClick={() => setSelectedImage(product.videos?.length > 0 ? i + 1 : i)} />
                ))}
              </div>
            )}
          </div>

          <div className="product-info">
            {product.badge && <span className="product-badge" style={{ position: 'static', display: 'inline-block', marginBottom: 12 }}>{product.badge}</span>}
            <h1>{product.title}</h1>
            <p className="subtitle">{product.bodyHtml?.replace(/<[^>]+>/g, '').slice(0, 120)}</p>

            <div className="rating-row">
              <span className="stars">★★★★★</span>
              <span style={{ fontWeight: 600 }}>{product.rating}/5</span>
              <span style={{ color: 'var(--text-muted)' }}>({product.reviewCount} reviews)</span>
            </div>

            <div className="price-block">
              <span className="sale-price">{formatPrice(price)}</span>
              {compareAt > price && (
                <>
                  <span className="mrp">MRP {formatPrice(compareAt)}</span>
                  <span className="discount">({discount}% off)</span>
                </>
              )}
              <p className="tax-note">Inclusive of all taxes</p>
            </div>

            {product.variants?.length > 1 && (
              <div className="variant-select">
                <label>{product.option1Name || 'Size'}</label>
                <div className="variant-options">
                  {product.variants.map((v, i) => (
                    <button key={i} className={`variant-option ${i === selectedVariant ? 'active' : ''}`} onClick={() => setSelectedVariant(i)}>
                      {v.option1 || `Option ${i + 1}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="product-actions">
              <button className="btn btn-outline" onClick={() => addToCart(product, variant)}>Add to Cart</button>
              <button className="btn btn-dark" onClick={handleBuyNow}>Buy Now</button>
            </div>

            {product.benefits?.length > 0 && (
              <ul className="product-highlights">
                {product.benefits.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            )}

            {product.suitableFor?.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Suitable for</h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {product.suitableFor.map((s, i) => (
                    <span key={i} style={{ padding: '6px 14px', background: 'var(--primary-light)', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="detail-tabs" style={{ marginTop: 48 }}>
          <div className="tab-buttons">
            {tabs.map(t => (
              <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>
            ))}
          </div>
          <div className="tab-content">
            {activeTab === 'benefits' && (
              <div>
                <h3>Benefits</h3>
                <ul>{product.benefits?.map((b, i) => <li key={i} style={{ listStyle: 'disc', marginLeft: 20, marginBottom: 8 }}>{b}</li>)}</ul>
                {product.bodyHtml && <div dangerouslySetInnerHTML={{ __html: product.bodyHtml }} />}
              </div>
            )}
            {activeTab === 'ingredients' && <div><h3>Full Ingredients</h3><p>{product.ingredients || 'Ingredient information coming soon.'}</p></div>}
            {activeTab === 'howto' && <div><h3>How to Use</h3><p>{product.howToUse || 'Usage instructions coming soon.'}</p></div>}
            {activeTab === 'faqs' && (
              <div>
                {product.faqs?.length ? product.faqs.map((f, i) => (
                  <details key={i} className="faq-item" open={i === 0}>
                    <summary>Q: {f.question}</summary>
                    <p>A: {f.answer}</p>
                  </details>
                )) : <p>No FAQs available yet.</p>}
              </div>
            )}
            {activeTab === 'specs' && <div><h3>Product Specification</h3><p>{product.specifications || `Vendor: ${product.vendor || 'Tansoura'} | Category: ${product.productCategory || 'General'}`}</p></div>}
          </div>
        </div>

            {related.length > 0 && (
          <section style={{ marginTop: 60 }}>
            <h2 className="section-title">Pairs well with</h2>
            <ProductGrid products={related.slice(0, 4)} />
          </section>
        )}
      </div>
      </div>
    </>
  );
}