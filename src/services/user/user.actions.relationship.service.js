const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const { Follow, Friendship, Block, FollowRequest } = require('../../models/relations');
const FriendshipLog = require('../../models/extra/friendshipLogs.model');
const User = require('../../models/user.model');
const userService = require('../user.service');
const followRequestService = require('./followRequest.service');
const Conversation = require('../../models/chat/conversation.model');

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
 * @returns {Promise<boolean>}
 */
const isBlocked = async (userId, targetUserId) => {
  const block = await Block.findOne({ blocker: userId, blocked: targetUserId });
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

/**
 * Check if a user has sent a follow request to another user
 * @param {string} userId
 * @param {string} targetUserId
 * @returns {Promise<boolean>}
 */
const hasRequestedFollow = async (userId, targetUserId) => {
  const request = await FollowRequest.findOne({
    requester: userId,
    recipient: targetUserId,
    status: 'pending',
  });
  return !!request;
};

// Validation helpers
const validateUserIds = async (userId, targetId) => {
  if (userId === targetId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Cannot perform this action on yourself',
      'لا يمكنك تنفيذ هذا الإجراء على نفسك'
    );
  }

  const [user1, user2] = await Promise.all([User.exists({ _id: userId }), User.exists({ _id: targetId })]);

  if (!user1 || !user2) {
    throw new ApiError(httpStatus.NOT_FOUND, 'One or both users not found', 'لم يتم العثور على مستخدم واحد أو كليهما');
  }
};

// Get relationship status between two users

// Update user counts based on actual document counts
const updateUserCounts = async (userId) => {
  const [followers, following, friends] = await Promise.all([
    Follow.countDocuments({ following: userId }),
    Follow.countDocuments({ follower: userId }),
    Friendship.countDocuments({
      $or: [{ user1: userId }, { user2: userId }],
    }),
  ]);

  await User.updateOne(
    { _id: userId },
    {
      followersCount: followers,
      followingCount: following,
      friendsCount: friends,
    }
  );
};

// Friendship management
const createFriendship = async (user1Id, user2Id) => {
  const friendship = await Friendship.findOneAndUpdate(
    {
      $or: [
        { user1: user1Id, user2: user2Id },
        { user1: user2Id, user2: user1Id },
      ],
    },
    {
      user1: user1Id,
      user2: user2Id,
      createdAt: new Date(),
    },
    { upsert: true, new: true }
  );

  await FriendshipLog.deleteMany({
    $or: [
      { userId: user1Id, friendId: user2Id },
      { userId: user2Id, friendId: user1Id },
    ],
  });

  await FriendshipLog.create([
    {
      userId: user1Id,
      friendId: user2Id,
      state: 'added',
    },
    {
      userId: user2Id,
      friendId: user1Id,
      state: 'added',
    },
  ]);

  // Update conversation to 'friend' type
  await Conversation.updateMany(
    {
      participants: { $all: [user1Id, user2Id] },
    },
    { areFriends: true }
  );

  // Update counts for both users
  await Promise.all([updateUserCounts(user1Id), updateUserCounts(user2Id)]);

  userService.isFriend(user1Id, user2Id, true);

  // Clean up any follow requests between these users
  await followRequestService.cleanupRequestsBetweenUsers(user1Id, user2Id);

  return friendship;
};

const removeFriendship = async (user1Id, user2Id) => {
  const friendship = await Friendship.findOneAndDelete({
    $or: [
      { user1: user1Id, user2: user2Id },
      { user1: user2Id, user2: user1Id },
    ],
  });

  console.log(friendship);
  userService.isFriend(user1Id, user2Id, true);

  await FriendshipLog.deleteMany({
    $or: [
      { userId: user1Id, friendId: user2Id },
      { userId: user2Id, friendId: user1Id },
    ],
  });
  if (friendship) {
    await FriendshipLog.create({
      userId: user1Id,
      friendId: user2Id,
      remover: user1Id,
      state: 'removed',
    });

    // Update conversation to 'non-friend' type
    await Conversation.updateMany(
      {
        participants: { $all: [user1Id, user2Id] },
      },
      { areFriends: false }
    );

    // Update counts for both users
    await Promise.all([updateUserCounts(user1Id), updateUserCounts(user2Id)]);
  }

  return friendship;
};
/**
 * Send a follow request to another user
 * @param {string} requesterId - ID of the user sending the request
 * @param {string} recipientId - ID of the user to receive the request
 * @returns {Promise<object>} - Result of the operation
 */
const sendFollowRequest = async (requesterId, recipientId) => {
  await validateUserIds(requesterId, recipientId);

  // Check if blocked
  await userService.isBlocked(recipientId, requesterId, true);

  // Check if already following
  const alreadyFollowing = await isFollowing(requesterId, recipientId);
  if (alreadyFollowing) {
    return;
  }

  // Check if already sent a request
  const existingRequest = await hasRequestedFollow(requesterId, recipientId);
  if (existingRequest) {
    return;
  }

  // Create the follow request
  await followRequestService.createRequest(requesterId, recipientId);

  return {
    message: 'Follow request sent',
    status: 'sent',
    messageAr: 'تم إرسال طلب المتابعة',
  };
};
// Core relationship functions
const followUser = async (followerId, followingId) => {
  await validateUserIds(followerId, followingId);

  // check if the user is blocked by bio check
  await userService.isBlocked(followingId, followerId, true);

  const existingFollow = await Follow.findOne({
    follower: followerId,
    following: followingId,
  });

  if (existingFollow) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Already following this user', 'أنت تتابع هذا المستخدم بالفعل');
  }

  // Create the follow relationship
  await Follow.create({
    follower: followerId,
    following: followingId,
    createdAt: new Date(),
  });

  // Check for reciprocal follow to establish friendship
  const reciprocalFollow = await Follow.findOne({
    follower: followingId,
    following: followerId,
  });

  // remove friendshipLog of removed if exist
  await FriendshipLog.deleteMany({
    userId: followerId,
    friendId: followingId,
  });

  if (reciprocalFollow) {
    // if reciprocalFollow.ignored is true, update it to false
    if (reciprocalFollow.ignored) {
      reciprocalFollow.ignored = false;
      reciprocalFollow.ignoredAt = null;
      await reciprocalFollow.save();
    }
    await createFriendship(followerId, followingId);
  }

  // Clean up any follow requests between these users
  if (!reciprocalFollow) {
    await followRequestService.cleanupRequestsBetweenUsers(followerId, followingId);
    await followRequestService.createRequest(followerId, followingId);
  }

  // Update counts for both users
  await Promise.all([updateUserCounts(followerId), updateUserCounts(followingId)]);
};

