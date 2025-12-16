const httpStatus = require('http-status');
const BoughtGift = require('../models/boughtGifts.model');
const ApiError = require('../utils/ApiError');

// Add gift method
const addGift = async (userId, giftId, quantity) => {
  try {
    let boughtGift = await BoughtGift.findOne({ user: userId, gift: giftId });

    if (boughtGift) {
      boughtGift.quantity += quantity;
    } else {
      boughtGift = new BoughtGift({ user: userId, gift: giftId, quantity });
    }

    await boughtGift.save();
    return boughtGift;
  } catch (error) {
    console.error('Error adding gift:', error.message);
  }
};

// Remove gift method
const removeGift = async (userId, giftId, quantity) => {
  try {
    const boughtGift = await BoughtGift.findOne({ user: userId, gift: giftId });

    if (!boughtGift) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Gift not found', 'الهدية غير موجودة');
    }

    if (boughtGift.quantity < quantity) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient quantity to remove', 'الكمية غير كافية للإزالة');
    }

    boughtGift.quantity -= quantity;

    if (boughtGift.quantity === 0) {
      await boughtGift.remove();
    } else {
      await boughtGift.save();
    }

    return boughtGift;
  } catch (error) {
    console.error('Error removing gift:', error.message);
  }
};

// Get all gifts for a user
const getGifts = async (userId) => {
  try {
    const boughtGifts = await BoughtGift.find({ user: userId })
      .populate('gift', 'name price image category type file  _id duration')
      .select('quantity gift');

    return boughtGifts.map((boughtGift) => ({
      quantity: boughtGift.quantity,
      ...boughtGift.gift?.toObject(),
    }));
  } catch (error) {
    console.error('Error getting gifts:', error.message);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Error getting gifts', 'خطأ في الحصول على الهدايا');
  }
};

// Get a specific gift for a user
const getGift = async (userId, giftId) => {
  try {
    const boughtGift = await BoughtGift.findOne({ user: userId, gift: giftId }).populate('gift');

    if (!boughtGift) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Gift not found', 'الهدية غير موجودة');
    }

    return boughtGift;
  } catch (error) {
    console.error('Error getting gift:', error.message);
    return null;
  }
};

module.exports = {
  addGift,
  removeGift,
  getGifts,
  getGift,
};
