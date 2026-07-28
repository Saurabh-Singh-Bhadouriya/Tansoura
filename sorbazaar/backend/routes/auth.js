const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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
  id: user._id,
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

const findByLogin = (login) => {
  const value = normalizeLogin(login);
  const emailValue = value.toLowerCase();
  return User.findOne({
    $or: [{ username: value }, { email: emailValue }, { phone: value }]
  });
};

const findByContact = (contact) => {
  const value = normalizeLogin(contact);
  const emailValue = value.toLowerCase();
  return User.findOne({
    $or: [{ email: emailValue }, { phone: value }]
  });
};

router.post('/signup', async (req, res) => {
  try {
    const username = normalizeLogin(req.body.username);
    const email = normalizeLogin(req.body.email).toLowerCase();
    const phone = normalizeLogin(req.body.phone);
    const { password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username and password required' });
    if (!email && !phone) return res.status(400).json({ message: 'Email or phone required' });

    const exists = await User.findOne({ $or: [{ username }, ...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])] });
    if (exists) return res.status(400).json({ message: 'User already exists' });

    const user = await User.create({ username, email, phone, password, role: 'user' });
    res.status(201).json({
      token: generateToken(user._id),
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
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    res.json({
      token: generateToken(user._id),
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

    user.password = password;
    await user.save();

    res.json({
      message: 'Password reset successfully',
      token: generateToken(user._id),
      user: publicUser(user)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/me', require('../middleware/auth').auth, async (req, res) => {
  res.json({ user: req.user });
});

router.put('/address', require('../middleware/auth').auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const address = req.body;
    const idx = user.addresses.findIndex(a => a.isDefault);
    if (idx >= 0) Object.assign(user.addresses[idx], address);
    else user.addresses.push({ ...address, isDefault: true });
    await user.save();
    res.json({ addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
