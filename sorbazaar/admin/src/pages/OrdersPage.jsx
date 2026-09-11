import { useState, useEffect } from 'react';
import { imgUrl } from '../api';

const API = import.meta.env.VITE_API_URL || '/api';

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('adminToken');
  const headers = { ...options.headers };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${endpoint}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

const STATUS_COLORS = {
  pending: '#FFC107',
  pending_verification: '#FF9800',
  verified: '#4CAF50',
  paid: '#4CAF50',
  failed: '#F44336',
  confirmed: '#2196F3',
  received: '#00BCD4',
  shipped: '#9C27B0',
  out_for_delivery: '#FF9800',
  delivered: '#4CAF50',
  cancelled: '#F44336'
};

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'received', label: 'Order Received' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' }
];

// Helper to convert MongoDB ObjectId to string
const toId = (id) => {
  if (!id) return '';
  return typeof id === 'object' ? String(id) : String(id);
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [message, setMessage] = useState('');
  const [autoVerifying, setAutoVerifying] = useState(false);
  const [timers, setTimers] = useState({});

  const load = () => {
    setLoading(true);
    const params = filter !== 'all' ? `?paymentStatus=${filter}` : '';
    apiFetch(`/orders/admin/all${params}`)
      .then(data => {
        // Ensure all _id fields are strings
        const normalized = data.map(order => ({
          ...order,
          id: toId(order.id),
          user: typeof order.user === 'object' ? { ...order.user, _id: toId(order.id) } : order.user
        }));
        setOrders(normalized);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [filter]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => {
        const newTimers = {};
        orders.forEach(order => {
          const id = toId(order.id);
          if (order.paymentStatus === 'pending_verification' && order.paymentVerificationAttemptedAt) {
            const remaining = 120 - Math.floor((Date.now() - new Date(order.paymentVerificationAttemptedAt).getTime()) / 1000);
            newTimers[id] = Math.max(0, remaining);
          }
        });
        return newTimers;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [orders]);

  const handleVerify = async (id, action) => {
    try {
      const orderId = toId(id);
      console.log('Verifying payment:', orderId, action);
      
      const res = await apiFetch(`/orders/admin/verify-payment/${orderId}`, {
        method: 'PUT',
        body: JSON.stringify({ action })
      });
      setMessage('✅ ' + res.message);
      load();
    } catch (err) {
      console.error('Verify failed:', err);
      setMessage('❌ ' + err.message);
      alert('Failed to verify payment: ' + err.message);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const id = toId(orderId);
      console.log('Updating order:', id, 'to:', newStatus);
      const res = await apiFetch(`/orders/admin/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ orderStatus: newStatus })
      });
      setMessage('✅ ' + res.message);
      load();
    } catch (err) {
      console.error('Update failed:', err);
      setMessage('❌ ' + err.message);
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleDelete = async (orderId) => {
    if (!confirm('Delete this order permanently?')) return;
    try {
      const id = toId(orderId);
      await apiFetch(`/orders/admin/${id}`, { method: 'DELETE' });
      setMessage('Order deleted successfully');
      load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleAutoVerify = async () => {
    setAutoVerifying(true);
    try {
      const res = await apiFetch('/orders/admin/auto-verify', { method: 'POST' });
      setMessage(res.message);
      load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setAutoVerifying(false);
    }
  };

  const pendingVerification = orders.filter(o => o.paymentStatus === 'pending_verification');

  return (
    <>
      <div className="page-header">
        <h1>Orders {pendingVerification.length > 0 && <span style={{ fontSize: 14, color: '#FF9800', fontWeight: 600 }}>({pendingVerification.length} pending verification)</span>}</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13 }}>
            <option value="all">All Orders</option>
            <option value="pending_verification">Pending Verification</option>
            <option value="verified">Verified</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
          </select>
          <button className="btn btn-outline" onClick={handleAutoVerify} disabled={autoVerifying}>
            {autoVerifying ? 'Auto-verifying...' : '⚡ Auto-Verify (2min)'}
          </button>
        </div>
      </div>

      {message && <div className={message.includes('successfully') || message.includes('updated') || message.includes('✅') ? 'success' : 'error'}>{message}</div>}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>UPI Details</th>
                <th>Timer</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={9}>Loading...</td></tr> :
                orders.length === 0 ? <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No orders found</td></tr> :
                orders.map(order => {
                  const orderId = toId(order.id);
                  const timerTime = timers[orderId];
                  
                  return (
                    <tr key={orderId} style={{ background: order.paymentStatus === 'pending_verification' ? '#FFF8E1' : 'transparent' }}>
                      <td>
                        <strong>#{orderId.slice(-8).toUpperCase()}</strong>
                        <br /><small style={{ color: 'var(--text-muted)', fontSize: 11 }}>{new Date(order.createdAt).toLocaleDateString()}</small>
                      </td>
                      <td>
                        <strong>{order.address?.fullName || (typeof order.user === 'object' ? order.user?.username : order.user)}</strong>
                        <br /><small style={{ color: 'var(--text-muted)', fontSize: 11 }}>{(typeof order.user === 'object' ? order.user?.phone : '') || order.address?.phone}</small>
                      </td>
                      <td>
                        {order.items?.slice(0, 2).map((item, i) => (
                          <div key={i} style={{ fontSize: 12, marginBottom: 2 }}>{item.title} x{item.quantity}</div>
                        ))}
                        {order.items?.length > 2 && <small style={{ color: 'var(--text-muted)' }}>+{order.items.length - 2} more</small>}
                      </td>
                      <td style={{ fontWeight: 700 }}>₹{order.total?.toLocaleString('en-IN')}</td>
                      <td>
                        <span style={{ 
                          display: 'inline-block', padding: '3px 8px', borderRadius: 4,
                          fontSize: 11, fontWeight: 600,
                          background: STATUS_COLORS[order.paymentStatus] || '#eee',
                          color: ['verified','paid','confirmed','delivered'].includes(order.paymentStatus) ? 'white' : '#333'
                        }}>
                          {order.paymentMethod?.toUpperCase()} - {order.paymentStatus?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <select 
                          value={order.orderStatus} 
                          onChange={(e) => handleStatusUpdate(orderId, e.target.value)}
                          style={{ padding: '4px 8px', fontSize: 11, borderRadius: 4, border: '1px solid var(--border)', background: 'white', cursor: 'pointer' }}
                        >
                          {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ maxWidth: 200, fontSize: 12 }}>
                        {order.paymentMethod === 'upi' && (
                          <div>
                            {order.upiPayment?.utr && <div><strong>UTR:</strong> {order.upiPayment.utr}</div>}
                            {order.upiPayment?.screenshot && (
                              <div style={{ marginTop: 4 }}>
                                <a href={imgUrl(order.upiPayment.screenshot)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontSize: 11 }}>
                                  📷 Screenshot
                                </a>
                              </div>
                            )}
                            {order.upiPayment?.autoVerified && (
                              <div style={{ color: '#4CAF50', fontSize: 11, marginTop: 2 }}>✅ Auto-verified</div>
                            )}
                            {order.upiPayment?.verifiedAt && (
                              <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2 }}>
                                Verified: {new Date(order.upiPayment.verifiedAt).toLocaleString()}
                              </div>
                            )}
                          </div>
                        )}
                        {order.paymentMethod === 'cod' && <span style={{ color: 'var(--text-muted)' }}>COD</span>}
                      </td>
                      <td>
                        {timerTime !== undefined && timerTime > 0 && (
                          <div style={{ 
                            fontSize: 18, fontWeight: 700, color: timerTime < 30 ? '#F44336' : '#FF9800',
                            textAlign: 'center'
                          }}>
                            {Math.floor(timerTime / 60)}:{(timerTime % 60).toString().padStart(2, '0')}
                          </div>
                        )}
                        {timerTime === 0 && (
                          <div style={{ fontSize: 11, color: '#4CAF50', fontWeight: 600 }}>Auto-verify soon...</div>
                        )}
                      </td>
                      <td>
                        {order.paymentStatus === 'pending_verification' && (
                          <div style={{ display: 'flex', gap: 4, flexDirection: 'column' }}>
                            <button className="btn btn-sm btn-primary" onClick={() => handleVerify(orderId, 'verify')} style={{ fontSize: 11, padding: '4px 10px' }}>
                              ✅ Verify
                            </button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleVerify(orderId, 'reject')} style={{ fontSize: 11, padding: '4px 10px' }}>
                              ❌ Reject
                            </button>
                          </div>
                        )}
                        {order.paymentStatus === 'verified' && <span style={{ color: '#4CAF50', fontSize: 12, fontWeight: 600 }}>✅ Verified</span>}
                        {order.paymentStatus === 'failed' && <span style={{ color: '#F44336', fontSize: 12, fontWeight: 600 }}>❌ Failed</span>}
                        <button 
                          className="btn btn-sm btn-outline" 
                          onClick={() => handleDelete(orderId)}
                          style={{ marginTop: 4, fontSize: 10, padding: '2px 8px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}