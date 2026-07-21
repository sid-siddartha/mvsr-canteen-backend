const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide the category name'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
    },
    icon: {
      type: String, // lucide-react icon name or URL
      default: 'Coffee',
    },
    banner: {
      type: String, // image URL
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Category', categorySchema);
