const mongoose = require('mongoose');

const roomBlockSchema = mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    blockedAt: {
      type: Date,
      default: Date.now,
    },
    permanent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure TTL works only for non-permanent blocks
roomBlockSchema.index({ blockedAt: 1 }, { expireAfterSeconds: 3600, partialFilterExpression: { permanent: false } });

const RoomBlock = mongoose.model('RoomBlock', roomBlockSchema);

module.exports = RoomBlock;
