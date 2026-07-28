const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['order_placed', 'order_received', 'order_confirmed', 'order_shipped', 'order_out_for_delivery', 'order_delivered', 
           'order_cancelled', 'order_cancelled_by_admin', 'order_deleted',
           'return_requested', 'return_pickup', 'returned',
           'upi_payment_pending', 'upi_payment_verified', 'upi_payment_rejected', 'payment_auto_verified',
           'product_approved', 'product_rejected'],
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed },
  read: { type: Boolean, default: false },
  actionUrl: String,
  actions: [{
    label: String,
    action: String,
    style: { type: String, default: 'primary' }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);