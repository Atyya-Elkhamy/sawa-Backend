// models/userSpecialId.model.js

const mongoose = require('mongoose');

const userSpecialIdSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      validate: {
        validator: function (v) {
          // Special ID should be alphanumeric and between 1-15 characters
          return /^[a-zA-Z0-9_]{1,15}$/.test(v);
        },
        message: 'Special ID must be alphanumeric and between 1-15 characters'
      }
    },
    acquiredAt: {
      type: Date,
      default: Date.now,
    },
    expirationDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false, // Only one special ID can be active at a time
    },
    vipLevel: {
      type: Number,
      required: true, // The VIP level when this special ID was acquired
      min: 1,
      max: 7,
    },
    source: {
      type: String,
      enum: ['vip_subscription', 'gift', 'admin', 'store_purchase'],
      default: 'vip_subscription',
    },
    metadata: {
      giftedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      duration: { type: Number }, // Duration in days
      subscriptionId: { type: mongoose.Schema.Types.ObjectId }, // Reference to VIP subscription
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
userSpecialIdSchema.index({ user: 1, isActive: 1 });
userSpecialIdSchema.index({ user: 1, expirationDate: 1 });

// TTL index to automatically clean up expired special IDs
userSpecialIdSchema.index({ expirationDate: 1 }, { expireAfterSeconds: 0 });

/**
 * Pre-save middleware to ensure only one active special ID per user
 */
userSpecialIdSchema.pre('save', async function (next) {
  if (this.isModified('isActive') && this.isActive) {
    // Deactivate all other special IDs for this user
    await this.constructor.updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { isActive: false }
    );
  }
  next();
});

/**
 * Get user's active special ID
 * @param {ObjectId} userId
 * @returns {Promise<Object|null>}
 */
userSpecialIdSchema.statics.getActiveForUser = async function (userId) {
  return this.findOne({
    user: userId,
    isActive: true,
    expirationDate: { $gt: new Date() },
  });
};

/**
 * Get all user's special IDs (active and inactive)
 * @param {ObjectId} userId
 * @returns {Promise<Array>}
 */
userSpecialIdSchema.statics.getAllForUser = async function (userId) {
  return this.find({ user: userId })
    .sort({ expirationDate: -1 });
};

/**
 * Activate a special ID for user
 * @param {ObjectId} userId
 * @param {ObjectId} userSpecialIdId
 * @returns {Promise<Object>}
 */
// userSpecialIdSchema.statics.activateForUser = async function (userId, userSpecialIdId) {
//   const userSpecialId = await this.findOne({
//     _id: userSpecialIdId,
//     user: userId,
//     expirationDate: { $gt: new Date() },
//   });

//   if (!userSpecialId) {
//     throw new Error('Special ID not found or expired');
//   }

//   // Deactivate all other special IDs for this user
//   await this.updateMany(
//     { user: userId, _id: { $ne: userSpecialIdId } },
//     { isActive: false }
//   );

//   // Activate the selected special ID
//   userSpecialId.isActive = true;
//   await userSpecialId.save();

//   // Swap the user's userId with the special ID value and store originalUserId
//   const User = mongoose.model('User');
//   const user = await User.findById(userId);
//   if (!user) {
//     throw new Error('User not found');
//   }

//   // If originalUserId is not set, store current userId
//   if (!user.originalUserId) {
//     user.originalUserId = user.userId;
//   }

//   // Replace displayed userId with special id value
//   user.userId = userSpecialId.value;
//   // Keep specialId.expirationDate and reference to active special id for quick checks
//   user.specialId = user.specialId || {};
//   user.specialId.expirationDate = userSpecialId.expirationDate;
//   user.specialId.activeSpecialId = userSpecialId._id;

//   await user.save();

