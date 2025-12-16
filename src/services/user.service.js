// services/user.service.js
const httpStatus = require('http-status');
const User = require('../models/user.model');
const Profile = require('../models/profile.model');
const { generateUniqueUserId } = require('../utils/IDGen');
const ApiError = require('../utils/ApiError');
const DeviceToken = require('../models/auth/deviceToken.model');
const { deviceTokenTypes } = require('../models/auth/deviceToken.model');
const UserCreditTransaction = require('../models/extra/userCreditTransaction.model');
const userRelationService = require('./user/user.relations.service');

const { redisClient } = require('../config/redis');
const logger = require('../config/logger');
const messageSender = require('./chat/messageSender');

const userRoomSelection = 'name roomType background image subject';

const userSelfSelect = `
  _id userId name avatar frame isMale isHost isAgencyHost isSuperAdmin isCustomerService credits level famePoints
  chargeLevel countryCode creditAgency currentRoom
`.replace(/\s+/g, ' ');

/**
 * Get user by phone
 * @param {string} phone
 * @param {string|null} select
 * @returns {Promise<User>}
 */

const getUserByPhone = async (phone, select = null) => {
  if (select) {
    return User.findOne({
      phone,
    }).select(select);
  }
  // return User.findOne({ phone }).select('phone password id');
  return User.findOne({ phone }).populate('room', userRoomSelection);
};

const userProjection =
  '_id userId name avatar frame isMale dateOfBirth level famePoints richPoints countryCode chargeLevel groupId currentRoom lastSeen isOnline ';

/**
 * Creates a deleted user placeholder to prevent null reference errors
 * @param {string} id - The ID to use for the deleted user placeholder
 * @returns {object} - A deleted user placeholder object
 */
const createDeletedUserPlaceholder = (id = null) => {
  const mongoose = require('mongoose');
  const defaultAvatar = '';

  return {
    _id: id || new mongoose.Types.ObjectId(),
    userId: '',
    name: '[مستخدم محذوف]',
    avatar: defaultAvatar,
    frame: {
      url: '',
      expirationDate: new Date(),
    },
    enterEffect: {
      url: '',
      expirationDate: new Date(),
    },
    soundEffect: {
      url: '',
      expirationDate: new Date(),
    },
    typingColor: {
      url: '',
      expirationDate: new Date(),
    },
    typingBubble: {
      url: '',
      expirationDate: new Date(),
    },
    wing: {
      url: '',
      expirationDate: new Date(),
    },
    specialId: {
      url: '',
      expirationDate: new Date(),
    },
    countryCode: '',
    role: 'user',
    isEmailVerified: false,
    group: null,
    hostAgency: null,
    followersCount: 0,
    followingCount: 0,
    friendsCount: 0,
    credits: 0,
    host: null,
    famePoints: 0,
    richPoints: 0,
    isAgencyHost: false,
    isSuperAdmin: false,
    isCustomerService: false,
    currentRoom: null,
    room: null,
    isOnline: false,
    lastSeen: new Date(),
    isMale: true,
    dateOfBirth: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365 * 18),
    creditAgency: null,
    level: 0,
    levelPoints: 0,
    chargeLevel: 0,
    totalChargedAmount: 0,
    weeklyGifts: 0,
    vipLevel: 0,
    isPro: false,
    settings: {
      friendsMessages: true,
      systemMessages: true,
      giftsFromPossibleFriends: true,
      addFollowers: true,
    },
    deletionRequest: {
      submittedAt: null,
      scheduledAt: null,
      isActive: false,
    },
    isDeleted: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Creates a new user with the specified user type and device token.
 * @param {object} userBody - User information, such as phone, googleId, facebookId, and deviceToken.
 * @param {string} userType - The type of user (phone, google, facebook).
 * @returns {object} - The created user.
 * @throws {ApiError} - If there is an issue with device token or user creation.
 */

const createUser = async (userBody, userType) => {
  // Validate user type
  if (!Object.values(deviceTokenTypes).includes(userType)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid user type', 'نوع المستخدم غير صالح');
  }
  // Generate unique userId
  let userId = await generateUniqueUserId();
  while (await User.findOne({ userId })) {
    userId = await generateUniqueUserId();
  }
  // Extract attributes correctly from the nested structure
  const { deviceToken, attributes } = userBody;
  const HardwareAttributes = attributes?.hardware || {};
  const SystemAttributes = attributes?.system || {};
  const AppAttributes = attributes?.app || {};
  console.log('Incoming device token:', deviceToken);
  if (!deviceToken) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Device token is required', 'رمز الجهاز مطلوب');
  }
  const isBlacklisted = await DeviceToken.isBlacklisted(deviceToken);
  if (isBlacklisted) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Device token blacklisted by admin', 'الجهاز محظور من قبل المسؤول');
  }
  const existingDevice = await DeviceToken.findOne({ token: deviceToken, type: userType });
  if (existingDevice) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Device token already used', 'رمز الجهاز مستخدم بالفعل');
  }
  // Prepare user body copy without device attributes
  const userBodyCopy = { ...userBody };
  delete userBodyCopy.attributes;
  let user;
  try {
    console.log('Creating user...');
    user = await User.create({
      ...userBodyCopy,
      userId,
    });
    console.log('User created successfully:', user.phone || user.email);
    // Create device token record with nested attributes
    console.log('Creating device token with attributes...');
    await DeviceToken.create({
      token: deviceToken,
      user: user._id,
      type: userType,
      attributes: {
        hardware: HardwareAttributes,
        system: SystemAttributes,
        app: AppAttributes,
      },
    });
    // Create profile
    await Profile.create({ user: user._id });
    console.log('Profile created successfully for user:', user._id);
    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    if (user) {
      await User.findByIdAndDelete(user._id);
      await DeviceToken.deleteOne({ user: user._id });
    }
    throw new ApiError(httpStatus.BAD_REQUEST, 'Unable to create user', 'لا يمكن إنشاء المستخدم');
  }
};


