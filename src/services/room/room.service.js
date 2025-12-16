const { ObjectId } = require('mongoose').Types;
const httpStatus = require('http-status');
const Room = require('../../models/room/room.model');
const User = require('../../models/user.model');
const ApiError = require('../../utils/ApiError');
const Follow = require('../../models/relations/follow.model');
const { Game } = require('../../models');
const logger = require('../../config/logger');
const userService = require('../user.service');
const groupContributionService = require('../group/groupContribution.service');
const { calculatePagination } = require('../../utils/pagination');
const messageSender = require('../chat/messageSender');
const generalRoomConfig = require('../../config/room/general.config');
const profileService = require('../profile.service');
const Participant = require('../../models/room/room.participants.model');
const { redisClient } = require('../../config/redis');
const roomProjection = ` _id name roomType roomCountryCode pkBattleModel.pkMicsCount subject image announce background micShape totalCharizmaCount owner moderators
  currentState specialMics gameImage gameRoomId gameLink purchasedRoomTypes isPrivate roomFrame isBlocked isConstant constantRank
`;

const roomJoinProjection = ` _id name roomType roomCountryCode pkBattleModel subject image announce background micShape totalCharizmaCount owner moderators
  currentState specialMics gameImage gameRoomId gameLink purchasedRoomTypes isPrivate roomFrame isBlocked isConstant constantRank
`;


const roomHomeProjection = `participantsCount image subject name gameRoomId gameImage gameLink roomType isPrivate background totalCharizmaCount roomFrame micShape createdAt currentState.hostMicEnabled isConstant constantRank`;

/**
 * Get room by ID
 * @param {ObjectId} roomId
 * @returns {Promise<Room>}
 */

// const getRoomById = async (roomId, accessLevel = 'participant') => {
//   let additionalFields = '';
//   if (accessLevel === 'moderator') {
//     additionalFields += 'streamKey';
//   }
//   const room = await Room.findById(roomId)
//     .select(`${roomJoinProjection} ${additionalFields}`)
//     .populate([
//       {
//         path: 'owner',
//         select: `${userService.userProjection} pro`,
//       },
//       {
//         path: 'moderators',
//         select: 'name avatar userId _id',
//       },
//     ]);
//   if (!room) {
//     throw new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة');
//   }

//   // Check if current room type requires pro access and validate owner's pro status
//   const currentRoomType = generalRoomConfig.RoomTypes[room.roomType];
//   if (currentRoomType && currentRoomType.isPro) {
//     const isValid = await profileService.checkProValidity(room.owner.pro);
//     if (!isValid) {
//       console.log(`Room ${roomId} owner lost pro access, resetting room type to classicRoom`);
//       room.roomType = 'classicRoom';
//       await room.save();
//     }
//   }

//   // add roomId to the room object and convert to JSON
//   const roomJson = room.toJSON();
//   roomJson.roomId = roomJson.owner.userId;

//   return {
//     room: roomJson,
//   };
// };

const getRoomById = async (roomId, accessLevel = 'participant') => {
  const selectFields =
    accessLevel === 'moderator'
      ? `${roomJoinProjection} streamKey`
      : roomJoinProjection;
  let room = await Room.findById(roomId)
    .select(selectFields)
    .populate([
      {
        path: 'owner',
        select: `${userService.userProjection} pro`,
        options: { lean: true },
      },
      {
        path: 'moderators',
        select: 'name avatar userId _id',
        options: { lean: true },
      },
    ])
    .lean();
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة');
  }
  const currentRoomType = generalRoomConfig.RoomTypes[room.roomType];
  if (currentRoomType?.isPro) {
    const isValid = await profileService.checkProValidity(room.owner.pro);
    if (!isValid) {
      console.log(
        `Room ${roomId} owner lost pro access, resetting room type to classicRoom`
      );
      await Room.updateOne(
        { _id: roomId },
        { $set: { roomType: 'classicRoom' } }
      );
      room.roomType = 'classicRoom';
    }
  }
  room.roomId = room.owner.userId;
  return { room };
};


