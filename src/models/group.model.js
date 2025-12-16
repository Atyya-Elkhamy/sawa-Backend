const mongoose = require('mongoose');

const groupSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    open: {
      type: Boolean,
      default: true,
    },
    groupId: {
      type: String,
      required: true,
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    contributionCredits: {
      type: Number,
      default: 0,
    },
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    groupRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null,
    },
    balance: {
      type: Number,
      default: 0,
    },
    cover: {
      type: String,
      default: null,
    },
    image: {
      type: String,
      default: null,
    },
    membersCount: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Method to update members count by counting users with this group
groupSchema.methods.updateMembersCount = async function() {
  const User = mongoose.model('User');
  this.membersCount = await User.countDocuments({ group: this._id });
  return this.save();
};

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;
