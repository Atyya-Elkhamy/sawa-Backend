const httpStatus = require('http-status');
const catchAsync = require('../../utils/catchAsync');
const { roomParticipantsService, roomService } = require('../../services');
const { User } = require('../../models');
const roomMicService = require('../../services/room/room.mics.service');
const hostActivityService = require('../../services/agencies/hostActivity.service');
const livekitService = require('../../services/room/live-kit.service');
const roomBlockedService = require('../../services/room/room.blocked.service');
const userService = require('../../services/user.service');
const { setAsync, getAsync } = require('../../config/redis');
/**
 * Add a participant to the room
 */
const participantJoin = catchAsync(async (req, res) => {
  const { password } = req.query;
  const { roomId } = req.params;
  const userId = req.user.id;
  // Run User + Blocked check in parallel (fastest way)
  const [user, isBlocked] = await Promise.all([
    User.findById(userId).select(
      `avatar name frame vip pro userId id isSuperAdmin host enterEffect typingBubble typingColor soundEffect`
    ),
    roomBlockedService.isUserBlocked(roomId, userId),
  ]);
  if (isBlocked) {
    return res.status(httpStatus.FORBIDDEN).send({
      message: 'User is blocked from the room',
      messageAr: 'المستخدم محظور من الغرفة',
    });
  }
  // Participant join logic (already optimized)
  const { isModerator, userState, ownerId } =
    await roomParticipantsService.participantJoin(
      roomId,
      userId,
      password,
      user.isSuperAdmin
    );
  const accessLevel = isModerator ? 'moderator' : 'participant';
  // Fetch room info AFTER permission logic (this is correct)
  // Faster: Do NOT select full room — only what frontend needs
  const { room } = await roomService.getRoomById(roomId, accessLevel);
  if (room.isBlocked) {
    return res.status(httpStatus.FORBIDDEN).send({
      message: 'Room is blocked',
      messageAr: 'الغرفة محظورة',
    });
  }
  // No extra DB logic, only calculation
  const isHidden = user.isSuperAdmin && user.id != ownerId;
  const options = {
    roomAdmin: !!isModerator,
    roomOwner: user.id == ownerId,
    canCreateRoom: !!isModerator,
  };
  const isEnterEffect =
    user.enterEffect.url &&
    new Date(user.enterEffect.expirationDate) > new Date();
  // Construct userData without slow operations
  const userData = {
    entryEffectUrl: isEnterEffect ? user.enterEffect.url : '',
    typingBubble: user.typingBubble || '',
    typingColor: Number(user.typingColor) || 0,
    soundEffect: user.soundEffect || '',
    isAdmin: !!user.isSuperAdmin,
    user: {
      id: user.id || user._id,
      userId: user.userId,
      userName: user.name,
      userImage: user.avatar || '',
      userFrame:
        user.frame.expirationDate > new Date() ? user.frame.url : '',
      vipLevel:
        user.vip?.expirationDate > new Date() ? user.vip.level : 0,
      isPro: user.pro?.expiryDate > new Date(),
    },
  };
  // Generate LiveKit token — unavoidable wait
  const roomAccessToken = await livekitService.createAccessToken(
    roomId,
    userId,
    userData,
    options
  );
  res.status(httpStatus.OK).send({
    message: 'User joined the room',
    messageAr: 'انضم المستخدم إلى الغرفة',
    roomAccessToken,
    room,
    isModerator,
    userState,
  });
});


/**
 * Participant leaves the room
 */
const participantLeave = catchAsync(async (req, res) => {
  await roomParticipantsService.participantLeave(req.params.roomId, req.user.id);
  console.log('participantLeave');
  res.status(httpStatus.OK).send({
    message: 'User left the room',
    messageAr: 'ترك المستخدم الغرفة',
    statusCode: httpStatus.OK,
  });
});