const checkRoomExists = async (roomId) => {
  const room = await Room.findById(roomId).select('id name image background _id  isPrivate roomType roomFrame').lean();
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة');
  }
  return room;
};

const incrementRoomCharizma = async (roomId, amount) => {
  const count = Number(amount);
  console.log('count', count);

  const room = await Room.findByIdAndUpdate(roomId, { $inc: { totalCharizmaCount: count } }, { new: true })
    .select('totalCharizmaCount owner name image roomType isPrivate background')
    .populate('owner', 'group');
  if (!room) {
    console.log('room not found');
    return;
  }
  return room;
};
// Helper for pagination

const getTrendingRooms = async (page = 1, limit = 10, countryCode = '') => {
  const MinutesAgo = new Date(Date.now() - 1 * 60 * 1000);
  const matchStage = { status: 'active' };
  if (countryCode) {
    matchStage.roomCountryCode = countryCode;
  }
  const trendingRooms = await Room.aggregate([
    { $match: matchStage },
    {
      $lookup: {
        from: 'gifttransactions',
        let: { roomId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$room', '$$roomId'] } } },
          { $match: { date: { $gte: MinutesAgo } } },
          {
            $group: {
              _id: null,
              totalGifts: { $sum: '$price' },
              giftCount: { $sum: 1 },
            },
          },
        ],
        as: 'recentGifts',
      },
    },
    {
      $addFields: {
        totalGifts: {
          $ifNull: [{ $arrayElemAt: ['$recentGifts.totalGifts', 0] }, 0],
        },
        giftCount: {
          $ifNull: [{ $arrayElemAt: ['$recentGifts.giftCount', 0] }, 0],
        },
        trendScore: {
          $ifNull: [{ $arrayElemAt: ['$recentGifts.totalGifts', 0] }, 0],
        },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'owner',
        foreignField: '_id',
        as: 'owner',
      },
    },
    { $unwind: '$owner' },
    {
      $project: {
        _id: 1,
        id: '$_id',
        name: 1,
        participantsCount: 1,
        totalGifts: 1,
        giftCount: 1,
        trendScore: 1,
        image: 1,
        subject: 1,
        gameImage: 1,
        roomType: 1,
        background: 1,
        totalCharizmaCount: 1,
        isPrivate: 1,
        roomFrame: 1,
        createdAt: 1,
        isConstant: 1,
        constantRank: 1,
        'currentState.hostMicEnabled': 1,
        'pkBattleModel.pkMicsCount': 1,
        micShape: 1,
        roomCountryCode: 1,
        'owner._id': 1,
        'owner.name': 1,
        'owner.avatar': 1,
        'owner.userId': 1,
      },
    },
  ]);
  // Separate constant and regular rooms
  const constantRooms = trendingRooms.filter((room) => room.isConstant);
  const regularRooms = trendingRooms.filter((room) => !room.isConstant);
  // Sort regular rooms
  regularRooms.sort((a, b) => {
    if (a.isPrivate !== b.isPrivate) return a.isPrivate - b.isPrivate; // public first
    if (a.totalGifts !== b.totalGifts) return b.totalGifts - a.totalGifts; // high gifts first
    if (a.participantsCount !== b.participantsCount)
      return b.participantsCount - a.participantsCount; // more participants first
    if (a.createdAt !== b.createdAt) return new Date(b.createdAt) - new Date(a.createdAt);
    return a._id.toString().localeCompare(b._id.toString());
  });
  // Sort constant rooms by rank
  constantRooms.sort((a, b) => a.constantRank - b.constantRank);
  const totalRooms = constantRooms.length + regularRooms.length;
  const adjustedConstantRooms = new Map();
  constantRooms.forEach((room) => {
    let targetRank = room.constantRank;
    if (targetRank > totalRooms) targetRank = totalRooms;
    while (adjustedConstantRooms.has(targetRank) && targetRank > 0) {
      targetRank--;
    }
    if (targetRank > 0) adjustedConstantRooms.set(targetRank, room);
  });
  const allProcessedRooms = [];
  let regularRoomIndex = 0;
  for (let position = 1; position <= totalRooms; position++) {
    if (adjustedConstantRooms.has(position)) {
      allProcessedRooms.push(adjustedConstantRooms.get(position));
    } else if (regularRoomIndex < regularRooms.length) {
      allProcessedRooms.push(regularRooms[regularRoomIndex]);
      regularRoomIndex++;
    }
  }
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const finalRooms = allProcessedRooms.slice(startIndex, endIndex);
  const pagination = calculatePagination(totalRooms, page, limit);
  return { rooms: finalRooms, pagination };
};

