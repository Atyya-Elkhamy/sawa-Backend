const httpStatus = require('http-status');
const catchAsync = require('../../utils/catchAsync');
const roomService = require('../../services/room/room.service');
const roomAdminService = require('../../services/room/room.admin.service');
const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');
const leaderboardService = require('../../services/extra/leaderboard.service');
const livekitRoomService = require('../../services/room/live-kit.service');
const { roomParticipantsService } = require('../../services');
const Room = require('../../models/room/room.model');
/**
 * Create a new room
 */

const createRoom = catchAsync(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: "Room image is required",
      messageAr: "الصورة مطلوبة لإنشاء الغرفة",
    });
  }
  const roomData = {
    ...req.body,
    owner: req.user.id,
    createdAt: req.user.createdAt || new Date(),
    image: req.file
      ? req.file.location
      : `${process.env.DEFAULT_IMAGE_URL}`,
  };
  console.log("Creating room with data:", roomData);
  //  Create room in MongoDB
  const room = await roomAdminService.createRoom(roomData);
  //  Run external tasks IN PARALLEL (MUCH FASTER)
  const [lkRoom, ingressInfo] = await Promise.all([
    livekitRoomService.createRoom(room._id),
    livekitRoomService.createIngress(room._id, req.user.id, req.user.id),
  ]);
  //  Save ingress info (only one Mongo save!)
  room.ingressInfo = ingressInfo;
  room.streamKey = ingressInfo.streamKey;
  await room.save();
  res.status(httpStatus.CREATED).send({
    message: "Room created successfully",
    messageAr: "تم إنشاء الغرفة بنجاح",
    room,
  });
});


/**
 * Get a room by ID
 */
const getRoom = catchAsync(async (req, res) => {
  const room = await roomService.getRoomById(req.params.roomId);
  console.log('room', room);
  res.status(httpStatus.OK).send(room);
});
const getTrendingRooms = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, countryCode } = req.query;
  const { rooms, pagination } = await roomService.getTrendingRooms(parseInt(page, 10), parseInt(limit, 10), countryCode);
  const map = new Map();
  rooms.forEach((element) => {
    map.set(element._id, element);
  });
  res.status(httpStatus.OK).send({
    rooms: Object.fromEntries(map),
    pagination,
  });
});

const getNewRooms = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, countryCode } = req.query;
  const { rooms, pagination } = await roomService.getNewRooms(parseInt(page, 10), parseInt(limit, 10), countryCode);
  const map = new Map();
  rooms.forEach((element) => {
    map.set(element.id, element);
  });
  res.status(httpStatus.OK).send({
    pagination,
    rooms: Object.fromEntries(map),
  });
});

const getMyFollowedRooms = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, countryCode } = req.query;
  const { rooms, pagination } = await roomService.getMyFollowedRooms(
    req.user.id,
    parseInt(page, 10),
    parseInt(limit, 10),
    countryCode
  );
  const map = new Map();
  rooms?.forEach((element) => {
    map.set(element._id, element);
  });
  res.status(httpStatus.OK).send({
    rooms: Object.fromEntries(map),
    pagination,
  });
});

const getGameRooms = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, countryCode } = req.query;
  const { rooms, pagination } = await roomService.getGameRooms(parseInt(page, 10), parseInt(limit, 10), countryCode);
  const map = new Map();
  rooms.forEach((element) => {
    map.set(element._id, element);
  });
  res.status(httpStatus.OK).send({
    rooms: Object.fromEntries(map),
    pagination,
  });
});

/**
 * Set game for a room
 */
const setRoomGame = catchAsync(async (req, res) => {
  const { roomId } = req.params;
  const { gameLink, gameRoomId, gameImage } = req.body;
  const updatedRoom = await roomAdminService.setRoomGame(roomId, { gameLink, gameRoomId, gameImage });
  res.status(httpStatus.OK).send({
    message: 'Game set successfully',
    messageAr: 'تم تعيين اللعبة بنجاح',
    room: updatedRoom,
  });
});

/**
 * Update room settings
 */
const updateRoomSettings = catchAsync(async (req, res) => {
  const { roomId } = req.params;
  const updateData = { ...req.body };
  // Pass the updateData to the service method
  if (req.file) {
    updateData.image = req.file.location;
  } else {
    // remove the image key if no image is uploaded
    delete updateData.image;
  }
  const updatedRoom = await roomAdminService.updateRoomSettings(roomId, updateData);
  res.status(httpStatus.OK).send({
    message: 'Room updated successfully',
    room: updatedRoom,
  });
});

const manageModerator = catchAsync(async (req, res) => {
  const { roomId } = req.params;
  const { userId, remove = false } = req.body;
  let moderators;
  let message;
  let messageAr;
  if (remove) {
    moderators = await roomAdminService.removeModerator(roomId, userId);
    message = 'Moderator removed successfully';
    messageAr = 'تم إزالة المشرف بنجاح';
  } else {
    moderators = await roomAdminService.addModerator(roomId, userId);
    message = 'Moderator added successfully';
    messageAr = 'تم إضافة المشرف بنجاح';
  }
  res.status(httpStatus.OK).send({
    message,
    messageAr,
    moderators,
  });
});

