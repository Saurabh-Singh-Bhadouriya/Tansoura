const express = require('express');
const User = require('../models/User');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all users
router.get('/', adminAuth, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single user
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
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
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (username) user.username = username;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (fullName !== undefined) user.fullName = fullName;
    if (role) user.role = role;
    if (addresses) user.addresses = addresses;

    await user.save();
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

    // Check if user exists
    const exists = await User.findOne({ 
      $or: [
        { username },
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : [])
      ]
    });
    
    if (exists) {
      return res.status(400).json({ message: 'User already exists with this username, email or phone' });
    }

    const user = await User.create({
      username,
      email,
      phone,
      password,
      fullName,
      role: role || 'user'
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user.toObject();
    res.status(201).json(userWithoutPassword);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Ban user (set status to banned)
router.put('/:id/ban', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Add banned field if not exists (for compatibility with existing schema)
    user.status = user.status === 'banned' ? 'active' : 'banned';
    await user.save();
    
    res.json({ message: user.status === 'banned' ? 'User banned successfully' : 'User unbanned', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete user
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot delete admin user' });
    }
    
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;