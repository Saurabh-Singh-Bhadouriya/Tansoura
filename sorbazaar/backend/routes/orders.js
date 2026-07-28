const express = require('express');
const Razorpay = require('razorpay');
const Order = require('../models/Order');
const { auth, adminAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { notifyUser, notifyAdmins } = require('./notifications');

const router = express.Router();

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Safe order number formatter (handles Mongoose ObjectId objects)
const orderNum = (id) => String(id).slice(-8).toUpperCase();

// Create Razorpay order
router.post('/create-razorpay-order', auth, async (req, res) => {
  try {
    const { total } = req.body;
    const amount = Math.round(Number(total) * 100); // Convert to paise for Razorpay
    const options = {
      amount: amount,
      currency: 'INR',
      receipt: `order_${Date.now()}`,
      payment_capture: 1,
    };
    const order = await razorpay.orders.create(options);
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, receipt: order.receipt });
  } catch (err) {
    console.error('Razorpay order creation error:', err);
    res.status(500).json({ message: err.message || 'Razorpay order creation failed' });
  }
});

// Create order
router.post('/', auth, async (req, res) => {
  try {
    const { items, address, paymentMethod, subtotal, shipping, total, paymentStatus, upiPayment } = req.body;
    
    const orderData = {
      user: req.user._id,
      items,
      address,
      paymentMethod,
      subtotal,
      shipping: shipping || 0,
      total,
      paymentStatus: paymentStatus || (paymentMethod === 'razorpay' ? 'paid' : (paymentMethod === 'cod' ? 'pending' : 'paid')),
      orderStatus: paymentMethod === 'razorpay' || paymentMethod === 'cod' ? 'confirmed' : 'pending',
      tracking: {
        confirmed: (paymentMethod === 'cod' || paymentMethod === 'razorpay') ? new Date() : undefined
      },
      estimatedDelivery: '3-7 business days'
    };

    if (paymentMethod === 'upi') {
      orderData.paymentStatus = 'pending_verification';
      orderData.orderStatus = 'pending';
      orderData.upiPayment = {
        utr: upiPayment?.utr || '',
        status: 'pending_verification',
        verifiedAt: null
      };
      orderData.paymentVerificationAttemptedAt = new Date();
    }

    const order = await Order.create(orderData);

    // Notify in background (don't wait, don't let it block the response)
    setImmediate(async () => {
      try {
        await notifyUser(req.user._id, 'order_placed', 'Order Placed Successfully! 🎉',
          `Your order #${orderNum(order._id)} has been placed.`,
          { orderId: order._id, total: order.total, paymentMethod },
          `/order/${order._id}/track`);
      } catch (e) { console.error('Notify user error:', e); }
      
      try {
        await notifyAdmins('order_placed', 'New Order Received! 📦',
          `Order #${orderNum(order._id)} placed by ${req.user.username}`,
          { orderId: order._id, total: order.total, userId: req.user._id, username: req.user.username },
          `/orders`, [
            { label: 'View Order', action: 'view', style: 'primary' },
            { label: 'Mark Processing', action: 'mark_processing', style: 'outline' }
          ]);
      } catch (e) { console.error('Notify admins error:', e); }
    });

    res.status(201).json(order);
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Upload UPI payment screenshot
router.post('/upload-screenshot', auth, upload.single('screenshot'), async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Screenshot required' });
    
    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.upiPayment.screenshot = `/uploads/${req.file.filename}`;
    await order.save();

    // Notify user
    await notifyUser(req.user._id, 'upi_payment_pending', 'Payment Proof Uploaded ✅',
      `Your payment proof for order #${orderNum(order._id)} has been submitted for verification.`,
      { orderId: order._id, utr: order.upiPayment.utr });

    // Notify admins
    await notifyAdmins('upi_payment_pending', 'UPI Payment Verification Needed 💳',
      `Order #${orderNum(order._id)} - UTR: ${order.upiPayment.utr || 'N/A'}, Amount: ₹${order.total}`,
      { orderId: order._id, utr: order.upiPayment.utr, total: order.total, screenshot: order.upiPayment.screenshot },
      `/orders`, [
        { label: 'Verify Payment', action: 'verify', style: 'primary' },
        { label: 'Reject', action: 'reject', style: 'danger' }
      ]);

    res.json({ message: 'Screenshot uploaded', screenshot: order.upiPayment.screenshot });
  } catch (err) {
    console.error('Screenshot upload error:', err);
    res.status(500).json({ message: err.message });
  }
});

// User: Cancel order (only if not shipped yet)
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const cancellableStatuses = ['pending', 'confirmed', 'pending_verification'];
    if (!cancellableStatuses.includes(order.orderStatus)) {
      return res.status(400).json({ message: 'Order cannot be cancelled after it has been shipped' });
    }

    order.orderStatus = 'cancelled';
    order.cancellationReason = req.body.reason || 'Cancelled by customer';
    order.tracking.cancelled = new Date();

    await order.save();

    // Notify user
    await notifyUser(req.user._id, 'order_cancelled', 'Order Cancelled',
      `Your order #${orderNum(order._id)} has been cancelled.`,
      { orderId: order._id, reason: order.cancellationReason });

    // Notify admins
    await notifyAdmins('order_cancelled_by_admin', 'Order Cancelled by Customer ⚠️',
      `Order #${orderNum(order._id)} was cancelled by ${req.user.username}.`,
      { orderId: order._id, reason: order.cancellationReason, username: req.user.username });

    res.json({ message: 'Order cancelled successfully', order });
  } catch (err) {
    console.error('Cancel order error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Admin: Update order status
router.put('/:id/status', adminAuth, async (req, res) => {
  try {
    const { orderStatus, cancellationReason, received } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const oldStatus = order.orderStatus;
    order.orderStatus = orderStatus;

    // Set received timestamp if status is being set to "received"
    if (orderStatus === 'received') {
      order.tracking.received = new Date();
    }
    if (orderStatus === 'confirmed') order.tracking.confirmed = new Date();
    if (orderStatus === 'shipped') order.tracking.shipped = new Date();
    if (orderStatus === 'out_for_delivery') order.tracking.outForDelivery = new Date();
    if (orderStatus === 'delivered') order.tracking.delivered = new Date();
    if (orderStatus === 'cancelled') {
      order.cancellationReason = cancellationReason || 'Cancelled by admin';
      order.tracking.cancelled = new Date();
    }

    await order.save();

    // Notify user of status change
    const statusMessages = {
      received: { title: 'Order Received! 📋', message: `Your order #${orderNum(order._id)} has been received and is being processed.` },
      confirmed: { title: 'Order Confirmed! ✅', message: `Your order #${orderNum(order._id)} has been confirmed.` },
      shipped: { title: 'Order Shipped! 🚚', message: `Your order #${orderNum(order._id)} has been shipped.` },
      out_for_delivery: { title: 'Out for Delivery! 📍', message: `Your order #${orderNum(order._id)} is out for delivery.` },
      delivered: { title: 'Delivered! 🎉', message: `Your order #${orderNum(order._id)} has been delivered.` },
      cancelled: { title: 'Order Cancelled', message: `Your order #${orderNum(order._id)} has been cancelled.` }
    };

    const notif = statusMessages[orderStatus];
    if (notif) {
      await notifyUser(order.user, `order_${orderStatus}`, notif.title, notif.message,
        { orderId: order._id, oldStatus, newStatus: orderStatus },
        `/order/${order._id}/track`);
    }

    res.json({ message: 'Order status updated', order });
  } catch (err) {
    console.error('Status update error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Admin: Get all orders (for verification)
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const { status, paymentStatus } = req.query;
    const filter = {};
    if (status) filter.orderStatus = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    
    const orders = await Order.find(filter)
      .populate('user', 'username email phone')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error('Get all orders error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Admin: Verify UPI payment
router.put('/admin/verify-payment/:id', adminAuth, async (req, res) => {
  try {
    const { action } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (action === 'verify') {
      order.paymentStatus = 'verified';
      order.orderStatus = 'confirmed';
      order.upiPayment.status = 'verified';
      order.upiPayment.verifiedAt = new Date();
      order.upiPayment.verifiedBy = req.user._id;
      order.upiPayment.autoVerified = false;
      order.paymentVerifiedAt = new Date();
      order.tracking.confirmed = new Date();
    } else if (action === 'reject') {
      order.upiPayment.status = 'rejected';
      order.paymentStatus = 'failed';
    }

    await order.save();

    // Notify user
    const notifType = action === 'verify' ? 'upi_payment_verified' : 'upi_payment_rejected';
    const notifTitle = action === 'verify' ? 'Payment Verified ✅' : 'Payment Rejected ❌';
    const notifMessage = action === 'verify'
      ? `Your UPI payment for order #${orderNum(order._id)} has been verified.`
      : `Your UPI payment for order #${orderNum(order._id)} was rejected. Please try again.`;

    await notifyUser(order.user, notifType, notifTitle, notifMessage,
      { orderId: order._id, action });

    res.json({ message: `Payment ${action === 'verify' ? 'verified' : 'rejected'} successfully`, order });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Admin: Auto-verify pending UPI payments
router.post('/admin/auto-verify', adminAuth, async (req, res) => {
  try {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    
    const orders = await Order.find({
      paymentMethod: 'upi',
      paymentStatus: 'pending_verification',
      paymentVerificationAttemptedAt: { $lte: twoMinutesAgo },
      'upiPayment.status': 'pending_verification'
    });

    let autoVerifiedCount = 0;
    for (const order of orders) {
      order.paymentStatus = 'verified';
      order.orderStatus = 'confirmed';
      order.upiPayment.status = 'verified';
      order.upiPayment.verifiedAt = new Date();
      order.upiPayment.autoVerified = true;
      order.paymentVerifiedAt = new Date();
      order.tracking.confirmed = new Date();
      await order.save();

      // Notify user
      await notifyUser(order.user, 'payment_auto_verified', 'Payment Auto-Verified ✅',
        `Your UPI payment for order #${orderNum(order._id)} has been auto-verified after 2 minutes.`,
        { orderId: order._id, autoVerified: true });

      autoVerifiedCount++;
    }

    res.json({ 
      message: `Auto-verified ${autoVerifiedCount} pending payments`, 
      autoVerified: autoVerifiedCount 
    });
  } catch (err) {
    console.error('Auto-verify error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Admin: Delete order
router.delete('/admin/:id', adminAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    await Order.findByIdAndDelete(req.params.id);

    // Notify user
    await notifyUser(order.user, 'order_deleted', 'Order Deleted',
      `Your order #${orderNum(order._id)} has been deleted by admin.`,
      { orderId: order._id });

    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    console.error('Delete order error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get my orders
router.get('/my', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error('Get my orders error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get single order by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;