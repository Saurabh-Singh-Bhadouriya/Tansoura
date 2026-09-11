import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { imgUrl, formatPrice, products as productsApi } from '../api';

export default function CartDrawer() {
  const { cart, cartOpen, setCartOpen, updateQty, removeFromCart, cartTotal, user, setAuthModal } = useApp();
  const [recommendations, setRecommendations] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (cart.length > 0) {
      productsApi.recommendations(cart[0].productId).then(setRecommendations).catch(() => {});
    }
  }, [cart]);

  const handleCheckout = () => {
    if (!user) {
      setAuthModal('login');
      return;
    }
    setCartOpen(false);
    navigate('/checkout');
  };

  return (
    <>
      <div className={`cart-overlay ${cartOpen ? 'open' : ''}`} onClick={() => setCartOpen(false)} />
      <div className={`cart-drawer ${cartOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h2>Cart ({cart.length})</h2>
          <button className="cart-close" onClick={() => setCartOpen(false)} aria-label="Close cart">×</button>
        </div>

        <div className="cart-items">
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>🛒</p>
              <p>Your cart is empty</p>
            </div>
          ) : cart.map(item => (
            <div key={item.key} className="cart-item">
              <img 
                className="cart-item-img" 
                src={imgUrl(item.image)} 
                alt={item.title}
                loading="lazy"
                decoding="async"
              />
              <div className="cart-item-info">
                <div className="cart-item-title">{item.title}</div>
                {item.variant && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.variant}</div>}
                <div className="cart-item-price">{formatPrice(item.price)}</div>
                <div className="cart-qty">
                  <button 
                    onClick={() => updateQty(item.key, item.quantity - 1)}
                    aria-label="Decrease quantity"
                    type="button"
                  >−</button>
                  <span>{item.quantity}</span>
                  <button 
                    onClick={() => updateQty(item.key, item.quantity + 1)}
                    aria-label="Increase quantity"
                    type="button"
                  >+</button>
                  <button 
                    style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--danger)', background: 'none' }}
                    onClick={() => removeFromCart(item.key)}
                    type="button"
                  >Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {recommendations.length > 0 && (
          <div className="cart-recommendations">
            <h3>Trending Products</h3>
            <div className="cart-rec-grid">
              {recommendations.slice(0, 6).map(p => (
                <div key={p.id} className="cart-rec-item" onClick={() => { setCartOpen(false); navigate(`/products/${p.handle}`); }}>
                  <img src={imgUrl(p.images?.[0]?.src)} alt={p.title} />
                  <p>{p.title.slice(0, 30)}...</p>
                  <span>{formatPrice(p.variants?.[0]?.price)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total">
              <span>Subtotal</span>
              <span>{formatPrice(cartTotal)}</span>
            </div>
            <button className="btn btn-primary btn-full" onClick={handleCheckout}>Checkout</button>
          </div>
        )}
      </div>
    </>
  );
}
