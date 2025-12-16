const mongoose = require('mongoose');

const giftTransactionSchema = mongoose.Schema(
  {
    gift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gift',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    amount: {
      type: Number,
      default: 1,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    message: {
      type: String,
      default: '', // Optional personalized message with the gift
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null, // Null if the gift is not sent in a room
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      default: null, // Null if the gift is not sent in a group
    },
  },
  {
    timestamps: true,
  }
);

// add index for sender, recipient, and date

giftTransactionSchema.index({ sender: 1, recipient: 1, date: 1 });
giftTransactionSchema.index({ recipient: 1, date: 1 });

// aggregate to get total gifts received by user and top 8 gifts received by user (most expensive gifts)

giftTransactionSchema.statics.getGiftStatsForUser = async function (userId) {
  const results = await this.aggregate([
    {
      $match: {
        recipient: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      // Lookup gift details for the gift field
      $lookup: {
        from: 'gifts',
        localField: 'gift',
        foreignField: '_id',
        as: 'giftDetails',
      },
    },
    {
      // Unwind the giftDetails array (since lookup returns an array)
      $unwind: '$giftDetails',
    },
    {
      // Group by gift ID to ensure distinct gifts
      $group: {
        _id: '$gift',
        totalAmount: { $sum: '$amount' },
        price: { $first: '$giftDetails.price' }, // Use original gift price for sorting
        image: { $first: '$giftDetails.image' },
        recipient: { $first: '$recipient' },
      },
    },
    {
      // Sort by gift price in descending order
      $sort: { price: -1 },
    },
    {
      // Group all results for the recipient
      $group: {
        _id: '$recipient',
        totalGiftsReceived: { $sum: '$totalAmount' },
        distinctGifts: {
          $push: {
            giftId: '$_id',
            image: '$image',
            price: '$price',
            amount: '$totalAmount',
          },
        },
      },
    },
    {
      // Take top 8 distinct gifts (already sorted by price)
      $addFields: {
        topGifts: {
          $slice: [
            {
              $map: {
                input: '$distinctGifts',
                as: 'gift',
                in: '$$gift.image',
              },
            },
            8,
          ],
        },
      },
    },
    {
      // Final projection to format the result
      $project: {
        _id: 0,
        totalGiftsReceived: 1,
        topGifts: 1,
      },
    },
  ]).exec();

  if (results.length > 0) {
    return results[0];
  }

  return {
    totalGiftsReceived: 0,
    topGifts: [],
  };
};
giftTransactionSchema.statics.getGiftSummaryForUser = async function (userId) {
  console.log('userId', userId);
  const results = await this.aggregate([
    {
      // Match transactions where the recipient is the specified user
      $match: {
        recipient: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      // Group by gift to calculate total count and sum of prices
      $group: {
        _id: '$gift', // Group by gift ID
        totalAmount: { $sum: '$amount' }, // Count of this gift received
        totalPrice: { $sum: '$price' }, // Sum of prices for this gift
      },
    },
    {
      // Lookup gift details (name, image) from the Gift collection
      $lookup: {
        from: 'gifts',
        localField: '_id',
        foreignField: '_id',
        as: 'giftDetails',
      },
    },
    {
      // Unwind the giftDetails array to access individual fields
      $unwind: '$giftDetails',
    },
    {
      // Project the final structure to include gift details, amount, and total price
      $project: {
        _id: 0, // Exclude the _id field from the output
        giftId: '$_id',
        name: '$giftDetails.name',
        image: '$giftDetails.image',
        pricePerGift: '$giftDetails.price',
        totalAmount: 1, // Total amount of this gift received
        totalPrice: 1, // Total price of this gift received
      },
    },
    {
      // Sort by totalAmount in descending order to show the most frequent gifts first
      $sort: { totalAmount: -1 },
    },
  ]).exec();

  console.log('results', results);

  return results.length > 0 ? results : [];
};

const GiftTransaction = mongoose.model('GiftTransaction', giftTransactionSchema);

module.exports = GiftTransaction;
