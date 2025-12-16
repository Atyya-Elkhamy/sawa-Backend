// controllers/gift.controller.js

const httpStatus = require('http-status');
const giftService = require('../services/gift.service');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const achievementService = require('../services/extra/achievement.service');
const roomService = require('../services/room/room.service');
const boughtGiftsService = require('../services/boughtGifts.service');
const messageSender = require('../services/chat/messageSender');
// Create a new gift
const createGift = catchAsync(async (req, res) => {
  const giftBody = req.body;
  if (req.files) {
    if (req.files.image) {
      giftBody.image = req.files.image[0].location;
    }
    if (req.files.file) {
      giftBody.file = req.files.file[0].location;
    }
  }
  const gift = await giftService.createGift(giftBody);
  res.status(httpStatus.CREATED).send(gift);
});
const editGift = catchAsync(async (req, res) => {
  const { giftId } = req.params;
  const giftBody = req.body;
  if (req.files) {
    if (req.files.image) {
      giftBody.image = req.files.image[0].location;
    }
    if (req.files.file) {
      giftBody.file = req.files.file[0].location;
    }
  }
  const gift = await giftService.editGift(giftId, giftBody);
  res.status(httpStatus.OK).send(gift);
});

// Get all gifts

const getGifts = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const gifts = await giftService.getGifts();
  const userBoughtGifts = await boughtGiftsService.getGifts(userId);

  const groupedGifts = gifts.reduce((acc, gift) => {
    const categoryIndex = acc.findIndex((category) => category.category === gift.category?.name);
    if (categoryIndex !== -1) {
      acc[categoryIndex].gifts.push(gift);
    } else {
      acc.push({
        category: gift.category?.name || "",
        categoryAr: gift.category?.nameAr || "",
        gifts: [gift],
      });
    }
    return acc;
  }, []);

  const myBagCategory = {
    category: 'mybag',
    categoryAr: 'حقيبتي',
    gifts: userBoughtGifts,
  };

  groupedGifts.push(myBagCategory);

  res.status(httpStatus.OK).send({
    gifts: groupedGifts,
  });
});

// Send a gift
const sendGift = catchAsync(async (req, res) => {
  const { giftId, recipientIds, message, amount } = req.body;
  const senderId = req.user._id; // Extracted from auth middleware
  const { groupId, roomId, isFree, fromChat } = req.query; // Optional query parameters
  const gift = await giftService.getGiftById(giftId);
  const giftPrice = gift.price;
  if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Recipient IDs are required and should be an array',
      'معرفات المستلمين مطلوبة ويجب أن تكون مصفوفة'
    );
  }

  const giftTransactionResults = await giftService.sendGift(senderId, recipientIds, giftId, amount, gift, message || '', {
    groupId,
    roomId,
    fromChat: fromChat === 'true',
    isFree: isFree === 'true'
  });
  await achievementService.recordAchievement(senderId, achievementService.actions.giftSent, {
    giftId,
    targetUser: recipientIds[0],
    roomId,
    giftValue: giftTransactionResults.totalCost,
  });

  if (roomId) {
    const rooomData = await roomService.incrementRoomCharizma(roomId, giftTransactionResults.totalCost);
    if (giftPrice * amount * 1 > 999 && rooomData) {
      const recipants = giftTransactionResults.results.map((result) => result.recipient);
      const giftData = gift;
      giftData.price = giftPrice;
      await messageSender.sendToAll(
        'specialGiftSent',
        {
          giftId,
          senderId,
          sender: {
            id: senderId,
            _id: senderId,
            name: req.user.name,
            avatar: req.user.avatar,
            userId: req.user.userId,
          },
          recipients: recipants,
          gift: giftData,
          roomId,
          room: {
            id: roomId,
            _id: roomId,
            name: rooomData.name,
            image: rooomData.image,
            roomType: rooomData.roomType,
            isPrivate: rooomData.isPrivate,
            background: rooomData.background,
          },
          amount,
        },
        false
      );
    }
  }
  // if gift price above 999 send io event
  res.status(httpStatus.CREATED).send(giftTransactionResults);
});

// Get gift transaction history for a user
const getGiftTransactionHistory = catchAsync(async (req, res) => {
  const transactions = await giftService.getGiftTransactionHistory(req.user._id);
  res.status(httpStatus.OK).send(transactions);
});

module.exports = {
  createGift,
  getGifts,
  sendGift,
  getGiftTransactionHistory,
  editGift,
};
