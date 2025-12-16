// // models/boughtItem.model.js

// const mongoose = require('mongoose');

// const boughtItemSchema = mongoose.Schema(
//   {
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//       index: true,
//     },
//     item: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Item',
//       required: true,
//     },
//     purchaseDate: {
//       type: Date,
//       default: Date.now,
//     },
//     expirationDate: {
//       type: Date, // Optional expiration date for the item
//     },
//     isHidden: {
//       type: Boolean, // Option to hide an item
//       default: false,
//     },
//     metadata: {
//       // Additional metadata for future use (e.g., price, discount)
//       price: { type: Number },
//       discount: { type: Number },
//     },
//     isSelected: {
//       type: Boolean,
//       default: false,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// // Create a TTL index on expirationDate to automatically delete the document after expirationDate
// boughtItemSchema.index({ expirationDate: 1 }, { expireAfterSeconds: 0 });
// boughtItemSchema.pre('save', function (next) {
//   // If expirationDate is null or undefined, TTL won't work on this document
//   if (this.expirationDate && this.expirationDate < new Date()) {
//     // If expiration date has already passed, set it to the current time
//     // This will cause the document to be eligible for deletion in the next TTL pass
//     this.expirationDate = new Date();
//   }
//   next();
// });
// // clean up expired items static method
// boughtItemSchema.statics.cleanUpExpiredItems = async function () {
//   const now = new Date();
//   await this.deleteMany({ expirationDate: { $lt: now, $ne: null } });
// };

// const BoughtItem = mongoose.model('BoughtItem', boughtItemSchema);

// // Static method to delete bought items when an item is deleted
// BoughtItem.deleteByItem = async function (itemId) {
//   const result = await this.deleteMany({ item: itemId });
//   return result;
// };

// module.exports = BoughtItem;

const mongoose = require('mongoose');

const boughtItemSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    specialId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserSpecialId' },
    purchaseDate: { type: Date, default: Date.now },
    expirationDate: { type: Date },
    isHidden: { type: Boolean, default: false },
    metadata: { price: { type: Number }, discount: { type: Number } },
    isSelected: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Ensure a user cannot have the same item twice
boughtItemSchema.index({
  user: 1, item: 1,
  'metadata.specialIdValue': 1
},
  { unique: true, sparse: true });

// TTL for expired items
boughtItemSchema.index({ expirationDate: 1 }, { expireAfterSeconds: 0 });

// Pre-save hook to push past expiration to current date
boughtItemSchema.pre('save', function (next) {
  if (this.expirationDate && this.expirationDate < new Date()) {
    this.expirationDate = new Date();
  }
  next();
});

// Manual cleanup of expired items
boughtItemSchema.statics.cleanUpExpiredItems = async function () {
  const now = new Date();
  await this.deleteMany({ expirationDate: { $lt: now, $ne: null } });
};

// Delete bought items by itemId
boughtItemSchema.statics.deleteByItem = async function (itemId) {
  return await this.deleteMany({ item: itemId });
};

const BoughtItem = mongoose.model('BoughtItem', boughtItemSchema);

module.exports = BoughtItem;
