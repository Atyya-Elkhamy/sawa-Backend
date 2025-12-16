const Room = require('../models/room/room.model');
const userService = require('./user.service');

/**
 * Get active participants in a room
 * @param {ObjectId} roomId - Room ID
 * @returns {Promise<object>}
 */
const getActiveParticipants = async (roomId) => {
  const room = await Room.findById(roomId)
    .populate('participants.user', 'name avatar')
    .populate('participantLogs.user', 'name avatar');

  if (!room) {
    throw new Error('Room not found');
  }

  // Transform room to handle deleted users
  const transformedRoom = userService.transformDeletedUsers(room, ['participants.user', 'participantLogs.user']);

  const activeParticipants = transformedRoom.participantLogs
    .filter((log) => log.leftAt === null)
    .map((log) => ({
      user: log.user,
      joinedAt: log.joinedAt,
    }));

  return {
    room: transformedRoom.name,
    activeParticipants,
  };
};

/**
 * Get historical join/leave data for participants
 * @param {ObjectId} roomId - Room ID
 * @returns {Promise<Array>}
 */
const getParticipantHistory = async (roomId) => {
  const room = await Room.findById(roomId).populate('participantLogs.user', 'name avatar');

  if (!room) {
    throw new Error('Room not found');
  }

  // Transform room to handle deleted users
  const transformedRoom = userService.transformDeletedUsers(room, 'participantLogs.user');

  return transformedRoom.participantLogs.map((log) => ({
    user: log.user,
    joinedAt: log.joinedAt,
    leftAt: log.leftAt,
  }));
};

module.exports = {
  getActiveParticipants,
  getParticipantHistory,
};
