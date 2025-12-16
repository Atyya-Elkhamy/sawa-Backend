const mongoose = require('mongoose');

const boughtGiftSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    gift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gift',
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware to handle cascading deletes
boughtGiftSchema.pre('deleteOne', { document: false, query: true }, async function () {
  // This will be called when using deleteOne on the query
  const doc = await this.model.findOne(this.getFilter());
  if (doc) {
    console.log(`Deleting BoughtGift: ${doc._id}`);
  }
});

boughtGiftSchema.pre('deleteMany', { document: false, query: true }, async function () {
  // This will be called when using deleteMany on the query
  const docs = await this.model.find(this.getFilter());
  console.log(`Deleting ${docs.length} BoughtGift documents`);
});

const BoughtGift = mongoose.model('BoughtGift', boughtGiftSchema);

// Static method to delete bought gifts when a user is deleted
BoughtGift.deleteByUser = async function (userId) {
  const result = await this.deleteMany({ user: userId });
  console.log(`Deleted ${result.deletedCount} bought gifts for user ${userId}`);
  return result;
};

// Static method to delete bought gifts when a gift is deleted
BoughtGift.deleteByGift = async function (giftId) {
  const result = await this.deleteMany({ gift: giftId });
  console.log(`Deleted ${result.deletedCount} bought gifts for gift ${giftId}`);
  return result;
};

module.exports = BoughtGift;
