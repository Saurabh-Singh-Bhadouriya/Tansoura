const express = require('express');
const prisma = require('../prismaClient');
const { adminAuth, auth } = require('../middleware/auth');

const router = express.Router();

// Admin: Get all promo codes
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const codes = await prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(codes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Create promo code
router.post('/admin/create', adminAuth, async (req, res) => {
  try {
    const code = await prisma.promoCode.create({ data: req.body });
    res.status(201).json(code);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Update promo code
router.put('/admin/:id', adminAuth, async (req, res) => {
  try {
    const code = await prisma.promoCode.update({ where: { id: req.params.id }, data: req.body });
    res.json(code);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Delete promo code
router.delete('/admin/:id', adminAuth, async (req, res) => {
  try {
    await prisma.promoCode.delete({ where: { id: req.params.id } });
    res.json({ message: 'Promo code deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Public: Validate promo code
router.post('/validate', auth, async (req, res) => {
  try {
    const { code, orderAmount, cartItems } = req.body;
    const user = await prisma.user.findFirst({ where: { id: req.user.id } });
    if (!user) return res.status(401).json({ message: 'User not found' });

    const promo = await prisma.promoCode.findFirst({
      where: { code: (code || '').toUpperCase(), isActive: true }
    });
    if (!promo) {
      return res.status(404).json({ message: 'Invalid promo code' });
    }

    const now = new Date();
    if (promo.validFrom && promo.validFrom > now) {
      return res.status(400).json({ message: 'Promo code not yet valid' });
    }
    if (promo.validUntil && promo.validUntil < now) {
      return res.status(400).json({ message: 'Promo code expired' });
    }

    if (orderAmount < promo.minOrderAmount) {
      return res.status(400).json({ message: `Minimum order amount should be ${promo.minOrderAmount}` });
    }

    if (promo.usageLimit > 0 && promo.usageCount >= promo.usageLimit) {
      return res.status(400).json({ message: 'Promo code usage limit exceeded' });
    }

    // Count this user's usage from embedded promoUsages
    const userUsage = (user.promoUsages || []).filter(u => u.promoCodeId === promo.id).length;
    if (userUsage >= promo.perUserLimit) {
      return res.status(400).json({ message: 'You have already used this promo code' });
    }

    let discount = 0;
    if (promo.discountType === 'percentage') {
      discount = (orderAmount * promo.discountValue) / 100;
      if (promo.maxDiscountAmount) {
        discount = Math.min(discount, promo.maxDiscountAmount);
      }
    } else {
      discount = promo.discountValue;
    }

    discount = Math.round(discount * 100) / 100;

    res.json({
      valid: true,
      code: promo.code,
      description: promo.description,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      discount,
      finalAmount: Math.round((orderAmount - discount) * 100) / 100
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;