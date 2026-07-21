const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const { protect, admin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// Helper function to generate JWT token (used if registering staff)
const jwt = require('jsonwebtoken');
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// ==========================================
// STAFF MANAGEMENT ROUTERS
// ==========================================

// @desc    Get all staff accounts
// @route   GET /api/admin/staff
// @access  Private/Admin
router.get('/staff', protect, admin, async (req, res, next) => {
  try {
    const staffList = await User.find({ role: 'staff' }).select('-password').sort({ createdAt: -1 });
    res.json({
      success: true,
      message: 'Staff list retrieved successfully.',
      data: staffList,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create a new staff account
// @route   POST /api/admin/staff
// @access  Private/Admin
router.post('/staff', protect, admin, async (req, res, next) => {
  const { username, password, name } = req.body;

  try {
    if (!username || !password || !name) {
      return res.status(400).json({ success: false, message: 'Username, password, and name are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const userExists = await User.findOne({ username: username.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Username is already taken.' });
    }

    const staffUser = await User.create({
      username: username.toLowerCase().trim(),
      password,
      name: name.trim(),
      role: 'staff',
    });

    res.status(201).json({
      success: true,
      message: 'Staff account created successfully.',
      data: {
        _id: staffUser._id,
        name: staffUser.name,
        username: staffUser.username,
        role: staffUser.role,
        createdAt: staffUser.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete a staff account
// @route   DELETE /api/admin/staff/:id
// @access  Private/Admin
router.delete('/staff/:id', protect, admin, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.role !== 'staff') {
      return res.status(400).json({ success: false, message: 'Only staff accounts can be deleted.' });
    }

    await User.deleteOne({ _id: req.params.id });

    res.json({
      success: true,
      message: 'Staff account removed successfully.',
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// ORDER MANAGEMENT ROUTERS
// ==========================================

// @desc    Get all orders with search, filter, and pagination
// @route   GET /api/admin/orders
// @access  Private/Admin
router.get('/orders', protect, admin, async (req, res, next) => {
  const {
    orderStatus,
    paymentMethod,
    paymentStatus,
    search,
    startDate,
    endDate,
    page = 1,
    limit = 10,
  } = req.query;

  try {
    let query = {};

    // Filters
    if (orderStatus) query.orderStatus = orderStatus;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    // Search query
    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
      ];
    }

    // Date Range filters
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const orders = await Order.find(query)
      .populate('items.menuItem')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const totalOrders = await Order.countDocuments(query);

    res.json({
      success: true,
      message: 'Orders retrieved successfully.',
      data: {
        orders,
        total: totalOrders,
        pages: Math.ceil(totalOrders / limitNum),
        currentPage: pageNum,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update order status or payment status
// @route   PATCH /api/admin/orders/:id
// @access  Private/Admin
router.patch('/orders/:id', protect, admin, async (req, res, next) => {
  const { orderStatus, paymentStatus } = req.body;

  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (orderStatus) order.orderStatus = orderStatus;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    const updatedOrder = await order.save();
    
    // Repopulate menu items before sending
    const populatedOrder = await Order.findById(updatedOrder._id).populate('items.menuItem');

    res.json({
      success: true,
      message: 'Order updated successfully.',
      data: populatedOrder,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// SALES ANALYTICS ROUTERS
// ==========================================

// @desc    Get aggregated sales analytics
// @route   GET /api/admin/analytics
// @access  Private/Admin
router.get('/analytics', protect, admin, async (req, res, next) => {
  try {
    // 1. Basic sums (revenue, count, delivered, preparing, pending, etc.)
    const ordersCount = await Order.countDocuments({});
    
    const revenueAgg = await Order.aggregate([
      { $match: { paymentStatus: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueAgg[0] ? revenueAgg[0].total : 0;

    const pendingOrders = await Order.countDocuments({ orderStatus: 'Pending' });
    const preparingOrders = await Order.countDocuments({ orderStatus: 'Preparing' });
    const readyOrders = await Order.countDocuments({ orderStatus: 'Ready' });
    const deliveredOrders = await Order.countDocuments({ orderStatus: 'Delivered' });
    const cancelledOrders = await Order.countDocuments({ paymentStatus: 'Cancelled' });

    // 2. Average Order Value
    const aov = ordersCount > 0 ? parseFloat((totalRevenue / ordersCount).toFixed(2)) : 0;

    // 3. Hourly Traffic (order load by hour)
    const hourlyTraffic = await Order.aggregate([
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Fill in 24 hours
    const hourlyMap = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
    hourlyTraffic.forEach(item => {
      // Adjust timezone offset here if needed, but standard aggregate gets UTC hour
      if (item._id !== null) hourlyMap[item._id].count = item.count;
    });

    // 4. Payment breakdown
    const paymentBreakdown = await Order.aggregate([
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          amount: { $sum: '$totalAmount' }
        }
      }
    ]);

    // 5. Category breakdown
    // We match orders, unwind items, lookup menuItems, group by category
    const categoryBreakdown = await Order.aggregate([
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'menuitems',
          localField: 'items.menuItem',
          foreignField: '_id',
          as: 'menuDetail'
        }
      },
      { $unwind: '$menuDetail' },
      {
        $group: {
          _id: '$menuDetail.category',
          count: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    // 6. Top foods
    const topFoods = await Order.aggregate([
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'menuitems',
          localField: 'items.menuItem',
          foreignField: '_id',
          as: 'menuDetail'
        }
      },
      { $unwind: '$menuDetail' },
      {
        $group: {
          _id: '$menuDetail.name',
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { quantity: -1 } },
      { $limit: 10 }
    ]);

    // 7. Sales timelines (Daily sales last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dailySales = await Order.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo }, paymentStatus: 'Paid' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 8. Repeat Customers (Count orders per name)
    const repeatCustomerStats = await Order.aggregate([
      {
        $group: {
          _id: '$customerName',
          orderCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          repeatCustomers: {
            $sum: {
              $cond: [{ $gt: ['$orderCount', 1] }, 1, 0]
            }
          }
        }
      }
    ]);
    const repeatCustomers = repeatCustomerStats[0] ? repeatCustomerStats[0].repeatCustomers : 0;
    const totalUniqueCustomers = repeatCustomerStats[0] ? repeatCustomerStats[0].totalCustomers : 0;

    res.json({
      success: true,
      message: 'Analytics loaded successfully.',
      data: {
        summary: {
          totalRevenue,
          ordersCount,
          pendingOrders,
          preparingOrders,
          readyOrders,
          deliveredOrders,
          cancelledOrders,
          aov,
          totalUniqueCustomers,
          repeatCustomers,
        },
        hourlyTraffic: hourlyMap,
        paymentBreakdown,
        categoryBreakdown,
        topFoods,
        dailySales,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