/**
 * Get user by MongoDB ID
 * @param {ObjectId} id
 * @returns {Promise<User>}
 */

const getUserById = async (id) => {
  return User.findById(id);
};
const getProjectedUserById = async (id) => {
  const user = await User.findById(id).select(userProjection);
  return user;
};

/**
 * Update user by userId
 * @param {string} userId
 * @param {object} updateBody
 * @returns {Promise<User>}
 */

const updateUserById = async (userId, updateBody) => {
  const user = await User.findByIdAndUpdate(userId, updateBody, { new: true });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  return user;
};

/**
 * Delete user by userId
 * @param {string} userId
 * @returns {Promise<User>}
 */

const deleteUserById = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  await user.deleteOne();
  return user;
};

/**
 * Search users by name or userId with pagination
 * @param {string} userId - User ID to exclude from results
 * @param {string} query - Search query
 * @param {number} page - Page number (default = 1)
 * @param {number} limit - Results per page (default = 14)
 * @param {boolean} showSelf - Include self in results (default = false)
 * @returns {Promise<object>} - Users, totalResults, currentPage, and totalPages
 */

const searchUsers = async (userId, query, page = 1, limit = 14, showSelf = false) => {
  if (!query) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Search query is required', 'البحث مطلوب');
  }
  const currentDate = new Date();
  // userId now always reflects the currently visible id (original or active special id),
  // so we can search directly by userId or by name (case-insensitive)
  const filter = {
    userId: query,
  };
  if (!showSelf) {
    filter._id = { $ne: userId };
  }
  const options = {
    page,
    limit,
    sort: { createdAt: -1 },
    select: userProjection.trim(),
  };

  const result = await User.paginate(filter, options);

  return result;
};

/**
 * Log wallet transaction
 * @param {string} userId
 * @param {number} amount
 * @param {string} type
 * @param {string} description
 * @param {string} descriptionAr
 * @returns {Promise<void>}
 */

const logWalletTransaction = async (userId, amount, type = 'credit', description, descriptionAr) => {
  logger.info(`Logging wallet transaction for user ${userId}: ${type} ${amount} ${description} ${descriptionAr}`);
  await UserCreditTransaction.create({
    user: userId,
    amount,
    type,
    description,
    descriptionAr,
  });
};