const unfollowUser = async (followerId, followingId) => {
  await validateUserIds(followerId, followingId);

  const deletedFollow = await Follow.findOneAndDelete({
    follower: followerId,
    following: followingId,
  });

  if (!deletedFollow) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Not following this user', 'أنت لا تتابع هذا المستخدم');
  }

  // Check and remove friendship if no reciprocal follow
  const reciprocalFollow = await Follow.findOne({
    follower: followingId,
    following: followerId,
  });

  if (reciprocalFollow) {
    await removeFriendship(followerId, followingId);
  }

  // Update counts for both users
  await Promise.all([updateUserCounts(followerId), updateUserCounts(followingId)]);
};

const blockUser = async (blockerId, blockedId) => {
  await validateUserIds(blockerId, blockedId);

  const existingBlock = await Block.findOne({
    blocker: blockerId,
    blocked: blockedId,
  });

  if (existingBlock) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User already blocked', 'المستخدم محظور بالفعل');
  }

  // Create block
  await Block.create({
    blocker: blockerId,
    blocked: blockedId,
    createdAt: new Date(),
  });

  // Remove any existing relationships
  await Promise.all([
    Follow.deleteMany({
      $or: [
        { follower: blockerId, following: blockedId },
        { follower: blockedId, following: blockerId },
      ],
    }),
    removeFriendship(blockerId, blockedId),
    // Clean up any follow requests between users
    followRequestService.cleanupRequestsBetweenUsers(blockerId, blockedId),
  ]);

  // Update counts for both users
  await Promise.all([updateUserCounts(blockerId), updateUserCounts(blockedId)]);
};

const unblockUser = async (blockerId, blockedId) => {
  await validateUserIds(blockerId, blockedId);

  const deletedBlock = await Block.findOneAndDelete({
    blocker: blockerId,
    blocked: blockedId,
  });

  if (!deletedBlock) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User is not blocked', 'المستخدم غير محظور');
  }
};

const toggleFollowUser = async (followerId, followingId) => {
  const status = await isFollowing(followerId, followingId);
  console.log(status);

  if (status) {
    await unfollowUser(followerId, followingId);
    return { message: 'Unfollowed user', status: 'unfollowed', messageAr: 'تم إلغاء متابعة المستخدم' };
  }
  await followUser(followerId, followingId);
  return { message: 'Followed user', status: 'followed', messageAr: 'تم متابعة المستخدم' };
};

const toggleBlockUser = async (blockerId, blockedId) => {
  const status = await isBlocked(blockerId, blockedId);

  if (status) {
    await unblockUser(blockerId, blockedId);
    return { message: 'Unblocked user', status: 'unblocked', messageAr: 'تم إلغاء حظر المستخدم' };
  }
  await blockUser(blockerId, blockedId);
  return { message: 'Blocked user', status: 'blocked', messageAr: 'تم حظر المستخدم' };
};

const ignoreFollowRequest = async (followingId, followerId) => {
  const follow = await Follow.findOne({ follower: followerId, following: followingId });
  if (!follow) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Follow request not found');
  }
  follow.ignored = true;
  follow.ignoredAt = new Date();
  await follow.save();
};

/**
 * Handle a follow request (accept or ignore)
 * @param {string} userId - ID of the user handling the request
 * @param {string} targetId
 * @param {boolean} accept - Whether to accept the request
 * @returns {Promise<object>} - Result of the operation
 */
const handleFollowRequest = async (userId, targetId, accept) => {
  // find the request with the userId as recipient and targetId as requester
  const request = await FollowRequest.findOne({
    recipient: userId,
    requester: targetId,
    status: 'pending',
  });
  if (!request) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Follow request not found', 'طلب المتابعة غير موجود');
  }
  const requestId = request._id;
  if (accept) {
    const result = await followRequestService.acceptRequest(requestId, userId);
    // If accepted, create the follow relationship from requester to recipient
    if (result.requesterId) {
      await followUser(userId, result.requesterId);
    }
    return result;
  }
  // Ignore request
  return followRequestService.ignoreRequest(requestId, userId);
};

/**
 * Cancel a follow request previously sent
 * @param {string} userId - ID of the user canceling the request
 * @param {string} requestId - ID of the request to cancel
 * @returns {Promise<object>} - Result of the operation
 */
const cancelFollowRequest = async (userId, requestId) => {
  return followRequestService.cancelRequest(requestId, userId);
};

module.exports = {
  followUser,
  unfollowUser,
  blockUser,
  unblockUser,
  toggleFollowUser,
  toggleBlockUser,
  sendFollowRequest,
  handleFollowRequest,
  cancelFollowRequest,
  ignoreFollowRequest,
  isFollowing,
  isFollower,
  isFriend,
  isBlocked,
  hasRequestedFollow,
};
