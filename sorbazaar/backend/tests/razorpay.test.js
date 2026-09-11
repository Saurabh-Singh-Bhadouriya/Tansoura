const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const { verifyRazorpaySignature } = require('../utils/razorpay');

test('verifyRazorpaySignature accepts valid Razorpay signatures', () => {
  const keySecret = 'test_secret';
  const orderId = 'order_123';
  const paymentId = 'pay_456';
  const signature = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  assert.equal(verifyRazorpaySignature({ order_id: orderId, payment_id: paymentId, razorpay_signature: signature, key_secret: keySecret }), true);
});

test('verifyRazorpaySignature rejects mismatched signatures', () => {
  assert.equal(
    verifyRazorpaySignature({
      order_id: 'order_123',
      payment_id: 'pay_456',
      razorpay_signature: 'bad_signature',
      key_secret: 'test_secret'
    }),
    false
  );
});
