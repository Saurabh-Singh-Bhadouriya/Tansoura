const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../prismaClient');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const USER_SELECT = { id: true, username: true, email: true, phone: true, role: true, fullName: true, dateOfBirth: true, gender: true, profilePhoto: true, language: true, theme: true, status: true, createdAt: true };

// Get full profile
router.get('/', auth, async (req, res) => {
  try {
    const user = await prisma.user.findFirst({ where: { id: req.user.id } });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update personal info
router.put('/personal-info', auth, async (req, res) => {
  try {
    const { fullName, email, phone, dateOfBirth, gender } = req.body;
    const data = {};
    if (fullName !== undefined) data.fullName = fullName;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;
    if (dateOfBirth !== undefined) data.dateOfBirth = dateOfBirth;
    if (gender !== undefined) data.gender = gender;

    const user = await prisma.user.update({ where: { id: req.user.id }, data, select: USER_SELECT });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update profile photo
router.put('/photo', auth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded. Please select an image.' });
    }
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { profilePhoto: `/uploads/${req.file.filename}` },
      select: USER_SELECT
    });
    res.json({ user });
  } catch (err) {
    console.error('Profile photo update error:', err);
    res.status(500).json({ message: 'Failed to update profile photo. Please try again.' });
  }
});

// Change password
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findFirst({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Address management (embedded on user doc)
router.get('/addresses', auth, async (req, res) => {
  try {
    const user = await prisma.user.findFirst({ where: { id: req.user.id } });
    res.json({ addresses: user.addresses || [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/addresses', auth, async (req, res) => {
  try {
    const user = await prisma.user.findFirst({ where: { id: req.user.id } });
    const existing = user.addresses || [];
    const address = { ...req.body, id: uuidv4(), isDefault: existing.length === 0 ? true : (req.body.isDefault || false) };
    let addresses = existing.map(a => ({ ...a, isDefault: false }));
    addresses = addresses.length === 0 ? [address] : [...addresses.map(a => ({ ...a, isDefault: false })), address];
    // ensure at least one default
    if (!addresses.some(a => a.isDefault)) addresses[0].isDefault = true;
    await prisma.user.update({ where: { id: req.user.id }, data: { addresses } });
    res.json({ addresses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/addresses/:index', auth, async (req, res) => {
  try {
    const idx = parseInt(req.params.index);
    const user = await prisma.user.findFirst({ where: { id: req.user.id } });
    const addresses = user.addresses || [];
    if (idx < 0 || idx >= addresses.length) {
      return res.status(400).json({ message: 'Invalid address index' });
    }
    addresses[idx] = { ...addresses[idx], ...req.body };
    await prisma.user.update({ where: { id: req.user.id }, data: { addresses } });
    res.json({ addresses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/addresses/:index', auth, async (req, res) => {
  try {
    const idx = parseInt(req.params.index);
    const user = await prisma.user.findFirst({ where: { id: req.user.id } });
    let addresses = user.addresses || [];
    if (idx < 0 || idx >= addresses.length) {
      return res.status(400).json({ message: 'Invalid address index' });
    }
    const wasDefault = addresses[idx].isDefault;
    addresses = addresses.filter((_, i) => i !== idx);
    if (wasDefault && addresses.length > 0 && !addresses.some(a => a.isDefault)) {
      addresses[0].isDefault = true;
    }
    await prisma.user.update({ where: { id: req.user.id }, data: { addresses } });
    res.json({ addresses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Wishlist (embedded productId array)
router.get('/wishlist', auth, async (req, res) => {
  try {
    const user = await prisma.user.findFirst({ where: { id: req.user.id } });
    res.json({ wishlist: user.wishlist || [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/wishlist/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params;
    const user = await prisma.user.findFirst({ where: { id: req.user.id } });
    let wishlist = user.wishlist || [];
    if (wishlist.includes(productId)) {
      wishlist = wishlist.filter(id => id !== productId);
    } else {
      wishlist.push(productId);
    }
    await prisma.user.update({ where: { id: req.user.id }, data: { wishlist } });
    res.json({ wishlist });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/wishlist/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params;
    const user = await prisma.user.findFirst({ where: { id: req.user.id } });
    let wishlist = (user.wishlist || []).filter(id => id !== productId);
    await prisma.user.update({ where: { id: req.user.id }, data: { wishlist } });
    res.json({ wishlist });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Recently viewed (embedded on user doc, keep last 20)
router.post('/recently-viewed', auth, async (req, res) => {
  try {
    const { productId } = req.body;
    const user = await prisma.user.findFirst({ where: { id: req.user.id } });
    let recentlyViewed = (user.recentlyViewed || []).filter(r => r.productId !== productId);
    recentlyViewed.unshift({ productId, viewedAt: new Date() });
    recentlyViewed = recentlyViewed.slice(0, 20);
    await prisma.user.update({ where: { id: req.user.id }, data: { recentlyViewed } });
    const ids = recentlyViewed.map(r => r.productId);
    res.json({ recentlyViewed: ids });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reviews (embedded on user)
router.get('/reviews', auth, async (req, res) => {
  try {
    const user = await prisma.user.findFirst({ where: { id: req.user.id } });
    res.json({ reviews: user.reviews || [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Notification preferences
router.put('/notification-preferences', auth, async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { notificationPreferences: req.body }
    });
    res.json({ notificationPreferences: user.notificationPreferences });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Account settings
router.put('/settings', auth, async (req, res) => {
  try {
    const { language, theme } = req.body;
    const data = {};
    if (language !== undefined) data.language = language;
    if (theme !== undefined) data.theme = theme;
    const user = await prisma.user.update({ where: { id: req.user.id }, data });
    res.json({ settings: { language: user.language, theme: user.theme } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete account
router.delete('/account', auth, async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.user.id } });
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;