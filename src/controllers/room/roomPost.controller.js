const httpStatus = require('http-status');
const catchAsync = require('../../utils/catchAsync');
const userService = require('../../services/user.service');
const broadcastService = require('../../services/room/roomPost.service');
const forbiddenWordsService = require('../../services/forbiddenWords.service');
const ApiError = require('../../utils/ApiError');
const config = require('../../config/room/general.config');
const { roomService } = require('../../services');
/**
 * Create a broadcast
 */
const createLiveMessage = catchAsync(async (req, res) => {
  const { message } = req.body;
  const { roomId } = req.params;
  const ownerId = req.user.id;


  // Check for forbidden words in the message
  const containsForbiddenWords = await forbiddenWordsService.containsForbiddenWords(message);
  if (containsForbiddenWords) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Message contains inappropriate content',
      'الرسالة تحتوي على محتوى غير مناسب'
    );
  }

  // Deduct credits
  const room = await roomService.checkRoomExists(roomId);
  const cost = config.broadcastCost || 1000;
  const user = await userService.getUserById(ownerId);
  if (user.credits < cost) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient credits', 'رصيد غير كافي');
  }

  // Deduct credits
  await userService.deductUserBalance(ownerId, cost, 'room broadcast', ' منشور غرفة');

  // Handle image upload if provided

  const post = await broadcastService.sendBroadcastNotification(message, room, user);

  res.status(httpStatus.CREATED).send({
    message: 'Broadcast created successfully',
    post,
  });
});

/**
 * Get broadcasts
 */
const getRoomPosts = catchAsync(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const posts = await broadcastService.getRoomPosts(Number(page), Number(limit));
  res.status(httpStatus.OK).send(posts);
});

const createRoomPost = catchAsync(async (req, res) => {
  const { message, roomId } = req.body;

  // Check for forbidden words in the message
  const containsForbiddenWords = await forbiddenWordsService.containsForbiddenWords(message);
  if (containsForbiddenWords) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Message contains inappropriate content',
      'الرسالة تحتوي على محتوى غير مناسب'
    );
  }

  // find room by id
  const { level } = req.user;
  if (!level || level < config.postMinimumLevel) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `You must be level ${config.postMinimumLevel} or higher to create a post`,
      `يجب أن يكون لديك مستوى ${config.postMinimumLevel} أو أعلى لإنشاء منشور`
    );
  }
  const room = await roomService.checkRoomExists(roomId);
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Room not found', 'الغرفة غير موجودة');
  }

  const post = await broadcastService.createRoomPost(message, roomId, req.user.id);
  res.status(httpStatus.CREATED).send(post);
});

module.exports = {
  createLiveMessage,
  getRoomPosts,
  createRoomPost,
};
