// models/pointAnalytics.model.js

const mongoose = require('mongoose');

const pointAnalyticsSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    famePoints: {
      type: Number,
      default: 0,
    },
    richPoints: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const PointAnalytics = mongoose.model('PointAnalytics', pointAnalyticsSchema);

module.exports = PointAnalytics;
