const { ObjectId } = require('mongoose').Types;
const httpStatus = require('http-status');
const Room = require('../../models/room/room.model');
const User = require('../../models/user.model');
const ApiError = require('../../utils/ApiError');
const userService = require('../user.service');
const Participant = require('../../models/room/room.participants.model');
const { calculatePagination } = require('../../utils/pagination');
const { sendRoomUpdateToAllUsers } = require('../chat/messageSender');
const roomService = require('./room.service');
const deleteUserMics = require('./room.mics.service').deleteUserMics;
const resetRoomMics = require('./room.mics.service').resetRoomMics;

const participantJoined = async (roomId, userId, numOfParticipants) => {
  const user = await User.findByIdAndUpdate(userId, { currentRoom: roomId }, { new: true }).select('currentRoom room isSuperAdmin');
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  console.log('user', user);
  if (user.room == roomId) {
    console.log('user.room == roomId');
    await roomService.activateRoom(roomId);
  }
  const participantsCount = numOfParticipants > 0 ? numOfParticipants : 1;
  const room = await Room.findByIdAndUpdate(roomId, { participantsCount }, { new: true });
  // add participant record in Participants collection and check if it was there before or not before adding
  // hidden
  if (user.isSuperAdmin && user.room != roomId) {
    return true;
  }
  console.log('adding participant record for user', userId, 'in room', roomId);
  await Participant.updateOne(
    { roomId, userId },
    { $setOnInsert: { joinedAt: new Date(), role: 'member' } },
    { upsert: true }
  );

};
/**
 * Participant joins the room
 * @param {ObjectId} roomId - Room ID
 * @param {ObjectId} userId - User ID of the participant
 * @param {string} [password] - Password for private rooms
 * @param {boolean} [isSuperAdmin] - Whether the user is a super admin
 * @returns {Promise<Room>}
 */

