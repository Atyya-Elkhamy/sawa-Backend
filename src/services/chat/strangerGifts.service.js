const StrangerGift = require('../../models/extra/strangerGift.model');

const getUnreadStrangerGiftsCount = async (userId) => {
  return StrangerGift.getUnreadCount(userId);
};

const getStrangerGiftsByUser = async (userId) => {
  const strangerGifts = await StrangerGift.getByUser(userId);
  // mark all gifts as read
  await StrangerGift.updateMany({ receiverId: userId, isRead: false }, { isRead: true });
  return strangerGifts;
};

module.exports = {
  getUnreadStrangerGiftsCount,
  getStrangerGiftsByUser,
};
