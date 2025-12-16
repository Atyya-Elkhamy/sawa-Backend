const mongoose = require('mongoose');

const strangerGiftSchema = new mongoose.Schema(
  {
    gift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gift',
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    total: {
      type: Number,
      default: 1,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: {
        expires: '30d',
      },
    },
  },
  {
    timestamps: true,
  }
);

// index for the receiver
strangerGiftSchema.index({ receiverId: 1 });
// index for the sender
strangerGiftSchema.index({ senderId: 1 });
// compound index to speed up upsert lookups per receiver-sender-gift
strangerGiftSchema.index({ receiverId: 1, senderId: 1, gift: 1 });

strangerGiftSchema.statics.getUnreadCount = async function (userId) {
  const count = await this.countDocuments({
    receiverId: userId,
    isRead: false,
  });
  return count;
};

strangerGiftSchema.statics.getByUser = async function (userId) {
  console.log('userId', userId);
  const messages = await this.find({
    receiverId: new mongoose.Types.ObjectId(userId),
  })
    .populate({
      path: 'gift',
      select: 'name price file image duration',
    })
    .populate({
      path: 'senderId',
      select: 'userId name avatar',
      model: 'User',
    })
    // order by last activity so upserts rise to the top
    .sort({ updatedAt: -1 })
    .limit(100);
  // mark all gifts as read
  await this.updateMany({ receiverId: userId, isRead: false }, { isRead: true });
  // Transform the data to match the previous format
  const transformedMessages = messages.map((message) => ({
    user: {
      userId: message.senderId.userId,
      id: message.senderId._id,
      name: message.senderId.name,
      avatar: message.senderId.avatar,
    },
    gift: {
      giftId: message.gift._id,
      name: message.gift.name,
      price: message.gift.price,
      file: message.gift.file,
      image: message.gift.image,
      duration: message.gift.duration,
    },
    total: message.total,
  }));

  console.log('messages', transformedMessages);
  return transformedMessages;
};

const StrangerGift = mongoose.model('StrangerGift', strangerGiftSchema);

// Static method to delete stranger gifts when a gift is deleted
StrangerGift.deleteByGift = async function (giftId) {
  const result = await this.deleteMany({ gift: giftId });
  return result;
};

module.exports = StrangerGift;
