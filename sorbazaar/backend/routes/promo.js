const express = require('express');
const PromoCode = require('../models/PromoCode');
const { adminAuth, auth } = require('../middleware/auth');

const router = express.Router();

// Admin: Get all promo codes
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const codes = await PromoCode.find().sort({ createdAt: -1 });
    res.json(codes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Create promo code
router.post('/admin/create', adminAuth, async (req, res) => {
  try {
    const code = await PromoCode.create(req.body);
    res.status(201).json(code);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Update promo code
router.put('/admin/:id', adminAuth, async (req, res) => {
  try {
    const code = await PromoCode.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!code) return res.status(404).json({ message: 'Promo code not found' });
    res.json(code);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Delete promo code
router.delete('/admin/:id', adminAuth, async (req, res) => {
  try {
    await PromoCode.findByIdAndDelete(req.params.id);
    res.json({ message: 'Promo code deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Public: Validate promo code
router.post('/validate', auth, async (req, res) => {
  try {
    const { code, orderAmount, cartItems } = req.body;
    const user = req.user;
    
    const promo = await PromoCode.findOne({ code: code.toUpperCase(), isActive: true });
    if (!promo) {
      return res.status(404).json({ message: 'Invalid promo code' });
    }

    // Check validity dates
    const now = new Date();
    if (promo.validFrom > now) {
      return res.status(400).json({ message: 'Promo code not yet valid' });
    }
    if (promo.validUntil && promo.validUntil < now) {
      return res.status(400).json({ message: 'Promo code expired' });
    }

    // Check minimum order amount
    if (orderAmount < promo.minOrderAmount) {
      return res.status(400).json({ message: `Minimum order amount should be ${promo.minOrderAmount}` });
    }

    // Check usage limit
    if (promo.usageLimit > 0 && promo.usageCount >= promo.usageLimit) {
      return res.status(400).json({ message: 'Promo code usage limit exceeded' });
    }

    // Check per-user limit
    const userUsage = promo.usedBy?.filter(uid => uid.toString() === user._id.toString())?.length || 0;
    if (userUsage >= promo.perUserLimit) {
      return res.status(400).json({ message: 'You have already used this promo code' });
    }

    // Calculate discount
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