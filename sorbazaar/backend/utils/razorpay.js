const crypto = require('node:crypto');

function verifyRazorpaySignature({ order_id, payment_id, razorpay_signature, key_secret }) {
  if (!order_id || !payment_id || !razorpay_signature || !key_secret) return false;

  const generated = crypto
    .createHmac('sha256', key_secret)
    .update(`${order_id}|${payment_id}`)
    .digest('hex');

  if (generated.length !== razorpay_signature.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(generated),
    Buffer.from(razorpay_signature)
  );
}

module.exports = { verifyRazorpaySignature };
