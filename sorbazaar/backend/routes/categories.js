const express = require('express');
const Category = require('../models/Category');
const { auth, adminAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Get all active categories (public)
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ active: true }).sort({ order: 1, name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all categories (admin)
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const categories = await Category.find().sort({ order: 1, name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single category
router.get('/:handle', async (req, res) => {
  try {
    const category = await Category.findOne({
      $or: [
        { handle: req.params.handle },
        { _id: req.params.handle.match(/^[0-9a-fA-F]{24}$/) ? req.params.handle : null }
      ]
    });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create category
router.post('/', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const data = req.body;
    if (req.file) {
      data.image = `/uploads/${req.file.filename}`;
    }
    const category = await Category.create(data);
    if (global.bumpDataVersion) global.bumpDataVersion();
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update category
router.put('/:id', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const data = req.body;
    if (req.file) {
      data.image = `/uploads/${req.file.filename}`;
    }
    data.updatedAt = Date.now();
    const category = await Category.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    if (global.bumpDataVersion) global.bumpDataVersion();
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete category
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    if (global.bumpDataVersion) global.bumpDataVersion();
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;