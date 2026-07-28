const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    title: String,
    price: Number,
    quantity: Number,
    image: String,
    variant: String
  }],
  address: {
    fullName: String,
    phone: String,
    pincode: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String
  },
  subtotal: Number,
  shipping: { type: Number, default: 0 },
  total: Number,
  paymentMethod: { type: String, enum: ['cod', 'upi', 'card', 'netbanking', 'paypal', 'binance', 'razorpay'], default: 'cod' },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'pending_verification', 'verified', 'paid', 'failed', 'captured'], 
    default: 'pending' 
  },
  upiPayment: {
    utr: String,
    screenshot: String,
    status: { type: String, enum: ['pending_verification', 'verified', 'rejected'], default: 'pending_verification' },
    verifiedAt: Date,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    autoVerified: { type: Boolean, default: false }
  },
  razorpayPayment: {
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    status: { type: String, enum: ['captured', 'failed'], default: 'captured' }
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'received', 'confirmed', 'shipped', 'out_for_delivery', 'delivered', 'return_requested', 'return_pickup', 'returned', 'cancelled'],
    default: 'pending'
  },
  tracking: {
    received: { type: Date },
    confirmed: { type: Date },
    shipped: { type: Date },
    outForDelivery: { type: Date },
    delivered: { type: Date },
    returnRequested: { type: Date },
    returnPickup: { type: Date },
    returned: { type: Date }
  },
  cancellationReason: { type: String },
  estimatedDelivery: { type: String, default: '3-7 business days' },
  paymentVerifiedAt: { type: Date },
  paymentVerificationAttemptedAt: { type: Date },
  promoCode: { type: String },
  promoDiscount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);