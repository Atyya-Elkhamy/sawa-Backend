const httpStatus = require('http-status');
const Room = require('../../models/room/room.model');
const ApiError = require('../../utils/ApiError');
const User = require('../../models/user.model');
const { redisClient } = require('../../config/redis');

const userRoomSelection = `name avatar id _id isMale frame`;

/**
 * User hops on a mic
 * @param {string} roomId - The ID of the room
 * @param {number} micNumber - The mic number the user wants to occupy
 * @param {string} userId - The ID of the user attempting to hop on the mic
 * @returns {Promise<object>} Updated room data
 */
const hopOnMic = async (roomId, micNumber, userId) => {
  // Find the room and select relevant fields
  const room = await Room.findById(roomId).select('mics');
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة');
  }
  // Check if the user is a participant in the room
  // Find the mic the user wants to occupy
  const mic = room.mics.find((m) => m.micNumber === micNumber);
  if (!mic) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Mic not found', 'الميكروفون غير موجود');
  }
  // Check the mic's state and type
  if (mic.roomMicState === 'locked') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Mic is locked', 'الميكروفون مقفل');
  }
  if (mic.micUserId) {
    throw new ApiError(httpStatus.CONFLICT, 'Mic is already occupied', 'الميكروفون محجوز بالفعل');
  }
  if (mic.type === 'Host') {
    const owner = room.owner._id?.toString() || room.owner.toString();
    if (owner !== userId) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'Only the room owner can occupy the host mic',
        'يمكن لمالك الغرفة فقط احتلال ميكروفون المضيف'
      );
    }
  }
  const user = await User.findById(userId).select(userRoomSelection);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  // Assign the user to the mic
  const otherMic = room.mics.find((m) => m.micUserId == userId);
  if (otherMic) {
    otherMic.micUserId = null;
    otherMic.micUserName = '';
    otherMic.micImage = '';
    otherMic.micUserAvatarFrame = '';
    otherMic.micUserIsMale = null;
    otherMic.roomMicState = 'noSpeaker';
  }
  mic.micUserId = userId;
  mic.micUserName = user.name;
  mic.micImage = user.avatar;
  mic.micUserAvatarFrame = user.frame;
  mic.micUserIsMale = user.isMale;
  mic.roomMicState = 'hasSpeaker';
  console.log('mic', mic, user);
  // Save the updated room
  await room.save();
  // if same user is already on another mic, remove them from that mic
  return room;
};

const hopOffMic = async (roomId, userId) => {
  const mic = await Room.findOneAndUpdate(
    { _id: roomId, 'mics.micUserId': userId },
    {
      $set: {
        'mics.$.micUserId': null,
        'mics.$.micUserName': '',
        'mics.$.micImage': '',
        'mics.$.micUserAvatarFrame': '',
        'mics.$.micUserIsMale': null,
        'mics.$.micEmoji': '',
        'mics.$.roomMicState': 'noSpeaker',
      },
    },
    { new: true }
  );
  return mic;
};

const changeMicState = async (roomId, micNumber, state) => {
  const cacheKey = `room_mics:${roomId}`;
  //  Find room with mics
  const room = await Room.findById(roomId).select('mics');
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة');
  }
  //  Try to find mic by number
  let micIndex = room.mics.findIndex((m) => m.micNumber === micNumber);
  //  If mic doesn't exist → create new one with default values
  if (micIndex === -1) {
    // Calculate a unique mic number if needed
    const existingNumbers = room.mics.map((m) => m.micNumber);
    const uniqueMicNumber = existingNumbers.includes(micNumber)
      ? Math.max(...existingNumbers, 0) + 1
      : micNumber;
    const newMic = {
      micNumber: uniqueMicNumber,
      micUserId: null,
      micUserName: '',
      micImage: '',
      micUserAvatarFrame: '',
      micUserCharsimaCount: 0,
      micUserIsMale: true,
      micEmoji: '',
      micEmojiDuration: 0,
      roomMicState: state || 'noSpeaker',
      isActive: true,
      type: 'regular',
      vipMicEffect: '',
      vipLevel: 0,
      isPro: false,
      isTopMic: false,
    };
    room.mics.push(newMic);
    console.log(`Created new mic #${uniqueMicNumber} in room ${roomId}`);
  } else {
    // Update existing mic
    const mic = room.mics[micIndex];
    if (state === 'noSpeaker') {
      // Remove mic completely if set to "noSpeaker"
      room.mics.splice(micIndex, 1);
      console.log(`Mic #${micNumber} deleted from room ${roomId} (state: noSpeaker)`);
    } else {
      mic.roomMicState = state;
      // Optional: reset user info if locked
      if (state === 'locked') {
        mic.micUserId = null;
        mic.micUserName = '';
        mic.micImage = '';
        mic.micUserAvatarFrame = '';
        mic.micUserIsMale = null;
        mic.micEmoji = '';
        mic.micEmojiDuration = 0;
      }
      room.mics[micIndex] = mic;
      console.log(`Updated mic #${micNumber} state → ${state}`);
    }
  }
  // Save updated room document
  await room.save();
  // Refresh Redis cache
  try {
    await redisClient.del(cacheKey);
    await redisClient.set(cacheKey, JSON.stringify(room.mics), { EX: 60 });
  } catch (err) {
    console.warn('Redis cache update failed:', err.message);
  }
  return room.mics;
};