/**
 * Deduct user balance
 * @param {string} userId
 * @param {number} amount
 * @param {string} description
 * @param {string} descriptionAr
 * @returns {Promise<User>}
 */

const deductUserBalance = async (
  userId,
  amount,
  description = 'Deducted from user balance',
  descriptionAr = 'خصم من رصيد المستخدم'
) => {
  if (amount <= 0) {
    return await User.findById(userId).select('credits'); // no-op
  }

  // Try to atomically decrement balance only if enough credits
  const result = await User.findOneAndUpdate(
    { _id: userId, credits: { $gte: amount } }, // condition
    { $inc: { credits: -amount } },             // atomic decrement
    { new: true, projection: { credits: 1 } }   // return new balance only
  );

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient credits', 'رصيد غير كافي');
  }

  // log transaction + send socket
  await logWalletTransaction(userId, amount, 'debit', description, descriptionAr);
  await messageSender.sendToUser(
    'userBalanceChange',
    {
      amount,
      newBalance: result.credits,
      type: 'debit',
      description,
      descriptionAr,
    },
    userId?.toString(),
    false
  );
  return result;
};


/**
 * Increase user balance
 * @param {string} userId
 * @param {number} amount
 * @param {string} description
 * @param {string} descriptionAr
 * @returns {Promise<User>}
 */

const increaseUserBalance = async (
  userId,
  amount,
  description = 'Added to user balance',
  descriptionAr = 'مكتسبات الجروب'
) => {
  const user = await User.findById(userId).select('credits');
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  if (amount <= 0) {
    // throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid amount', 'المبلغ غير صالح');
    return user;
  }
  logger.info(`increasing user balance ${userId} ${amount}`);
  user.credits += amount * 1 || 0;
  await user.save();
  await logWalletTransaction(userId, amount, 'credit', description, descriptionAr);
  await messageSender.sendToUser(
    'userBalanceChange',
    {
      amount,
      newBalance: user.credits,
      type: 'credit',
      description,
      descriptionAr,
    },
    userId?.toString(),
    false
  );
  return user;
};

/**
 * Transfer credits between two users
 * @param {string} fromUserId
 * @param {string} toUserId
 * @param {number} amount
 * @returns {Promise<{sender: User, recipient: User}>}
 */

const transferCredits = async (fromUserId, toUserId, amount) => {
  // get users names
  const [fromUser, toUser] = await Promise.all([
    User.findById(fromUserId).select('name'),
    User.findById(toUserId).select('name'),
  ]);

  const [sender, recipient] = await Promise.all([
    deductUserBalance(fromUserId, amount, `Transfer to user ${toUser.name}`, `تحويل لمستخدم  ${toUser.name}`),
    increaseUserBalance(toUserId, amount, `Received from user ${fromUser.name}`, `تم الاستلام من مستخدم  ${fromUser.name}`),
  ]);
  return { sender, recipient };
};

/**
 * Get user relations with another user
 * @param {string} userId
 * @param {string} targetUserId
 * @returns {Promise<{isFollowingUser: boolean, isFriendUser: boolean, isBlockedUser: boolean, isFollowerUser: boolean}>}
 */

const getUserRelations = async (userId, targetUserId) => {
  const [isFollowingUser, isFriendUser, isBlockedUser, isFollowerUser] = await Promise.all([
    userRelationService.isFollowing(userId, targetUserId),
    userRelationService.isFriend(userId, targetUserId),
    userRelationService.isBlocked(userId, targetUserId),
    userRelationService.isFollower(userId, targetUserId),
  ]);

  return { isFollowingUser, isFriendUser, isBlockedUser, isFollowerUser };
};
const checkFriends = async (user, targetUser, rev = false) => {
  // rearrange the userId and targetUserId
  // make them strings and on order
  let userId = user?.toString();
  let targetUserId = targetUser?.toString();
  if (userId > targetUserId) {
    [userId, targetUserId] = [targetUserId, userId];
  }

  const key = `friendship:${userId}:${targetUserId}`;
  if (!rev) {
    const friends = await redisClient.get(key);

    if (friends === 'true') {
      logger.info(`friends from cache ${userId} ${targetUserId}`);
      return true;
    }
  }
  const revalidate = await userRelationService.isFriend(userId, targetUserId);
  if (revalidate) {
    redisClient.set(key, 'true', {
      EX: 600, // Expiration time in seconds
      NX: false,
    });
    logger.info(`friends from db ${userId} ${targetUserId}`);
    return true;
  }
  redisClient.set(key, 'false', {
    EX: 3600, // Expiration time in seconds
    NX: false,
  });
  return false;
};

