const express = require('express');
const Notification = require('../models/Notification');
const { auth, adminAuth } = require('../middleware/auth');
const Order = require('../models/Order');
const User = require('../models/User');

const router = express.Router();

// Get my notifications (user)
router.get('/my', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, user: req.user._id });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    
    notification.read = true;
    await notification.save();
    res.json({ message: 'Marked as read', notification });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark all as read
router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Get all notifications
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const notifications = await Notification.find()
      .populate('user', 'username email phone')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Helper: Create notification
async function createNotification(userId, type, title, message, data = {}, actionUrl = '', actions = []) {
  try {
    const notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
      data,
      actionUrl,
      actions
    });
    return notification;
  } catch (err) {
    console.error('Notification creation error:', err);
    return null;
  }
}

// Helper: Notify admins
async function notifyAdmins(type, title, message, data = {}, actionUrl = '', actions = []) {
  try {
    const admins = await User.find({ role: 'admin' });
    const notifications = [];
    for (const admin of admins) {
      const notif = await createNotification(admin._id, type, title, message, data, actionUrl, actions);
      if (notif) notifications.push(notif);
    }
    return notifications;
  } catch (err) {
    console.error('Admin notification error:', err);
    return [];
  }
}

// Helper: Notify user
async function notifyUser(userId, type, title, message, data = {}, actionUrl = '', actions = []) {
  return createNotification(userId, type, title, message, data, actionUrl, actions);
}

// Admin: Delete notification
router.delete('/admin/:id', adminAuth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notification deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Get pending UPI verifications count
router.get('/admin/pending-upi-count', adminAuth, async (req, res) => {
  try {
    const count = await Order.countDocuments({
      paymentMethod: 'upi',
      paymentStatus: 'pending_verification'
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = { 
  router, 
  createNotification, 
  notifyAdmins, 
  notifyUser 
};