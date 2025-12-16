const mongoose = require('mongoose');
const generalRoomConfig = require('../../config/room/general.config');
const roomAssetSchema = require('./embeded/embeddedAsset.schema');
const roomSpecialMicSchema = require('./embeded/embeddedSpecialMic.schema');
const micSchema = require('./embeded/embeddedMic.schema');
const { PkBattleModelSchema } = require('./embeded/embeddedRoomPk.schema');

const roomSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    roomCountryCode: {
      type: String,
      default: 'SA',
    },
    subject: {
      type: String,
      default: 'قراّن',
    },
    image: {
      type: String,
      default: '',
    },
    background: { type: roomAssetSchema, default: generalRoomConfig.defaultBackground },
    micShape: { type: roomAssetSchema, default: generalRoomConfig.defaultMicShape },
    totalCharizmaCount: {
      type: Number,
      default: 0,
    },
    password: {
      type: String,
      default: '',
    },
    announce: {
      type: String,
      default: '',
    },
    gameImage: {
      type: String,
      default: '',
    },
    roomFrame: {
      url: {
        type: String,
        default: '',
      },
      expirationDate: {
        type: Date,
        default: () => Date.now(),
      },
    },
    gameRoomId: {
      type: String,
      default: '',
    },
    gameLink: {
      type: String,
      default: '',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      unique: true, // Ensure each user can own only one room
      required: true,
    },
    moderators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isPrivate: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    currentState: {
      charizmaMode: {
        type: Boolean,
        default: false,
      },
      enterEffectEnabled: {
        type: Boolean,
        default: true,
      },
      hostMicEnabled: {
        type: Boolean,
        default: true,
      },
      guessGameEnabled: {
        type: Boolean,
        default: false,
      },
    },
    roomType: {
      type: String,
      enum: generalRoomConfig.RoomTypesArray,
      default: 'classicRoom',
    },
    purchasedRoomTypes: [
      {
        type: String,
        enum: generalRoomConfig.RoomTypesArray,
      },
    ],
    specialMics: {
      type: Map,
      of: roomSpecialMicSchema,
      default: {},
    },
    participantsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    ingressInfo: {
      type: Object,
      default: {},
    },
    streamKey: {
      type: String,
      default: '',
    },
    isConstant: {
      type: Boolean,
      default: false,
    },
    constantRank: {
      type: Number,
      default: null,
    },
    mics: {
      type: [micSchema],
      default: [],
    },
    pkBattleModel: {
      type: PkBattleModelSchema,
      default: null,
    },
    isPkEnabled: {
      type: Boolean,
      default: false,
    },
    livekitRoomName: {
      type: String,
      default: '', 
    },
  },
  {
    timestamps: true,
  }
);

async function updatePkTime(room) {
  if (!room?.pkBattleModel) return;
  const model = room.pkBattleModel;
  // Not started → nothing to do
  if (!model.pkBattelIsStarted || !model.startedAt) return;
  const now = Date.now();
  const elapsed = Math.floor((now - model.startedAt.getTime()) / 1000);
  // Remaining time (countdown)
  const remaining = model.pkTime - elapsed;
  // Expose remaining time (frontend can show countdown)
  model.currentPkTime = Math.max(remaining, 0);
  // If countdown hit zero → stop PK
  if (remaining <= 0) {
    console.log(`PK countdown finished → stopping PK for room ${room._id}`);
    // Call service safely (do not .save() here!)
    const RoomServicePk = require("../../services/room/room-pk.service");
    await RoomServicePk.updatePkBattle(room._id, {
      pkBattelIsStarted: false,
      currentPkTime: 0
    });
    return;
  }
}


// For queries returning many docs
roomSchema.post("find", function (docs) {
  docs.forEach(updatePkTime);
});

// For queries returning one doc
roomSchema.post("findOne", function (doc) {
  if (doc) updatePkTime(doc);
});

// For findOneAndUpdate returning the updated doc
roomSchema.post("findOneAndUpdate", function (doc) {
  if (doc) updatePkTime(doc);
});



