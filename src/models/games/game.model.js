const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    image: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    active: {
      type: Boolean,
      default: true,
    },
    rateMultiplier: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    gifts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gift',
      },
    ],
    storeItems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item',
      },
    ],
    gameBoxCredits: {
      type: Number,
      default: 0,
    },
    screen_width: {
      type: Number,
      default: 1920,
    },
    screen_height: {
      type: Number,
      default: 1080,
    },
  },
  {
    timestamps: true,
  }
);

const Game = mongoose.model('Game', gameSchema);

// Static method to remove gift references when a gift is deleted
Game.removeGiftReference = async function (giftId) {
  const result = await this.updateMany({ gifts: giftId }, { $pull: { gifts: giftId } });
  return result;
};

module.exports = Game;