const getNewRooms = async (page = 1, limit = 10, countryCode = '') => {
  // Only include rooms created within the last month
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const MinutesAgo = new Date(Date.now() - 1 * 60 * 1000);
  const matchStage = {
    status: 'active',
    isConstant: { $ne: true },
    createdAt: { $gte: monthAgo },
  };
  if (countryCode) {
    matchStage.roomCountryCode = countryCode;
  }
  const newRooms = await Room.aggregate([
    { $match: matchStage },
    {
      $lookup: {
        from: 'gifttransactions',
        let: { roomId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$room', '$$roomId'] } } },
          { $match: { date: { $gte: MinutesAgo } } },
          {
            $group: {
              _id: null,
              totalGifts: { $sum: '$price' },
              giftCount: { $sum: 1 },
            },
          },
        ],
        as: 'recentGifts',
      },
    },
    {
      $addFields: {
        totalGifts: { $ifNull: [{ $arrayElemAt: ['$recentGifts.totalGifts', 0] }, 0] },
        giftCount: { $ifNull: [{ $arrayElemAt: ['$recentGifts.giftCount', 0] }, 0] },
      },
    },
    // Keep trendScore equal to totalGifts for consistency with trending
    { $addFields: { trendScore: '$totalGifts' } },
    {
      $lookup: {
        from: 'users',
        localField: 'owner',
        foreignField: '_id',
        as: 'owner',
      },
    },
    { $unwind: '$owner' },
    {
      $project: {
        _id: 1,
        id: '$_id',
        name: 1,
        participantsCount: 1,
        totalGifts: 1,
        giftCount: 1,
        trendScore: 1,
        image: 1,
        subject: 1,
        gameImage: 1,
        roomType: 1,
        background: 1,
        totalCharizmaCount: 1,
        isPrivate: 1,
        roomFrame: 1,
        createdAt: 1,
        'currentState.hostMicEnabled': 1,
        'bpkBattleModel.pkMicsCount': 1,
        micShape: 1,
        'owner._id': 1,
        'owner.name': 1,
        'owner.avatar': 1,
        'owner.userId': 1,
      },
    },
    // Same ordering as trending: public first, then totalGifts, then participants, then recency and stable tie-breaker
    { $sort: { isPrivate: 1, totalGifts: -1, participantsCount: -1, createdAt: -1, _id: -1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit },
  ]);
  // count of rooms created within last month (same filter used in $match)
  const total = await Room.countDocuments(matchStage);
  const pagination = calculatePagination(total, page, limit);
  return {
    rooms: newRooms,
    pagination,
  };
};

const getMyFollowedRooms = async (userId = null, page = 1, limit = 10, countryCode = '') => {
  // Check if userId is provided
  if (!userId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User ID is required', 'رقم تعريف المستخدم مطلوب');
  }
  // Verify the user exists
  const userExists = await User.exists({ _id: userId });
  if (!userExists) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  // Get the list of user IDs that the user is following
  const followingRecords = await Follow.find({ follower: userId }).select('following');
  const followedIds = followingRecords.map((follow) => follow.following);
  if (followedIds.length === 0) {
    // If the user is not following anyone, return an empty array
    const pagination = calculatePagination(0, page, limit);
    return {
      rooms: [],
      pagination,
    };
  }
  // Followed rooms should use the same trending criteria; restrict to owners followed by the user
  const MinutesAgo = new Date(Date.now() - 1 * 60 * 1000);
  const matchStage = {
    owner: { $in: followedIds },
    status: 'active',
  };
  if (countryCode) {
    matchStage.roomCountryCode = countryCode;
  }
  const followedRooms = await Room.aggregate([
    { $match: matchStage },
    {
      $lookup: {
        from: 'gifttransactions',
        let: { roomId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$room', '$$roomId'] } } },
          { $match: { date: { $gte: MinutesAgo } } },
          {
            $group: {
              _id: null,
              totalGifts: { $sum: '$price' },
              giftCount: { $sum: 1 },
            },
          },
        ],
        as: 'recentGifts',
      },
    },
    {
      $addFields: {
        totalGifts: { $ifNull: [{ $arrayElemAt: ['$recentGifts.totalGifts', 0] }, 0] },
        giftCount: { $ifNull: [{ $arrayElemAt: ['$recentGifts.giftCount', 0] }, 0] },
      },
    },
    // Keep trendScore equal to totalGifts for consistency with trending
    { $addFields: { trendScore: '$totalGifts' } },
    {
      $lookup: {
        from: 'users',
        localField: 'owner',
        foreignField: '_id',
        as: 'owner',
      },
    },
    { $unwind: '$owner' },
    {
      $project: {
        _id: 1,
        id: '$_id',
        name: 1,
        participantsCount: 1,
        totalGifts: 1,
        giftCount: 1,
        trendScore: 1,
        image: 1,
        subject: 1,
        gameImage: 1,
        roomType: 1,
        background: 1,
        totalCharizmaCount: 1,
        isPrivate: 1,
        roomFrame: 1,
        micShape: 1,
        'currentState.hostMicEnabled': 1,
        'pkBattleModel.pkMicsCount': 1,
        createdAt: 1,
        'owner._id': 1,
        'owner.name': 1,
        'owner.avatar': 1,
        'owner.userId': 1,
      },
    },
    { $sort: { isPrivate: 1, totalGifts: -1, participantsCount: -1, createdAt: -1, _id: -1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit },
  ]);
  const total = await Room.countDocuments(matchStage);
  const pagination = calculatePagination(total, page, limit);
  return {
    rooms: followedRooms,
    pagination,
  };
};

const getGameRooms = async (page = 1, limit = 10, countryCode = '') => {
  const matchStage = {
    gameRoomId: { $exists: true, $ne: "" },
    gameLink: { $exists: true, $ne: "" },
    gameImage: { $exists: true, $ne: "" },
    status: 'active',
  };
  if (countryCode) {
    matchStage.roomCountryCode = countryCode;
  }
  const gameRooms = await Room.find(matchStage)
    .select(`${roomHomeProjection} owner`)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('owner', 'name avatar userId');
  // Transform rooms to handle deleted owners
  const transformedRooms = userService.transformDeletedUsers(gameRooms, 'owner');
  const total = await Room.countDocuments(matchStage);
  const pagination = calculatePagination(total, page, limit);
  return {
    rooms: transformedRooms,
    pagination,
  };
};

const getModerators = async (roomId) => {
  const room = await Room.findById(roomId);
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة');
  }
  const moderators = await User.find({ _id: { $in: room.moderators } }).select('name avatar userId _id');
  return moderators;
};

const setRoomGame = async (roomId, gameId, roomGameId) => {
  const room = await Room.findById(roomId).select('gameImage gameRoomId ');
  if (!roomGameId) {
    // set game image to null
    room.gameImage = '';
    room.gameRoomId = '';
    await room.save();
    return room;
  }
  const game = await Game.findById(gameId).select('image');
  if (!game) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Game not found', 'اللعبة غير موجودة');
  }
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة');
  }
  room.gameImage = game.image;
  room.gameRoomId = roomGameId;
  await room.save();
  return room;
};

