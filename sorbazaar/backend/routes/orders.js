const express = require('express');
const Razorpay = require('razorpay');
const prisma = require('../prismaClient');
const { auth, adminAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { notifyUser, notifyAdmins } = require('./notifications');
const { verifyRazorpaySignature } = require('../utils/razorpay');

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const orderNum = (id) => String(id).slice(-8).toUpperCase();

router.post('/create-order', auth, async (req, res) => {
  try {
    const rawAmount = Number(req.body.amount ?? req.body.total ?? 0);
    if (!Number.isFinite(rawAmount) || rawAmount < 100) {
      return res.status(400).json({ message: 'Amount must be at least 100 paise.' });
    }

    const amount = Math.round(rawAmount);
    const options = { amount, currency: 'INR', receipt: `order_${Date.now()}`, payment_capture: 1 };

    const order = await razorpay.orders.create(options);
    return res.json({ order_id: order.id, amount: order.amount, currency: order.currency, receipt: order.receipt });
  } catch (err) {
    console.error('Razorpay order creation error:', err);
    const statusCode = err?.statusCode === 401 ? 401 : 500;
    return res.status(statusCode).json({ message: err.message || 'Razorpay order creation failed' });
  }
});

router.post('/create-razorpay-order', auth, async (req, res) => {
  try {
    const { total } = req.body;
    const rawAmount = Number(total ?? 0) * 100;
    if (!Number.isFinite(rawAmount) || rawAmount < 100) {
      return res.status(400).json({ message: 'Amount must be at least 100 paise.' });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(rawAmount),
      currency: 'INR',
      receipt: `order_${Date.now()}`,
      payment_capture: 1
    });

    return res.json({ orderId: order.id, amount: order.amount, currency: order.currency, receipt: order.receipt });
  } catch (err) {
    console.error('Razorpay order creation error:', err);
    const statusCode = err?.statusCode === 401 ? 401 : 500;
    return res.status(statusCode).json({ message: err.message || 'Razorpay order creation failed' });
  }
});

