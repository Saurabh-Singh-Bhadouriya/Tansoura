import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import SearchBar from '../components/SearchBar';
import SEO from '../components/SEO';
import { products as productsApi, imgUrl, mediaUrl, formatPrice, offers as offersApi } from '../api';
import { ProductGrid } from '../components/ProductCard';
import { useRefreshKey } from '../context/DataRefreshContext';

export default function ProductDetailPage() {
  const { handle } = useParams();
  const navigate = useNavigate();
  const refreshKey = useRefreshKey();
  const { addToCart, setCartOpen } = useApp();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [offers, setOffers] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState('benefits');
  const [loading, setLoading] = useState(true);

  // Auto-slide state
  const [autoSlide, setAutoSlide] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [pincode, setPincode] = useState('');
  const [deliveryEstimate, setDeliveryEstimate] = useState(null);
  const [deliveryLoading, setDeliveryLoading] = useState(false);

  // Thumbnail drag-to-scroll using refs (not state) for instant updates
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const thumbsRef = useRef(null);
  const [dragCursor, setDragCursor] = useState('grab');

  // Video error state - fallback to image if video fails
  const [videoError, setVideoError] = useState(false);

  // Compute allMedia from product state (must be before callbacks that use it)
  const allMedia = product ? [
    ...(product.videos?.length > 0 && !videoError ? [{ type: 'video', src: product.videos[0] }] : []),
    ...(product.images?.map(img => ({ type: 'image', src: img.src })) || [])
  ] : [];

  useEffect(() => {
    setLoading(true);
    productsApi.get(handle)
      .then(p => {
        setProduct(p);
        setSelectedVariant(0);
        setSelectedImage(0);
        setVideoError(false);
        return Promise.all([
          productsApi.recommendations(p.id),
          offersApi.list({ navPage: p.navPage || 'home' })
        ]);
      })
      .then(([relatedProducts, offersData]) => {
        setRelated(relatedProducts);
        setOffers(offersData || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [handle, refreshKey]);

  // Auto-slide effect - only when NOT hovering and video is not playing
  useEffect(() => {
    if (!product || !autoSlide || isVideoPlaying) return;
    if (product.videos?.length > 0) return;

    const totalMedia = product.images?.length || 0;
    if (totalMedia <= 1) return;

    const interval = setInterval(() => {
      setSelectedImage(prev => (prev + 1) % totalMedia);
    }, 2000);

    return () => clearInterval(interval);
  }, [product, autoSlide, isVideoPlaying]);

  // Video play/pause handlers
  const handleVideoPlay = useCallback(() => setIsVideoPlaying(true), []);
  const handleVideoPause = useCallback(() => setIsVideoPlaying(false), []);

  const handleMouseEnter = useCallback(() => setAutoSlide(false), []);
  const handleMouseLeave = useCallback(() => setAutoSlide(true), []);

  // Mouse drag to scroll thumbnails
  const handleThumbnailMouseDown = useCallback((e) => {
    isDraggingRef.current = true;
    dragStartXRef.current = e.pageX;
    const thumbs = thumbsRef.current;
    if (thumbs) scrollLeftRef.current = thumbs.scrollLeft;
    setDragCursor('grabbing');
  }, []);

  const handleThumbnailMouseMove = useCallback((e) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const x = e.pageX;
    const walk = (x - dragStartXRef.current) * 2;
    const thumbs = thumbsRef.current;
    if (thumbs) thumbs.scrollLeft = scrollLeftRef.current - walk;
  }, []);

  const handleThumbnailMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    setDragCursor('grab');
  }, []);

  // Touch support for mobile swipe on thumbnails
  const handleThumbnailTouchStart = useCallback((e) => {
    if (e.touches && e.touches[0]) {
      isDraggingRef.current = true;
      dragStartXRef.current = e.touches[0].pageX;
      const thumbs = thumbsRef.current;
      if (thumbs) scrollLeftRef.current = thumbs.scrollLeft;
    }
  }, []);

  // Touch swipe on main image for mobile
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const mainImageRef = useRef(null);

  // Use native addEventListener with { passive: false } to allow preventDefault
  useEffect(() => {
    const el = mainImageRef.current;
    if (!el) return;

    const onTouchStart = (e) => {
      if (allMedia.length <= 1) return;
      if (e.touches && e.touches[0]) {
        touchStartXRef.current = e.touches[0].pageX;
        touchStartYRef.current = e.touches[0].pageY;
        setIsSwiping(true);
        setSwipeOffset(0);
        setAutoSlide(false);
      }
    };

    const onTouchMove = (e) => {
      if (!isSwipingRef.current || !e.touches || !e.touches[0]) return;
      const currentX = e.touches[0].pageX;
      const currentY = e.touches[0].pageY;
      const diffX = currentX - touchStartXRef.current;
      const diffY = currentY - touchStartYRef.current;
      
      if (Math.abs(diffX) > Math.abs(diffY)) {
        e.preventDefault();
        setSwipeOffset(diffX);
      }
    };

    const onTouchEnd = (e) => {
      if (!isSwipingRef.current) return;
      setIsSwiping(false);
      setSwipeOffset(0);
      
      const diffX = touchStartXRef.current - (e.changedTouches?.[0]?.pageX || touchStartXRef.current);
      const threshold = 50;
      
      if (Math.abs(diffX) > threshold) {
        const totalMedia = allMedia.length;
        if (diffX > 0) {
          setSelectedImage(prev => (prev + 1) % totalMedia);
        } else {
          setSelectedImage(prev => (prev - 1 + totalMedia) % totalMedia);
        }
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [allMedia.length]);

  // Track isSwiping in a ref for the native event handler
  const isSwipingRef = useRef(false);
  useEffect(() => { isSwipingRef.current = isSwiping; }, [isSwiping]);

  const handleThumbnailTouchMove = useCallback((e) => {
    if (!isDraggingRef.current) return;
    if (e.touches && e.touches[0]) {
      const x = e.touches[0].pageX;
      const walk = (x - dragStartXRef.current) * 2;
      const thumbs = thumbsRef.current;
      if (thumbs) thumbs.scrollLeft = scrollLeftRef.current - walk;
    }
  }, []);

  const handleThumbnailTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  if (loading) return <div className="pd-loading">Loading...</div>;
  if (!product) return <div className="pd-loading">Product not found</div>;

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

  const hasOption1 = product.variants?.length > 1 && product.option1Name;
  const hasOption2 = product.variants?.some(v => v.option2);

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
          sku: product.id,
          price: price,
          brand: product.vendor || 'Tansoura',
          inStock: true,
          rating: product.rating || 4.5,
          reviewCount: product.reviewCount || 0,
        }}
      />

      <div className="pd-page">
        <div className="pd-search">
          <SearchBar compact />
        </div>

        <div className="pd-layout">
          {/* ===== GALLERY ===== */}
          <div className="pd-gallery">
            <div
              ref={mainImageRef}
              className="pd-main-image"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
               {product.videos?.length > 0 && !videoError ? (
                 <div className="pd-video-wrap">
                   <video
                     src={mediaUrl(product.videos[0])}
                     controls
                     autoPlay
                     muted
                     loop
                     playsInline
                     preload="metadata"
                     onPlay={handleVideoPlay}
                     onPause={handleVideoPause}
                     onError={(e) => {
                       console.error('Video failed to load:', mediaUrl(product.videos[0]), e);
                       setIsVideoPlaying(false);
                       setVideoError(true);
                     }}
                     className="pd-video-el"
                     disablePictureInPicture
                     webkit-playsinline="true"
                     x5-playsinline="true"
                     x-webkit-airplay="deny"
                     style={{
                       objectFit: 'contain',
                       width: '100%',
                       height: '100%',
                       background: '#000'
                     }}
                   >
                     Your browser does not support video playback.
                   </video>
                 </div>
              ) : (
                <div className="pd-img-wrap">
                  <img
                    src={imgUrl(product.images?.[selectedImage]?.src || product.images?.[0]?.src)}
                    alt={product.title}
                    className="pd-main-img"
                    style={{
                      transform: isSwiping ? `translateX(${swipeOffset}px)` : 'translateX(0)',
                      transition: isSwiping ? 'none' : 'transform 0.3s ease',
                    }}
                  />
                  {allMedia.length > 1 && (
                    <div className="pd-dots">
                      {allMedia.map((_, idx) => {
                        const dotIndex = product.videos?.length > 0 && !videoError ? idx + 1 : idx;
                        const isActive = selectedImage === dotIndex || (selectedImage === 0 && idx === 0);
                        return (
                          <span
                            key={idx}
                            className={`pd-dot ${isActive ? 'pd-dot--active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (idx === 0 && product.videos?.length > 0 && !videoError) {
                                setSelectedImage(0);
                              } else {
                                setSelectedImage(dotIndex);
                              }
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {allMedia.length > 1 && (
              <div
                ref={thumbsRef}
                className="pd-thumbs"
                onMouseDown={handleThumbnailMouseDown}
                onMouseMove={handleThumbnailMouseMove}
                onMouseUp={handleThumbnailMouseUp}
                onMouseLeave={handleThumbnailMouseUp}
                onTouchStart={handleThumbnailTouchStart}
                onTouchMove={handleThumbnailTouchMove}
                onTouchEnd={handleThumbnailTouchEnd}
                style={{ cursor: dragCursor, userSelect: 'none' }}
              >
                {allMedia.map((media, idx) => {
                  const isVideoActive = product.videos?.length > 0 && !videoError && selectedImage === 0 && media.type === 'video';
                  const imageIndex = product.videos?.length > 0 && !videoError ? idx + 1 : idx;
                  const isImageActive = selectedImage === imageIndex;
                  const isActive = isVideoActive || isImageActive;

                  return (
                    <div
                      key={idx}
                      className={`pd-thumb ${isActive ? 'pd-thumb--active' : ''}`}
                      onClick={() => {
                        if (media.type === 'video' && product.videos?.length > 0 && !videoError) {
                          setSelectedImage(0);
                        } else {
                          setSelectedImage(imageIndex);
                        }
                      }}
                    >
                      {media.type === 'video' ? (
                        <div className="pd-thumb-video">
                          <video src={mediaUrl(media.src)} muted preload="metadata" />
                          <span className="pd-thumb-play">▶</span>
                        </div>
                      ) : (
                        <img src={imgUrl(media.src)} alt="" className="pd-thumb-img" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ===== PRODUCT INFO ===== */}
          <div className="pd-info">
            {product.badge && <span className="pd-badge">{product.badge}</span>}
            <h1 className="pd-title">{product.title}</h1>
            <p className="pd-subtitle">{product.bodyHtml?.replace(/<[^>]+>/g, '').slice(0, 120)}</p>

            <div className="pd-rating">
              <span className="pd-stars">★★★★★</span>
              <span className="pd-rating-value">{product.rating || 4.5}/5</span>
              <span className="pd-rating-count">({product.reviewCount || 0} reviews)</span>
            </div>

            <div className="pd-price">
              <span className="pd-sale-price">{formatPrice(price)}</span>
              {compareAt > price && (
                <>
                  <span className="pd-mrp">MRP {formatPrice(compareAt)}</span>
                  <span className="pd-discount">({discount}% off)</span>
                </>
              )}
              <p className="pd-tax">Inclusive of all taxes</p>
            </div>

            {/* Offers */}
            {offers.length > 0 && (
              <div className="pd-offers">
                <h4 className="pd-offers-title"><span>🎉</span> Available Offers</h4>
                {offers.map((offer, i) => (
                  <div key={i} className="pd-offer-item">
                    <span className="pd-offer-bullet">•</span>
                    <div>
                      <strong>{offer.title}</strong>
                      {offer.description && <p className="pd-offer-desc">{offer.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Variant Selector */}
            {hasOption1 && (
              <div className="pd-variant">
                <label className="pd-variant-label">{product.option1Name || 'Size'}</label>
                <div className="pd-variant-options">
                  {product.variants.map((v, i) => (
                    <button
                      key={i}
                      className={`pd-variant-btn ${i === selectedVariant ? 'pd-variant-btn--active' : ''}`}
                      onClick={() => { setSelectedVariant(i); setSelectedImage(i); }}
                    >
                      {v.option1 || `Option ${i + 1}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {hasOption2 && (
              <div className="pd-variant">
                <label className="pd-variant-label">Color</label>
                <div className="pd-variant-options">
                  {[...new Set(product.variants.map(v => v.option2).filter(Boolean))].map((color, i) => (
                    <button
                      key={i}
                      className="pd-variant-btn pd-variant-color"
                      style={{ background: color.toLowerCase() }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pd-actions">
              <button className="pd-btn pd-btn--outline" onClick={() => addToCart(product, variant)}>Add to Cart</button>
              <button className="pd-btn pd-btn--dark" onClick={handleBuyNow}>Buy Now</button>
            </div>

            {/* Short Description */}
            <div className="pd-desc-box">
              <h4 className="pd-desc-title">Product Description</h4>
              <ul className="pd-desc-list">
                <li className="pd-desc-item">
                  <span className="pd-desc-check">✓</span>
                  Premium quality {product.title} from {product.vendor || 'Tansoura'}
                </li>
                {product.benefits?.slice(0, 3).map((benefit, i) => (
                  <li key={i} className="pd-desc-item">
                    <span className="pd-desc-check">✓</span>
                    {benefit}
                  </li>
                ))}
                <li className="pd-desc-item">
                  <span className="pd-desc-check">✓</span>
                  100% authentic product with easy returns
                </li>
                <li className="pd-desc-item">
                  <span className="pd-desc-check">✓</span>
                  Free delivery on orders above ₹499
                </li>
                <li className="pd-desc-item">
                  <span className="pd-desc-check">✓</span>
                  Cash on Delivery available
                </li>
              </ul>
            </div>

            {/* Delivery Estimate */}
            <div className="pd-delivery">
              <div className="pd-delivery-header">
                <span className="pd-delivery-icon">📦</span>
                <h4 className="pd-delivery-title">Delivery Estimate</h4>
              </div>
              <div className="pd-delivery-info">
                <div className="pd-delivery-line">⚡ If ordered before 12PM, Today</div>
                <div className="pd-delivery-line">🚚 Free delivery on orders above ₹499</div>
              </div>
              <div className="pd-pincode-row">
                <input
                  type="text"
                  placeholder="Enter pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="pd-pincode-input"
                />
                <button
                  onClick={() => {
                    if (!pincode || pincode.length !== 6) {
                      alert('Please enter a valid 6-digit pincode');
                      return;
                    }
                    setDeliveryLoading(true);
                    setTimeout(() => {
                      const days = Math.floor(Math.random() * 4) + 4;
                      const date = new Date();
                      date.setDate(date.getDate() + days);
                      setDeliveryEstimate({
                        days: days,
                        date: date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })
                      });
                      setDeliveryLoading(false);
                    }, 800);
                  }}
                  disabled={deliveryLoading}
                  className="pd-pincode-btn"
                >
                  {deliveryLoading ? 'Checking...' : 'Check'}
                </button>
              </div>
              {deliveryEstimate && (
                <div className="pd-delivery-result">
                  <strong>Expected delivery:</strong> {deliveryEstimate.days} days - <strong>{deliveryEstimate.date}</strong>
                </div>
              )}
              <div className="pd-trust-badges">
                <div className="pd-trust-item"><span className="pd-trust-icon">✓</span>100% Authentic</div>
                <div className="pd-trust-item"><span className="pd-trust-icon">✓</span>Easy Returns</div>
                <div className="pd-trust-item"><span className="pd-trust-icon">✓</span>Secure Payment</div>
                <div className="pd-trust-item"><span className="pd-trust-icon">✓</span>COD Available</div>
              </div>
            </div>

            {/* Key Highlights */}
            {product.benefits?.length > 0 && (
              <div className="pd-highlights">
                <h3 className="pd-highlights-title">Key Highlights</h3>
                <ul className="pd-highlights-list">
                  {product.benefits.slice(0, 5).map((b, i) => (
                    <li key={i} className="pd-highlights-item">
                      <span className="pd-highlights-check">✓</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suitable For */}
            {product.suitableFor?.length > 0 && (
              <div className="pd-suitable">
                <h3 className="pd-suitable-title">Suitable For</h3>
                <div className="pd-suitable-tags">
                  {product.suitableFor.map((s, i) => (
                    <span key={i} className="pd-suitable-tag">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===== TABS ===== */}
        <div className="pd-tabs">
          <div className="pd-tab-buttons">
            {tabs.map(t => (
              <button
                key={t.id}
                className={`pd-tab-btn ${activeTab === t.id ? 'pd-tab-btn--active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="pd-tab-content">
            {activeTab === 'benefits' && (
              <div>
                <h3>Benefits</h3>
                {product.benefits?.length > 0 && (
                  <ul style={{ listStyle: 'disc', paddingLeft: 20 }}>
                    {product.benefits.map((b, i) => <li key={i} style={{ marginBottom: 8 }}>{b}</li>)}
                  </ul>
                )}
                {product.bodyHtml && <div dangerouslySetInnerHTML={{ __html: product.bodyHtml }} />}
              </div>
            )}
            {activeTab === 'ingredients' && (
              <div>
                <h3>Full Ingredients</h3>
                {product.ingredients ? (
                  <div dangerouslySetInnerHTML={{ __html: product.ingredients }} />
                ) : (
                  <p style={{ color: 'var(--text-muted)' }}>Ingredient information coming soon.</p>
                )}
              </div>
            )}
            {activeTab === 'howto' && (
              <div>
                <h3>How to Use</h3>
                {product.howToUse ? (
                  <div dangerouslySetInnerHTML={{ __html: product.howToUse }} />
                ) : (
                  <p style={{ color: 'var(--text-muted)' }}>Usage instructions coming soon.</p>
                )}
              </div>
            )}
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
            {activeTab === 'specs' && (
              <div>
                <h3>Product Specifications</h3>
                {product.specifications ? (
                  <div dangerouslySetInnerHTML={{ __html: product.specifications }} />
                ) : (
                  <div>
                    <p><strong>Vendor:</strong> {product.vendor || 'Tansoura'}</p>
                    <p><strong>Category:</strong> {product.productCategory ? product.productCategory.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'General'}</p>
                    <p><strong>Platform:</strong> {product.platform || 'Manual'}</p>
                    <p><strong>Rating:</strong> ⭐ {product.rating || 4.5}/5 ({product.reviewCount || 0} reviews)</p>
                    {variant?.sku && <p><strong>SKU:</strong> {variant.sku}</p>}
                    {variant?.inventoryQty !== undefined && <p><strong>Stock:</strong> {variant.inventoryQty > 0 ? 'In Stock' : 'Out of Stock'}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Frequently Bought Together */}
        {related.length > 0 && (
          <section className="pd-related">
            <h2 className="pd-related-title">Frequently Bought Together</h2>
            <p className="pd-related-subtitle">Complete your purchase with these complementary products</p>
            <ProductGrid products={related.slice(0, 4)} />
          </section>
        )}
      </div>
    </>
  );
}