const joinGame = async (roomId, gameId) => {
  console.log('roomId', roomId);
  console.log('gameId', gameId);
  const room = await Room.findById(roomId).select('gameImage gameRoomId owner').populate('owner', 'userId');
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة');
  }
  const game = await Game.findById(gameId).select('image');
  if (!game) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Game not found', 'اللعبة غير موجودة');
  }
  console.log('room.owner', room.owner);
  const userId = room.owner?.userId;
  room.gameImage = game.image;
  room.gameRoomId = userId;
  await room.save();
  return room;
};

const deactivateRoom = async (roomId) => {
  try {
    if (!ObjectId.isValid(roomId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid room ID', 'رقم تعريف الغرفة غير صالح');
    }
    const room = await Room.findById(roomId).select('isConstant name').lean();
    if (room?.isConstant) {
      logger.info(`Not deactivating constant room: ${room.name} (${roomId})`);
      return room;
    }
    // ---- CLEANUPS ------------------------------------
    // 1. Remove participants
    // 2. Remove mics, special mics, and PK model (embedded in Room)
    // ---------------------------------------------------
    const [updatedRoom] = await Promise.all([
      Room.findByIdAndUpdate(
        roomId,
        {
          $set: {
            status: 'inactive',
            participantsCount: 0,
            mics: [],
            specialMics: {},
            pkBattleModel: null,
            isPkEnabled: false,
            gameImage: '',
            gameRoomId: '',
            gameLink: '',
          },
        },
        { new: true, lean: true }
      ),
      Participant.deleteMany({ room: roomId }),
    ]);
    if (!updatedRoom) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة');
    }
    // ---- SOCKET NOTIFICATION ------------------------------------
    messageSender.sendToAll('Room-Deactivated', { roomId }, false);
    // ---- CACHE INVALIDATION -------------------------------------
    await redisClient.del(`room:${roomId}:*`);
    return updatedRoom;
  } catch (error) {
    logger.error(`Error deactivating room ${roomId}: ${error.message}`);
    throw error;
  }
};