// Pre-remove middleware to clean up related data when room is deleted
roomSchema.pre('remove', async function (next) {
  const roomId = this._id;

  try {
    // Remove room posts
    await this.model('RoomPost').deleteMany({ room: roomId });

    // Remove room-specific assets (those with roomId not null)
    await this.model('RoomAsset').deleteMany({ roomId: roomId });

    // Remove room blocks
    await this.model('RoomBlock').deleteMany({ roomId: roomId });

    // Remove room participants
    await this.model('Participant').deleteMany({ roomId: roomId });

    // Remove group contributions related to this room
    await this.model('GroupContribution').deleteMany({ roomId: roomId });

    // Update users who have this room as current room
    await this.model('User').updateMany(
      { currentRoom: roomId },
      { $unset: { currentRoom: 1 } }
    );

    // Update users who have this room reference
    await this.model('User').updateMany(
      { room: roomId },
      { $unset: { room: 1 } }
    );

    // Update groups that reference this room
    await this.model('Group').updateMany(
      { groupRoom: roomId },
      { $unset: { groupRoom: 1 } }
    );

    // Remove chat messages that reference this room in invitation content
    await this.model('ChatMessage').deleteMany({
      'content.roomId': roomId
    });

    next();
  } catch (error) {
    next(error);
  }
});

// Pre middleware for deleteOne method
roomSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
  const roomId = this._id;

  try {
    // Remove room posts
    await this.model('RoomPost').deleteMany({ room: roomId });

    // Remove room-specific assets (those with roomId not null)
    await this.model('RoomAsset').deleteMany({ roomId: roomId });

    // Remove room blocks
    await this.model('RoomBlock').deleteMany({ roomId: roomId });

    // Remove room participants
    await this.model('Participant').deleteMany({ roomId: roomId });

    // Remove group contributions related to this room
    await this.model('GroupContribution').deleteMany({ roomId: roomId });

    // Update users who have this room as current room
    await this.model('User').updateMany(
      { currentRoom: roomId },
      { $unset: { currentRoom: 1 } }
    );

    // Update users who have this room reference
    await this.model('User').updateMany(
      { room: roomId },
      { $unset: { room: 1 } }
    );

    // Update groups that reference this room
    await this.model('Group').updateMany(
      { groupRoom: roomId },
      { $unset: { groupRoom: 1 } }
    );

    // Remove chat messages that reference this room in invitation content
    await this.model('ChatMessage').deleteMany({
      'content.roomId': roomId
    });

    next();
  } catch (error) {
    next(error);
  }
});

// Pre middleware for findOneAndDelete method
roomSchema.pre('findOneAndDelete', async function (next) {
  const room = await this.model.findOne(this.getQuery());
  if (!room) {
    return next();
  }

  const roomId = room._id;

  try {
    // Remove room posts
    await mongoose.model('RoomPost').deleteMany({ room: roomId });

    // Remove room-specific assets (those with roomId not null)
    await mongoose.model('RoomAsset').deleteMany({ roomId: roomId });

    // Remove room blocks
    await mongoose.model('RoomBlock').deleteMany({ roomId: roomId });

    // Remove room participants
    await mongoose.model('Participant').deleteMany({ roomId: roomId });

    // Remove group contributions related to this room
    await mongoose.model('GroupContribution').deleteMany({ roomId: roomId });

    // Update users who have this room as current room
    await mongoose.model('User').updateMany(
      { currentRoom: roomId },
      { $unset: { currentRoom: 1 } }
    );

    // Update users who have this room reference
    await mongoose.model('User').updateMany(
      { room: roomId },
      { $unset: { room: 1 } }
    );

    // Update groups that reference this room
    await mongoose.model('Group').updateMany(
      { groupRoom: roomId },
      { $unset: { groupRoom: 1 } }
    );

    // Remove chat messages that reference this room in invitation content
    await mongoose.model('ChatMessage').deleteMany({
      'content.roomId': roomId
    });

    next();
  } catch (error) {
    next(error);
  }
});


/**
 * Clean up expired room assets like frames, backgrounds, mic shapes, etc.
 * Run daily from the scheduler.
 */
roomSchema.statics.cleanUpExpiredItems = async function () {
  const now = new Date();
  try {
    const expiredRooms = await this.find({
      'roomFrame.expirationDate': { $lt: now },
      'roomFrame.url': { $ne: '' },
    });
    for (const room of expiredRooms) {
      room.roomFrame = { url: '', expirationDate: null };
      await room.save();
      console.log(`[RoomCleanup] Reset expired frame for room: ${room.name}`);
    }
    console.log(`[RoomCleanup] Cleaned ${expiredRooms.length} expired frames.`);
    return expiredRooms.length;
  } catch (error) {
    console.error('[RoomCleanup] Error cleaning up expired frames:', error);
    throw error;
  }
};


const Room = mongoose.model('Room', roomSchema);

module.exports = Room;

// room mods // model
