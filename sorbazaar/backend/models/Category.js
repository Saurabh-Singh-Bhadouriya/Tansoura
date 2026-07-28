const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  handle: { type: String, unique: true, sparse: true },
  description: String,
  image: String,
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

categorySchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  if (!this.handle && this.name) {
    this.handle = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

module.exports = mongoose.model('Category', categorySchema);