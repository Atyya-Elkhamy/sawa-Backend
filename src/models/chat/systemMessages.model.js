const mongoose = require('mongoose');
const { calculatePagination } = require('../../utils/pagination');
const messageSender = require('../../services/chat/messageSender');

const systemMessageSchema = new mongoose.Schema(
  {
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required() {
        return this.senderType === 'individual';
      },
    },
    broadCastId: {
      type: String,
      default: null,
    },
    broadCastMain: {
      type: Boolean,
      default: false,
    },
    senderType: {
      type: String,
      enum: ['individual', 'broadcast', 'broadcastOnScreen'],
      default: 'individual',
    },
    content: {
      text: { type: String, required: true },
      textAr: { type: String, default: '' },
      imageUrl: { type: String, default: null },
      link: { type: String, default: null },
    },
    image: { type: String, default: null },
    createdAt: { type: Date, default: Date.now, index: { expires: '90d' } },
  },
  { timestamps: true }
);

// Indexes
systemMessageSchema.index({ receiverId: 1, createdAt: 1 });
systemMessageSchema.index({ senderType: 1, createdAt: 1 });
systemMessageSchema.index({ broadCastMain: 1, createdAt: 1 });

// Broadcast a message to all users
systemMessageSchema.statics.broadcastMessage = async function ({ content, broadCastId,messageId }) {

  // Send socket message to all users
  await messageSender.sendToAll(
    'SystemMessage-Broadcast',
    {
      content,
      createdAt: new Date(),
      broadCastId,
      messageId
    },
    true
  );

  return true;
};

// Static method to get unread message count for a user
systemMessageSchema.statics.getUnreadSystemMessagesCount = async function (userId, userLastReadAt = null) {
  const query = {
    $or: [
      { receiverId: userId, senderType: 'individual' },
      { senderType: 'broadcast'},
    ],
  };

  if (userLastReadAt) {
    query.createdAt = { $gt: userLastReadAt };
  }

  return this.countDocuments(query);
};

// Method to retrieve system messages by user and mark as read
systemMessageSchema.statics.getSystemMessagesByUser = async function (userId, userLastReadAt = null) {
  const messages = await this.find({
    $or: [
      { receiverId: userId, senderType: 'individual' },
      { senderType: 'broadcast' },
    ],
  }).sort({ createdAt: -1 });

  // Add isRead property to each message based on lastReadAt comparison
  const messagesWithReadStatus = messages.map((message) => {
    const messageObj = message.toObject();
    const isRead = userLastReadAt ? messageObj.createdAt <= userLastReadAt : true;

    return {
      ...messageObj,
      isRead,
    };
  });

  return messagesWithReadStatus;
};

// Paginate system messages
systemMessageSchema.statics.paginateSystemMessages = async function (userId, page = 1, limit = 10, userLastReadAt = null) {
  const messages = await this.find({
    $or: [
      { receiverId: userId, senderType: 'individual' },
      { senderType: 'broadcast'},
    ],
  })
    .select('content createdAt senderType broadCastId')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  console.log('system messagessss', messages);

  // Add isRead property to each message based on lastReadAt comparison
  const messagesWithReadStatus = messages.map((message) => {
    const messageObj = message.toObject();
    const isRead = userLastReadAt ? messageObj.createdAt <= userLastReadAt : true;

    return {
      ...messageObj,
      isRead,
    };
  });

  const total = await this.countDocuments({
    $or: [
      { receiverId: userId, senderType: 'individual' },
      { senderType: 'broadcast'},
    ],
  });

  const pagination = calculatePagination(total, page, limit);

  return {
    list: messagesWithReadStatus,
    ...pagination,
  };
};
systemMessageSchema.statics.broadcastOnScreen = async function ({ content }) {
  await messageSender.sendToAll(
    'SystemMessage-OnScreen',
    {
      content,
      createdAt: new Date(),
    },
    false
  );
};

systemMessageSchema.statics.sendMessage = async function ({ content, receiverId }) {
  if (receiverId) {
    await messageSender.sendToUser(
      'SystemMessage-individual',
      { content, createdAt: new Date() },
      receiverId?.toString(),
      true
    );
  }
};
const SystemMessage = mongoose.model('SystemMessage', systemMessageSchema);
module.exports = SystemMessage;
