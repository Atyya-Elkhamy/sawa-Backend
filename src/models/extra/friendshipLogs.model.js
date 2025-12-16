const mongoose = require('mongoose');

const friendshipLogSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    friendId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    state: {
      type: String,
      enum: ['added', 'removed', 'active'],
      required: true,
    },
    remover: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Adding index for faster queries
/**
 * @typedef FriendshipLog
 */
const FriendshipLog = mongoose.model('FriendshipLog', friendshipLogSchema);

module.exports = FriendshipLog;
