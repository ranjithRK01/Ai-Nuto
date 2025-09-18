const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    tamilName: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'snacks', 'beverages'],
      default: 'lunch',
    },
    unit: {
      type: String,
      default: 'piece',
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient searching
menuItemSchema.index({ name: 'text', tamilName: 'text' });

module.exports = mongoose.model('MenuItem', menuItemSchema);
