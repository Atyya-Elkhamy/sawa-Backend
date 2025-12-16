const mongoose = require('mongoose');

const participantSchema = mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    role: {
      type: String,
      enum: ['member', 'moderator', 'host'],
      default: 'member',
    },
  },
  { timestamps: true }
);

participantSchema.index({ roomId: 1, userId: 1 }, { unique: true }); // Ensure a user can join a room only once

const Participant = mongoose.model('Participant', participantSchema);

module.exports = Participant;
