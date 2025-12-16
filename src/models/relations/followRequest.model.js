const mongoose = require('mongoose');

/**
 * Follow Request Schema
 * This model represents a pending follow request from one user to another.
 * It's designed to be temporary and will be deleted when:
 * 1. Users follow each other (becoming friends)
 * 2. The request is accepted
 * 3. The request is explicitly ignored
 * 4. The friendship status changes
 */
const followRequestSchema = new mongoose.Schema({
  // The user who sent the follow request
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // The user who received the follow request
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Status of the request
  status: {
    type: String,
    enum: ['pending', 'accepted', 'ignored', 'expired'],
    default: 'pending',
  },

  // When the request was ignored (if applicable)
  ignoredAt: {
    type: Date,
    default: null,
  },

  // Whether the recipient has viewed the request
  viewed: {
    type: Boolean,
    default: false,
  },

  // When the request was created
  createdAt: {
    type: Date,
    default: Date.now,
    // Automatically expire documents after 30 days if not handled
    index: { expires: '30d' },
  },

  // When the request expires (can be manually set to clean up)
  expiresAt: {
    type: Date,
    default() {
      // Default expiration is 30 days from creation
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date;
    },
  },
});

// Create a unique compound index to ensure a user can only have one active request to another user
followRequestSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// Additional index for faster queries on status and viewed fields
followRequestSchema.index({ recipient: 1, status: 1, viewed: 1 });

/**
 * Utility function to mark a request as viewed
 * @returns {Promise<Document>}
 */
followRequestSchema.methods.markAsViewed = async function () {
  if (!this.viewed) {
    this.viewed = true;
    return this.save();
  }
  return this;
};

/**
 * Utility function to ignore a request
 * @returns {Promise<Document>}
 */
followRequestSchema.methods.ignore = async function () {
  this.status = 'ignored';
  this.ignoredAt = new Date();
  return this.save();
};

/**
 * Utility function to accept a request
 * @returns {Promise<Document>}
 */
followRequestSchema.methods.accept = async function () {
  this.status = 'accepted';
  return this.save();
};

/**
 * Count unread follow requests for a user
 * @param {ObjectId} userId - The user ID to count requests for
 * @returns {Promise<number>} - Number of unread requests
 */
followRequestSchema.statics.countUnreadForUser = async function (userId) {
  return this.countDocuments({
    recipient: userId,
    status: 'pending',
    viewed: false,
  });
};

/**
 * Get all follow requests for a user with pagination
 * @param {ObjectId} userId - The user ID to get requests for
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 14)
 * @returns {Promise<object>} - Paginated results
 */
followRequestSchema.statics.getRequestsForUser = async function (userId, page = 1, limit = 14) {
  const skip = (page - 1) * limit;

  // Get total count
  const totalRequests = await this.countDocuments({
    recipient: userId,
    status: 'pending',
  });

  // Get requests for the page
  const requests = await this.find({
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

  // Calculate pagination info
  const totalPages = Math.ceil(totalRequests / limit);

  return {
    requests: requests.map((req) => ({
      requestId: req._id,
      ...req.requester._doc,
      createdAt: req.createdAt,
      viewed: req.viewed,
    })),
    pagination: {
      page,
      limit,
      totalPages,
      totalItems: totalRequests,
    },
  };
};

/**
 * Clean up requests when a follow or friendship is created
 * This should be called when users follow each other or become friends
 * @param {ObjectId} user1 - First user ID
 * @param {ObjectId} user2 - Second user ID
 * @returns {Promise<void>}
 */
followRequestSchema.statics.cleanupBetweenUsers = async function (user1, user2) {
  await this.deleteMany({
    $or: [
      { requester: user1, recipient: user2 },
      { requester: user2, recipient: user1 },
    ],
  });
};

const FollowRequest = mongoose.model('FollowRequest', followRequestSchema);

module.exports = FollowRequest;
