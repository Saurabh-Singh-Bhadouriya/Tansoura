const express = require('express');
const Slider = require('../models/Slider');
const { adminAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { navPage } = req.query;
    const filter = { active: true };
    if (navPage) filter.navPage = navPage;
    const sliders = await Slider.find(filter).sort({ position: 1 });
    res.json(sliders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const sliders = await Slider.find().sort({ navPage: 1, position: 1 });
    res.json(sliders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', adminAuth, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  try {
    const data = JSON.parse(req.body.sliderData || '{}');
    if (req.files && req.files.image && req.files.image.length > 0) {
      data.image = `/uploads/${req.files.image[0].filename}`;
    }
    if (req.files && req.files.video && req.files.video.length > 0) {
      data.video = `/uploads/${req.files.video[0].filename}`;
    }
    const slider = await Slider.create(data);
    if (global.bumpDataVersion) global.bumpDataVersion();
    res.status(201).json(slider);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', adminAuth, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  try {
    const data = JSON.parse(req.body.sliderData || '{}');
    if (req.files && req.files.image && req.files.image.length > 0) {
      data.image = `/uploads/${req.files.image[0].filename}`;
    }
    if (req.files && req.files.video && req.files.video.length > 0) {
      data.video = `/uploads/${req.files.video[0].filename}`;
    }
    const slider = await Slider.findByIdAndUpdate(req.params.id, data, { new: true });
    if (global.bumpDataVersion) global.bumpDataVersion();
    res.json(slider);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await Slider.findByIdAndDelete(req.params.id);
    if (global.bumpDataVersion) global.bumpDataVersion();
    res.json({ message: 'Slider deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;