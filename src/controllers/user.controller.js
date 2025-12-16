const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const userService = require('../services/user.service');
const userRelationsService = require('../services/user/user.relations.service');
const userRelationActionsService = require('../services/user/user.actions.relationship.service');
const achievementService = require('../services/extra/achievement.service');

// Get all users with filtering and pagination
const searchUsers = catchAsync(async (req, res) => {
  const { query } = req.params;
  const userId = req.user.id || null;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const showSelf = req.query.showSelf == 'true'; // Convert to boolean

  const users = await userService.searchUsers(userId, query, page, limit, showSelf);
  res.send({ data: users });
});

// Get a single user by ID
const getUserById = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  res.send(user);
});

// Update a user's information by ID
const updateUserById = catchAsync(async (req, res) => {
  const user = await userService.updateUserById(req.params.userId, req.body);
  res.send(user);
});

// View the authenticated user's profile
const getProfile = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.user.id);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  res.send(user);
});

// Update the authenticated user's profile
const updateProfile = catchAsync(async (req, res) => {
  const user = await userService.updateUserById(req.user.id, req.body);
  res.send(user);
});

// Follow or unfollow another user
const followUser = catchAsync(async (req, res) => {
  const result = await userRelationActionsService.toggleFollowUser(req.user.id, req.params.id);
  // record the follow action achievement
  if (result.status === 'followed') {
    console.log('following user', req.params.id);
    achievementService.recordAchievement(req.user.id, 'follow', {
      targetUser: req.params.id,
      name: req.user.name,
      avatar: req.user.avatar,
      // for the follower notification
    });
    achievementService.recordAchievement(req.params.id, 'follower', {
      targetUser: req.user.id,
    });
  }
  res.send(result);
});

// Block or unblock a user
const blockUser = catchAsync(async (req, res) => {
  const result = await userRelationActionsService.toggleBlockUser(req.user.id, req.params.id);
  res.send(result);
});

// Ignore or accept a follower
const ignoreUser = catchAsync(async (req, res) => {
  const result = await userRelationActionsService.handleFollowRequest(req.user.id, req.params.id, false);
  res.send(result);
});

const acceptUser = catchAsync(async (req, res) => {
  const result = await userRelationActionsService.handleFollowRequest(req.user.id, req.params.id, true);
  res.send(result);
});

// Get the user's friends list
const getFriendsList = catchAsync(async (req, res) => {
  const friends = await userRelationsService.getFriendsList(req.user.id, req.query.page, req.query.limit);
  res.send({ data: friends });
});

// Get the user's followers list
const getFollowersList = catchAsync(async (req, res) => {
  const followers = await userRelationsService.getFollowersList(req.user.id, req.query.page, req.query.limit);
  res.send({ data: followers });
});

// Get the user's recent followers list (unignored)
const getRecentFollowersList = catchAsync(async (req, res) => {
  const followers = await userRelationsService.getRecentFollowersList(req.user.id, req.query.page, req.query.limit);
  res.send({ data: followers });
});

// Get the users the authenticated user is following
const getFollowingList = catchAsync(async (req, res) => {
  const following = await userRelationsService.getFollowingList(req.user.id, req.query.page, req.query.limit);
  res.send({ data: following });
});

// Get the user's blocked users list
const getBlockedList = catchAsync(async (req, res) => {
  const blockedUsers = await userRelationsService.getBlockedList(req.user.id, req.query.page, req.query.limit);
  res.send({ data: blockedUsers });
});

// Get the user's ignored followers list
const getIgnoredList = catchAsync(async (req, res) => {
  const ignoredUsers = await userRelationsService.getIgnoredList(req.user.id, req.query.page, req.query.limit);
  res.send({ data: ignoredUsers });
});

// Get recently added friends
const getRecentFriendsAdded = catchAsync(async (req, res) => {
  const friends = await userRelationsService.getRecentAddedFriends(req.user.id, req.query.page, req.query.limit);
  res.send({ data: friends });
});

// Get recently removed friends
const getRecentFriendsRemoved = catchAsync(async (req, res) => {
  const friends = await userRelationsService.getRecentRemovedFriends(req.user.id, req.query.page, req.query.limit);
  res.send({ data: friends });
});

// Manage user credits (add or deduct)
const manageCredits = catchAsync(async (req, res) => {
  const { type, amount } = req.body;
  let user;
  if (type === 'add') {
    user = await userService.increaseUserBalance(req.user.id, amount);
  } else if (type === 'deduct') {
    user = await userService.deductUserBalance(req.user.id, amount);
  } else {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Invalid type. Use "add" or "deduct".',
      'نوع غير صالح. استخدم "إضافة" أو "خصم".'
    );
  }
  res.send(user);
});

// Get the main profile data for the authenticated user
const getMainProfile = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.user.id);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  // Include any additional data you need for the main profile
  res.send(user);
});

module.exports = {
  searchUsers,
  getUserById,
  updateUserById,
  getProfile,
  updateProfile,
  followUser,
  ignoreUser,
  acceptUser,
  blockUser,
  manageCredits,
  getMainProfile,
  getFriendsList,
  getFollowersList,
  getFollowingList,
  getBlockedList,
  getIgnoredList,
  getRecentFriendsAdded,
  getRecentFriendsRemoved,
  getRecentFollowersList,
};