/**
 * Reserve a mic temporarily in Redis
 * @param {string} roomId - The ID of the room
 * @param {number} micNumber - The mic number to reserve
 * @param {string} userId - The ID of the user reserving the mic
 * @returns {Promise<void>}
 */
const reserveMic = async (roomId, micNumber, userId) => {
  const key = `mic_reservation:${roomId}:${micNumber}`;
  // Set reservation with 2 seconds expiration
  await redisClient.set(key, userId, {
    EX: 2, // Expiration time in seconds
    NX: false,
  });
};

/**
 * Get mic reservation from Redis
 * @param {string} roomId - The ID of the room
 * @param {number} micNumber - The mic number to check
 * @returns {Promise<string|null>} User ID who reserved the mic or null
 */
const getMicReservation = async (roomId, micNumber) => {
  const key = `mic_reservation:${roomId}:${micNumber}`;
  return await redisClient.get(key);
};
/**
 * Remove mic reservation from Redis
 * @param {string} roomId - The ID of the room
 * @param {number} micNumber - The mic number to unreserve
 * @returns {Promise<void>}
 */
const removeMicReservation = async (roomId, micNumber) => {
  const key = `mic_reservation:${roomId}:${micNumber}`;
  await redisClient.del(key);
};

const getRoomMics = async (roomId) => {
  const cacheKey = `room_mics:${roomId}`;
  const cachedMics = await redisClient.get(cacheKey);
  if (cachedMics) {
    console.log(`Cache hit for room ${roomId}`);
    return JSON.parse(cachedMics);
  }
  const room = await Room.findById(roomId).select('mics').lean();
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة');
  }
  // Ensure micUserId is always a string (not ObjectId)
  const micsWithUserId = room.mics.map((mic) => ({
    ...mic,
    micUserId: mic.micUserId ? mic.micUserId.toString() : null,
  }));
  await redisClient.set(cacheKey, JSON.stringify(micsWithUserId), { EX: 60 });
  console.log(`Cache set for room ${roomId}`);
  return micsWithUserId;
};

const addMicToRoom = async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user?.id;
  const micData = req.body;
  const cacheKey = `room_mics:${roomId}`;
  try {
    // Validate room
    const room = await Room.findById(roomId);
    if (!room) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Room not found',
        'الغرفة غير موجودة'
      );
    }

    const duplicatedMic = room.mics.find(
      (m) =>
        m.micNumber === micData.micNumber &&
        m.isTopMic === micData.isTopMic &&
        m.micUserId?.toString() !== userId
    );

    if (duplicatedMic) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Mic number already taken',
        'المايك مستخدم من قبل مستخدم آخر'
      );
    }

    // Check if user already has a mic
    const existingMic = room.mics.find((m) => m.micUserId?.toString() === userId);
    if (existingMic) {
      // Allow same user to move mic position
      Object.assign(existingMic, {
        micNumber: micData.micNumber,
        micUserName: micData.micUserName ?? existingMic.micUserName,
        micImage: micData.micImage ?? existingMic.micImage,
        micUserAvatarFrame: micData.micUserAvatarFrame ?? existingMic.micUserAvatarFrame,
        micUserCharsimaCount: micData.micUserCharsimaCount ?? existingMic.micUserCharsimaCount,
        micUserIsMale: micData.micUserIsMale ?? existingMic.micUserIsMale,
        micEmoji: micData.micEmoji ?? existingMic.micEmoji,
        micEmojiDuration: micData.micEmojiDuration ?? existingMic.micEmojiDuration,
        roomMicState: micData.roomMicState ?? existingMic.roomMicState,
        isActive: micData.isActive ?? existingMic.isActive,
        type: micData.type ?? existingMic.type,
        vipMicEffect: micData.vipMicEffect ?? existingMic.vipMicEffect,
        vipLevel: micData.vipLevel ?? existingMic.vipLevel,
        isPro: micData.isPro ?? existingMic.isPro,
        isTopMic: micData.isTopMic ?? existingMic.isTopMic,
      });
      await saveRoomAndUpdateCache(room, cacheKey);
      return res.status(httpStatus.OK).json({
        message: 'User mic updated successfully',
        messageAr: 'تم تغيير رقم المايك للمستخدم بنجاح',
        mics: room.mics,
      });
    }
    const newMic = createMicObject(micData, userId, roomId);
    await Room.updateOne(
      { _id: roomId },
      { $push: { mics: newMic } }
    );
    const updatedRoom = await Room.findById(roomId).select('mics');
    // Update cache with new data
    await redisClient.del(cacheKey);
    await redisClient.set(cacheKey, JSON.stringify(updatedRoom.mics), { EX: 60 });
    return res.status(httpStatus.CREATED).json({
      message: 'Mic added successfully',
      messageAr: 'تم إضافة المايك بنجاح',
      mics: updatedRoom.mics,
    });
  } catch (error) {
    console.error('Add mic error:', error);
    const statusCode = error.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message: error.message || 'Internal server error',
      messageAr: error.messageAr || 'حدث خطأ في الخادم',
    });
  }
};

