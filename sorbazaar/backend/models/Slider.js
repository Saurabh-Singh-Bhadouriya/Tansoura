const mongoose = require('mongoose');

const sliderSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: String,
  link: String,
  buttonText: String,
  image: String,
  video: String,
  navPage: {
    type: String,
    required: true,
    enum: ['home', 'skincare', 'haircare', 'bath-body', 'makeup', 'electronics', 'fashion', 'home-living', 'offers', 'new-arrivals']
  },
  position: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Ensure at least one of image or video is present
sliderSchema.pre('validate', function (next) {
  if (!this.image && !this.video) {
    this.invalidate('image', 'Either image or video is required');
    this.invalidate('video', 'Either image or video is required');
  }
  next();
});

module.exports = mongoose.model('Slider', sliderSchema);
