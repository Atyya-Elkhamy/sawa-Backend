// services/gift.service.js

const httpStatus = require('http-status');
const { Gift, GiftTransaction } = require('../models');
const User = require('../models/user.model');
const ApiError = require('../utils/ApiError');
const { getStartOfToday, getStartOfWeek, getStartOfMonth } = require('../utils/timePeriods');
const hostActivityService = require('./agencies/hostActivity.service');
const userService = require('./user.service');

const chatService = require('./chat/chat.service');
const BoughtGifts = require('./boughtGifts.service');
const groupContributionService = require('./group/groupContribution.service');

/**
 * Create a new gift
 * @param {object} giftBody
 * @returns {Promise<Gift>}
 */
const createGift = async (giftBody) => {
  return Gift.create(giftBody);
};

/**
 * Get all gifts
 * @returns {Promise<Array<Gift>>}
 */
const getGifts = async () => {
  // Find all gifts that are not hidden and populate the category details
  // const GiftCategory = require('../models/giftCategory.model');
  // const categories = await GiftCategory.find();

  return Gift.find({ hidden: { $ne: true }, price: { $gt: 0 } })
    .select('name price image category type file duration')
    .populate('category', 'name nameAr -_id')
    .sort({ price: 1 });
};

/**
 * Get a gift by ID
 * @param {string} giftId
 * @returns {Promise<Gift>}
 */
const getGiftById = async (giftId) => {
  const gift = await Gift.findById(giftId);
  if (!gift) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Gift not found', 'الهدية غير موجودة');
  }
  return gift;
};

/**
 * Edit a gift
 * @param {string} giftId
 * @param {object} giftBody
 */
const editGift = async (giftId, giftBody) => {
  const gift = await Gift.findById(giftId);
  if (!gift) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Gift not found', 'الهدية غير موجودة');
  }

  Object.assign(gift, giftBody);
  await gift.save();
  return gift;
};

/**
 * Send a gift from one user to another
 * @param {ObjectId} senderId
 * @param {Array<ObjectId>} recipientIds
 * @param {ObjectId} giftId
 * @param {number} amount
 * @param {Gift} gift
 * @param {string} message
 * @param params
 * @returns {Promise<GiftTransaction>}
 */

const sendGift = async (
  senderId,
  recipientIds,
  giftId,
  amount = 1,
  gift,
  message = '',
  params = { groupId: null, roomId: null, fromChat: false, isFree: false }
) => {
  if (!gift) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Gift not found', 'الهدية غير موجودة');
  }
  gift.price *= amount;

  const sender = await User.findById(senderId).select('credits richPoints name avatar');
  if (!sender) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Sender not found', 'المرسل غير موجود');
  }

  // Check if sender has enough balance to send the gift to all recipients
  const totalCost = gift.price * recipientIds.length;
  if (!params.isFree && gift.price > 0) {

    if (sender.credits < totalCost) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient balance to send gift', 'رصيد غير كافي لإرسال الهدية');
    }
    // Deduct the total price of the gifts from the sender's credits
    await userService.deductUserBalance(senderId, totalCost, 'send gift', 'ارسال هدية');
    sender.richPoints += totalCost;
    await sender.save();
  } else {
    console.log('Gift is free');

    const boughtGit = await BoughtGifts.getGift(senderId, giftId);
    if (!boughtGit) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Gift not found in the user gift bag',
        'الهدية غير موجودة في حقيبة الهدايا'
      );
    }

    if (boughtGit.quantity < amount * recipientIds.length) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Gift quantity is not enough', 'كمية الهدية غير كافية');
    }

    boughtGit.quantity -= amount * recipientIds.length;
    await boughtGit.save();
  }

  // Prepare gift transactions for all recipients using Promise.all to run them concurrently
  const results = await Promise.all(
    recipientIds.map(async (recipientId) => {
      try {
        const recipient = await User.findById(recipientId).select('_id host credits famePoints name avatar userId group');
        if (!recipient) {
          // skip this recipient
          console.log('Recipient not found', recipientId);
          return {
            recipientId,
            message: 'Recipient not found',
            status: 'failed',
          };
        }
        console.log('Recipient:', recipient);
        if (recipient.host) {
          await hostActivityService.hostReceivedGift(recipient.host, gift.price);
        } else {
          const increasedCredits = gift.price * 0.3; // 30% of the gift price
          console.log(`user Credits will be increased${recipientId} ${increasedCredits}`);
          await userService.increaseUserBalance(recipientId, increasedCredits, 'receive gift', 'استلام هدية');
        }
        if (recipient.group) {
          await groupContributionService.addContribution(recipient._id, recipient.group, gift.price);
        }

        // send gift message to the recipient

        if (senderId != recipientId) {
          chatService.sendGiftMessage(senderId, recipientId, params.fromChat, {
            giftId,
            amount,
            body: gift.file,
            senderName: sender.name,
            senderAvatar: sender.avatar,
            giftImage: gift.image,
            duration: gift.duration || 0,
          });
        }

        recipient.famePoints += gift.price;
        recipient.save();

        // Create a gift transaction record
        const giftTransaction = await GiftTransaction.create({
          gift: giftId,
          sender: senderId,
          recipient: recipientId,
          price: gift.price,
          amount,
          room: params.roomId || null,
          group: params.groupId || null,
          message,
        });

        return {
          recipientId,
          giftTransaction,
          recipient: {
            id: recipient._id,
            _id: recipient._id,
            name: recipient.name,
            avatar: recipient.avatar,
            userId: recipient.userId,
          },
          status: 'success',
        };
      } catch (error) {
        return {
          recipientId,
          message: error.message,
          status: 'failed',
        };
      }
    })
  );

  return {
    results,
    remainingCredits: sender.credits,
    totalCost,
  };
};