/* Helper: Construct mic object */
function createMicObject(micData, userId, roomId) {
  return {
    roomId,
    micNumber: micData.micNumber,
    micUserId: userId || null,
    micUserName: micData.micUserName || '',
    micImage: micData.micImage || '',
    micUserAvatarFrame: micData.micUserAvatarFrame || '',
    micUserCharsimaCount: micData.micUserCharsimaCount || 0,
    micUserIsMale: micData.micUserIsMale ?? true,
    micEmoji: micData.micEmoji || '',
    micEmojiDuration: micData.micEmojiDuration || 0,
    roomMicState: micData.roomMicState || 'noSpeaker',
    isActive: micData.isActive ?? true,
    type: micData.type || 'regular',
    vipMicEffect: micData.vipMicEffect || '',
    vipLevel: micData.vipLevel || 0,
    isPro: micData.isPro ?? false,
    isTopMic: micData.isTopMic ?? false,
  };
}

/* 🧠 Helper: Save room + update Redis cache */
async function saveRoomAndUpdateCache(room, cacheKey) {
  try {
    await room.save();
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(
        httpStatus.CONFLICT,
        'Duplicate mic assignment',
        'تم تعيين نفس المستخدم أو رقم المايك مسبقاً'
      );
    }
    throw err;
  }
  // Update Redis cache asynchronously
  try {
    await redisClient.del(cacheKey);
    await redisClient.set(cacheKey, JSON.stringify(room.mics), { EX: 60 });
  } catch (redisErr) {
    console.warn('Redis cache update failed:', redisErr.message);
  }
};

const deleteUserMics = async (roomId, userId) => {
  const cacheKey = `room_mics:${roomId}`;
  const userIdStr = userId.toString();
  const room = await Room.findById(roomId).select('mics');
  if (!room) throw new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة');
  const initialCount = room.mics.length;
  const before = room.mics.map(m => m.micUserId?.toString());
  room.mics = room.mics.filter(mic => mic.micUserId?.toString() !== userIdStr);
  const after = room.mics.map(m => m.micUserId?.toString());
  if (room.mics.length === initialCount) {
    console.warn(`User ${userId} had no active mics in room ${roomId}`);
    // Don’t throw — just return safely
    return room.mics;
  }
  await room.save();
  try {
    await redisClient.del(cacheKey);
    await redisClient.set(cacheKey, JSON.stringify(room.mics), { EX: 60 });
  } catch (redisErr) {
    console.error('Redis update failed:', redisErr.message);
  }
  console.log(`Deleted all mics for user ${userId} in room ${roomId}`);
  return room.mics;
};

const resetRoomMics = async (roomId) => {
  const cacheKey = `room_mics:${roomId}`;
  // Load the room
  const room = await Room.findById(roomId).select('mics');
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة');
  }
  // Keep only mics with micNumber > 1
  room.mics = room.mics.filter(mic => mic.micNumber <= 1);
  console.log(`Deleted mics with micNumber > 1 in room ${roomId}`);
  // Save to DB
  await room.save();
  // Update Redis cache
  try {
    await redisClient.del(cacheKey);
    await redisClient.set(cacheKey, JSON.stringify(room.mics), { EX: 60 });
  } catch (err) {
    console.warn('Redis caching failed:', err.message);
  }
  console.log(`Room mics updated successfully in room ${roomId}`);
  return room.mics;
};



module.exports = {
  hopOnMic,
  hopOffMic,
  changeMicState,
  reserveMic,
  getMicReservation,
  removeMicReservation,
  getRoomMics,
  addMicToRoom,
  deleteUserMics,
  resetRoomMics,
};
