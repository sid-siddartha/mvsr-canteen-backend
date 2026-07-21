const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide the item name'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide a short description'],
    },
    price: {
      type: Number,
      required: [true, 'Please provide the item price'],
      min: [0, 'Price cannot be negative'],
    },
    category: {
      type: String,
      required: [true, 'Please select a category'],
      enum: ['Snacks', 'Beverages', 'Main Course', 'Combos', 'Desserts'],
    },
    image: {
      type: String,
      required: [true, 'Please provide an image URL'],
    },
    isVeg: {
      type: Boolean,
      required: [true, 'Please specify if the item is Veg or Non-Veg'],
      default: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    prepTime: {
      type: Number,
      default: 10, // minutes
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    isBestSeller: {
      type: Boolean,
      default: false,
    },
    isChefSpecial: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('MenuItem', menuItemSchema);