const activateRoom = async (roomId) => {
  logger.info(`Activating room${roomId}`);
  const room = await Room.findByIdAndUpdate(
    roomId,
    { status: 'active' },
    {
      new: true,
    }
  );
  console.log('room', room);
};

// decrease room charizma count by 40% weekly for all rooms
const resetRoomCharizmaCount = async () => {
  try {
    // Decrease totalCharizmaCount by 40% (multiply by 0.6) for all rooms
    const result = await Room.updateMany(
      { status: 'active' }, // Only update active rooms
      [
        {
          $set: {
            totalCharizmaCount: {
              $floor: {
                $multiply: ['$totalCharizmaCount', 0.6]
              }
            }
          }
        }
      ]
    );
    logger.info(`Weekly room charizma count decrease completed. Updated ${result.modifiedCount} rooms.`);
    return result;
  } catch (error) {
    logger.error('Error decreasing room charizma count:', error.message);
    throw error;
  }
};

/**
 * Get active rooms where the specified user IDs are owners
 * @param {Array<string|ObjectId>} ownerIds - Array of user IDs who are room owners
 * @returns {Promise<object>} - Object containing rooms array
 */
const getRoomsByOwnerIds = async (ownerIds) => {
  if (!ownerIds || !Array.isArray(ownerIds) || ownerIds.length === 0) {
    return [];
  }
  // Convert string IDs to ObjectId if needed
  const validOwnerIds = ownerIds
    .map((id) => {
      try {
        return typeof id === 'string' ? new ObjectId(id) : id;
      } catch (error) {
        logger.error(`Invalid ID format: ${id}`);
        return null;
      }
    })
    .filter(Boolean); // Remove any null values from invalid IDs
  if (validOwnerIds.length === 0) {
    return {
      rooms: [],
    };
  }
  // Build match criteria
  const matchStage = {
    owner: { $in: validOwnerIds },
    status: 'active',
  };
  // Get rooms where the owners match the specified IDs
  const rooms = await Room.find(matchStage)
    .select(`${roomHomeProjection} owner`)
    .sort({ createdAt: -1 })
    .populate('owner', 'name avatar userId _id')
    .lean();
  // Transform rooms to handle deleted owners
  const transformedRooms = userService.transformDeletedUsers(rooms, 'owner');
  return transformedRooms;
};

