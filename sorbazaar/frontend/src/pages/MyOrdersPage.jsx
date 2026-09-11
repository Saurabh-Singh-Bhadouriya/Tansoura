import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import SEO from '../components/SEO';
import { orders as ordersApi, imgUrl, formatPrice } from '../api';

const CANCELLABLE_STATUSES = ['pending', 'confirmed', 'pending_verification'];

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_STYLES = {
  pending: { bg: '#FAF5FF', color: '#6B46C1', label: 'Pending' },
  confirmed: { bg: '#EBF8FF', color: '#2B6CB0', label: 'Confirmed' },
  shipped: { bg: '#FEFCBF', color: '#975A16', label: 'Shipped' },
  out_for_delivery: { bg: '#FEEBC8', color: '#C05621', label: 'Out for Delivery' },
  delivered: { bg: '#F0FFF4', color: '#276749', label: 'Delivered' },
  return_requested: { bg: '#FFF5F5', color: '#9B2C2C', label: 'Return Requested' },
  return_pickup: { bg: '#FFF5F5', color: '#9B2C2C', label: 'Return Pickup' },
  returned: { bg: '#E53E3E', color: 'white', label: 'Returned' },
  cancelled: { bg: '#FFF5F5', color: '#C53030', label: 'Cancelled' }
};

export default function MyOrdersPage() {
  const { user, authChecked, setAuthModal } = useApp();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authChecked) return;
    if (!user) {
      setAuthModal('login');
      setLoading(false);
      return;
    }
    ordersApi.my()
      .then(data => {
        setOrders(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user, authChecked, setAuthModal]);

  if (!user) return null;
  if (loading) return <div className="container" style={{ textAlign: 'center', padding: '80px 20px' }}>Loading orders...</div>;

  return (
    <>
      <SEO
        title="My Orders - Tansoura"
        description="View your order history on Tansoura. Track your orders, check delivery status, and manage your purchases."
        noindex={true}
      />

      <div className="container orders-page">
        <h1 className="section-title">My Orders</h1>
        <p className="section-subtitle">View and track all your orders</p>

        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📦</div>
            <h2 style={{ marginBottom: 12 }}>No orders yet</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Looks like you haven't placed any orders yet.</p>
            <Link to="/" className="btn btn-primary">Start Shopping</Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map(order => {
              const s = STATUS_STYLES[order.orderStatus] || STATUS_STYLES.pending;
              return (
                <div key={order.id} className="order-card">
                  <div className="order-card-header">
                    <div>
                      <span className="order-id">Order #{order.id.slice(-8).toUpperCase()}</span>
                      <span className="order-date">{formatDate(order.createdAt)}</span>
                    </div>
                    <span style={{ backgroundColor: s.bg, color: s.color, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, display: 'inline-block' }}>
                      {s.label}
                    </span>
                  </div>
                  <div className="order-card-items">
                    {order.items.slice(0, 3).map((item, i) => (
                      <img key={i} src={imgUrl(item.image)} alt={item.title} className="order-item-thumb" />
                    ))}
                    {order.items.length > 3 && <span className="order-more-items">+{order.items.length - 3}</span>}
                  </div>
                  <div className="order-card-footer">
                    <span className="order-total" style={{ fontSize: 18, fontWeight: 700 }}>{formatPrice(order.total)}</span>
                    <div className="order-card-actions">
                      {order.orderStatus !== 'cancelled' && order.orderStatus !== 'returned' && order.orderStatus !== 'delivered' && (
                        <>
                          <Link to={`/order/${order.id}/track`} className="btn btn-sm btn-primary">Track Order</Link>
                          {CANCELLABLE_STATUSES.includes(order.orderStatus) && (
                            <button 
                              className="btn btn-sm btn-outline" 
                              style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                              onClick={async () => {
                                const reason = prompt('Enter cancellation reason (optional):') || 'Cancelled by customer';
                                if (!confirm('Are you sure you want to cancel this order?')) return;
                                try {
                                  await ordersApi.cancel(order.id, reason);
                                  window.location.reload();
                                } catch (err) {
                                  alert(err.message);
                                }
                              }}
                            >
                              Cancel
                            </button>
                          )}
                        </>
                      )}
                      {order.orderStatus === 'cancelled' && (
                        <span style={{ color: 'var(--danger)', fontSize: 12, fontWeight: 600 }}>❌ Cancelled</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}