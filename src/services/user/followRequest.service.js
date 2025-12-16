/**
 * Follow Request Service
 * Handles operations related to follow requests between users
 */

const httpStatus = require('http-status');
const { ObjectId } = require('mongoose').Types;
const ApiError = require('../../utils/ApiError');
const { FollowRequest, Follow } = require('../../models/relations');
const { calculatePagination } = require('../../utils/pagination');

/**
 * Create a follow request from one user to another
 * @param {ObjectId} requesterId - The ID of the user sending the request
 * @param {ObjectId} recipientId - The ID of the user receiving the request
 * @returns {Promise<Document>} - The created follow request
 */
const createRequest = async (requesterId, recipientId) => {
  // Check if the users are the same
  if (requesterId.toString() === recipientId.toString()) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot send follow request to yourself', 'لا يمكنك إرسال طلب متابعة لنفسك');
  }

  // Check if there's already a pending request
  const existingRequest = await FollowRequest.findOne({
    requester: requesterId,
    recipient: recipientId,
  });

  if (existingRequest) {
    return;
  }

  // Create new request
  return FollowRequest.create({
    requester: requesterId,
    recipient: recipientId,
    status: 'pending',
    createdAt: new Date(),
  });
};

/**
 * Get follow requests for a user with pagination
 * @param {ObjectId} userId - ID of the user to get requests for
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 14)
 * @returns {Promise<object>} - Paginated follow requests
 */
const getFollowRequests = async (userId, page = 1, limit = 14) => {
  const skip = (page - 1) * limit;

  const totalRequests = await FollowRequest.countDocuments({
    recipient: userId,
    status: 'pending',
  });

  const requests = await FollowRequest.find({
    recipient: userId,
    status: 'pending',
  })
    .populate(
      'requester',
      '_id userId name avatar frame isMale dateOfBirth level famePoints richPoints countryCode chargeLevel currentRoom'
    )
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  // Mark requests as viewed
  const requestIds = requests.map((req) => req._id);
  if (requestIds.length > 0) {
    await FollowRequest.updateMany({ _id: { $in: requestIds } }, { viewed: true });
  }

  const pagination = calculatePagination(totalRequests, page, limit);

  const formattedRequests = requests.map((request) => ({
    requestId: request._id,
    createdAt: request.createdAt,
    viewed: request.viewed,
    ...request.requester._doc,
  }));

  return {
    ...pagination,
    list: formattedRequests,
  };
};

/**
 * Count unread follow requests for a user
 * @param {ObjectId} userId - ID of the user
 * @returns {Promise<number>} - Number of unread requests
 */
const countUnreadRequests = async (userId) => {
  return FollowRequest.countDocuments({
    recipient: userId,
    status: 'pending',
    viewed: false,
  });
};

/**
 * Accept a follow request
 * @param {ObjectId} requestId - ID of the request
 * @param {ObjectId} userId - ID of the user accepting the request (must be the recipient)
 * @returns {Promise<object>} - Result of the operation
 */
const acceptRequest = async (requestId, userId) => {
  const request = await FollowRequest.findOne({
    _id: requestId,
    recipient: userId,
    status: 'pending',
  }).populate('requester');

  if (!request) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Follow request not found or already handled',
      'لم يتم العثور على طلب المتابعة أو تم معالجته بالفعل'
    );
  }

  // Mark as accepted
  request.status = 'accepted';
  await request.save();

  return {
    message: 'Follow request accepted',
    status: 'accepted',
    messageAr: 'تم قبول طلب المتابعة',
    requesterId: request.requester._id,
  };
};

/**
 * Ignore a follow request
 * @param {ObjectId} requestId - ID of the request
 * @param {ObjectId} userId - ID of the user ignoring the request (must be the recipient)
 * @returns {Promise<object>} - Result of the operation
 */
const ignoreRequest = async (requestId, userId) => {
  const request = await FollowRequest.findOne({
    _id: requestId,
    recipient: userId,
    status: 'pending',
  });

  if (!request) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Follow request not found or already handled',
      'لم يتم العثور على طلب المتابعة أو تم معالجته بالفعل'
    );
  }

  // Mark as ignored
  request.status = 'ignored';
  request.ignoredAt = new Date();
  await request.save();

  return {
    message: 'Follow request ignored',
    status: 'ignored',
    messageAr: 'تم تجاهل طلب المتابعة',
  };
};

/**
 * Cancel a follow request sent by the user
 * @param {ObjectId} requestId - ID of the request or the recipient's ID
 * @param {ObjectId} userId - ID of the user canceling the request (must be the requester)
 * @returns {Promise<object>} - Result of the operation
 */
const cancelRequest = async (requestId, userId) => {
  let query;

  // Check if requestId is a valid ObjectId
  if (ObjectId.isValid(requestId)) {
    query = {
      _id: requestId,
      requester: userId,
      status: 'pending',
    };
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid request ID', 'معرف طلب غير صالح');
  }

  const request = await FollowRequest.findOne(query);

  if (!request) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Follow request not found or already handled',
      'لم يتم العثور على طلب المتابعة أو تم معالجته بالفعل'
    );
  }

  // Delete the request
  await request.deleteOne();

  return {
    message: 'Follow request canceled',
    status: 'canceled',
    messageAr: 'تم إلغاء طلب المتابعة',
  };
};

/**
 * Clean up follow requests between users
 * Should be called when users follow each other or become friends
 * @param {ObjectId} user1 - First user ID
 * @param {ObjectId} user2 - Second user ID
 * @returns {Promise<void>}
 */
const cleanupRequestsBetweenUsers = async (user1, user2) => {
  await FollowRequest.deleteMany({
    $or: [
      { requester: user1, recipient: user2 },
      { requester: user2, recipient: user1 },
    ],
  });
};
// get ignored requests list
/**
 * Get ignored requests list
 * @param {ObjectId} userId - ID of the user
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 14)
 * @returns {Promise<object>} - Paginated ignored requests
 */
const getIgnoredRequests = async (userId, page = 1, limit = 14) => {
  const skip = (page - 1) * limit;

  const totalRequests = await FollowRequest.countDocuments({
    recipient: userId,
    status: 'ignored',
  });

  const requests = await FollowRequest.find({
    recipient: userId,
    status: 'ignored',
  })
    .populate(
      'requester',
      '_id userId name avatar frame isMale dateOfBirth level famePoints richPoints countryCode chargeLevel currentRoom'
    )
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const pagination = calculatePagination(totalRequests, page, limit);

  const formattedRequests = requests.map((request) => ({
    requestId: request._id,
    createdAt: request.createdAt,
    ...request.requester._doc,
  }));

  return {
    ...pagination,
    list: formattedRequests,
  };
};

module.exports = {
  createRequest,
  getFollowRequests,
  countUnreadRequests,
  acceptRequest,
  ignoreRequest,
  cancelRequest,
  cleanupRequestsBetweenUsers,
  getIgnoredRequests,
};