const inviteUserToRoom = catchAsync(async (req, res) => {
  const { roomId } = req.params;
  const { receiverId } = req.body;
  const senderId = req.user.id;
  await roomAdminService.inviteUserToRoom(roomId, senderId, receiverId);
  res.status(httpStatus.OK).send({
    message: 'User invited successfully',
    messageAr: 'تمت الدعوة بنجاح',
  });
});

const getModerators = catchAsync(async (req, res) => {
  const { roomId } = req.params;
  const moderators = await roomService.getModerators(roomId);
  res.status(httpStatus.OK).send(moderators);
});

const setRoomPassword = catchAsync(async (req, res) => {
  const roomId = req.room.id;
  const { password } = req.body;
  await roomAdminService.setRoomPassword(roomId, password);
  res.status(httpStatus.OK).send({
    message: 'Password set successfully',
    messageAr: 'تم تعيين كلمة المرور بنجاح',
  });
});

const updateCurrentState = catchAsync(async (req, res) => {
  const { roomId } = req.params;
  const updateBody = req.body;
  await roomAdminService.updateCurrentState(roomId, updateBody);
  res.status(httpStatus.OK).send({
    message: 'Room current state updated successfully',
    messageAr: 'تم تحديث حالة الغرفة بنجاح',
    // currentState: room.currentState,
  });
});


const receiveWebhook = catchAsync(async (req, res) => {
  const event = req.event;
  // Debug full event payload safely
  logger.info("🔔 LiveKit Webhook Received:");
  logger.info(JSON.stringify(event, null, 2));
  // Extract safely to avoid crashes
  const eventType = event?.event || null;
  const room = event?.room || {};
  const participant = event?.participant || {};
  // const roomName = room?.name || room?.roomName || room?.sid || null;
  const roomName = event.room?.name || event.ingressInfo?.roomName;
  const numParticipants = room?.numParticipants ?? null;
  const participantId =
    participant?.identity ||
    participant?.participantId ||
    participant?.name ||
    null;
  // Additional defensive debugging
  if (!eventType) {
    logger.error("❌ Webhook missing event type!");
    return res.status(200).send("Missing event type");
  }
  if (!roomName) {
    logger.warn("⚠️ Webhook event missing room name");
  }
  logger.info(`➡️ Event Type: ${eventType}`);
  logger.info(`➡️ Room Name: ${roomName}`);
  logger.info(`➡️ Participant: ${participantId}`);
  // Main switch — EXACT LOGIC preserved!
  switch (eventType) {
    case 'room_started':
      logger.info(`✅ Room started: ${roomName}`);
      await roomService.activateRoom(roomName);
      break;
    case 'room_finished':
      logger.info(`✅ Room finished: ${roomName}`);
      await roomService.deactivateRoom(roomName);
      break;
    case 'participant_joined':
      logger.info(
        `✅ Participant joined: ${participantId} in room: ${roomName}, numParticipants: ${numParticipants}`
      );
      if (participantId && !participantId.includes('-')) {
        await roomParticipantsService.participantJoined(
          roomName,
          participantId,
          numParticipants || 1
        );
      }
      break;
    case 'participant_left':
      logger.info(
        `✅ Participant left: ${participantId} in room: ${roomName}, numParticipants: ${numParticipants}`
      );
      if (participantId && !participantId.includes('-')) {
        await roomParticipantsService.participantLeave(
          roomName,
          participantId,
          numParticipants || 0
        );
      }
      break;
    case 'ingress_started':
      logger.info(`📡 Ingress started for room: ${roomName}`);
      await Room.updateOne(
        { _id: roomName },
        { $set: { 'ingressInfo.isLive': true } }
      );
      break;
    case 'ingress_ended':
      logger.info(`📡 Ingress ended for room: ${roomName}`);
      await Room.updateOne(
        { _id: roomName },
        { $set: { 'ingressInfo.isLive': false } }
      );
      break;
    default:
      logger.warn(`⚠️ Unhandled event: ${eventType}`);
      break;
  }

  res.status(200).send('Webhook received and processed');
});

const getLeaderboard = catchAsync(async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;
  const { type, period } = req.query;
  const statistics = await leaderboardService.getRoomLeaderboardData({
    roomId,
    userId,
    type: type || 'fame',
    period: period || 'today',
  });
  res.status(httpStatus.OK).send(statistics);
});

const joinGame = catchAsync(async (req, res) => {
  const roomId = req.room.id;
  const { gameId } = req.body;
  const room = await roomService.joinGame(roomId, gameId);
  res.status(httpStatus.OK).send(room);
});

module.exports = {
  createRoom,
  getRoom,
  updateRoomSettings,
  getTrendingRooms,
  getNewRooms,
  getMyFollowedRooms,
  getGameRooms,
  manageModerator,
  getModerators,
  updateCurrentState,
  setRoomPassword,
  receiveWebhook,
  getLeaderboard,
  joinGame,
  inviteUserToRoom,
  setRoomGame,
};