/**
 * get User Settings
 * @param {string} userId
 * @returns {Promise<object>} - User settings
 */
const getSettings = async (userId) => {
  const user = await User.findById(userId).select('settings');
  return (
    user.settings || {
      friendsMessages: true,
      systemMessages: true,
      giftsFromPossibleFriends: true,
      addFollowers: true,
    }
  );
};

const resetCacheDataForUser = async (userId) => {
  const data = {
    currentRoom: null,
    isOnline: false,
    lastSeen: new Date(),
  };
  await User.findByIdAndUpdate(userId, { $set: data }, { new: true });
  // Reset the cache for the user
  await redisClient.del(`user:${userId}`);
  await redisClient.del(`user:relations:${userId}`);
  await redisClient.del(`userConversations:${userId}`);
  await redisClient.hDel('connectedUsers', userId);
  logger.info(`Cache data reset for user ${userId}`);
};

/**
 * Safely get user with deleted user fallback
 * @param {string} userId - User ID to fetch
 * @param {string} select - Fields to select
 * @returns {Promise<User>} - User object or deleted user placeholder
 */
const getSafeUserById = async (userId, select = null) => {
  try {
    const user = await User.findById(userId).select(select);
    if (!user) {
      return createDeletedUserPlaceholder(userId);
    }
    return user;
  } catch (error) {
    logger.warn(`Failed to fetch user ${userId}: ${error.message}`);
    return createDeletedUserPlaceholder(userId);
  }
};

/**
 * Transform populated documents to handle null/deleted users
 * @param {object | Array} doc - Document(s) to process
 * @param {string | Array} userFields - Field name(s) that contain user references
 * @returns {object | Array} - Processed document(s) with deleted user placeholders
 */
const transformDeletedUsers = (doc, userFields) => {
  if (!doc) return doc;

  const fields = Array.isArray(userFields) ? userFields : [userFields];

  if (Array.isArray(doc)) {
    return doc.map((item) => transformDeletedUsers(item, userFields));
  }

  const transformed = doc.toObject ? doc.toObject() : { ...doc };

  fields.forEach((field) => {
    // Handle nested field paths like 'participantLogs.user'
    if (field.includes('.')) {
      const parts = field.split('.');
      const parentField = parts[0];
      const childField = parts[1];

      if (transformed[parentField] && Array.isArray(transformed[parentField])) {
        transformed[parentField] = transformed[parentField].map((item) => {
          if (item[childField] === null || item[childField] === undefined) {
            return {
              ...item,
              [childField]: createDeletedUserPlaceholder(),
            };
          }
          return item;
        });
      }
    } else {
      // Handle direct field paths
      if (transformed[field] === null || transformed[field] === undefined) {
        transformed[field] = createDeletedUserPlaceholder();
      } else if (Array.isArray(transformed[field])) {
        transformed[field] = transformed[field].map((item) => {
          if (item === null || item === undefined) {
            return createDeletedUserPlaceholder();
          }
          return item;
        });
      }
    }
  });

  return transformed;
};

// Require relations service after helper definitions to avoid circular require issues

module.exports = {
  createUser,
  getUserByPhone,
  getUserById,
  updateUserById,
  deleteUserById,
  getSettings,
  searchUsers,
  deductUserBalance,
  userProjection,
  userSelfSelect,
  increaseUserBalance,
  logWalletTransaction,
  transferCredits,
  getUserRelations,
  isFollowing: userRelationService.isFollowing,
  isFriend: checkFriends,
  isBlocked: userRelationService.isBlocked,
  isFollower: userRelationService.isFollower,
  getProjectedUserById,
  resetCacheDataForUser,
  createDeletedUserPlaceholder,
  getSafeUserById,
  transformDeletedUsers,
};
