const mongoose = require('mongoose');

const { Schema } = mongoose;

const chargePrize = new Schema(
  {

    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: ['weekly', 'monthly'],
      required: true,
    },
    requiredPoints: {
      type: Number,
      required: true,
      min: 0,
    },
    items: [
      {
        item: {
          type: Schema.Types.ObjectId,
          ref: 'Item', // Existing database Item model
          required: true,
        },
        days: {
          type: Number,
          default: 1,
          min: 1,
        },
        displayName: {
          type: String,
          trim: true,
        },
      },
    ],
    gifts: [
      {
        gift: {
          type: Schema.Types.ObjectId,
          ref: 'Gift', // Existing database Gift model
          required: true,
        },
        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },
        displayName: {
          type: String,
          trim: true,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    vipDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    vipLevel: {
      type: Number,
      default: 0,
      min: 0,
      max: 7,
    },
    proMonths: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const ChargePrize = mongoose.model('ChargePrize', chargePrize);

// Static method to remove gift references when a gift is deleted
ChargePrize.removeGiftReference = async function (giftId) {
  const result = await this.updateMany({ 'gifts.gift': giftId }, { $pull: { gifts: { gift: giftId } } });
  return result;
};

module.exports = ChargePrize;
