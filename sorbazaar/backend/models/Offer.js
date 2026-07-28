const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  image: String,
  video: String,
  link: String,
  type: { type: String, enum: ['banner', 'offer', 'promo'], default: 'banner' },
  navPage: { type: String, default: 'home' },
  position: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  startDate: Date,
  endDate: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Offer', offerSchema);
