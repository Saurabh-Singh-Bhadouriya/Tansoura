const express = require('express');
const prisma = require('../prismaClient');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get my notifications (user)
router.get('/my', auth, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    const unreadCount = await prisma.notification.count({ where: { userId: req.user.id, read: false } });
    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await prisma.notification.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    const updated = await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } });
    res.json({ message: 'Marked as read', notification: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark all as read
router.put('/read-all', auth, async (req, res) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true }
    });
    res.json({ message: 'All notifications marked as read', count: result.count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Get all notifications (attach minimal user info)
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    const users = await prisma.user.raw.find({}, { projection: { _id: 1, username: 1, email: 1, phone: 1 } }).toArray();
    const userMap = new Map(users.map(u => [String(u._id), u]));
    const out = notifications.map(n => ({
      ...n,
      user: (() => {
        const u = userMap.get(String(n.userId));
        return u ? { id: String(u._id), username: u.username, email: u.email, phone: u.phone } : undefined;
      })()
    }));
    res.json(out);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Helper: Create notification
async function createNotification(userId, type, title, message, data = {}, actionUrl = '', actions = []) {
  try {
    const notification = await prisma.notification.create({
      data: { userId, type, title, message, data, actionUrl, actions, read: false }
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
    const admins = await prisma.user.findMany({ where: { role: 'admin' } });
    const notifications = [];
    for (const admin of admins) {
      const notif = await createNotification(admin.id, type, title, message, data, actionUrl, actions);
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
    await prisma.notification.delete({ where: { id: req.params.id } });
    res.json({ message: 'Notification deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Get pending UPI verifications count
router.get('/admin/pending-upi-count', adminAuth, async (req, res) => {
  try {
    const count = await prisma.order.count({ where: { paymentMethod: 'upi', paymentStatus: 'pending_verification' } });
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