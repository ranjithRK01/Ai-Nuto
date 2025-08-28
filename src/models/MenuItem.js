const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  shopId: {
    type: String,
    trim: true,
    index: true
  },
  names: {
    en: {
      full: { type: String, required: true, trim: true },
      short: { type: String, trim: true }
    },
    ta: {
      full: { type: String, trim: true },
      short: { type: String, trim: true }
    }
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    default: 'piece'
  },
  categories: {
    type: [String],
    default: ['lunch'],
    validate: v => {
      const allowed = ['breakfast', 'lunch', 'dinner'];
      return Array.isArray(v) && v.length > 0 && v.every(c => allowed.includes(String(c)));
    }
  },
  synonyms: {
    en: { type: [String], default: [] },
    ta: { type: [String], default: [] }
  },
  tags: { type: [String], default: [] },
  isAvailable: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Text indexes for multilingual search and fuzzy prefiltering
menuItemSchema.index({ 'names.en.full': 'text', 'names.ta.full': 'text', tags: 'text' });
menuItemSchema.index({ shopId: 1, isAvailable: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);