const hopOnMic = catchAsync(async (req, res) => {
  const { roomId, micNumber } = req.params; // Extract roomId and micNumber from URL
  const userId = req.user.id; // Authenticated user ID
  const room = await roomMicService.hopOnMic(roomId, parseInt(micNumber, 10), userId);
  res.status(httpStatus.OK).send();
});
const hopOffMic = catchAsync(async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;
  const room = await roomMicService.hopOffMic(roomId, userId);
  res.status(httpStatus.OK).send();
});

const changeMicState = catchAsync(async (req, res) => {
  const roomId = req.room.id;
  const { micNumber, state } = req.body;
  await roomMicService.changeMicState(roomId, micNumber, state);
  res.status(httpStatus.OK).send({
    message: 'Mic state changed successfully',
  });
});

const getRoomParticipants = catchAsync(async (req, res) => {
  const { roomId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const room = await roomParticipantsService.getRoomParticipants(roomId, Number(page), Number(limit));
  res.status(httpStatus.OK).send(room);
});

// block user from the room
const blockUser = catchAsync(async (req, res) => {
  const roomId = req.room.id;
  const { userId, permanent } = req.body;
  const adminId = req.room.ownerId;
  if (userId === adminId) {
    return res.status(httpStatus.BAD_REQUEST).send({
      message: 'You cannot block the owner of the room',
      messageAr: 'لا يمكنك حظر صاحب الغرفة',
    });
  }
  if (userId === req.user.id) {
    return res.status(httpStatus.BAD_REQUEST).send({
      message: 'You cannot block yourself',
      messageAr: 'لا يمكنك حظر نفسك',
    });
  }
  //
  // try {
  //   await livekitService.removeParticipant(roomId, userId);
  // } catch (error) {
  //   console.log('error', error);
  // }
  const room = await roomBlockedService.blockUser(roomId, userId, permanent);
  // remove participant from the livekit room
  res.status(httpStatus.OK).send(room);
});

// unblock user from the room
const unblockUser = catchAsync(async (req, res) => {
  const roomId = req.room.id;
  const { userId } = req.body;
  const room = await roomBlockedService.unblockUser(roomId, userId);
  res.status(httpStatus.OK).send(room);
});

// get blocked users in the room
const getBlockedUsers = catchAsync(async (req, res) => {
  const roomId = req.room.id;
  const { page = 1, limit = 10 } = req.query;
  const blockedUsers = await roomBlockedService.getBlockedUsers(roomId, Number(page), Number(limit));
  res.status(httpStatus.OK).send(blockedUsers);
});

const createIngress = catchAsync(async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;
  console.log('createIngress', roomId, userId);
  const ingressInfo = await livekitService.createIngress(roomId, userId, 'roomIngress-المذيع');
  res.status(httpStatus.OK).send({
    message: 'Ingress created successfully',
    streamKey: ingressInfo.streamKey,
    url: ingressInfo.url,
  });
});

/**
 * Reserve a mic temporarily to prevent concurrent access
 */
const reserveMic = catchAsync(async (req, res) => {
  const { roomId, micNumber } = req.params;
  const userId = req.user.id;
  // Check if the mic is already reserved
  const existingReservation = await roomMicService.getMicReservation(roomId, micNumber);
  if (existingReservation && existingReservation !== userId) {
    return res.status(httpStatus.CONFLICT).send({
      message: 'Mic is already reserved',
      messageAr: 'الميكروفون محجوز بالفعل',
    });
  }
  // Reserve the mic for 2 seconds
  await roomMicService.reserveMic(roomId, micNumber, userId);
  res.status(httpStatus.OK).send({
    message: 'Mic reserved successfully',
    messageAr: 'تم حجز الميكروفون بنجاح',
    data: {
      roomId,
      micNumber,
      reservedBy: userId,
      expiresIn: 2 // seconds
    }
  });
});


module.exports = {
  participantJoin,
  participantLeave,
  blockUser,
  unblockUser,
  getBlockedUsers,
  hopOnMic,
  hopOffMic,
  changeMicState,
  getRoomParticipants,
  createIngress,
  reserveMic,
};
