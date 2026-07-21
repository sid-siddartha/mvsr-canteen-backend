const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { BadRequestError, UnauthorizedError } = require('../utils/customErrors');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user (Staff/Admin)
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res, next) => {
  const { username, password, name, role } = req.body;

  try {
    if (!username || !password || !name) {
      throw new BadRequestError('Username, password, and name are required.', 'AuthController -> register');
    }

    if (password.length < 6) {
      throw new BadRequestError('Password must be at least 6 characters.', 'AuthController -> register');
    }

    const userExists = await User.findOne({ username });
    if (userExists) {
      throw new BadRequestError('Username is already taken.', 'AuthController -> register');
    }

    const user = await User.create({
      username,
      password,
      name,
      role: role || 'staff',
    });

    res.status(201).json({
      success: true,
      message: 'Staff user registered successfully.',
      data: {
        _id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Auth user & get token (Login)
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res, next) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      throw new BadRequestError('Please provide both username and password.', 'AuthController -> login');
    }

    const user = await User.findOne({ username });

    if (user && (await user.matchPassword(password))) {
      res.json({
        success: true,
        message: 'Login successful.',
        data: {
          _id: user._id,
          name: user.name,
          username: user.username,
          role: user.role,
          token: generateToken(user._id),
        },
      });
    } else {
      throw new UnauthorizedError('Invalid username or password.', 'AuthController -> login');
    }
  } catch (error) {
    next(error);
  }
});

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      throw new UnauthorizedError('Staff account not found.', 'AuthController -> getMe');
    }
    
    res.json({
      success: true,
      message: 'Staff profile retrieved successfully.',
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
