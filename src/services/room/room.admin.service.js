const { ObjectId } = require('mongoose').Types;
const httpStatus = require('http-status');
const Room = require('../../models/room/room.model');
const User = require('../../models/user.model');
const ApiError = require('../../utils/ApiError');
const generalRoomConfig = require('../../config/room/general.config');
const chatService = require('../chat/chat.service');
/**
 * Create a new room (only if the user does not already own a room)
 * @param {object} roomBody - Room data
 * @returns {Promise<Room>}
 */

const createRoom = async (roomBody) => {
  // 1. Enforce one-room-per-user rule (same logic)
  const existingRoom = await Room.findOne({ owner: roomBody.owner }).lean();
  if (existingRoom) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "User already owns a room",
      "المستخدم يمتلك بالفعل غرفة"
    );
  }
  // 2. Clean mics (same logic)
  if (Array.isArray(roomBody.mics)) {
    roomBody.mics = roomBody.mics.filter(
      (mic) => mic.micNumber != null && mic.micUserId != null
    );
  }
  // 3. Set default room type
  roomBody.roomType = roomBody.roomType || "classicRoom";
  try {
    // 4. Create room in ONE step (faster than new + save)
    const room = await Room.create(roomBody);
    // 5. Update user in ONE fast operation (no load, no save)
    await User.updateOne(
      { _id: room.owner },
      { $set: { room: room._id } }
    );
    return room;
  } catch (error) {
    // Same error handling
    if (error.code === 11000) {
      throw new ApiError(
        httpStatus.CONFLICT,
        "Duplicate key error: Room already exists or invalid field combination.",
        "حدث تعارض في البيانات. الغرفة موجودة بالفعل أو هناك قيم مكررة."
      );
    }
    throw error;
  }
};


/**
 * Get room by ID
 * @param {ObjectId} roomId
 * @returns {Promise<Room>}
 */

const getRoomById = async (roomId) => {
  const room = await Room.findById(roomId);
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة');
  }
  return room;
};

/**
 * Update room settings
 * @param {ObjectId} roomId - Room ID
 * @param {object} updateBody - Data to update
 * @returns {Promise<Room>}
 */

const updateRoomSettings = async (roomId, updateBody) => {
  const keys = Object.keys(updateBody);
  const room = await Room.findById(roomId).select(keys.join(' '));

  Object.keys(updateBody).forEach((key) => {
    const value = updateBody[key];
    if (value !== null && value !== undefined && value !== '') {
      room[key] = value;
    }
  });

  await room.save();
  return room;
};

/**
 * Add a moderator to the room
 * @param {string} roomId - The ID of the room
 * @param {string} userId - The ID of the user to be added as a moderator
 */

const addModerator = async (roomId, userId) => {
  const room = await Room.findById(roomId);

  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة');
  }

  // Check if the user is already a moderator
  if (room.moderators.includes(userId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User is already a moderator', 'المستخدم مشرف بالفعل');
  }

  // Check if the room already has 5 moderators
  if (room.moderators.length >= 5) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Maximum number of moderators reached (5)',
      'لقد تم الوصول إلى أقصى عدد من المشرفين (5)'
    );
  }

  // Add the user as a moderator
  room.moderators.push(userId);
  await room.save();

  const moderators = await User.find({ _id: { $in: room.moderators } }).select('name avatar userId _id');
  return moderators;
};

/**
 * Remove a moderator from the room
 * @param {string} roomId - The ID of the room
 * @param {string} userId - The ID of the user to be removed as a moderator
 */

const removeModerator = async (roomId, userId) => {
  const room = await Room.findById(roomId);

  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة');
  }

  // Check if the user is a moderator
  if (!room.moderators.includes(userId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User is not a moderator', 'المستخدم ليس مشرف');
  }

  // Remove the user from moderators
  room.moderators = room.moderators.filter((modId) => modId.toString() !== userId);
  await room.save();

  const moderators = await User.find({ _id: { $in: room.moderators } }).select('name avatar userId _id');
  return moderators;
};

const updateCurrentState = async (roomId, updateBody) => {
  const room = await Room.findById(roomId);

  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة');
  }

  // Update only the fields that are provided
  Object.keys(updateBody).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(room.currentState, key)) {
      if (updateBody[key] !== null) {
        room.currentState[key] = updateBody[key];
      }
    }
  });

  await room.save();
  return room;
};

const inviteUserToRoom = async (roomId, sender, receiver) => {
  const room = await Room.findById(roomId).select('name owner password isPrivate');
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة');
  }
  const user = await User.findById(receiver);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  let body = `You have been invited to join ${room.name} room.`;
  let bodyAr = `لقد تمت دعوتك للانضمام إلى غرفة ${room.name}`;
  if (room.isPrivate && room.password) {
    body = `You have been invited to join a private ${room.name} room. `;
    bodyAr = `لقد تمت دعوتك للانضمام إلى غرفة ${room.name} الخاصة.`;
  }
  const invitation = {
    body,
    bodyAr,
    invitationType: chatService.INVITATION_TYPES.ROOM,
    invitationId: roomId,
    roomId,
  };
  await chatService.sendInvitationMessage({
    senderId: sender,
    receiverId: receiver,
    invitation,
  });
  return true;
};
const setRoomPassword = async (roomId, password) => {
  const update = { password, isPrivate: true };
  if (!password || password.length === 0) {
    update.isPrivate = false;
  }

  const room = await Room.findByIdAndUpdate(roomId, update, { new: true });

  return room;
};
const setRoomGame = async (roomId, { gameLink, gameRoomId, gameImage }) => {
  const room = await Room.findById(roomId).select('gameLink gameRoomId gameImage _id');

  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة');
  }

  room.gameLink = gameLink;
  room.gameRoomId = gameRoomId;
  room.gameImage = gameImage;

  await room.save();
  return room;
};

module.exports = {
  createRoom,
  getRoomById,
  updateRoomSettings,
  addModerator,
  removeModerator,
  updateCurrentState,
  setRoomPassword,
  inviteUserToRoom,
  setRoomGame,
};
