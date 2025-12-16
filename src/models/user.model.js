const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { toJSON, paginate } = require('./plugins');
// const { roles } = require('../config/roles');
const { generateUniqueUserId } = require('../utils/IDGen');

const defaultAvatar = 'https://sawa-sawa.s3.eu-north-1.amazonaws.com/public/default_avatar.png';
// Define the User schema
const userSchema = mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ['google', 'facebook', 'phone'],
      default: 'phone',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      // can be empty for google and facebook
      default: '',
      // if empty dont give null index

      validate(value) {
        if (this.provider === 'phone' && !validator.isMobilePhone(value, 'any')) {
          throw new Error('Invalid phone number');
        }
      },
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      trim: true,
      required: false,
      default: '',
      private: true,
      validate(value) {
        if (!value) {
          return;
        }
        if (this.provider === 'phone') {
          if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
            throw new Error('Password must contain at least one letter and one number');
          }
        }
      },
    },
    userId: {
      type: String,
      unique: true,
      required: true, // Important, prevent doc creation if userId is undefined
      default: null,
    },
    // Keep originalUserId so we can swap back when special IDs are deactivated or expired
    originalUserId: {
      type: String,
      default: null,
      index: true,
    },
    avatar: {
      type: String,
      default: defaultAvatar,
      // optional
      required: false,
    },
    // expirable items
    frame: {
      url: {
        type: String,
        default: '',
      },
      expirationDate: {
        type: Date,
        default: Date.now(),
      },
    },
    enterEffect: {
      url: {
        type: String,
        default: '',
      },
      expirationDate: {
        type: Date,
        default: Date.now(),
      },
    },
    soundEffect: {
      url: {
        type: String,
        default: '',
      },
      expirationDate: {
        type: Date,
        default: Date.now(),
      },
    },
    typingColor: {
      url: {
        type: String,
        default: '',
      },
      expirationDate: {
        type: Date,
        default: Date.now(),
      },
    },
    typingBubble: {
      url: {
        type: String,
        default: '',
      },
      expirationDate: {
        type: Date,
        default: Date.now(),
      },
    },
    wing: {
      url: {
        type: String,
        default: '',
      },
      expirationDate: {
        type: Date,
        default: Date.now(),
      },
    },

    // Note: special ID values are stored in the UserSpecialId collection.
    // We keep an expirationDate field for UI/quick checks but no longer store the special id value here.
    specialId: {
      expirationDate: {
        type: Date,
        default: Date.now(),
      },
      // activeSpecialId is an optional reference to the UserSpecialId document when active
      activeSpecialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserSpecialId',
        default: null,
      },
    },
    countryCode: {
      type: mongoose.Schema.Types.Mixed,
      default: '',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
    },
    hostAgency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agency',
      default: null,
    },
    followersCount: {
      type: Number,
      default: 0,
    },
    followingCount: {
      type: Number,
      default: 0,
    },
    friendsCount: {
      type: Number,
      default: 0,
    },
    credits: {
      type: Number,
      default: 0,
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Host',
      default: null,
    },
    famePoints: {
      type: Number,
      default: 0,
      index: -1,
    },
    richPoints: {
      type: Number,
      default: 0,
      index: -1,
    },
    isAgencyHost: {
      type: Boolean,
      default: false,
    },
    isSuperAdmin: {
      type: Boolean,
      default: false,
    },
    isCustomerService: {
      type: Boolean,
      default: false,
    },
    currentRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now(),
    },
    isMale: {
      type: Boolean,
      default: true,
    },
    lastGenderChangeDate: {
      type: Date,
      default: null,
    },
    dateOfBirth: {
      type: Date,
      required: true,
      default: Date.now() - 1000 * 60 * 60 * 24 * 365 * 18,
    },
    googleId: {
      type: String,
      default: '',
      // unique if not empty
    },
    facebookId: {
      type: String,
      default: '',
    },
    creditAgency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CreditAgency',
      default: null,
    },
    level: {
      type: Number,
      default: 0,
    },
    levelPoints: {
      type: Number,
      default: 0,
    },
    chargeLevel: {
      type: Number,
      default: 0,
      min: 0,
      max: 200,
    },
    totalChargedAmount: {
      type: Number,
      default: 0,
    },
    weeklyGifts: {
      type: Number,
      default: 0,
    },
    vip: {
      level: { type: Number, default: 0, min: 0, max: 7 },
      expirationDate: {
        type: Date,
        default: null,
      },
    },
    pro: {
      expirationDate: { type: Date, default: null },
    },
    settings: {
      friendsMessages: {
        type: Boolean,
        default: true, // or false, based on what should be default
      },
      systemMessages: {
        type: Boolean,
        default: true,
      },
      giftsFromPossibleFriends: {
        type: Boolean,
        default: true,
      },
      addFollowers: {
        type: Boolean,
        default: true,
      },
    },
    deletionRequest: {
      submittedAt: {
        type: Date,
        default: null,
      },
      scheduledAt: {
        type: Date,
        default: null,
      },
      isActive: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Add plugins that convert mongoose to JSON and add pagination
userSchema.plugin(toJSON);
userSchema.plugin(paginate);

userSchema.pre(/^find/, function (next) {
  // `this.getOptions().select` is the projection (i.e., fields) for this query
  const fields = this.projection();

  // add the special id to the projection
  // check if not empty object
  if (fields && !fields.specialId && Object.keys(fields).length !== 0) {
    fields.specialId = 1;
  }

  // If fields is undefined, it means no projection is specified => fetch everything => populate.
  // If fields is a string, it might look like "name email currentRoom" => we can check if it includes "currentRoom".
  // If fields is an object, it might look like { name: 1, email: 1, currentRoom: 1 } => we can check if currentRoom is not explicitly excluded.
  // There are many possibilities, so we handle them robustly below.

  // Helper to check if "currentRoom" is included (or not explicitly excluded):
  /**
   *
   * @param fieldsArg
   */
  function isCurrentRoomSelected(fieldsArg) {
    if (!fieldsArg) return true; // no projection => select all => populate
    if (typeof fieldsArg === 'string') {
      // e.g. .select('name email currentRoom')
      return fieldsArg.split(' ').includes('currentRoom');
    }
    if (typeof fieldsArg === 'object') {
      // e.g. .select({ name: 1, currentRoom: 1 })  or  .select({ name: 1, currentRoom: 0 })
      // If currentRoom is not in the fields object at all, that typically means "not excluded"
      // unless there is a pattern of only including certain fields.
      // For robust checking, you might do extra logic. Here's a simpler approach:
      if (fieldsArg.currentRoom === 0) return false;
      if (fieldsArg.currentRoom === 1) return true;
      // If the user is only including some fields and doesn't mention `currentRoom`,
      // Mongoose won't return it. So let's interpret that as "excluded," or you can interpret it as "not mentioned => skip."
      // The approach differs by your preference. For example, we can interpret "not mentioned => do not populate".
      return false;
    }
    return false;
  }
  if (isCurrentRoomSelected(fields)) {
    // Populate the "currentRoom" field with only "name" and "roomType"
    this.populate('currentRoom', 'name roomType image background isPrivate currentState.hostMicEnabled micShape');
  }

  return next();
});

/**
 * Check if email is taken
 * @param {string} email - The user's email
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
userSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};
userSchema.statics.isPhoneTaken = async function (phone, excludeUserId) {
  const user = await this.findOne({ phone, _id: { $ne: excludeUserId } });
  return !!user;
};

/**
 * Check if password matches the user's password
 * @param {string} password
 * @returns {Promise<boolean>}
 */
userSchema.methods.isPasswordMatch = async function (password) {
  return bcrypt.compare(password, this.password);
};

/**
 * Pre-save hook to hash password if modified
 */
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 8);
  }
  // if credits modified make sure it is not negative and its integer
  if (this.isModified('credits')) {
    this.credits = Math.floor(this.credits);
  }
  next();
});

