const mongoose = require('mongoose');

const achievementSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: ['login', 'giftSent', 'roomEntry', 'microphone', 'follow', 'follower', 'games'],
      required: true,
    },
    points: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    // Additional data based on the action
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: () => {
        return this.action === 'follow' || this.action === 'follower';
      },
    },
    giftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gift',
      required: () => {
        return this.action === 'giftSent';
      },
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: () => {
        return this.action === 'roomEntry' || this.action === 'microphone';
      },
    },
    isDuplicate: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Prevent duplicate achievements for actions like follow
achievementSchema.index({ user: 1 });

const Achievement = mongoose.model('Achievement', achievementSchema);

// Static method to delete achievements when a gift is deleted
Achievement.deleteByGift = async function (giftId) {
  const result = await this.deleteMany({ giftId });
  return result;
};

module.exports = Achievement;
