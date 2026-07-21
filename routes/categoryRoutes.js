const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { protect, admin } = require('../middleware/auth');

// @desc    Get all active categories
// @route   GET /api/categories
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.find({}).sort({ order: 1, name: 1 });
    res.json({
      success: true,
      message: 'Categories retrieved successfully.',
      data: categories,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
router.post('/', protect, admin, async (req, res, next) => {
  const { name, description, icon, banner, isActive, order } = req.body;

  try {
    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const categoryExists = await Category.findOne({ name: name.trim() });
    if (categoryExists) {
      return res.status(400).json({ success: false, message: 'Category already exists.' });
    }

    const category = new Category({
      name: name.trim(),
      description,
      icon,
      banner,
      isActive: isActive !== undefined ? isActive : true,
      order: order !== undefined ? order : 0,
    });

    const createdCategory = await category.save();

    res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      data: createdCategory,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update a category
// @route   PATCH /api/categories/:id
// @access  Private/Admin
router.patch('/:id', protect, admin, async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    if (req.body.name && req.body.name.trim() !== category.name) {
      const categoryExists = await Category.findOne({ name: req.body.name.trim() });
      if (categoryExists) {
        return res.status(400).json({ success: false, message: 'Category name is already taken.' });
      }
      category.name = req.body.name.trim();
    }

    category.description = req.body.description !== undefined ? req.body.description : category.description;
    category.icon = req.body.icon || category.icon;
    category.banner = req.body.banner !== undefined ? req.body.banner : category.banner;
    category.isActive = req.body.isActive !== undefined ? req.body.isActive : category.isActive;
    category.order = req.body.order !== undefined ? req.body.order : category.order;

    const updatedCategory = await category.save();

    res.json({
      success: true,
      message: 'Category updated successfully.',
      data: updatedCategory,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    await Category.deleteOne({ _id: req.params.id });

    res.json({
      success: true,
      message: 'Category removed successfully.',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
