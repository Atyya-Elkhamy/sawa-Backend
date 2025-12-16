const httpStatus = require('http-status');
const Room = require('../models/room/room.model');
const ApiError = require('../utils/ApiError');
const Participant = require('../models/room/room.participants.model');
const { webhookReceiver } = require('../services/room/live-kit.service');

const isRoomOwner = async (req, res, next) => {
  const userId = req.user.id;
  const { roomId } = req.params;

  const room = await Room.findById(roomId);

  if (!room) {
    return next(new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة'));
  }
  // check if room owner is id or user object
  const ownerId = room.owner?.toString() || room.owner?.id?.toString();

  console.log('ownerId', ownerId);
  console.log('userId', userId);
  console.log('ownerId === userId', ownerId === userId);
  if (ownerId !== userId) {
    return next(new ApiError(httpStatus.FORBIDDEN, 'You are not the owner of this room', 'أنت لست صاحب هذه الغرفة'));
  }

  // Attach the room to the request object for further use if needed
  req.room = room;
  next();
};
const isRoomOwnerOrModerator = async (req, res, next) => {
  const userId = req.user.id;
  const { roomId } = req.params;

  const room = await Room.findById(roomId);

  if (!room) {
    return next(new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة'));
  }

  // Check if the user is the owner
  const ownerId = room.owner?.toString() || room.owner?.id?.toString();

  const isOwner = ownerId === userId;

  let isModerator = false;
  // Check if the user is a moderator
  if (!isOwner) {
    isModerator = room.moderators && room.moderators.some((modId) => modId?.toString() === userId);
  }

  if (!isOwner && !isModerator) {
    return next(
      new ApiError(
        httpStatus.FORBIDDEN,
        'you are not the owner or a moderator of this room',
        'أنت لست صاحب هذه الغرفة أو مشرف عليها'
      )
    );
  }

  // Attach the room to the request object for further use if needed
  req.room = room;
  req.room.ownerId = ownerId;
  next();
};

/**
 * Middleware to check if a user is a participant in the room
 * @param req
 * @param res
 * @param next
 */

const isParticipant = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const room = await Room.findById(roomId);
    if (!room) {
      return next(new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة'));
    }
    const ownerId = room.owner?.toString() || room.owner?.id?.toString();
    const isOwner = ownerId === userId;
    const isModerator = room.moderators?.some((modId) => modId?.toString() === userId);
    // Allow owner or moderator automatically
    if (isOwner || isModerator) {
      req.room = room;
      return next();
    }
    // Otherwise, must be a participant
    const participantExists = await Participant.exists({ roomId, userId });
    if (!participantExists) {
      return next(
        new ApiError(
          httpStatus.FORBIDDEN,
          'You are not a participant in this room',
          'أنت لست مشارك في هذه الغرفة'
        )
      );
    }
    req.room = room;
    next();
  } catch (error) {
    next(error);
  }
};

const receiveWebhook = async (req, res, next) => {
  try {
    const webhook = await webhookReceiver.receive(req.body, req.get('Authorization'));
    req.event = webhook;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).send();
  }
};

module.exports = { isRoomOwner, isRoomOwnerOrModerator, isParticipant, receiveWebhook };
