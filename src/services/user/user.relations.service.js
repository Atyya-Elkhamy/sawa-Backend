// services/user.relations.service.js

const { ObjectId } = require('mongoose').Types;
const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const { Follow, Friendship, Block, FollowRequest } = require('../../models/relations');
const FriendshipLog = require('../../models/extra/friendshipLogs.model');
const { calculatePagination } = require('../../utils/pagination');
const { weekAgo } = require('../../utils/timePeriods');
const followRequestService = require('./followRequest.service');
// Lazy require to avoid circular dependency where user.service also requires this module.
// Use getUserService().<fn> when calling functions that depend on user.service.
const getUserService = () => require('../user.service');
// const { formatUserModel } = require('../../utils/formatter');
// const { userProjection } = require('../user.service');
const userProjection =
  '_id userId name avatar frame isMale dateOfBirth level famePoints richPoints countryCode chargeLevel currentRoom';
/**
 * Get followers list
 * @param {ObjectId} userId
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<object>}
 */
const getRecentFollowersList = async (userId, page = 1, limit = 14) => {
  const skips = (page - 1) * limit;

  // Get the list of users that the current user is following
  const followingList = await Follow.find({ follower: userId }).distinct('following');

  // mark as viewed
  await Follow.updateMany({ follower: userId, viewed: false }, { viewed: true });
  // Count total followers who are not ignored and not followed back
  const totalFollowers = await Follow.countDocuments({
    following: userId,
    ignored: false,
    follower: { $nin: followingList },
  });

  // Retrieve followers who are not ignored and not followed back
  // order by createdAt in descending order
  const followers = await Follow.find({
    following: userId,
    ignored: false,
    follower: { $nin: followingList },
  })
    .populate('follower', userProjection)
    .skip(skips)
    .limit(limit)
    .sort({ createdAt: -1 });

  const pagination = calculatePagination(totalFollowers, page, limit);

  // Transform followers to handle deleted users
  const transformedFollowers = getUserService().transformDeletedUsers(followers, 'follower');
  const formattedFollowers = transformedFollowers.map((f) => f.follower);

  return {
    ...pagination,
    list: formattedFollowers,
  };
};
// count recent followers
/*
    @param {ObjectId} userId
  @returns {Promise<number>}
*/
const countUnReadFollowers = async (userId) => {
  const followingList = await Follow.find({ follower: userId }).distinct('following');
  const totalFollowers = await Follow.countDocuments({
    following: userId,
    ignored: false,
    follower: { $nin: followingList },
    viewed: false,
  });
  return totalFollowers;
};
/**
 * Get followers list
 * @param {ObjectId} userId
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<object>}
 */

const getFollowersList = async (userId, page = 1, limit = 14) => {
  const skips = (page - 1) * limit;
  const totalFollowers = await Follow.countDocuments({ following: userId });

  const followers = await Follow.find({ following: userId }).populate('follower', userProjection).skip(skips).limit(limit).sort({ createdAt: -1 });

  const pagination = calculatePagination(totalFollowers, page, limit);

  // Transform followers to handle deleted users
  const transformedFollowers = getUserService().transformDeletedUsers(followers, 'follower');
  const formattedFollowers = transformedFollowers.map((f) => f.follower);

  return {
    ...pagination,
    list: formattedFollowers,
  };
};

/**
 * Get following list
 * @param {ObjectId} userId
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<object>}
 */

const getFollowingList = async (userId, page = 1, limit = 14) => {
  const skips = (page - 1) * limit;
  const totalFollowing = await Follow.countDocuments({ follower: userId });

  const following = await Follow.find({ follower: userId })
    .populate({ path: 'following', select: userProjection })
    .skip(skips)
    .limit(limit)
    .sort({ createdAt: -1 });

  console.log(following);
  const pagination = calculatePagination(totalFollowing, page, limit);

  // Transform following to handle deleted users
  const transformedFollowing = getUserService().transformDeletedUsers(following, 'following');
  const formattedFollowing = transformedFollowing.map((f) => f.following);

  return {
    ...pagination,
    list: formattedFollowing,
  };
};

/**
 * Get friends list
 * @param {ObjectId} userId
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<object>}
 */

const getFriendsList = async (userId, page = 1, limit = 14) => {
  const skips = (page - 1) * limit;
  const totalFriends = await Friendship.countDocuments({
    $or: [{ user1: userId }, { user2: userId }],
  });

  const friends = await Friendship.find({
    $or: [{ user1: userId }, { user2: userId }],
  })
    .skip(skips)
    .limit(limit)
    .populate('user1', userProjection)
    .populate('user2', userProjection)
    .sort({ createdAt: -1 });

  // Transform friends to handle deleted users
  const transformedFriends = getUserService().transformDeletedUsers(friends, ['user1', 'user2']);

  const friendsList = transformedFriends.map((f) => {
    const friend = f.user1?._id.toString() == userId.toString() ? f.user2 : f.user1;
    return friend;
  });

  const pagination = calculatePagination(totalFriends, page, limit);

  return {
    ...pagination,
    list: friendsList,
  };
};

/**
 * Get blocked users list
 * @param {ObjectId} userId
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<object>}
 */

