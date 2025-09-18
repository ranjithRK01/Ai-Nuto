const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema(
  {
    chunkId: {
      type: String,
      required: true,
      unique: true,
    },
    planId: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
    },
    metadata: {
      sectionTitle: String,
      sectionIndex: Number,
      chunkIndex: Number,
      type: {
        type: String,
        enum: ['nutrition_chunk', 'general_chunk'],
        default: 'nutrition_chunk',
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
chunkSchema.index({ planId: 1, createdAt: -1 });
chunkSchema.index({ 'metadata.sectionTitle': 1 });
chunkSchema.index({ embedding: 1 }); // For vector search

// Text search index
chunkSchema.index({ text: 'text' });

module.exports = mongoose.model('Chunk', chunkSchema);
