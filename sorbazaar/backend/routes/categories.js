const express = require('express');
const prisma = require('../prismaClient');
const { adminAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Get all active categories (public)
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { active: true },
      orderBy: { order: 'asc' }
    });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all categories (admin)
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { order: 'asc' }
    });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single category
router.get('/:handle', async (req, res) => {
  try {
    const category = await prisma.category.findFirst({
      where: { handle: req.params.handle }
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
    const data = { ...req.body };
    if (req.file) data.image = `/uploads/${req.file.filename}`;
    if (!data.handle && data.name) {
      data.handle = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    const category = await prisma.category.create({ data });
    if (global.bumpDataVersion) global.bumpDataVersion();
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update category
router.put('/:id', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.image = `/uploads/${req.file.filename}`;
    data.updatedAt = new Date();
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data
    });
    if (global.bumpDataVersion) global.bumpDataVersion();
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete category
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    if (global.bumpDataVersion) global.bumpDataVersion();
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;