//   return userSpecialId;
// };
const ApiError = require('../utils/ApiError');
// or the correct path in your project
userSpecialIdSchema.statics.activateForUser = async function (userId, userSpecialIdId) {
  const userSpecialId = await this.findOne({
    _id: userSpecialIdId,
    user: userId,
    expirationDate: { $gt: new Date() },
  });
  if (!userSpecialId) {
    throw new ApiError(404, 'Special ID not found or expired', 'الرقم المميز غير موجود أو منتهي');
  }
  const User = mongoose.model('User');
  // ✅ CHECK if this special ID value is already used by another user
  const alreadyUsed = await User.findOne({
    userId: userSpecialId.value,
    _id: { $ne: userId },
  }).lean();
  if (alreadyUsed) {
    throw new ApiError(
      400,
      'This special ID is already used by another user',
      'هذا الرقم المميز مستخدم بالفعل'
    );
  }
  // Deactivate other special IDs
  await this.updateMany(
    { user: userId, _id: { $ne: userSpecialIdId } },
    { isActive: false }
  );
  userSpecialId.isActive = true;
  await userSpecialId.save();
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found', 'المستخدم غير موجود');
  }
  if (!user.originalUserId) {
    user.originalUserId = user.userId;
  }
  user.userId = userSpecialId.value;
  user.specialId = {
    expirationDate: userSpecialId.expirationDate,
    activeSpecialId: userSpecialId._id,
  };
  await user.save();
  return userSpecialId;
};


/**
 * Deactivate a user's special id and revert to original userId
 * @param {ObjectId} userId
 * @param {ObjectId} userSpecialIdId
 */
userSpecialIdSchema.statics.deactivateForUser = async function (userId, userSpecialIdId) {
  const userSpecialId = await this.findOne({
    _id: userSpecialIdId,
    user: userId,
  });

  if (!userSpecialId) {
    throw new Error('Special ID not found');
  }

  // Mark special id as inactive
  userSpecialId.isActive = false;
  await userSpecialId.save();

  // Revert user's userId to originalUserId if present
  const User = mongoose.model('User');
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (user.originalUserId) {
    user.userId = user.originalUserId;
  }

  // Clear active special id reference but keep expirationDate for records
  if (user.specialId) {
    user.specialId.activeSpecialId = null;
    // Optionally update expirationDate to now or leave as-is; leave as-is to allow UI to show last expiry
  }

  await user.save();

  return userSpecialId;
};

/**
 * Generate and add special ID to user for VIP subscription
 * @param {ObjectId} userId
 * @param {number} vipLevel - VIP level (1-7)
 * @param {number} duration - Duration in days
 * @param {string} source - Source of acquisition
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>}
 */
userSpecialIdSchema.statics.generateForVipUser = async function (userId, vipLevel, duration, source = 'vip_subscription', metadata = {}) {
  // Check if user already has a special ID for this VIP level
  const existingUserSpecialId = await this.findOne({
    user: userId,
    vipLevel: vipLevel,
  });

  if (existingUserSpecialId) {
    // Extend the expiration date
    const newExpirationDate = new Date(Math.max(existingUserSpecialId.expirationDate, new Date()));
    newExpirationDate.setDate(newExpirationDate.getDate() + duration);

    existingUserSpecialId.expirationDate = newExpirationDate;
    existingUserSpecialId.metadata = { ...existingUserSpecialId.metadata, ...metadata };
    await existingUserSpecialId.save();

    return existingUserSpecialId;
  }

  // Generate a unique special ID value
  const specialIdValue = await this.generateUniqueSpecialId(vipLevel);

  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + duration);

  // Create new user special ID
  const userSpecialId = new this({
    user: userId,
    name: specialIdValue,
    value: specialIdValue,
    expirationDate,
    vipLevel,
    source,
    metadata: {
      ...metadata,
      duration,
    },
  });

  await userSpecialId.save();
  return userSpecialId;
};

/**
 * Generate a unique special ID value
 * @param {number} vipLevel
 * @returns {Promise<string>}
 */
userSpecialIdSchema.statics.generateUniqueSpecialId = async function (vipLevel) {
  const prefixes = {
    1: '111',
    2: '222',
    3: '333',
    4: '444',
    5: '555',
    6: '666',
    7: '777',
  };

  const prefix = prefixes[vipLevel] || '000';
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    // Generate random 5 digit number
    const randomNumber = Math.floor(Math.random() * (99999 - 10000) + 10000);
    const specialIdValue = `${prefix}${randomNumber}`;

    // Check if this value already exists
    const exists = await this.findOne({ value: specialIdValue });
    if (!exists) {
      return specialIdValue;
    }

    attempts++;
  }

  // Fallback: use timestamp
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}${timestamp}`;
};
/**
 * Clean up expired special IDs
 */
userSpecialIdSchema.statics.cleanupExpired = async function () {
  const result = await this.deleteMany({
    expirationDate: { $lt: new Date() },
  });
  return result;
};

const UserSpecialId = mongoose.model('UserSpecialId', userSpecialIdSchema);

module.exports = UserSpecialId;
