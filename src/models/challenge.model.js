const mongoose = require('mongoose');

const challengeSchema = mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    prizeAmount: {
      type: Number,
      required: true,
      min: 50,
      max: 200,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'expired', 'cancelled'],
      default: 'active',
    },
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    creatorChoice: {
      type: String,
      enum: ['rock', 'paper', 'scissors'],
      required: true,
    },
    acceptorChoice: {
      type: String,
      enum: ['rock', 'paper', 'scissors'],
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 30000), // 30 seconds from creation
    },
    isRefunded: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for quick lookups
challengeSchema.index({ roomId: 1, status: 1 });
challengeSchema.index({ expiresAt: 1, status: 1, isRefunded: 1 });
// Index for cleanup of old expired challenges
challengeSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 0 });

const Challenge = mongoose.model('Challenge', challengeSchema);

module.exports = Challenge;
