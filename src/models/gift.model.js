// models/gift.model.js

const mongoose = require('mongoose');

const giftSchema = mongoose.Schema(
  {
    image: {
      type: String,
      required: false,
      default: '',
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GiftCategory',
      required: true,
    },
    gameMultiplier: {
      type: Number,
      default: 1,
    },
    type: {
      type: String,
      enum: ['free', 'pro', 'vip'],
      default: 'free',
      required: true,
    },
    file: {
      type: String, // URL or path to an optional file associated with the gift (e.g., animation, sound)
      default: '',
    },
    hidden: {
      type: Boolean,
      default: false,
    },
    // double decimel
    duration: {
      type: Number,
      default: 0,
    }
  },
  {
    timestamps: true,
  }
);

/**
 * Pre-remove hook to delete associated documents and references
 */
giftSchema.pre(['deleteOne', 'findOneAndDelete'], { document: true, query: false }, async function (next) {
  const BoughtGift = mongoose.model('BoughtGift');
  const GameGiftTransaction = mongoose.model('GameGiftTransaction');
  const StrangerGift = mongoose.model('StrangerGift');
  const Achievement = mongoose.model('Achievement');
  const Game = mongoose.model('Game');
  const ChargePrize = mongoose.model('ChargePrize');

  await Promise.all([
    BoughtGift.deleteByGift(this._id),
    GameGiftTransaction.deleteByGift(this._id),
    StrangerGift.deleteByGift(this._id),
    Achievement.deleteByGift(this._id),
    Game.removeGiftReference(this._id),
    ChargePrize.removeGiftReference(this._id),
  ]);
  next();
});

giftSchema.pre(['deleteMany'], { document: false, query: true }, async function (next) {
  const BoughtGift = mongoose.model('BoughtGift');
  const GameGiftTransaction = mongoose.model('GameGiftTransaction');
  const StrangerGift = mongoose.model('StrangerGift');
  const Achievement = mongoose.model('Achievement');
  const Game = mongoose.model('Game');
  const ChargePrize = mongoose.model('ChargePrize');

  const gifts = await this.model.find(this.getFilter()).select('_id');
  const giftIds = gifts.map((gift) => gift._id);

  await Promise.all(
    giftIds.map(async (giftId) => {
      await Promise.all([
        BoughtGift.deleteByGift(giftId),
        GameGiftTransaction.deleteByGift(giftId),
        StrangerGift.deleteByGift(giftId),
        Achievement.deleteByGift(giftId),
        Game.removeGiftReference(giftId),
        ChargePrize.removeGiftReference(giftId),
      ]);
    })
  );
  next();
});

const Gift = mongoose.model('Gift', giftSchema);

module.exports = Gift;
