const express = require('express');
const prisma = require('../prismaClient');
const { adminAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { navPage, type } = req.query;
    const where = { active: true, ...(navPage ? { navPage } : {}), ...(type ? { type } : {}) };
    const offers = await prisma.offer.findMany({ where, orderBy: { position: 'asc' } });
    res.json(offers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const offers = await prisma.offer.findMany({ orderBy: { position: 'asc' } });
    res.json(offers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', adminAuth, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  try {
    const data = JSON.parse(req.body.offerData || '{}');
    if (req.files?.image) data.image = `/uploads/${req.files.image[0].filename}`;
    if (req.files?.video) data.video = `/uploads/${req.files.video[0].filename}`;
    const offer = await prisma.offer.create({ data });
    if (global.bumpDataVersion) global.bumpDataVersion();
    res.status(201).json(offer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', adminAuth, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  try {
    const data = JSON.parse(req.body.offerData || '{}');
    if (req.files?.image) data.image = `/uploads/${req.files.image[0].filename}`;
    if (req.files?.video) data.video = `/uploads/${req.files.video[0].filename}`;
    const offer = await prisma.offer.update({ where: { id: req.params.id }, data });
    if (global.bumpDataVersion) global.bumpDataVersion();
    res.json(offer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await prisma.offer.delete({ where: { id: req.params.id } });
    if (global.bumpDataVersion) global.bumpDataVersion();
    res.json({ message: 'Offer deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;