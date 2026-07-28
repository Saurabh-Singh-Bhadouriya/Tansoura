const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  label: { type: String, default: 'Home' },
  fullName: String,
  phone: String,
  pincode: String,
  addressLine1: String,
  addressLine2: String,
  city: String,
  state: String,
  isDefault: { type: Boolean, default: false }
});

const reviewSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  rating: Number,
  title: String,
  comment: String,
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, sparse: true, trim: true, lowercase: true },
  phone: { type: String, sparse: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  status: { type: String, enum: ['active', 'banned'], default: 'active' },
  fullName: { type: String, default: '' },
  dateOfBirth: { type: String, default: '' },
  gender: { type: String, default: '' },
  profilePhoto: { type: String, default: '' },
  addresses: [addressSchema],
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  recentlyViewed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  reviews: [reviewSchema],
  notificationPreferences: {
    orderUpdates: { type: Boolean, default: true },
    offers: { type: Boolean, default: true },
    promotional: { type: Boolean, default: true }
  },
  language: { type: String, default: 'en' },
  theme: { type: String, default: 'light' },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
