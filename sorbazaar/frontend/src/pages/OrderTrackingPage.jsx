import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import SEO from '../components/SEO';
import OrderTrackList from '../components/OrderTrackList';
import { orders as ordersApi, imgUrl, formatPrice } from '../api';

// Normal delivery flow
const DELIVERY_STEPS = [
  { key: 'confirmed', label: 'Order Confirmed', desc: 'Your order has been placed & confirmed', icon: '✅' },
  { key: 'shipped', label: 'Shipped', desc: 'Your package has been shipped', icon: '🚚' },
  { key: 'outForDelivery', label: 'Out for Delivery', desc: 'Delivery partner is on the way', icon: '📍' },
  { key: 'delivered', label: 'Delivered', desc: 'Package delivered successfully', icon: '🎉' },
];

// Return flow (after delivery)
const RETURN_STEPS = [
  { key: 'return_requested', label: 'Return Requested', desc: 'Return request has been initiated', icon: '🔄' },
  { key: 'return_pickup', label: 'Return Pickup', desc: 'Pickup scheduled at your address', icon: '📦' },
  { key: 'returned', label: 'Returned / Refunded', desc: 'Amount will be refunded shortly', icon: '💰' },
];

function getCompletedIndex(order) {
  if (!order) return -1;
  const { orderStatus, tracking } = order;

  // If cancelled before delivery
  if (orderStatus === 'cancelled' && !tracking?.delivered) return -1;

  // Return flow
  if (orderStatus === 'returned' || tracking?.returned) return 3;
  if (orderStatus === 'return_pickup' || tracking?.returnPickup) return 2;
  if (orderStatus === 'return_requested' || tracking?.returnRequested) return 1;

  // Delivery flow
  if (orderStatus === 'delivered' || tracking?.delivered) return 3;
  if (orderStatus === 'out_for_delivery' || tracking?.outForDelivery) return 2;
  if (orderStatus === 'shipped' || tracking?.shipped) return 1;
  if (orderStatus === 'confirmed' || orderStatus === 'pending') return 0;
  
  return -1;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function TrackingNode({ label, desc, isActive, isCurrent, dateStr }) {
  return (
    <div style={{ minWidth: 130, padding: '4px 8px' }}>
      <div style={{
        fontWeight: isActive ? 700 : 400,
        fontSize: isCurrent ? 15 : 13,
        color: isActive ? 'var(--text)' : 'var(--text-muted)',
        marginBottom: 2,
        transition: 'all 0.3s'
      }}>
        {label}
      </div>
      {desc && <div style={{ fontSize: 11, color: isActive ? 'var(--text-muted)' : 'var(--text-muted)', opacity: isActive ? 1 : 0.5, marginBottom: 2 }}>{desc}</div>}
      {dateStr && (
        <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 2, fontWeight: 500 }}>
          {dateStr}
        </div>
      )}
    </div>
  );
}

