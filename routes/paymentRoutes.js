const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');
const { BadRequestError, NotFoundError } = require('../utils/customErrors');

// Initialize Razorpay
// Note: Frontend key id is exposed, secret key is kept secret on the server.
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key_id',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_key_secret',
});

// @desc    Get Razorpay public key ID config
// @route   GET /api/payment/config
// @access  Public
router.get('/config', (req, res, next) => {
  try {
    res.json({
      success: true,
      message: 'Payment configuration retrieved.',
      data: {
        keyId: process.env.RAZORPAY_KEY_ID || 'dummy_key_id',
      },
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create a Razorpay order
// @route   POST /api/payment/create-order
// @access  Public
router.post('/create-order', async (req, res, next) => {
  const { amount } = req.body;

  try {
    if (!amount || amount <= 0) {
      throw new BadRequestError('Invalid transaction amount.', 'PaymentController -> createOrder');
    }

    const options = {
      amount: Math.round(amount * 100), // convert to paise (INR)
      currency: 'INR',
      receipt: `receipt_token_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    
    res.json({
      success: true,
      message: 'Razorpay order created successfully.',
      data: order,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Verify Razorpay payment signature
// @route   POST /api/payment/verify
// @access  Public
router.post('/verify', async (req, res, next) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;

  try {
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !orderId) {
      throw new BadRequestError('Missing required payment parameters for verification.', 'PaymentController -> verifyPayment');
    }

    // Generate expected signature
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'dummy_key_secret');
    hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
    const generatedSignature = hmac.digest('hex');

    const isValid = generatedSignature === razorpaySignature;

    if (isValid) {
      // Find the local order
      const order = await Order.findById(orderId);
      if (!order) {
        throw new NotFoundError("We couldn't find the associated order to update.", 'PaymentController -> verifyPayment');
      }

      // Update order variables
      order.paymentStatus = 'Paid';
      order.paymentMethod = 'Online';
      order.amountPaid = order.totalAmount;
      order.transactionTime = new Date();
      order.orderStatus = 'Preparing'; // Change from Pending to Preparing on payment success
      order.razorpayOrderId = razorpayOrderId;
      order.razorpayPaymentId = razorpayPaymentId;
      order.razorpaySignature = razorpaySignature;

      const updatedOrder = await order.save();
      const populatedOrder = await Order.findById(updatedOrder._id).populate('items.menuItem');

      res.json({
        success: true,
        message: 'Payment verified and order updated successfully.',
        data: populatedOrder,
      });
    } else {
      // Mark local order payment as failed
      const order = await Order.findById(orderId);
      if (order) {
        order.paymentStatus = 'Failed';
        await order.save();
      }
      throw new BadRequestError('Payment verification failed. The security signature did not match.', 'PaymentController -> verifyPayment');
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
