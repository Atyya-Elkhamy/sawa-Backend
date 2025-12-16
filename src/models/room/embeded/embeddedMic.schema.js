const mongoose = require('mongoose');

const micSchema = new mongoose.Schema(
  {
    micNumber: {
      type: Number,
      required: true,
    },
    micUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    micUserName: {
      type: String,
      default: '',
    },
    micImage: {
      type: String,
      default: '',
    },
    micUserAvatarFrame: {
      type: String,
      default: '',
    },
    micUserCharsimaCount: {
      type: Number,
      default: 0,
    },
    micUserIsMale: {
      type: Boolean,
      default: true,
    },
    micEmoji: {
      type: String,
      default: '',
    },
    micEmojiDuration: {
      type: Number,
      default: 0,
    },
    roomMicState: {
      type: String,
      enum: ['noSpeaker', 'hasSpeaker', 'muted', 'locked'],
      default: 'noSpeaker',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    type: {
      type: String,
      enum: ['regular', 'host', 'vip', 'king', 'boss'],
      default: 'regular',
    },
    vipMicEffect: {
      type: String,
      default: '',
    },
    vipLevel: {
      type: Number,
      default: 0,
    },
    isPro: {
      type: Boolean,
      default: false,
    },
    isTopMic: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

module.exports = micSchema;
