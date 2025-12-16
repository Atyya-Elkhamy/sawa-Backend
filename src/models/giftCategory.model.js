const mongoose = require('mongoose');

const giftCategorySchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    nameAr: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const GiftCategory = mongoose.model('GiftCategory', giftCategorySchema);

module.exports = GiftCategory;
