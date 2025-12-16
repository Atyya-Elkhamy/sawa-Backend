// models/item.model.js

const mongoose = require('mongoose');
const { itemTypesArray } = require('../config/stores.config');
const { vipLevels } = require('../config/pricing');

const itemSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    type: {
      type: String,
      enum: itemTypesArray, // Refers to the section type directly
      index: true,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    image: {
      type: String,
      default: '',
    },
    file: {
      type: String,
    },
    description: {
      type: String,
    },
    isTopProduct: {
      type: Boolean,
      default: false,
    },
    isHidden: {
      type: Boolean, // Option to hide an item
      default: false,
    },
    usedUntil: {
      type: Date,
      // defult null only for the special ids
      default: null,
    },
    vipLevel: {
      type: String,
      default: '0',
      enum: ['0', ...vipLevels.map(String)], // 0 is for all users
    },
    vipOnly: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// when saving the item make vipOnly true if vipLevel is not 0

/**
 * Pre-remove hook to delete associated BoughtItem documents
 */
itemSchema.pre(['deleteOne', 'findOneAndDelete'], { document: true, query: false }, async function (next) {
  const BoughtItem = mongoose.model('BoughtItem');
  await BoughtItem.deleteByItem(this._id);
  next();
});

itemSchema.pre(['deleteMany'], { document: false, query: true }, async function (next) {
  const BoughtItem = mongoose.model('BoughtItem');
  const items = await this.model.find(this.getFilter()).select('_id');
  const itemIds = items.map((item) => item._id);

  await Promise.all(itemIds.map((itemId) => BoughtItem.deleteByItem(itemId)));
  next();
});

const Item = mongoose.model('Item', itemSchema);

module.exports = Item;
