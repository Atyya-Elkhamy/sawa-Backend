const mongoose = require('mongoose');
const { MESSAGE_TYPES } = require('../../config/chat.config');

const chatMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    messageType: {
      type: String,
      enum: Object.values(MESSAGE_TYPES),
      required: true,
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // deletedFor: [
    //   {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'User',
    //   },
    // ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

chatMessageSchema.virtual('roomData', {
  ref: 'Room',
  localField: 'content.roomId',
  foreignField: '_id',
  justOne: true,
});

chatMessageSchema.pre('save', function (next) {
  const message = this;
  const { messageType, content } = message;
  try {
    switch (messageType) {
      case 'text':
        if (!content.body) throw new Error('Text content is required.');
        break;
      case 'image':
        if (!content.body) throw new Error('Image URL is required.');
        break;
      case 'gift':
        if (!content.body) throw new Error('Gift ID is required.');
        break;
      case 'emoji':
        if (!content.body) throw new Error('Sticker ID is required.');
        break;
      case 'voice':
        if (!content.body || !content.duration) throw new Error('Audio URL and duration are required.');
        break;
      case 'invitation':
        if (!content.invitationType || !content.invitationId) throw new Error('Invitation type and ID are required.');
        break;
      default:
        throw new Error('Invalid message type.');
    }
    next();
  } catch (error) {
    next(error);
  }
});

chatMessageSchema.index({ senderId: 1, receiverId: 1 });
chatMessageSchema.index({ receiverId: 1, isRead: 1, createdAt: 1 });
module.exports = mongoose.model('ChatMessage', chatMessageSchema);