/**
 * Pre-remove hook to delete all associated documents when a user is deleted
 */
userSchema.pre(['deleteOne', 'findOneAndDelete'], { document: true, query: false }, async function (next) {
  await deleteUserAssociatedData(this._id);
  next();
});

userSchema.pre(['deleteMany'], { document: false, query: true }, async function (next) {
  const users = await this.model.find(this.getFilter()).select('_id');
  const userIds = users.map((user) => user._id);

  for (const userId of userIds) {
    await deleteUserAssociatedData(userId);
  }
  next();
});

/**
 * Helper function to delete all data associated with a user
 * @param {ObjectId} userId - The ID of the user to delete data for
 */
async function deleteUserAssociatedData(userId) {
  console.log(`Deleting all associated data for user ${userId}`);

  try {
    // Get references to all models that need cleanup
    const BoughtGift = mongoose.model('BoughtGift');
    const BoughtItem = mongoose.model('BoughtItem');
    const Profile = mongoose.model('Profile');
    const Achievement = mongoose.model('Achievement');
    const StrangerGift = mongoose.model('StrangerGift');
    const ProfileVisitor = mongoose.model('ProfileVisitor');
    const UserCreditTransaction = mongoose.model('UserCreditTransaction');
    const FriendshipLog = mongoose.model('FriendshipLog');
    const GiftTransaction = mongoose.model('GiftTransaction');
    const GameUserTransaction = mongoose.model('GameUserTransaction');
    const GameGiftTransaction = mongoose.model('GameGiftTransaction');
    const HostAgencyRequest = mongoose.model('HostAgencyRequest');
    const HostAgencyInvite = mongoose.model('HostAgencyInvite');
    const GroupContribution = mongoose.model('GroupContribution');
    const PointAnalytics = mongoose.model('PointAnalytics');
    const ChatMessage = mongoose.model('ChatMessage');
    const Conversation = mongoose.model('Conversation');
    const SystemMessage = mongoose.model('SystemMessage');
    const RoomPost = mongoose.model('RoomPost');
    const Participant = mongoose.model('Participant');
    const CreditTransaction = mongoose.model('CreditTransaction');
    const Host = mongoose.model('Host');
    const Room = mongoose.model('Room');
    const Group = mongoose.model('Group');
    const Token = mongoose.model('Token');
    const Challenge = mongoose.model('Challenge');
    const DeviceToken = mongoose.model('DeviceToken');
    const RoomBlock = mongoose.model('RoomBlock');
    const GroupRelation = mongoose.model('GroupRelation');
    const HostDailyRecord = mongoose.model('HostDailyRecord');

    // Relations models
    const Follow = mongoose.model('Follow');
    const Friendship = mongoose.model('Friendship');
    const Block = mongoose.model('Block');
    const FollowRequest = mongoose.model('FollowRequest');
    const UserSpecialId = mongoose.model('UserSpecialId');

    // Delete all records where user is referenced
    const deletionPromises = [
      // Direct user references
      BoughtGift.deleteMany({ user: userId }),
      BoughtItem.deleteMany({ user: userId }),
      Profile.deleteMany({ user: userId }),
      Achievement.deleteMany({ user: userId }),
      Achievement.deleteMany({ targetUser: userId }),
      UserSpecialId.deleteMany({ user: userId }),
      UserCreditTransaction.deleteMany({ user: userId }),
      FriendshipLog.deleteMany({ userId }),
      FriendshipLog.deleteMany({ friendId: userId }),
      FriendshipLog.deleteMany({ remover: userId }),
      GameUserTransaction.deleteMany({ user: userId }),
      HostAgencyRequest.deleteMany({ user: userId }),
      HostAgencyInvite.deleteMany({ user: userId }),
      GroupContribution.deleteMany({ user: userId }),
      PointAnalytics.deleteMany({ user: userId }),
      RoomPost.deleteMany({ user: userId }),
      Participant.deleteMany({ userId }),
      CreditTransaction.deleteMany({ relatedUser: userId }),
      Host.deleteMany({ user: userId }),
      Token.deleteMany({ user: userId }),
      Challenge.deleteMany({ createdBy: userId }),
      Challenge.deleteMany({ acceptedBy: userId }),
      Challenge.deleteMany({ winner: userId }),
      DeviceToken.deleteMany({ user: userId }),
      RoomBlock.deleteMany({ userId }),
      GroupRelation.deleteMany({ user: userId }),

      // Gift and stranger gift transactions
      StrangerGift.deleteMany({ senderId: userId }),
      StrangerGift.deleteMany({ receiverId: userId }),
      GiftTransaction.deleteMany({ sender: userId }),
      GiftTransaction.deleteMany({ recipient: userId }),
      GameGiftTransaction.deleteMany({ recipient: userId }),

      // Profile visitors
      ProfileVisitor.deleteMany({ visitedUserId: userId }),
      ProfileVisitor.deleteMany({ visitorUserId: userId }),

      // Chat and conversations
      ChatMessage.deleteMany({ senderId: userId }),
      ChatMessage.deleteMany({ receiverId: userId }),
      SystemMessage.deleteMany({ receiverId: userId }),

      // Relations
      Follow.deleteMany({ follower: userId }),
      Follow.deleteMany({ following: userId }),
      Friendship.deleteMany({ user1: userId }),
      Friendship.deleteMany({ user2: userId }),
      Block.deleteMany({ blocker: userId }),
      Block.deleteMany({ blocked: userId }),
      FollowRequest.deleteMany({ requester: userId }),
      FollowRequest.deleteMany({ recipient: userId }),
    ];

    // Execute all deletions in parallel
    const results = await Promise.allSettled(deletionPromises);

    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Failed to delete associated data at index ${index}:`, result.reason);
      }
    });

    // Handle special cases that require more complex logic

    // Find and delete HostDailyRecords for hosts owned by this user
    const userHosts = await Host.find({ user: userId }).select('_id');
    const hostIds = userHosts.map((host) => host._id);
    if (hostIds.length > 0) {
      await HostDailyRecord.deleteMany({ host: { $in: hostIds } });
    }

    // Delete conversations where user is a participant
    await Conversation.deleteMany({
      participants: userId,
    });

    // Update rooms owned by the user - transfer ownership or delete
    const ownedRooms = await Room.find({ owner: userId });
    for (const room of ownedRooms) {
      // For now, we'll delete the room. You might want to transfer ownership instead
      await Room.deleteOne({ _id: room._id });
    }

    // Remove user from room moderators
    await Room.updateMany({ moderators: userId }, { $pull: { moderators: userId } });

    // Update groups where user is admin - transfer ownership or delete
    // const adminGroup = await Group.findOne({ admin: userId });
    // if (adminGroup) {
    //   // Transfer ownership to the first member
    //   const newAdmin = await Users.findOne({ group: adminGroup._id });
    //   if (newAdmin) {
    //     adminGroup.admin = newAdmin.user;
    //     await adminGroup.save();
    //   } else {
    //     await Group.deleteOne({ _id: adminGroup._id });
    //   }
    // } else {
    //   await Group.deleteOne({ _id: adminGroup._id });
    // }

    const adminGroup = await Group.findOne({ admin: userId });
    if (adminGroup) {
      const newAdmin = await User.findOne({ group: adminGroup._id });
      if (newAdmin) {
        adminGroup.admin = newAdmin._id;
        await adminGroup.save();
      } else {
        await Group.deleteOne({ _id: adminGroup._id });
      }
    }

    // Update user counts in other users (followers, following, friends)
    // This would require more complex logic to update counters correctly

    console.log(`Successfully deleted all associated data for user ${userId}`);
  } catch (error) {
    console.error(`Error deleting associated data for user ${userId}:`, error);
    throw error;
  }
}

const originalToJSON =
  userSchema.methods.toJSON ||
  function () {
    return this.toObject();
  };
userSchema.methods.toJSON = function () {
  const obj = originalToJSON.call(this);

  // We no longer override `userId` with a special id in JSON here.
  // `userId` now always holds the currently visible ID (either original or special when active).
  // Keep the specialId.expirationDate and activeSpecialId available for UI if present.

  return obj;
};

userSchema.statics.cleanUpExpiredItems = async function () {
  const now = new Date();
  const expirableFields = [
    'frame',
    'enterEffect',
    'soundEffect',
    'typingColor',
    'typingBubble',
    'wing',
  ];
  const update = {};
  for (const field of expirableFields) {
    update[`${field}.url`] = '';
    update[`${field}.expirationDate`] = null;
  }
  // Clean up users with expired items
  await this.updateMany(
    {
      $or: expirableFields.map((field) => ({
        [`${field}.expirationDate`]: { $lt: now, $ne: null },
      })),
    },
    { $set: update }
  );
};


/**
 * @typedef User
 */
const User = mongoose.model('User', userSchema);

// Export the cascading delete function for use in admin interface
User.deleteUserAssociatedData = deleteUserAssociatedData;

module.exports = User;
