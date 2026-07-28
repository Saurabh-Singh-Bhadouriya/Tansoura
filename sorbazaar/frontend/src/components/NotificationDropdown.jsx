import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';

const NOTIFICATION_ICONS = {
  order_placed: '🎉',
  order_confirmed: '✅',
  order_shipped: '🚚',
  order_out_for_delivery: '📍',
  order_delivered: '🎊',
  order_cancelled: '❌',
  order_cancelled_by_admin: '⚠️',
  return_requested: '🔄',
  return_pickup: '📦',
  returned: '💰',
  upi_payment_pending: '💳',
  upi_payment_verified: '✅',
  upi_payment_rejected: '❌',
  payment_auto_verified: '🤖'
};

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useNotifications();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif) => {
    if (!notif.read) await markAsRead(notif._id);
    setOpen(false);
  };

  const getNotificationLink = (notif) => {
    if (notif.actionUrl) return notif.actionUrl;
    switch (notif.type) {
      case 'order_placed':
      case 'order_confirmed':
      case 'order_cancelled':
      case 'upi_payment_pending':
      case 'upi_payment_verified':
      case 'upi_payment_rejected':
      case 'payment_auto_verified':
        return `/order/${notif.data?.orderId}/track`;
      default:
        return '/orders';
    }
  };

  return (
    <div className="notification-dropdown" ref={dropdownRef}>
      <button className="nav-icon notification-bell" onClick={() => setOpen(!open)}>
        🔔
        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button className="notification-mark-all" onClick={markAllAsRead}>
                Mark all as read
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <span style={{ fontSize: 40, marginBottom: 12 }}>🔔</span>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif._id}
                  className={`notification-item ${!notif.read ? 'notification-unread' : ''}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="notification-icon">
                    {NOTIFICATION_ICONS[notif.type] || '📢'}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{notif.title}</div>
                    <div className="notification-message">{notif.message}</div>
                    <div className="notification-time">
                      {new Date(notif.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {notif.actions && notif.actions.length > 0 && (
                      <div className="notification-actions">
                        {notif.actions.map((action, idx) => (
                          <button
                            key={idx}
                            className={`btn btn-xs ${action.style === 'danger' ? 'btn-danger' : action.style === 'outline' ? 'btn-outline' : 'btn-primary'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (action.action === 'verify') {
                                window.location.href = '/orders';
                              } else if (action.action === 'reject') {
                                window.location.href = '/orders';
                              } else {
                                window.location.href = getNotificationLink(notif);
                              }
                            }}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    className="notification-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(notif._id);
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}