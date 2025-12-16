const { ObjectId } = require('mongoose').Types;
const httpStatus = require('http-status');
const Room = require('../../models/room/room.model');
const ApiError = require('../../utils/ApiError');
const userService = require('../user.service');
const roomConfig = require('../../config/room/general.config');
const generalRoomConfig = require('../../config/room/general.config');

/**
 * Purchase a special mic
 * @param {ObjectId} userId - ID of the user
 * @param {ObjectId} roomId - ID of the room
 * @param {string} micType - Type of the mic ('king', 'boss', 'vip')
 * @param {number} durationOption - Duration in days (e.g., 7, 15, 30)
 * @returns {Promise}
 */
const purchaseSpecialMic = async (userId, roomId, micType, durationOption = 7) => {
  // Verify room ownership
  const room = await Room.findById(roomId).select('specialMics');
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة');
  }

  // Validate micType
  if (!generalRoomConfig.specialMicEnum.includes(micType)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid mic type', 'نوع ميكروفون غير صالح');
  }

  // Calculate price and duration
  const micPrice = roomConfig.specialMicPrices[durationOption] || roomConfig.specialMicPrices[7];
  const duration = durationOption || 7;

  // Deduct credits
  await userService.deductUserBalance(
    userId,
    micPrice,
    `Purchase special mic ${micType} for ${duration} days`,
    `شراء ميكروفون خاص ${micType} لمدة ${duration} يوم`
  );

  // Calculate expiration date
  const now = new Date();
  const expirationDate = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);

  // Update or add special mic in the room
  const existingMic = room.specialMics.get(micType);

  if (existingMic) {
    // Extend expiration date if mic is not expired, accumulate the days
    if (existingMic.expirationDate > now) {
      existingMic.expirationDate = new Date(existingMic.expirationDate.getTime() + duration * 24 * 60 * 60 * 1000);
    } else {
      existingMic.expirationDate = expirationDate;
    }
    existingMic.purchased = true;
    existingMic.isActive = existingMic.isActive || false;

    room.specialMics.set(micType, existingMic);
  } else {
    // Add new special mic
    room.specialMics.set(micType, {
      expirationDate,
      isActive: false,
      purchased: true,
    });
  }

  await room.save();

  return {
    message: 'Special mic purchased successfully',
    messageAr: 'تم شراء الميكروفون الخاص بنجاح',
    specialMics: Object.fromEntries(room.specialMics), // Convert Map to Object for response
  };
};
/**
 * Toggle the activation state of a special mic
 * @param {string} userId - ID of the user
 * @param {string} roomId - ID of the room
 * @param {string} micType - Type of the mic to toggle
 */

const toggleSpecialMic = async (userId, roomId, micType) => {
  // Verify room ownership
  const room = await Room.findById(roomId).select('specialMics mics owner');
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة');
  }

  // Check if the user is the owner of the room

  // Validate micType
  if (!generalRoomConfig.specialMicEnum.includes(micType)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid mic type', 'نوع ميكروفون غير صالح');
  }

  // Get the special mic
  const mic = room.specialMics.get(micType);

  if (!mic || !mic.purchased) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Special mic not purchased', 'الميكروفون الخاص غير مشترى');
  }

  mic.isActive = !mic.isActive;

  // Check if mic has expired
  if (mic.expirationDate && mic.expirationDate < new Date()) {
    // Deactivate expired mic
    mic.isActive = false;
    mic.purchased = false;
    room.specialMics.set(micType, mic);
    await room.save();
    throw new ApiError(httpStatus.BAD_REQUEST, 'Special mic has expired', 'انتهت صلاحية الميكروفون الخاص');
  }

  await room.save();

  return {
    message: mic.isActive ? 'Special mic activated successfully' : 'Special mic deactivated successfully',
    messageAr: mic.isActive ? 'تم تفعيل الميكروفون الخاص بنجاح' : 'تم إلغاء تفعيل الميكروفون الخاص بنجاح',
    specialMics: Object.fromEntries(room.specialMics),
  };
};

module.exports = {
  // Other exports...
  toggleSpecialMic,
};

/**
 * Get special mics for a room
 * @param {string} roomId - ID of the room
 */
const getSpecialMics = async (roomId) => {
  const room = await Room.findById(roomId).select('specialMics');
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة');
  }

  return Object.fromEntries(room.specialMics);
};

module.exports = {
  purchaseSpecialMic,
  toggleSpecialMic,
  getSpecialMics,
};
