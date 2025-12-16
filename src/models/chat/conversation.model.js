const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatMessage',
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    unreadCount: {
      type: Map,
      of: Number, // Track unread count for both participants (key is user ID)
    },
    // deletion date for each participant
    deletedAt: {
      type: Map,
      of: Date,
    },

    areFriends: {
      type: Boolean,
      default: false,
    },
    isSecure: {
      type: Boolean,
      default: false,
    },
    secureEnabledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    hidden: {
      type: Map,
      of: Boolean,
    },
    // Custom background for each user in the conversation
    background: {
      type: Map,
      of: String, // Store background URL for each user (key is user ID)
      default: new Map(),
    },
  },
  {
    timestamps: true,
    index: { participants: 1 }, // Ensures quick lookup for participants
  }
);

conversationSchema.methods.addUnreadCount = function (userId) {
  this.unreadCount.set(userId, (this.unreadCount.get(userId) || 0) + 1);
};

conversationSchema.methods.resetUnreadCount = function (userId) {
  this.unreadCount.set(userId, 0);
};

// Helper method to set a user's conversation background
conversationSchema.methods.setBackground = function (userId, backgroundUrl) {
  // if background is not set, initialize it
  if (!this.background) {
    this.background = new Map();
  }
  this.background.set(userId, backgroundUrl);
  console.log('setBackground', this.background);
};

// Helper method to get a user's conversation background
conversationSchema.methods.getBackground = function (userId) {
  // if background is not set, return null
  console.log('background', this.background);
  if (!this.background) {
    return null;
  }
  return this.background.get(userId) || null;
};

module.exports = mongoose.model('Conversation', conversationSchema);