export default function OrderTrackingPage() {
  const { id } = useParams();
  const { user, authChecked, setAuthModal } = useApp();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authChecked) return;
    if (!user) {
      setAuthModal('login');
      setLoading(false);
      return;
    }
    if (!id) return;
    
    ordersApi.get(id)
      .then(data => {
        setOrder(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id, user, authChecked, setAuthModal]);

  if (!user) return null;
  if (loading) return <div className="container" style={{ textAlign: 'center', padding: '80px 20px' }}>Loading tracking details...</div>;
  if (error) return <div className="container" style={{ textAlign: 'center', padding: '80px 20px' }}><p style={{ color: 'var(--danger)' }}>{error || 'Request failed'}</p><Link to="/orders" className="btn btn-primary" style={{ marginTop: 16 }}>View My Orders</Link></div>;
  if (!order) return <div className="container" style={{ textAlign: 'center', padding: '80px 20px' }}><p>Order not found</p><Link to="/orders" className="btn btn-primary" style={{ marginTop: 16 }}>View My Orders</Link></div>;

  const orderStatus = order.orderStatus;
  const isCancelledBeforeDelivery = orderStatus === 'cancelled' && !order.tracking?.delivered;
  const canCancel = ['pending', 'confirmed', 'pending_verification'].includes(orderStatus);
  const isReturnFlow = ['return_requested', 'return_pickup', 'returned'].includes(orderStatus) || order.tracking?.returnRequested;
  const isDelivered = orderStatus === 'delivered' || !!order.tracking?.delivered;

  // Determine which steps to show
  const deliverySteps = DELIVERY_STEPS;
  const showReturnFlow = isReturnFlow || (isDelivered && orderStatus !== 'cancelled');

  const completedDeliveryIndex = getCompletedIndex(order);
  
  // For return flow, completedIndex is 1-based within RETURN_STEPS
  const getReturnCompletedIndex = () => {
    const { orderStatus, tracking } = order;
    if (orderStatus === 'returned' || tracking?.returned) return 2;
    if (orderStatus === 'return_pickup' || tracking?.returnPickup) return 1;
    if (orderStatus === 'return_requested' || tracking?.returnRequested) return 0;
    return -1;
  };

  const returnCompletedIndex = getReturnCompletedIndex();

  return (
    <>
      <SEO
        title={`Order Tracking - #${order._id.slice(-8).toUpperCase()}`}
        description={`Track your order #${order._id.slice(-8).toUpperCase()} on Tansoura. Real-time order status and delivery updates.`}
        noindex={true}
      />

      <div className="container tracking-page">
        <div className="tracking-header">
          <h1>Order Tracking</h1>
          <p className="tracking-order-id">Order #{order._id.slice(-8).toUpperCase()}</p>
          <p className="tracking-date">Placed on {formatDate(order.createdAt)}</p>
        </div>

        {isCancelledBeforeDelivery ? (
          <div className="tracking-cancelled">
            <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
            <h2>Order Cancelled</h2>
            <p>This order has been cancelled before delivery.</p>
            {order.cancellationReason && (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>Reason: {order.cancellationReason}</p>
            )}
          </div>
        ) : (
          <>
            {/* Delivery Timeline */}
            <div className="tracking-timeline" style={{ padding: '24px 16px', overflowX: 'auto' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>Delivery Status</h3>
              <OrderTrackList
                data={deliverySteps}
                completedIndex={completedDeliveryIndex}
                horizontal={true}
                componentSize={28}
                strokeDuration={500}
                strokeCompletedColor="#0F9D58"
                strokePendingColor="#CCCCCC"
                enableRipple={true}
                completedComponent={(index) => (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    backgroundColor: '#0F9D58', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: 'white', fontSize: 13, fontWeight: 'bold',
                    boxShadow: '0 2px 8px rgba(15, 157, 88, 0.4)',
                  }}>✓</div>
                )}
                pendingComponent={(index) => {
                  const step = deliverySteps[index];
                  // Show icon on pending if it's the current step
                  const isCurrent = index === completedDeliveryIndex + 1 && completedDeliveryIndex >= 0;
                  return (
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      backgroundColor: isCurrent ? 'white' : '#E8E8E8',
                      border: isCurrent ? `3px solid #999999` : 'none',
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 13, opacity: isCurrent ? 1 : 0.6,
                    }}>{isCurrent ? '○' : '○'}</div>
                  );
                }}
                renderItem={({ item, index }) => {
                  const isActive = index <= completedDeliveryIndex;
                  const isCurrent = index === completedDeliveryIndex;
                  let dateStr = '';
                  if (item.key === 'confirmed') dateStr = formatDate(order.tracking?.confirmed);
                  if (item.key === 'shipped') dateStr = formatDate(order.tracking?.shipped);
                  if (item.key === 'outForDelivery') dateStr = formatDate(order.tracking?.outForDelivery);
                  if (item.key === 'delivered') dateStr = formatDate(order.tracking?.delivered);
                  return <TrackingNode label={item.label} desc={item.desc} isActive={isActive} isCurrent={isCurrent} dateStr={dateStr} />;
                }}
              />
            </div>

            {/* Return Timeline (only if delivered + return started, or returned) */}
            {showReturnFlow && (
              <div className="tracking-timeline" style={{ padding: '24px 16px', overflowX: 'auto', marginTop: isCancelledBeforeDelivery ? 0 : -12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, textAlign: 'center', color: '#E53E3E' }}>
                  {orderStatus === 'returned' ? '🔄 Return / Refund' : '🔄 Return Progress'}
                </h3>
                <OrderTrackList
                  data={RETURN_STEPS}
                  completedIndex={returnCompletedIndex}
                  horizontal={true}
                  componentSize={28}
                  strokeDuration={500}
                  strokeCompletedColor="#E53E3E"
                  strokePendingColor="#CCCCCC"
                  enableRipple={true}
                  completedComponent={(index) => (
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      backgroundColor: '#E53E3E', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: 'white', fontSize: 13, fontWeight: 'bold',
                      boxShadow: '0 2px 8px rgba(229, 62, 62, 0.4)',
                    }}>✓</div>
                  )}
                  pendingComponent={(index) => {
                    const isCurrent = index === returnCompletedIndex + 1;
                    return (
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        backgroundColor: isCurrent ? 'white' : '#E8E8E8',
                        border: isCurrent ? `3px solid #E53E3E` : 'none',
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 13, opacity: isCurrent ? 1 : 0.6,
                      }}>{isCurrent ? '○' : '○'}</div>
                    );
                  }}
                  renderItem={({ item, index }) => {
                    const isActive = index <= returnCompletedIndex;
                    const isCurrent = index === returnCompletedIndex;
                    let dateStr = '';
                    if (item.key === 'return_requested') dateStr = formatDate(order.tracking?.returnRequested);
                    if (item.key === 'return_pickup') dateStr = formatDate(order.tracking?.returnPickup);
                    if (item.key === 'returned') dateStr = formatDate(order.tracking?.returned);
                    return <TrackingNode label={item.label} desc={item.desc} isActive={isActive} isCurrent={isCurrent} dateStr={dateStr} />;
                  }}
                />
              </div>
            )}

            {/* Current Status Info */}
            <div className="tracking-current-status" style={{
              background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: 20,
              boxShadow: 'var(--shadow)', marginBottom: 24, textAlign: 'center'
            }}>
              {isReturnFlow ? (
                <>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🔄</div>
                  <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
                    {orderStatus === 'returned' ? 'Returned / Refunded' : 'Return in Progress'}
                  </div>
                  {orderStatus === 'returned' && order.tracking?.returned && (
                    <div style={{ color: 'var(--primary)', fontSize: 13, marginTop: 8, fontWeight: 500 }}>
                      Refunded on {formatDate(order.tracking?.returned)}
                    </div>
                  )}
                </>
              ) : completedDeliveryIndex >= 0 && completedDeliveryIndex < deliverySteps.length ? (
                <>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>{deliverySteps[completedDeliveryIndex]?.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
                    {deliverySteps[completedDeliveryIndex]?.label}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                    {deliverySteps[completedDeliveryIndex]?.desc}
                  </div>
                </>
              ) : null}
            </div>

            {/* Estimated Delivery */}
            {!isCancelledBeforeDelivery && !showReturnFlow && (
              <div className="tracking-delivery">
                <div className="delivery-estimate">
                  <span className="delivery-icon">🚚</span>
                  <div>
                    <div className="delivery-title">Estimated Delivery</div>
                    <div className="delivery-text">{order.estimatedDelivery || '3-7 business days'}</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Order Summary */}
        <div className="tracking-order-summary">
          <h2>Order Summary</h2>
          <div className="tracking-items">
            {order.items.map((item, i) => (
              <div key={i} className="tracking-item">
                <img src={imgUrl(item.image)} alt={item.title} />
                <div className="tracking-item-info">
                  <div className="tracking-item-title">{item.title}</div>
                  {item.variant && <div className="tracking-item-variant">{item.variant}</div>}
                  <div className="tracking-item-qty">Qty: {item.quantity}</div>
                </div>
                <div className="tracking-item-price">{formatPrice(item.price * item.quantity)}</div>
              </div>
            ))}
          </div>
          <div className="tracking-totals">
            <div className="tracking-total-row"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
            <div className="tracking-total-row"><span>Shipping</span><span>{order.shipping === 0 ? 'FREE' : formatPrice(order.shipping)}</span></div>
            <div className="tracking-total-row total"><span>Total</span><span>{formatPrice(order.total)}</span></div>
          </div>
        </div>

        {/* Delivery Address */}
        {order.address && (
          <div className="tracking-address">
            <h2>Delivery Address</h2>
            <p>{order.address.fullName}</p>
            <p>{order.address.addressLine1}{order.address.addressLine2 ? `, ${order.address.addressLine2}` : ''}</p>
            <p>{order.address.city}, {order.address.state} - {order.address.pincode}</p>
            <p>Phone: {order.address.phone}</p>
          </div>
        )}

        <div className="tracking-actions">
          {canCancel && (
            <button 
              className="btn btn-outline" 
              style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
              onClick={async () => {
                const reason = prompt('Enter cancellation reason (optional):') || 'Cancelled by customer';
                if (!confirm('Are you sure you want to cancel this order?')) return;
                try {
                  await ordersApi.cancel(order._id, reason);
                  window.location.reload();
                } catch (err) {
                  alert(err.message);
                }
              }}
            >
              ❌ Cancel Order
            </button>
          )}
          <Link to="/orders" className="btn btn-outline">View All Orders</Link>
          <Link to="/" className="btn btn-primary">Continue Shopping</Link>
        </div>
      </div>
    </>
  );
}