const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const { protect } = require('../middleware/auth');
const { BadRequestError, NotFoundError } = require('../utils/customErrors');

// @desc    Get all menu items
// @route   GET /api/menu
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    const menuItems = await MenuItem.find({});
    res.json({
      success: true,
      message: 'Menu retrieved successfully.',
      data: menuItems,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create a menu item
// @route   POST /api/menu
// @access  Private/Staff
router.post('/', protect, async (req, res, next) => {
  const { name, description, price, category, image, isVeg, isAvailable } = req.body;

  try {
    if (!name || !description || price === undefined || !category || !image) {
      throw new BadRequestError(
        'Missing required fields: name, description, price, category, and image are required.',
        'MenuController -> createItem'
      );
    }

    if (price < 0) {
      throw new BadRequestError('Price cannot be negative.', 'MenuController -> createItem');
    }

    const menuItem = new MenuItem({
      name,
      description,
      price,
      category,
      image,
      isVeg: isVeg !== undefined ? isVeg : true,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      prepTime: req.body.prepTime !== undefined ? req.body.prepTime : 10,
      isPopular: req.body.isPopular !== undefined ? req.body.isPopular : false,
      isBestSeller: req.body.isBestSeller !== undefined ? req.body.isBestSeller : false,
      isChefSpecial: req.body.isChefSpecial !== undefined ? req.body.isChefSpecial : false,
    });

    const createdMenuItem = await menuItem.save();
    
    res.status(201).json({
      success: true,
      message: 'Menu item created successfully.',
      data: createdMenuItem,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Bulk delete menu items
// @route   POST /api/menu/bulk-delete
// @access  Private/Staff
router.post('/bulk-delete', protect, async (req, res, next) => {
  const { ids } = req.body;
  try {
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ success: false, message: 'Please provide an array of item IDs' });
    }
    await MenuItem.deleteMany({ _id: { $in: ids } });
    res.json({ success: true, message: 'Bulk delete successful.' });
  } catch (err) {
    next(err);
  }
});

// @desc    Bulk toggle menu item availability
// @route   PATCH /api/menu/bulk-toggle
// @access  Private/Staff
router.patch('/bulk-toggle', protect, async (req, res, next) => {
  const { ids, isAvailable } = req.body;
  try {
    if (!ids || !Array.isArray(ids) || isAvailable === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide ids array and isAvailable boolean' });
    }
    await MenuItem.updateMany({ _id: { $in: ids } }, { $set: { isAvailable } });
    res.json({ success: true, message: 'Bulk availability toggle successful.' });
  } catch (err) {
    next(err);
  }
});

// @desc    Update a menu item
// @route   PATCH /api/menu/:id
// @access  Private/Staff
router.patch('/:id', protect, async (req, res, next) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      throw new NotFoundError("We couldn't find the requested item.", 'MenuController -> updateItem');
    }

    if (req.body.price !== undefined && req.body.price < 0) {
      throw new BadRequestError('Price cannot be negative.', 'MenuController -> updateItem');
    }

    menuItem.name = req.body.name || menuItem.name;
    menuItem.description = req.body.description || menuItem.description;
    menuItem.price = req.body.price !== undefined ? req.body.price : menuItem.price;
    menuItem.category = req.body.category || menuItem.category;
    menuItem.image = req.body.image || menuItem.image;
    menuItem.isVeg = req.body.isVeg !== undefined ? req.body.isVeg : menuItem.isVeg;
    menuItem.isAvailable = req.body.isAvailable !== undefined ? req.body.isAvailable : menuItem.isAvailable;
    menuItem.prepTime = req.body.prepTime !== undefined ? req.body.prepTime : menuItem.prepTime;
    menuItem.isPopular = req.body.isPopular !== undefined ? req.body.isPopular : menuItem.isPopular;
    menuItem.isBestSeller = req.body.isBestSeller !== undefined ? req.body.isBestSeller : menuItem.isBestSeller;
    menuItem.isChefSpecial = req.body.isChefSpecial !== undefined ? req.body.isChefSpecial : menuItem.isChefSpecial;

    const updatedMenuItem = await menuItem.save();
    
    res.json({
      success: true,
      message: 'Menu item updated successfully.',
      data: updatedMenuItem,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete a menu item
// @route   DELETE /api/menu/:id
// @access  Private/Staff
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      throw new NotFoundError("We couldn't find the requested item.", 'MenuController -> deleteItem');
    }

    await MenuItem.deleteOne({ _id: req.params.id });
    
    res.json({
      success: true,
      message: 'Menu item removed successfully.',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
