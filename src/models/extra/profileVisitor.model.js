const mongoose = require('mongoose');

// Create a schema for the profile visitor
const profileVisitorSchema = new mongoose.Schema({
  visitedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  visitorUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  visitedDate: {
    type: Date,
    required: true,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  amount: {
    type: Number,
    default: 1,
  },
  createdAt: {
    type: Date,
    default: Date.now, // Automatically set the date when a document is created
    index: { expires: '60d' }, // MongoDB TTL index to auto-delete after 60 days
  },
});

// Create a compound index to ensure uniqueness of visitor per day
// profileVisitorSchema.index({ visitedUserId: 1, visitorUserId: 1, visitedDate: 1 }, { unique: true });
// profileVisitorSchema.index({ visitedUserId: 1, visitorUserId: 1, visitedDate: -1 });
profileVisitorSchema.index({ visitedUserId: 1, visitorUserId: 1 }, { unique: true });


const ProfileVisitor = mongoose.model('ProfileVisitor', profileVisitorSchema);

module.exports = ProfileVisitor;
