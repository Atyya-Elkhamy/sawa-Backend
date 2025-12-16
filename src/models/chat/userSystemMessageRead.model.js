const mongoose = require('mongoose');

const userSystemMessageReadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    lastReadAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
// Note: userId already has index due to unique: true

const UserSystemMessageRead = mongoose.model('UserSystemMessageRead', userSystemMessageReadSchema);
module.exports = UserSystemMessageRead;
