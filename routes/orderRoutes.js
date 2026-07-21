const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const { protect } = require('../middleware/auth');
const { BadRequestError, NotFoundError } = require('../utils/customErrors');

console.log('--- RAZORPAY DEBUG LOGS ---');
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID);
console.log('RAZORPAY_KEY_SECRET PRESENT:', process.env.RAZORPAY_KEY_SECRET ? 'YES' : 'NO');
console.log('---------------------------');

// Initialize Razorpay Node SDK
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key_id',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_key_secret',
});

// @desc    Create a new order
// @route   POST /api/orders
// @access  Public
router.post('/', async (req, res, next) => {
  const { items, totalAmount, customerName, paymentMethod } = req.body;

  try {
    if (!items || items.length === 0) {
      throw new BadRequestError('No items added to your tray.', 'OrderController -> createOrder');
    }

    if (!customerName || !customerName.trim()) {
      throw new BadRequestError('Your name is required to place an order.', 'OrderController -> createOrder');
    }

    const selectedMethod = paymentMethod || 'Cash';
    if (!['Cash', 'Online'].includes(selectedMethod)) {
      throw new BadRequestError('Invalid payment method selected.', 'OrderController -> createOrder');
    }

    // Validate prices and availability of items
    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItem);
      if (!menuItem) {
        throw new NotFoundError("We couldn't find one of the items in your tray.", 'OrderController -> createOrder');
      }
      if (!menuItem.isAvailable) {
        throw new BadRequestError(`${menuItem.name} is currently sold out. Please remove it and try again.`, 'OrderController -> createOrder');
      }
    }

    if (selectedMethod === 'Online') {
      // 1. Create a Razorpay Order
      const options = {
        amount: Math.round(totalAmount * 100), // convert to paise (INR)
        currency: 'INR',
        receipt: `receipt_token_${Date.now()}`,
      };

      const razorpayOrder = await razorpay.orders.create(options);

      // 2. Save Order as Pending in MongoDB
      const order = new Order({
        items,
        totalAmount,
        customerName,
        paymentMethod: 'Online',
        paymentStatus: 'Pending',
        orderStatus: 'Pending',
        razorpayOrderId: razorpayOrder.id,
      });

      const createdOrder = await order.save();

      res.status(201).json({
        success: true,
        message: 'Online payment initiated.',
        data: {
          order: createdOrder,
          razorpayOrder,
        },
      });
    } else {
      // Cash at counter flow
      const order = new Order({
        items,
        totalAmount,
        customerName,
        paymentMethod: 'Cash',
        paymentStatus: 'Pending',
        orderStatus: 'Pending',
      });

      const createdOrder = await order.save();

      res.status(201).json({
        success: true,
        message: 'Order placed successfully (Cash at Counter).',
        data: {
          order: createdOrder,
        },
      });
    }
  } catch (error) {
    next(error);
  }
});

// @desc    Get all pending orders
// @route   GET /api/orders/pending
// @access  Private/Staff
router.get('/pending', protect, async (req, res, next) => {
  try {
    // Return orders that are active in the kitchen queue.
    // Online orders must be "Paid" before cooking. Cash orders appear immediately.
    const orders = await Order.find({
      orderStatus: { $in: ['Pending', 'Preparing', 'Ready'] },
      $or: [
        { paymentMethod: 'Cash' },
        { paymentMethod: 'Online', paymentStatus: 'Paid' },
      ],
    })
      .populate('items.menuItem')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      message: 'Pending orders retrieved successfully.',
      data: orders,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get order details by orderId (code) or database ID
// @route   GET /api/orders/:idOrCode
// @access  Public
router.get('/:idOrCode', async (req, res, next) => {
  const param = req.params.idOrCode;

  try {
    let order;

    if (param.match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(param).populate('items.menuItem');
    } else {
      order = await Order.findOne({ orderId: param }).populate('items.menuItem');
    }

    if (!order) {
      throw new NotFoundError("We couldn't find the requested order.", 'OrderController -> getOrderDetails');
    }

    res.json({
      success: true,
      message: 'Order details retrieved successfully.',
      data: order,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Mark order as delivered
// @route   PATCH /api/orders/:id/deliver
// @access  Private/Staff
router.patch('/:id/deliver', protect, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      throw new NotFoundError("We couldn't find the requested order.", 'OrderController -> deliverOrder');
    }

    if (order.isUsed || order.orderStatus === 'Delivered') {
      throw new BadRequestError('This order has already been processed or delivered.', 'OrderController -> deliverOrder');
    }
    
    // Mark as delivered
    order.orderStatus = 'Delivered';
    order.isUsed = true;
    order.scannedAt = new Date();

    // If payment method was cash, it is now collected
    if (order.paymentMethod === 'Cash') {
      order.paymentStatus = 'Paid';
      order.amountPaid = order.totalAmount;
    }

    const updatedOrder = await order.save();
    const populatedOrder = await Order.findById(updatedOrder._id).populate('items.menuItem');
    
    res.json({
      success: true,
      message: 'Order marked as delivered successfully.',
      data: populatedOrder,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Process QR code order scan (mark as used / check reuse)
// @route   POST /api/orders/scan
// @access  Private/Staff
router.post('/scan', protect, async (req, res, next) => {
  const { code } = req.body;

  try {
    if (!code) {
      throw new BadRequestError('Scanned token code is required.', 'OrderController -> scanOrder');
    }

    let order;

    if (code.match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(code).populate('items.menuItem');
    } else {
      order = await Order.findOne({ orderId: code }).populate('items.menuItem');
    }

    if (!order) {
      throw new NotFoundError("We couldn't find the requested order.", 'OrderController -> scanOrder');
    }

    if (order.isUsed || order.orderStatus === 'Delivered') {
      throw new BadRequestError('This QR Code has already been used / is invalid.', 'OrderController -> scanOrder');
    }

    // Set statuses
    order.orderStatus = 'Delivered';
    order.isUsed = true;
    order.scannedAt = new Date();

    // Collect cash at counter if cash order
    if (order.paymentMethod === 'Cash') {
      order.paymentStatus = 'Paid';
      order.amountPaid = order.totalAmount;
    }

    const updatedOrder = await order.save();
    const populatedOrder = await Order.findById(updatedOrder._id).populate('items.menuItem');
    
    res.json({
      success: true,
      message: 'Order scanned and processed successfully.',
      data: populatedOrder,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get order details for multiple orderIds (History)
// @route   POST /api/orders/history
// @access  Public
router.post('/history', async (req, res, next) => {
  const { orderIds } = req.body;

  try {
    if (!orderIds || !Array.isArray(orderIds)) {
      throw new BadRequestError('An array of order IDs is required.', 'OrderController -> getOrderHistory');
    }

    // Filter valid mongoose ObjectIds to prevent crash on non-ObjectId patterns
    const validIds = orderIds.filter(id => id && id.match(/^[0-9a-fA-F]{24}$/));

    const orders = await Order.find({ _id: { $in: validIds } })
      .populate('items.menuItem')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: 'Order history retrieved successfully.',
      data: orders,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
