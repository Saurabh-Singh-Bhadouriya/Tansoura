const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../prismaClient');

const router = express.Router();

const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';
  const expiresIn = process.env.JWT_EXPIRES || '7d';
  if (!process.env.JWT_SECRET) {
    console.warn('[auth] JWT_SECRET is missing. Using dev fallback (NOT for production).');
  }
  return jwt.sign({ id }, secret, { expiresIn });
};

const publicUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  phone: user.phone,
  role: user.role,
  fullName: user.fullName || '',
  dateOfBirth: user.dateOfBirth || '',
  gender: user.gender || '',
  profilePhoto: user.profilePhoto || '',
  addresses: user.addresses || [],
  wishlist: user.wishlist || [],
  recentlyViewed: user.recentlyViewed || [],
  reviews: user.reviews || [],
  notificationPreferences: user.notificationPreferences || { orderUpdates: true, offers: true, promotional: true },
  language: user.language || 'en',
  theme: user.theme || 'light',
  createdAt: user.createdAt
});

const normalizeLogin = (login = '') => String(login).trim();

async function findByLogin(login) {
  const value = normalizeLogin(login);
  const emailValue = value.toLowerCase();
  return prisma.user.findFirst({
    where: {
      OR: [
        { username: value },
        { email: emailValue },
        { phone: value }
      ]
    }
  });
}

async function findByContact(contact) {
  const value = normalizeLogin(contact);
  const emailValue = value.toLowerCase();
  return prisma.user.findFirst({
    where: {
      OR: [
        { email: emailValue },
        { phone: value }
      ]
    }
  });
}

router.post('/signup', async (req, res) => {
  try {
    const username = normalizeLogin(req.body.username);
    const email = normalizeLogin(req.body.email).toLowerCase();
    const phone = normalizeLogin(req.body.phone);
    const { password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username and password required' });
    if (!email && !phone) return res.status(400).json({ message: 'Email or phone required' });

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : [])
        ]
      }
    });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        username,
        email: email || null,
        phone: phone || null,
        password: hashedPassword,
        role: 'user',
        addresses: [],
        wishlist: [],
        recentlyViewed: [],
        reviews: []
      }
    });
    res.status(201).json({
      token: generateToken(user.id),
      user: publicUser(user)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const login = normalizeLogin(req.body.login);
    const { password } = req.body;
    const user = await findByLogin(login);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    res.json({
      token: generateToken(user.id),
      user: publicUser(user)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const login = normalizeLogin(req.body.login);
    if (!login) return res.status(400).json({ message: 'Email or phone required' });

    const user = await findByContact(login);
    if (!user) return res.status(404).json({ message: 'No account found' });

    res.json({
      message: 'OTP sent successfully',
      otp: process.env.RESET_OTP || '1234'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const login = normalizeLogin(req.body.login);
    const { otp, password } = req.body;
    if (!login || !otp || !password) {
      return res.status(400).json({ message: 'Email or phone, OTP and new password are required' });
    }
    if (String(otp) !== String(process.env.RESET_OTP || '1234')) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await findByContact(login);
    if (!user) return res.status(404).json({ message: 'No account found' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    res.json({
      message: 'Password reset successfully',
      token: generateToken(updated.id),
      user: publicUser(updated)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/me', require('../middleware/auth').auth, async (req, res) => {
  const user = await prisma.user.findFirst({ where: { id: req.user.id } });
  res.json({ user: publicUser(user) });
});

router.put('/address', require('../middleware/auth').auth, async (req, res) => {
  try {
    const { v4: uuidv4 } = require('uuid');
    const user = await prisma.user.findFirst({ where: { id: req.user.id } });
    const existing = user.addresses || [];
    const isDefault = existing.length === 0 ? true : (req.body.isDefault || false);
    const newAddress = { ...req.body, id: uuidv4(), isDefault };
    let addresses = existing.map(a => ({ ...a, isDefault: false }));
    if (isDefault) addresses = addresses.map(a => ({ ...a, isDefault: false }));
    addresses.push(newAddress);
    await prisma.user.update({ where: { id: user.id }, data: { addresses } });
    res.json({ addresses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;