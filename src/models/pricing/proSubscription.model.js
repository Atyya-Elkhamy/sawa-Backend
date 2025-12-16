const mongoose = require('mongoose');

const proSubscriptionSchema = mongoose.Schema(
  {
    months: {
      type: Number,
      required: true,
      unique: true,
      min: 1,
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

// Add indexes
proSubscriptionSchema.index({ isActive: 1 });

/**
 * @typedef ProSubscription
 */
const ProSubscription = mongoose.model('ProSubscription', proSubscriptionSchema);

module.exports = ProSubscription;
