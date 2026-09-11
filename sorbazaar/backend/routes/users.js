const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../prismaClient');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

const USER_SELECT = { id: true, username: true, email: true, phone: true, role: true, fullName: true, status: true, profilePhoto: true, language: true, theme: true, createdAt: true };

// Get all users
router.get('/', adminAuth, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: USER_SELECT
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single user
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.params.id },
      select: { ...USER_SELECT, notificationPreferences: true }
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update user
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { username, email, phone, fullName, role, addresses } = req.body;
    const data = {};
    if (username) data.username = username;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;
    if (fullName !== undefined) data.fullName = fullName;
    if (role) data.role = role;
    if (addresses !== undefined) data.addresses = addresses;

    const user = await prisma.user.update({ where: { id: req.params.id }, data, select: USER_SELECT });
    res.json({ message: 'User updated successfully', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create user (admin only)
router.post('/', adminAuth, async (req, res) => {
  try {
    const { username, email, phone, password, fullName, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : [])
        ]
      }
    });

    if (existing) {
      return res.status(400).json({ message: 'User already exists with this username, email or phone' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        phone,
        password: hashedPassword,
        fullName,
        role: role || 'user',
        addresses: [],
        wishlist: [],
        recentlyViewed: [],
        reviews: []
      },
      select: USER_SELECT
    });

    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Ban user (set status to banned)
router.put('/:id/ban', adminAuth, async (req, res) => {
  try {
    const user = await prisma.user.findFirst({ where: { id: req.params.id }, select: { id: true, status: true } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const newStatus = user.status === 'banned' ? 'active' : 'banned';
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: newStatus },
      select: { id: true, username: true, email: true, phone: true, role: true, status: true, createdAt: true }
    });

    res.json({ message: newStatus === 'banned' ? 'User banned successfully' : 'User unbanned', user: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete user
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const user = await prisma.user.findFirst({ where: { id: req.params.id }, select: { id: true, role: true } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot delete admin user' });
    }

    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;