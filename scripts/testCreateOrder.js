const Order = require('../models/Order');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const test = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    const order = new Order({
      customerName: 'Diagnostic Student',
      items: [
        {
          menuItem: new mongoose.Types.ObjectId(), // mock id
          quantity: 1,
          price: 150,
        }
      ],
      totalAmount: 150,
      paymentMethod: 'Cash',
    });

    const saved = await order.save();
    console.log('SUCCESS! Saved Order:', saved);
  } catch (err) {
    console.error('CRITICAL ERROR DURING SAVE:', err);
  } finally {
    await mongoose.disconnect();
  }
};

test();