const participantJoin = async (roomId, userId, password = '', isSuperAdmin = false) => {
  const room = await Room.findById(roomId).select('owner moderators isPrivate password status');
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة');
  }
  const ownerId = room.owner;
  if (!isSuperAdmin) {
    await userService.isBlocked(ownerId, userId, true);
  }
  let userState = 'member';
  let isModerator = false;
  if (ownerId.equals(userId) || isSuperAdmin) {
    userState = 'host';
    isModerator = true;
  }
  if (room.status !== 'active' && !isModerator) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Room is empty', 'الغرفة فارغة');
  }
  if (!isModerator) {
    const isMod = room.moderators.map(mod => mod.toString()).includes(userId.toString());
    if (isMod) {
      userState = 'moderator';
      isModerator = true;
    }
  }
  if (room.isPrivate && userState !== 'host') {
    // Only check password for non-host users
    if (room.password && room.password !== password) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect password', 'كلمة المرور غير صحيحة');
    }
  }
  await Participant.findOneAndUpdate(
    { roomId, userId },
    {
      roomId,
      userId,
      role: userState,
      joinedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return { isModerator, userState, ownerId };
};
// add user to the room

/**
 * Participant leaves the room
 * @param {ObjectId} roomId - Room ID
 * @param {ObjectId} userId - User ID of the participant
 * @returns {Promise<Room>}
 */

// const participantLeave = async (roomId, userId, numOfParticipants = 0) => {
//   const participantsCount = Math.max(numOfParticipants, 0);
//   // Use Promise.all to parallelize independent DB operations
//   const [participant] = await Promise.all([
//     User.findOneAndUpdate(
//       { _id: userId },
//       { $unset: { currentRoom: "" } },
//       { select: "currentRoom room" }
//     ),
//     Room.findByIdAndUpdate(roomId, { participantsCount }, { new: true }),
//     Participant.deleteMany({ roomId, userId }),
//   ]);
//   if (!participant) {
//     throw new ApiError(httpStatus.NOT_FOUND, "Participant not found", "المشارك غير موجود");
//   }
//   try {
//     await deleteUserMics(roomId, userId);
//   } catch (err) {
//     // Don’t crash the flow if the user already has no mic
//     if (err.message.includes("User has no mics")) {
//       console.warn(`User ${userId} already had no mic in room ${roomId}`);
//     } else {
//       console.error("Error deleting user mic:", err);
//     }
//   }
//   // Only deactivate after other operations finish
//   if (participantsCount === 0) {
//     // Run deactivate in the background (non-blocking)
//     roomService.deactivateRoom(roomId).catch((err) =>
//       console.error("Room deactivation failed:", err)
//     );
//   }
//   return true;
// };

const participantLeave = async (roomId, userId, numOfParticipants = 0) => {
  const participantsCount = Math.max(numOfParticipants, 0);
  // Update participant info, room count, and remove participant record in parallel
  const [participant, room] = await Promise.all([
    User.findOneAndUpdate(
      { _id: userId },
      { $unset: { currentRoom: "" } },
      { select: "currentRoom room" }
    ),
    Room.findByIdAndUpdate(roomId, { participantsCount }, { new: true }),
    Participant.deleteMany({ roomId, userId }),
  ]);
  if (!participant) {
    throw new ApiError(httpStatus.NOT_FOUND, "Participant not found", "المشارك غير موجود");
  }
  // Delete mics of this specific user
  try {
    await deleteUserMics(roomId, userId);
  } catch (err) {
    if (err.message.includes("User has no mics")) {
      console.warn(`User ${userId} already had no mic in room ${roomId}`);
    } else {
      console.error("Error deleting user mic:", err);
    }
  }
  // If no participants remain, clear all mics and deactivate room
  if (participantsCount === 0 && room) {
    try {
      const cacheKey = `room_mics:${roomId}`;
      room.mics = []; // Clear all mics
      await room.save();
      // Update Redis cache
      await redisClient.del(cacheKey);
      await redisClient.set(cacheKey, JSON.stringify(room.mics), { EX: 60 });
      console.log(`All mics cleared in room ${roomId} as it has no participants`);
    } catch (err) {
      console.error("Error clearing all room mics:", err);
    }
    // Deactivate room in background
    roomService.deactivateRoom(roomId).catch(err =>
      console.error("Room deactivation failed:", err)
    );
  }

  return true;
};


/**
 * Block a user from the room
 * @param {ObjectId} roomId - Room ID
 * @param {ObjectId} userId - User ID of the user to be blocked
 * @returns {Promise<Room>}
 */

const blockUser = async (roomId, userId) => {
  const room = await Room.findById(roomId);
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة');
  }
  room.blockedUsers.push(userId);
  // Remove the user from participants if they are already in the room
  room.participants = room.participants.filter((p) => p.user.toString() !== userId.toString());
  await room.save();
  return room;
};

/**
 * Unblock a user from the room
 * @param {ObjectId} roomId - Room ID
 * @param {ObjectId} userId - User ID of the user to be unblocked
 * @returns {Promise<Room>}
 */

const unblockUser = async (roomId, userId) => {
  const room = await Room.findById(roomId);
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة');
  }
  room.blockedUsers = room.blockedUsers.filter((id) => id.toString() !== userId.toString());
  await room.save();
  return room;
};

const getRoomParticipants = async (roomId, page = 1, limit = 20) => {
  const participants = await Participant.find({ roomId })
    .populate('userId', userService.userProjection)
    .limit(limit)
    .skip((page - 1) * limit);
  // Transform participants to handle deleted users
  const transformedParticipants = userService.transformDeletedUsers(participants, 'userId');
  const total = await Participant.countDocuments({ roomId });
  const pagination = calculatePagination(total, page, limit);
  return { participants: transformedParticipants, ...pagination };
};

module.exports = {
  participantJoin,
  participantLeave,
  blockUser,
  unblockUser,
  getRoomParticipants,
  participantJoined,
};