/**
 * Get gift transaction history for a user
 * @param {ObjectId} userId
 * @returns {Promise<Array<GiftTransaction>>}
 */
const getGiftTransactionHistory = async (userId) => {
  const transactions = await GiftTransaction.find({ sender: userId }).populate('gift recipient', 'name avatar frame level');

  // Transform transactions to handle deleted recipients
  const transformedTransactions = userService.transformDeletedUsers(transactions, 'recipient');

  return transformedTransactions;
};
// services/leaderboardService.js

/**
 * Get Fame Points Leaderboard
 * @param {string} period - 'today', 'week', 'month'
 * @param params
 * @returns {Array} - Array of users with total famePoints
 */
const getFameLeaderboard = async (period, params) => {
  let startDate;
  switch (period) {
    case 'today':
      startDate = getStartOfToday();
      break;
    case 'week':
      startDate = getStartOfWeek();
      break;
    case 'month':
      startDate = getStartOfMonth();
      break;
    default:
      throw new Error('Invalid period specified.');
  }
  const page = parseInt(params.page, 10) || 1;
  const limit = parseInt(params.limit, 10) || 20;

  const skip = (page - 1) * limit;
  const pipeline = [
    {
      $match: {
        date: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$recipient',
        totalFamePoints: { $sum: '$price' }, // Assuming each gift's price contributes to famePoints
      },
    },
    {
      $sort: { totalFamePoints: -1 },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userDetails',
      },
    },
    {
      $unwind: '$userDetails',
    },
    {
      $project: {
        _id: 0,
        userId: '$userDetails.userId',
        name: '$userDetails.name',
        avatar: '$userDetails.avatar',
        totalFamePoints: 1,
      },
    },
    {
      $facet: {
        paginatedResults: [{ $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: 'count' }],
      },
    },
  ];

  const result = await GiftTransaction.aggregate(pipeline).exec();
  return {
    data: result[0].paginatedResults,
    totalUsers: result[0].totalCount[0].count,
  };
};

/**
 * Get Rich Points Leaderboard
 * @param {string} period - 'today', 'week', 'month'
 * @returns {Array} - Array of users with total richPoints
 */
const getRichLeaderboard = async (period) => {
  let startDate;
  switch (period) {
    case 'today':
      startDate = getStartOfToday();
      break;
    case 'week':
      startDate = getStartOfWeek();
      break;
    case 'month':
      startDate = getStartOfMonth();
      break;
    default:
      throw new Error('Invalid period specified.');
  }

  const pipeline = [
    {
      $match: {
        date: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$sender',
        totalRichPoints: { $sum: '$price' }, // Assuming each gift's price contributes to richPoints
      },
    },
    {
      $sort: { totalRichPoints: -1 },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userDetails',
      },
    },
    {
      $unwind: '$userDetails',
    },
    {
      $project: {
        _id: 0,
        userId: '$userDetails.userId',
        name: '$userDetails.name',
        avatar: '$userDetails.avatar',
        totalRichPoints: 1,
      },
    },
  ];

  const result = await GiftTransaction.aggregate(pipeline).exec();
  return result;
};

module.exports = {
  createGift,
  getGifts,
  sendGift,
  getGiftTransactionHistory,
  getFameLeaderboard,
  getRichLeaderboard,
  editGift,
  getGiftById,
};
