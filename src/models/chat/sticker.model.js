const mongoose = require('mongoose');

const stickerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      index: true, // For faster queries by category
    },
    image: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['free', 'pro', 'vip'],
      default: 'free',
      required: true,
    },
    file: {
      type: String,
      required: false,
      default: '',
    },
    vipLevel: {
      type: Number,
      required: false,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    duration: {
      type: Number,
      default: 0,
    }
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

module.exports = mongoose.model('Sticker', stickerSchema);
