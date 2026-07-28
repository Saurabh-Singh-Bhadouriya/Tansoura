import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { imgUrl, mediaUrl, formatPrice, products as productsApi } from '../api';
import { useState, useRef, useEffect } from 'react';

export default function ProductCard({ product, onAddCart }) {
  const navigate = useNavigate();
  const { addToCart, setCartOpen } = useApp();
  const variant = product.variants?.[0];
  const price = variant?.price || 0;
  const compareAt = variant?.compareAtPrice;

  const handleAddCart = (e) => {
    e.stopPropagation();
    addToCart(product, variant);
    onAddCart?.();
  };

  const handleBuyNow = (e) => {
    e.stopPropagation();
    addToCart(product, variant);
    setCartOpen(false);
    navigate('/checkout');
  };

  const [hovered, setHovered] = useState(false);
  const videoRef = useRef(null);
  const hasVideo = product.videos?.length > 0;

  useEffect(() => {
    if (hasVideo && videoRef.current) {
      if (hovered) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [hovered, hasVideo]);

  return (
    <div className="product-card" onClick={() => navigate(`/products/${product.handle}`)}>
      <div className="product-card-image" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        {hasVideo ? (
          <video
            ref={videoRef}
            src={mediaUrl(product.videos[0])}
            className="product-card-video"
            muted
            loop
            playsInline
            preload="metadata"
            poster={imgUrl(product.images?.[0]?.src)}
          />
        ) : (
          <img src={imgUrl(product.images?.[0]?.src)} alt={product.title} loading="lazy" />
        )}
        {!hasVideo && product.badge && <span className="product-badge">{product.badge}</span>}
      </div>
      <div className="product-card-body">
        <h3 className="product-card-title">{product.title}</h3>
        <p className="product-card-desc">{product.tags?.slice(0, 2).join(', ')}</p>
        <div className="product-rating">
          <span className="stars">★</span>
          <span>{product.rating}/5</span>
          <span style={{ color: 'var(--text-muted)' }}>({product.reviewCount})</span>
        </div>
        <div className="product-price">
          <span className="sale">{formatPrice(price)}</span>
          {compareAt > price && <span className="original">{formatPrice(compareAt)}</span>}
        </div>
        <div className="product-card-actions">
          <button className="btn btn-outline btn-sm" onClick={handleAddCart}>Add to Cart</button>
          <button className="btn btn-primary btn-sm" onClick={handleBuyNow}>Buy Now</button>
        </div>
      </div>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="product-card" style={{ opacity: 0.7 }}>
      <div className="product-card-image" style={{ background: '#e9ecef', minHeight: 220 }} />
      <div className="product-card-body">
        <div style={{ height: 14, background: '#e9ecef', borderRadius: 4, marginBottom: 8 }} />
        <div style={{ height: 12, background: '#e9ecef', borderRadius: 4, width: '70%', marginBottom: 12 }} />
        <div style={{ height: 12, background: '#e9ecef', borderRadius: 4, width: '40%', marginBottom: 16 }} />
        <div style={{ height: 36, background: '#e9ecef', borderRadius: 6 }} />
      </div>
    </div>
  );
}

export function ProductGrid({ products, loading }) {
  if (loading) return (
    <div className="product-grid">
      {Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)}
    </div>
  );
  if (!products?.length) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No products found</div>;
  return (
    <div className="product-grid">
      {products.map(p => <ProductCard key={p._id} product={p} />)}
    </div>
  );
}
