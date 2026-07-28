const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: String,
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true },
  minOrderAmount: { type: Number, default: 0 },
  maxDiscountAmount: { type: Number },
  usageLimit: { type: Number, default: 0 }, // 0 = unlimited
  usageCount: { type: Number, default: 0 },
  perUserLimit: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  validFrom: { type: Date, default: Date.now },
  validUntil: { type: Date },
  applicableCategories: [{ type: String }], // empty = all categories
  applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

promoCodeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('PromoCode', promoCodeSchema);