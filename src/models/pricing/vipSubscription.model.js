const mongoose = require('mongoose');

const vipSubscriptionSchema = mongoose.Schema(
  {
    vipLevel: {
      type: Number,
      required: true,
      min: 1,
      max: 7,
    },
    days: {
      type: Number,
      required: true,
      enum: [7, 15, 30], // 7 days, 15 days, 30 days
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add compound unique index for vipLevel and days combination
vipSubscriptionSchema.index({ vipLevel: 1, days: 1 }, { unique: true });
vipSubscriptionSchema.index({ vipLevel: 1 });
vipSubscriptionSchema.index({ days: 1 });
vipSubscriptionSchema.index({ isActive: 1 });

/**
 * @typedef VipSubscription
 */
const VipSubscription = mongoose.model('VipSubscription', vipSubscriptionSchema);

module.exports = VipSubscription;