router.post('/verify-payment', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing Razorpay payment details.' });
    }

    const isValid = verifyRazorpaySignature({
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      razorpay_signature,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    if (!isValid) {
      return res.status(400).json({ message: 'Payment verification failed.' });
    }

    return res.json({ success: true, message: 'Payment verified successfully.' });
  } catch (err) {
    console.error('Razorpay verification error:', err);
    return res.status(500).json({ message: err.message || 'Payment verification failed.' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { items, address, paymentMethod, subtotal, shipping, total, paymentStatus, upiPayment, razorpayOrderId, razorpayPaymentId, razorpaySignature, razorpayStatus } = req.body;

    const orderData = {
      userId: req.user.id,
      items: (items || []).map(item => ({ ...item })),
      addressFullName: address?.fullName,
      addressPhone: address?.phone,
      addressPincode: address?.pincode,
      addressLine1: address?.addressLine1,
      addressLine2: address?.addressLine2,
      addressCity: address?.city,
      addressState: address?.state,
      subtotal,
      shipping: shipping || 0,
      total,
      paymentMethod: paymentMethod || 'cod',
      paymentStatus: paymentStatus || (paymentMethod === 'razorpay' || paymentMethod === 'cod' ? (paymentMethod === 'cod' ? 'pending' : 'paid') : 'paid'),
      orderStatus: paymentMethod === 'razorpay' || paymentMethod === 'cod' ? 'confirmed' : 'pending',
      estimatedDelivery: '3-7 business days'
    };

    if (paymentMethod === 'cod' || paymentMethod === 'razorpay') {
      orderData.trackingConfirmed = new Date();
    }

    if (paymentMethod === 'upi') {
      orderData.paymentStatus = 'pending_verification';
      orderData.orderStatus = 'pending';
      orderData.upiUtr = upiPayment?.utr || '';
      orderData.upiStatus = 'pending_verification';
      orderData.paymentVerificationAttemptedAt = new Date();
    }

    // Persist Razorpay references for signature-verified online payments
    if (paymentMethod === 'razorpay' && razorpayOrderId && razorpayPaymentId) {
      orderData.razorpayOrderId = razorpayOrderId;
      orderData.razorpayPaymentId = razorpayPaymentId;
      orderData.razorpaySignature = razorpaySignature || '';
      orderData.razorpayStatus = razorpayStatus || 'captured';
    }

    const order = await prisma.order.create({ data: orderData });

    setImmediate(async () => {
      try {
        await notifyUser(req.user.id, 'order_placed', 'Order Placed Successfully! 🎉',
          `Your order #${orderNum(order.id)} has been placed.`,
          { orderId: order.id, total: order.total, paymentMethod },
          `/order/${order.id}/track`);
      } catch (e) { console.error('Notify user error:', e); }
      try {
        await notifyAdmins('order_placed', 'New Order Received! 📦',
          `Order #${orderNum(order.id)} placed by ${req.user.username}`,
          { orderId: order.id, total: order.total, userId: req.user.id, username: req.user.username },
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

router.post('/upload-screenshot', auth, upload.single('screenshot'), async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Screenshot required' });

    const order = await prisma.order.findFirst({ where: { id: orderId, userId: req.user.id } });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { upiScreenshot: `/uploads/${req.file.filename}` }
    });

    await notifyUser(req.user.id, 'upi_payment_pending', 'Payment Proof Uploaded ✅',
      `Your payment proof for order #${orderNum(order.id)} has been submitted for verification.`,
      { orderId: order.id, utr: order.upiUtr });

    await notifyAdmins('upi_payment_pending', 'UPI Payment Verification Needed 💳',
      `Order #${orderNum(order.id)} - UTR: ${order.upiUtr || 'N/A'}, Amount: ₹${order.total}`,
      { orderId: order.id, utr: order.upiUtr, total: order.total, screenshot: updated.upiScreenshot },
      `/orders`, [
        { label: 'Verify Payment', action: 'verify', style: 'primary' },
        { label: 'Reject', action: 'reject', style: 'danger' }
      ]);

    res.json({ message: 'Screenshot uploaded', screenshot: updated.upiScreenshot });
  } catch (err) {
    console.error('Screenshot upload error:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const order = await prisma.order.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const cancellableStatuses = ['pending', 'confirmed', 'pending_verification'];
    if (!cancellableStatuses.includes(order.orderStatus)) {
      return res.status(400).json({ message: 'Order cannot be cancelled after it has been shipped' });
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        orderStatus: 'cancelled',
        cancellationReason: req.body.reason || 'Cancelled by customer',
        trackingCancelled: new Date()
      }
    });

    await notifyUser(req.user.id, 'order_cancelled', 'Order Cancelled',
      `Your order #${orderNum(order.id)} has been cancelled.`,
      { orderId: order.id, reason: updated.cancellationReason });

    await notifyAdmins('order_cancelled_by_admin', 'Order Cancelled by Customer ⚠️',
      `Order #${orderNum(order.id)} was cancelled by ${req.user.username}.`,
      { orderId: order.id, reason: updated.cancellationReason, username: req.user.username });

    res.json({ message: 'Order cancelled successfully', order: updated });
  } catch (err) {
    console.error('Cancel order error:', err);
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/status', adminAuth, async (req, res) => {
  try {
    const { orderStatus, cancellationReason } = req.body;
    const order = await prisma.order.findFirst({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const data = { orderStatus };
    if (orderStatus === 'received') data.trackingReceived = new Date();
    if (orderStatus === 'confirmed') data.trackingConfirmed = new Date();
    if (orderStatus === 'shipped') data.trackingShipped = new Date();
    if (orderStatus === 'out_for_delivery') data.trackingOutForDelivery = new Date();
    if (orderStatus === 'delivered') data.trackingDelivered = new Date();
    if (orderStatus === 'cancelled') {
      data.cancellationReason = cancellationReason || 'Cancelled by admin';
      data.trackingCancelled = new Date();
    }

    const updated = await prisma.order.update({ where: { id: order.id }, data });

    const statusMessages = {
      received: { title: 'Order Received! 📋', message: `Your order #${orderNum(order.id)} has been received and is being processed.` },
      confirmed: { title: 'Order Confirmed! ✅', message: `Your order #${orderNum(order.id)} has been confirmed.` },
      shipped: { title: 'Order Shipped! 🚚', message: `Your order #${orderNum(order.id)} has been shipped.` },
      out_for_delivery: { title: 'Out for Delivery! 📍', message: `Your order #${orderNum(order.id)} is out for delivery.` },
      delivered: { title: 'Delivered! 🎉', message: `Your order #${orderNum(order.id)} has been delivered.` },
      cancelled: { title: 'Order Cancelled', message: `Your order #${orderNum(order.id)} has been cancelled.` }
    };

    const notif = statusMessages[orderStatus];
    if (notif) {
      await notifyUser(order.userId, `order_${orderStatus}`, notif.title, notif.message,
        { orderId: order.id, oldStatus: order.orderStatus, newStatus: orderStatus },
        `/order/${order.id}/track`);
    }

    res.json({ message: 'Order status updated', order: updated });
  } catch (err) {
    console.error('Status update error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Admin: Get all orders (join user info)
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const { status, paymentStatus, page, limit } = req.query;
    const where = {};
    if (status) where.orderStatus = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;

    const orders = await prisma.order.findMany({ where, orderBy: { createdAt: 'desc' } });

    // Join user info
    const users = await prisma.user.raw.find({}, { projection: { _id: 1, username: 1, email: 1, phone: 1 } }).toArray();
    const userMap = new Map(users.map(u => [String(u._id), u]));
    const out = orders.map(o => ({
      ...o,
      user: (() => {
        const u = userMap.get(String(o.userId));
        return u ? { id: String(u._id), username: u.username, email: u.email, phone: u.phone } : null;
      })()
    }));

    res.json(out);
  } catch (err) {
    console.error('Get all orders error:', err);
    res.status(500).json({ message: err.message });
  }
});

router.put('/admin/verify-payment/:id', adminAuth, async (req, res) => {
  try {
    const { action } = req.body;
    const order = await prisma.order.findFirst({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const data = {};
    if (action === 'verify') {
      data.paymentStatus = 'verified';
      data.orderStatus = 'confirmed';
      data.upiStatus = 'verified';
      data.upiVerifiedAt = new Date();
      data.upiVerifiedBy = req.user.id;
      data.upiAutoVerified = false;
      data.paymentVerifiedAt = new Date();
      data.trackingConfirmed = new Date();
    } else if (action === 'reject') {
      data.upiStatus = 'rejected';
      data.paymentStatus = 'failed';
    }

    const updated = await prisma.order.update({ where: { id: order.id }, data });

    const notifType = action === 'verify' ? 'upi_payment_verified' : 'upi_payment_rejected';
    const notifTitle = action === 'verify' ? 'Payment Verified ✅' : 'Payment Rejected ❌';
    const notifMessage = action === 'verify'
      ? `Your UPI payment for order #${orderNum(order.id)} has been verified.`
      : `Your UPI payment for order #${orderNum(order.id)} was rejected. Please try again.`;

    await notifyUser(order.userId, notifType, notifTitle, notifMessage, { orderId: order.id, action });

    res.json({ message: `Payment ${action === 'verify' ? 'verified' : 'rejected'} successfully`, order: updated });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/admin/auto-verify', adminAuth, async (req, res) => {
  try {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const orders = await prisma.order.findMany({
      where: {
        paymentMethod: 'upi',
        paymentStatus: 'pending_verification',
        paymentVerificationAttemptedAt: { lte: twoMinutesAgo },
        upiStatus: 'pending_verification'
      }
    });

    let autoVerifiedCount = 0;
    for (const order of orders) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'verified',
          orderStatus: 'confirmed',
          upiStatus: 'verified',
          upiVerifiedAt: new Date(),
          upiAutoVerified: true,
          paymentVerifiedAt: new Date(),
          trackingConfirmed: new Date()
        }
      });
      await notifyUser(order.userId, 'payment_auto_verified', 'Payment Auto-Verified ✅',
        `Your UPI payment for order #${orderNum(order.id)} has been auto-verified after 2 minutes.`,
        { orderId: order.id, autoVerified: true });
      autoVerifiedCount++;
    }

    res.json({ message: `Auto-verified ${autoVerifiedCount} pending payments`, autoVerified: autoVerifiedCount });
  } catch (err) {
    console.error('Auto-verify error:', err);
    res.status(500).json({ message: err.message });
  }
});

router.delete('/admin/:id', adminAuth, async (req, res) => {
  try {
    const order = await prisma.order.findFirst({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    await prisma.order.delete({ where: { id: order.id } });
    await notifyUser(order.userId, 'order_deleted', 'Order Deleted',
      `Your order #${orderNum(order.id)} has been deleted by admin.`,
      { orderId: order.id });

    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    console.error('Delete order error:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/my', auth, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (err) {
    console.error('Get my orders error:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const order = await prisma.order.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;