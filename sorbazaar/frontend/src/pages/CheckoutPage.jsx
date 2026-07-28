import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import SEO from '../components/SEO';
import { auth as authApi, orders as ordersApi, promo, imgUrl, formatPrice } from '../api';

export default function CheckoutPage() {
  const { cart, cartTotal, user, authChecked, setAuthModal, setCart } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState('address');
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [address, setAddress] = useState({
    fullName: '', phone: '', pincode: '', addressLine1: '', addressLine2: '', city: '', state: ''
  });
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [validatingPromo, setValidatingPromo] = useState(false);

  useEffect(() => {
    if (!authChecked) return;
    if (!user) { setAuthModal('login'); return; }
    if (cart.length === 0 && !orderPlaced) { navigate('/'); return; }
    const defaultAddr = user.addresses?.find(a => a.isDefault) || user.addresses?.[0];
    if (defaultAddr) setAddress(defaultAddr);
  }, [user, authChecked, cart, navigate, setAuthModal, orderPlaced]);

  const updateAddr = (field) => (e) => setAddress({ ...address, [field]: e.target.value });

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    try { await authApi.saveAddress(address); } catch {}
    setStep('payment');
  };

  const handleApplyPromo = async () => {
    setValidatingPromo(true);
    setPromoError('');
    try {
      const result = await promo.validate(promoCode, cartTotal, cart);
      setAppliedPromo(result);
    } catch (err) {
      setPromoError(err.message);
      setAppliedPromo(null);
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
    setPromoError('');
  };

  const handleRazorpayPayment = async () => {
    setLoading(true);
    try {
      const shipping = cartTotal >= 299 ? 0 : 49;
      const discount = appliedPromo?.discount || 0;
      const total = cartTotal + shipping - discount;

      const razorpayOrder = await ordersApi.createRazorpayOrder(total);

      const loadRazorpayScript = () => {
        return new Promise((resolve) => {
          if (window.Razorpay) { resolve(window.Razorpay); return; }
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve(window.Razorpay);
          document.body.appendChild(script);
        });
      };

      const Razorpay = await loadRazorpayScript();

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_TDPERy2DA9NlDu',
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        order_id: razorpayOrder.orderId,
        name: 'Tansoura',
        description: 'Order Payment',
        image: '/logo.png',
        prefill: {
          name: address.fullName || user?.username || '',
          email: user?.email || '',
          contact: address.phone || user?.phone || ''
        },
        notes: { address: `${address.addressLine1}, ${address.city}, ${address.state} - ${address.pincode}` },
        theme: { color: '#0f172a' },
        handler: async (response) => {
          try {
            const orderData = {
              items: cart.map(i => ({ product: i.productId, title: i.title, price: i.price, quantity: i.quantity, image: i.image, variant: i.variant })),
              address, paymentMethod: 'razorpay', subtotal: cartTotal, shipping, total, paymentStatus: 'paid',
              promoCode: appliedPromo?.code, promoDiscount: discount,
              razorpayPayment: { razorpayOrderId: response.razorpay_order_id, razorpayPaymentId: response.razorpay_payment_id, razorpaySignature: response.razorpay_signature, status: 'captured' }
            };
            const order = await ordersApi.create(orderData);
            setCart([]); setOrderPlaced(true);
            navigate('/order-success', { state: { orderId: order._id, paymentMethod: 'razorpay' } });
          } catch (err) { alert('Payment successful but order creation failed. Please contact support.'); setLoading(false); }
        },
        modal: { ondismiss: () => setLoading(false) }
      };

      const rzp = new Razorpay(options);
      rzp.open();
    } catch (err) { alert('Failed to initialize payment. Please try again.'); setLoading(false); }
  };

  const handleUPIAppPayment = async () => {
    setLoading(true);
    try {
      const shipping = cartTotal >= 299 ? 0 : 49;
      const discount = appliedPromo?.discount || 0;
      const total = cartTotal + shipping - discount;
      await ordersApi.createRazorpayOrder(total);
      const upiId = 'TANSORA@ybl';
      const upiPayload = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent('Tansoura')}&am=${encodeURIComponent(total.toFixed(2))}&cu=INR&random=${Date.now()}`;
      window.location.href = upiPayload;
      setTimeout(() => { if (confirm('UPI app not detected. Open Razorpay to pay via UPI?')) handleRazorpayPayment(); else setLoading(false); }, 1500);
    } catch (err) { alert('Failed to open UPI app. Please try again.'); setLoading(false); }
  };

  const handleCODPayment = async () => {
    setLoading(true);
    try {
      const shipping = cartTotal >= 299 ? 0 : 49;
      const discount = appliedPromo?.discount || 0;
      const total = cartTotal + shipping - discount;
      const orderData = { items: cart.map(i => ({ product: i.productId, title: i.title, price: i.price, quantity: i.quantity, image: i.image, variant: i.variant })), address, paymentMethod: 'cod', subtotal: cartTotal, shipping, total, paymentStatus: 'pending', promoCode: appliedPromo?.code, promoDiscount: discount };
      const order = await ordersApi.create(orderData);
      setCart([]); setOrderPlaced(true);
      navigate('/order-success', { state: { orderId: order._id, paymentMethod: 'cod' } });
    } catch (err) { alert(`Order failed: ${err.message || 'Please try again'}`); setLoading(false); }
  };

  if (!user || cart.length === 0) return null;

  const shipping = cartTotal >= 299 ? 0 : 49;
  const discount = appliedPromo?.discount || 0;
  const total = cartTotal + shipping - discount;

  return (
    <>
      <SEO title="Checkout - Complete Your Order" description="Complete your order on Tansoura. Secure checkout with Razorpay and Cash on Delivery. Free shipping above ₹299." noindex breadcrumbs={[{ name: 'Home', item: 'https://tansoura.in/' }, { name: 'Checkout', item: 'https://tansoura.in/checkout' }]} />
      <div className="container checkout-page">
        <h1 className="section-title" style={{ marginBottom: 32 }}>Checkout</h1>
        <div className="checkout-grid">
          <div>
            {step === 'address' ? (
              <div className="checkout-section">
                <h2>📦 Delivery Address</h2>
                <form className="checkout-form" onSubmit={handleAddressSubmit}>
                  <div className="form-group"><label>Full Name</label><input value={address.fullName} onChange={updateAddr('fullName')} required /></div>
                  <div className="form-row">
                    <div className="form-group"><label>Phone</label><input value={address.phone} onChange={updateAddr('phone')} required /></div>
                    <div className="form-group"><label>Pincode</label><input value={address.pincode} onChange={updateAddr('pincode')} required /></div>
                  </div>
                  <div className="form-group"><label>Address Line 1</label><input value={address.addressLine1} onChange={updateAddr('addressLine1')} required /></div>
                  <div className="form-group"><label>Address Line 2</label><input value={address.addressLine2} onChange={updateAddr('addressLine2')} /></div>
                  <div className="form-row">
                    <div className="form-group"><label>City</label><input value={address.city} onChange={updateAddr('city')} required /></div>
                    <div className="form-group"><label>State</label><input value={address.state} onChange={updateAddr('state')} required /></div>
                  </div>
                  <button className="btn btn-primary" type="submit">Proceed to Payment →</button>
                </form>
              </div>
            ) : (
              <div className="checkout-section">
                <h2>💳 Payment Method</h2>
                <div className="payment-options">
                  <label className={`payment-option ${paymentMethod === 'razorpay' ? 'selected' : ''}`}>
                    <input type="radio" name="payment" value="razorpay" checked={paymentMethod === 'razorpay'} onChange={() => setPaymentMethod('razorpay')} />
                    <div>
                      <div style={{ fontWeight: 600 }}>💳 Pay with Razorpay</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>UPI, Cards, Net Banking, Wallets & more</div>
                    </div>
                  </label>
                  <label className={`payment-option ${paymentMethod === 'cod' ? 'selected' : ''}`}>
                    <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
                    <div>
                      <div style={{ fontWeight: 600 }}>💵 Cash on Delivery</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pay when you receive the order</div>
                    </div>
                  </label>
                </div>

                {paymentMethod === 'razorpay' && (
                  <button type="button" className="btn btn-outline" onClick={handleUPIAppPayment} disabled={loading} style={{ width: '100%', marginTop: 12 }}>
                    📱 Open UPI App & Pay {formatPrice(total)}
                  </button>
                )}

                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                  <button className="btn btn-outline" onClick={() => setStep('address')}>← Back</button>
                  {paymentMethod === 'razorpay' && (
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleRazorpayPayment} disabled={loading}>
                      {loading ? 'Processing...' : `Pay Using QR ${formatPrice(total)}`}
                    </button>
                  )}
                  {paymentMethod === 'cod' && (
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCODPayment} disabled={loading}>
                      {loading ? 'Processing...' : `Place Order - ${formatPrice(total)}`}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="checkout-section" style={{ height: 'fit-content', position: 'sticky', top: 100 }}>
            <h2>🧾 Order Summary</h2>
            {cart.map(item => (
              <div key={item.key} className="order-summary-item">
                <img src={imgUrl(item.image)} alt={item.title} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Qty: {item.quantity}</div>
                </div>
                <div style={{ fontWeight: 700 }}>{formatPrice(item.price * item.quantity)}</div>
              </div>
            ))}
            
            <div style={{ marginTop: 20, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
              <h3 style={{ fontSize: 14, marginBottom: 12 }}>🎟️ Promo Code</h3>
              {!appliedPromo ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" placeholder="Enter promo code" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14 }} />
                  <button className="btn btn-primary" onClick={handleApplyPromo} disabled={validatingPromo || !promoCode} style={{ padding: '8px 16px' }}>{validatingPromo ? 'Applying...' : 'Apply'}</button>
                </div>
              ) : (
                <div style={{ background: '#E8F5E9', padding: 12, borderRadius: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <strong style={{ color: '#2E7D32' }}>{appliedPromo.code}</strong>
                    <button type="button" onClick={handleRemovePromo} style={{ background: 'none', border: 'none', color: '#c62828', cursor: 'pointer', fontSize: 12 }}>Remove</button>
                  </div>
                  <div style={{ fontSize: 13, color: '#2E7D32' }}>Discount: -{formatPrice(appliedPromo.discount)}</div>
                </div>
              )}
              {promoError && <div style={{ color: '#d32f2f', fontSize: 12, marginTop: 8 }}>{promoError}</div>}
            </div>

            <div style={{ marginTop: 16 }}>
              <div className="summary-row"><span>Subtotal</span><span>{formatPrice(cartTotal)}</span></div>
              {appliedPromo && <div className="summary-row" style={{ color: '#2E7D32' }}><span>Promo Discount ({appliedPromo.code})</span><span>-{formatPrice(appliedPromo.discount)}</span></div>}
              <div className="summary-row"><span>Shipping</span><span>{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span></div>
              <div className="summary-row total"><span>Total</span><span>{formatPrice(total)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}