// update room frame
/*
 * @param {ObjectId} userId - User ID of the room owner
 * @param {string} frameUrl - URL of the frame
 * @returns {Promise<Room>} - Updated room object
 */

const updateRoomFrame = async (userId, frameUrl, duration = null) => {
  const room = await Room.findOne({ owner: userId }).select('roomFrame');
  if (!room) return null;
  // === Handle toggle (if same frame is selected again) ===
  if (room.roomFrame?.url === frameUrl) {
    room.roomFrame = { url: '', expirationDate: null };
    await room.save();
    return room;
  }
  // === Compute expiration dynamically ===
  let expirationDate;
  if (duration instanceof Date) {
    // If a Date object is passed directly
    expirationDate = duration;
  } else if (typeof duration === 'number') {
    // Duration in minutes
    expirationDate = new Date(Date.now() + duration * 60 * 1000);
  } else {
    // Default: 7 days
    expirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  // === Apply frame ===
  room.roomFrame = {
    url: frameUrl,
    expirationDate,
  };
  await room.save();
  return room;
};


// Remove any applied room frame for the user's room
const clearRoomFrame = async (userId) => {
  const room = await Room.findOne({ owner: userId }).select('roomFrame');
  if (!room) return null;
  room.roomFrame.url = '';
  room.roomFrame.expirationDate = new Date();
  await room.save();
  return room;
};

/**
 * Create a constant room with fixed ranking
 * @param {Object} roomData - Room data
 * @param {number} constantRank - Fixed ranking position
 * @returns {Promise<Room>}
 */
const createConstantRoom = async (roomData, constantRank) => {
  const room = new Room({
    ...roomData,
    isConstant: true,
    constantRank: constantRank,
    status: 'active', // Constant rooms are always active
  });
  await room.save();
  return room;
};

/**
 * Update constant room ranking
 * @param {ObjectId} roomId - Room ID
 * @param {number} constantRank - New ranking position
 * @returns {Promise<Room>}
 */
const updateConstantRoomRank = async (roomId, constantRank) => {
  const room = await Room.findByIdAndUpdate(
    roomId,
    { constantRank },
    { new: true }
  );
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found');
  }
  return room;
};

/**
 * Get all constant rooms ordered by rank
 * @returns {Promise<Room[]>}
 */
const getConstantRooms = async () => {
  return await Room.find({ isConstant: true })
    .sort({ constantRank: 1 })
    .populate('owner', 'name avatar userId');
};

/**
 * Toggle room constant status
 * @param {ObjectId} roomId - Room ID
 * @param {boolean} isConstant - Whether room should be constant
 * @param {number} constantRank - Ranking position (if making constant)
 * @returns {Promise<Room>}
 */
const toggleConstantRoom = async (roomId, isConstant, constantRank = null) => {
  const updateData = { isConstant };
  if (isConstant && constantRank !== null) {
    updateData.constantRank = constantRank;
  } else if (!isConstant) {
    updateData.constantRank = null;
  }
  const room = await Room.findByIdAndUpdate(roomId, updateData, { new: true });
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found');
  }
  return room;
};

module.exports = {
  getRoomById,
  getTrendingRooms,
  getNewRooms,
  getMyFollowedRooms,
  getGameRooms,
  getModerators,
  setRoomGame,
  joinGame,
  incrementRoomCharizma,
  deactivateRoom,
  activateRoom,
  resetRoomCharizmaCount,
  checkRoomExists,
  getRoomsByOwnerIds,
  updateRoomFrame,
  clearRoomFrame,
  createConstantRoom,
  updateConstantRoomRank,
  getConstantRooms,
  toggleConstantRoom,
};
