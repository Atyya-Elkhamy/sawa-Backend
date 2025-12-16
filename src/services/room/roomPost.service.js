const RoomPost = require('../../models/room/roomPost.model');
const { calculatePagination } = require('../../utils/pagination');
const messageSender = require('../chat/messageSender');
const userService = require('../user.service');
/**
 * Create a room post
 * @param message
 * @param roomId
 * @param userId
 * @returns {Promise<RoomPost>}
 */

const createRoomPost = async (message, roomId, userId) => {
  const roomPost = await RoomPost.create({ message, room: roomId, user: userId });
  return roomPost;
};
const sendBroadcastNotification = async (message, room, user) => {
  const { image = '', name = '', id, _id, background, roomType, isPrivate } = room;
  const { avatar = '', id: userId, userId: userUniqueId, name: userName } = user;

  const Data = {
    message,
    room: id || _id,
    image: avatar || image,
    userName,
    background,
    roomType,
    isPrivate,
  };
  console.log('Dataaa', Data);
  await messageSender.sendToAll('liveMessage', Data, false);
  return Data;
};

/**
 * Get room posts
 * @param page
 * @param limit
 * @returns {Promise<Array<RoomPost>>}
 */

const getRoomPosts = async (page = 1, limit = 20) => {
  const match = {};
  // populate user
  const posts = await RoomPost.find(match)
    .populate('user', 'name avatar id userId')
    .populate('room', 'image name background roomType micShape currentState.hostMicEnabled isPrivate')
    .sort({ date: -1 })
    .limit(limit)
    .skip((page - 1) * limit);

  // Transform posts to handle deleted users
  const transformedPosts = userService.transformDeletedUsers(posts, 'user');

  // count total number of room posts
  const total = await RoomPost.countDocuments(match);
  const pagination = calculatePagination(total, page, limit);

  return { posts: transformedPosts, pagination };
};

module.exports = {
  createRoomPost,
  getRoomPosts,
  sendBroadcastNotification,
};
