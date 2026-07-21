const Razorpay = require('razorpay');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('--- DIAGNOSTIC RUN ---');
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID);
console.log('RAZORPAY_KEY_SECRET_LENGTH:', process.env.RAZORPAY_KEY_SECRET ? process.env.RAZORPAY_KEY_SECRET.length : 0);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

razorpay.orders.create({
  amount: 100,
  currency: 'INR',
  receipt: 'test_receipt_id'
})
.then(order => {
  console.log('API RESPONSE SUCCESS:', order);
})
.catch(err => {
  console.error('API RESPONSE ERROR:', err);
});