const getBlockedList = async (userId, page = 1, limit = 14) => {
  const skips = (page - 1) * limit;
  const match = {
    blocker: userId,
    createdAt: { $gte: weekAgo() },
  };
  const totalBlocked = await Block.countDocuments(match);

  const blocks = await Block.find(match).populate('blocked', userProjection).skip(skips).limit(limit);

  const pagination = calculatePagination(totalBlocked, page, limit);

  // Transform blocks to handle deleted users
  const transformedBlocks = getUserService().transformDeletedUsers(blocks, 'blocked');
  const formattedBlockedUsers = transformedBlocks.map((b) => b.blocked);

  return {
    ...pagination,
    list: formattedBlockedUsers,
  };
};

/**
 * Get ignored follow requests
 * @param {ObjectId} userId
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<object>}
 */

const getIgnoredList = async (userId, page = 1, limit = 14) => {
  const skips = (page - 1) * limit;
  const match = {
    following: userId,
    ignored: true,
    ignoredAt: { $gte: weekAgo() },
  };
  const totalIgnored = await Follow.countDocuments(match);

  const ignoredRequests = await Follow.find(match).populate('follower', userProjection).skip(skips).limit(limit);

  const pagination = calculatePagination(totalIgnored, page, limit);

  // Transform ignored requests to handle deleted users
  const transformedIgnored = getUserService().transformDeletedUsers(ignoredRequests, 'follower');
  const formattedIgnoredRequests = transformedIgnored.map((f) => f.follower);

  return {
    ...pagination,
    list: formattedIgnoredRequests,
  };
};

/**
 * Get recent added friends
 * @param {string} userId
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<object>}
 */

const getRecentAddedFriends = async (userId, page = 1, limit = 14) => {
  const skips = (page - 1) * limit;
  const match = {
    userId,
    state: 'added',
    updatedAt: { $gte: weekAgo() },
  };

  const totalNewFriends = await FriendshipLog.countDocuments(match);

  const recentFriends = await FriendshipLog.find(match)
    .sort({ updatedAt: -1 })
    .skip(skips)
    .limit(limit)
    .populate('friendId', userProjection);

  console.log('recentFriends', recentFriends);

  // Transform recent friends to handle deleted users
  const transformedRecentFriends = getUserService().transformDeletedUsers(recentFriends, 'friendId');
  const formattedUsers = transformedRecentFriends.map((f) => f.friendId);

  const pagination = calculatePagination(totalNewFriends, page, limit);

  return {
    ...pagination,
    list: formattedUsers,
  };
};

/**
 * Get recent removed friends
 * @param {string} userId
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<object>}
 */
const getRecentRemovedFriends = async (userId, page = 1, limit = 14) => {
  const skips = (page - 1) * limit;
  const match = {
    remover: userId,
    state: 'removed',
    updatedAt: { $gte: weekAgo() },
  };

  const totalRemovedFriends = await FriendshipLog.countDocuments(match);

  const recentFriends = await FriendshipLog.find(match)
    .sort({ updatedAt: -1 })
    .skip(skips)
    .limit(limit)
    .populate('friendId', userProjection);

  // Transform recent removed friends to handle deleted users
  const transformedRecentFriends = getUserService().transformDeletedUsers(recentFriends, 'friendId');
  const formattedUsers = transformedRecentFriends.map((f) => f.friendId);

  const pagination = calculatePagination(totalRemovedFriends, page, limit);

  return {
    ...pagination,
    list: formattedUsers,
  };
};

/**
 * Check if a user is following another user
 * @param {string} userId
 * @param {string} targetUserId
 * @returns {Promise<boolean>}
 */
const isFollowing = async (userId, targetUserId) => {
  const follow = await Follow.findOne({ follower: userId, following: targetUserId });
  return !!follow;
};

/**
 * Check if a user is friends with another user
 * @param {string} userId
 * @param {string} targetUserId
 * @returns {Promise<boolean>}
 */
const isFriend = async (userId, targetUserId) => {
  const friendship = await Friendship.findOne({
    $or: [
      { user1: userId, user2: targetUserId },
      { user1: targetUserId, user2: userId },
    ],
  });
  return !!friendship;
};

/**
 * Check if a user has blocked another user
 * @param {string} userId
 * @param {string} targetUserId
 * @param stop
 * @returns {Promise<boolean>}
 */
const isBlocked = async (userId, targetUserId, stop = false) => {
  const block = await Block.findOne({
    $or: [
      { blocker: userId, blocked: targetUserId },
      { blocker: targetUserId, blocked: userId },
    ],
  });
  if (block && stop) {
    throw new ApiError(httpStatus.FORBIDDEN, 'there is A Block Between The Two Users', 'هناك حظر بينكما');
  }
  return !!block;
};

/**
 * Check if a user is a follower of another user
 * @param {string} userId
 * @param {string} targetUserId
 * @returns {Promise<boolean>}
 */
const isFollower = async (userId, targetUserId) => {
  const follow = await Follow.findOne({ follower: targetUserId, following: userId });
  return !!follow;
};

module.exports = {
  getFollowersList,
  getFollowingList,
  getFriendsList,
  getBlockedList,
  getIgnoredList: followRequestService.getIgnoredRequests,
  getRecentAddedFriends,
  getRecentRemovedFriends,
  isFollowing,
  isFriend,
  isBlocked,
  isFollower,
  getRecentFollowersList: followRequestService.getFollowRequests,
  countUnReadFollowers: followRequestService.countUnreadRequests,
};
