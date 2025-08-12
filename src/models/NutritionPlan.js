const mongoose = require('mongoose');

const nutritionPlanSchema = new mongoose.Schema({
  planId: {
    type: String,
    required: true,
    unique: true
  },
  filename: {
    type: String,
    required: true
  },
  documentType: {
    type: String,
    enum: ['pdf', 'docx', 'doc', 'text'],
    required: true
  },
  summary: {
    type: String,
    required: true
  },
  sections: [{
    type: String
  }],
  nutritionInfo: {
    meals: {
      type: Number,
      default: 0
    },
    foods: {
      type: Number,
      default: 0
    },
    restrictions: {
      type: Number,
      default: 0
    },
    timing: {
      type: Number,
      default: 0
    }
  },
  chunksStored: {
    type: Number,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for active plans
nutritionPlanSchema.index({ isActive: 1, uploadedAt: -1 });

// Index for plan lookup
nutritionPlanSchema.index({ planId: 1 });

module.exports = mongoose.model('NutritionPlan', nutritionPlanSchema); 