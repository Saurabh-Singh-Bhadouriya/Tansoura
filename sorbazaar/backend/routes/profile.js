const express = require('express');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Get full profile
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update personal info
router.put('/personal-info', auth, async (req, res) => {
  try {
    const { fullName, email, phone, dateOfBirth, gender } = req.body;
    const user = await User.findById(req.user._id);
    if (fullName !== undefined) user.fullName = fullName;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
    if (gender !== undefined) user.gender = gender;
    await user.save();
    res.json({ user: { ...user.toObject(), password: undefined } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update profile photo
router.put('/photo', auth, (req, res, next) => {
  upload.single('photo')(req, res, function(err) {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
      }
      if (err.message && err.message.includes('Unexpected field')) {
        return res.status(400).json({ message: 'Upload field name must be "photo"' });
      }
      return res.status(400).json({ message: err.message || 'Upload failed' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded. Please select an image.' });
    }
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.profilePhoto = `/uploads/${req.file.filename}`;
    await user.save();
    res.json({ user: { ...user.toObject(), password: undefined } });
  } catch (err) {
    console.error('Profile photo update error:', err);
    res.status(500).json({ message: 'Failed to update profile photo. Please try again.' });
  }
});

// Change password
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Address management
router.get('/addresses', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ addresses: user.addresses || [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/addresses', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const address = { ...req.body, isDefault: user.addresses.length === 0 ? true : req.body.isDefault || false };
    if (address.isDefault) {
      user.addresses.forEach(a => a.isDefault = false);
    }
    user.addresses.push(address);
    await user.save();
    res.json({ addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/addresses/:index', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const idx = parseInt(req.params.index);
    if (idx < 0 || idx >= user.addresses.length) {
      return res.status(400).json({ message: 'Invalid address index' });
    }
    if (req.body.isDefault) {
      user.addresses.forEach(a => a.isDefault = false);
    }
    Object.assign(user.addresses[idx], req.body);
    await user.save();
    res.json({ addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/addresses/:index', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const idx = parseInt(req.params.index);
    if (idx < 0 || idx >= user.addresses.length) {
      return res.status(400).json({ message: 'Invalid address index' });
    }
    const wasDefault = user.addresses[idx].isDefault;
    user.addresses.splice(idx, 1);
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }
    await user.save();
    res.json({ addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Wishlist
router.get('/wishlist', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist');
    res.json({ wishlist: user.wishlist || [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/wishlist/:productId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const idx = user.wishlist.findIndex(id => id.toString() === req.params.productId);
    if (idx >= 0) {
      user.wishlist.splice(idx, 1);
    } else {
      user.wishlist.push(req.params.productId);
    }
    await user.save();
    res.json({ wishlist: user.wishlist });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/wishlist/:productId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.wishlist = user.wishlist.filter(id => id.toString() !== req.params.productId);
    await user.save();
    res.json({ wishlist: user.wishlist });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Recently viewed
router.post('/recently-viewed', auth, async (req, res) => {
  try {
    const { productId } = req.body;
    const user = await User.findById(req.user._id);
    user.recentlyViewed = user.recentlyViewed.filter(id => id.toString() !== productId);
    user.recentlyViewed.unshift(productId);
    if (user.recentlyViewed.length > 20) user.recentlyViewed = user.recentlyViewed.slice(0, 20);
    await user.save();
    res.json({ recentlyViewed: user.recentlyViewed });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reviews
router.get('/reviews', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('reviews.product');
    res.json({ reviews: user.reviews || [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Notification preferences
router.put('/notification-preferences', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.notificationPreferences = { ...user.notificationPreferences, ...req.body };
    await user.save();
    res.json({ notificationPreferences: user.notificationPreferences });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Account settings
router.put('/settings', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { language, theme } = req.body;
    if (language !== undefined) user.language = language;
    if (theme !== undefined) user.theme = theme;
    await user.save();
    res.json({ settings: { language: user.language, theme: user.theme } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete account
router.delete('/account', auth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;