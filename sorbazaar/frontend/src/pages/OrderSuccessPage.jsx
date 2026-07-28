import { useLocation, Link } from 'react-router-dom';
import SEO from '../components/SEO';

export default function OrderSuccessPage() {
  const location = useLocation();
  const orderId = location.state?.orderId;

  return (
    <>
      <SEO
        title="Order Placed Successfully"
        description="Your order has been placed successfully on Tansoura. Thank you for shopping with us. You will receive a confirmation shortly."
        noindex={true}
      />

      <div className="container" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <h1 style={{ fontSize: 28, marginBottom: 12 }}>Order Placed Successfully!</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>Thank you for shopping with Tansoura.</p>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
          You will receive a confirmation shortly.
          {orderId && <span style={{ display: 'block', marginTop: 4, fontWeight: 500, color: 'var(--primary)' }}>Order ID: #{orderId.slice(-8).toUpperCase()}</span>}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {orderId && (
            <Link to={`/order/${orderId}/track`} className="btn btn-outline">📦 Track Order</Link>
          )}
          <Link to="/orders" className="btn btn-outline">My Orders</Link>
          <Link to="/" className="btn btn-primary">Continue Shopping</Link>
        </div>
      </div>
    </>
  );
}
