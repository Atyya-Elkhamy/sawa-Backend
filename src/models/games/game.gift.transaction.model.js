// models/gameGiftTransaction.model.js
const mongoose = require('mongoose');

const gameGiftTransactionSchema = new mongoose.Schema(
  {
    gift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gift',
      default: null,
    },
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Game', // Reference to the Game model
      required: true,
      index: true, // Index to speed up queries involving gameId
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true, // Index to speed up queries involving recipient
    },
    price: {
      type: Number,
      required: true,
      min: 0, // Ensure price is not negative
    },
    message: {
      type: String,
      default: '',
      trim: true, // Trim spaces
      maxlength: 200, // Limit the length of the message if needed
    },
  },
  {
    timestamps: true,
  }
);

// Add a compound index if you frequently query by gameId and recipient together
gameGiftTransactionSchema.index({ gameId: 1, recipient: 1, price: 1 });

// get leader board of top 10 users in this round in the game

gameGiftTransactionSchema.statics.getLeaderBoard = async function (gameId) {
  return this.aggregate([
    { $match: { gameId } },
    {
      $group: {
        _id: '$recipient',
        total: { $sum: '$price' },
      },
    },
    { $sort: { total: -1 } },
    { $limit: 10 },
  ]);
};

gameGiftTransactionSchema.statics.getGlobalLeaderBoard = async function (gameId) {
  const pipeline = [
    { $match: { gameId: new mongoose.Types.ObjectId(gameId) } }, // Filter by gameId
    {
      $group: {
        _id: '$recipient', // Group by recipient (user)
        totalProfit: { $sum: '$price' }, // Sum all the prices for total profit
      },
    },
    { $sort: { totalProfit: -1 } }, // Sort by total profit in descending order
    {
      $group: {
        _id: null,
        users: {
          $push: {
            recipient: '$_id',
            totalProfit: '$totalProfit',
          },
        },
      },
    },
    {
      $unwind: {
        path: '$users',
        includeArrayIndex: 'rank', // Add rank as 0-indexed rank
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'users.recipient',
        foreignField: '_id',
        as: 'userDetails',
      },
    },
    { $unwind: '$userDetails' }, // Flatten the lookup result
    {
      $project: {
        rank: { $add: ['$rank', 1] }, // 1-based rank
        userId: '$userDetails.userId',
        name: '$userDetails.name',
        avatar: '$userDetails.avatar',
        frame: '$userDetails.frame',
        totalProfit: '$users.totalProfit',
        id: '$users.recipient',
      },
    },
    { $limit: 50 }, // Pagination: limit documents
  ];

  const results = await this.aggregate(pipeline).exec();

  return {
    results,
  };
};

gameGiftTransactionSchema.statics.getRoundLeaderBoard = async function (gameId) {
  // get top3 last 60 seconds
  const pipeline = [
    {
      $match: {
        gameId: new mongoose.Types.ObjectId(gameId),
        createdAt: { $gte: new Date(new Date() - 60 * 1000) },
      },
    }, // Filter by gameId and createdAt in the last 60 seconds
    {
      $group: {
        _id: '$recipient', // Group by recipient (user)
        totalProfit: { $sum: '$price' }, // Sum all the prices for total profit
      },
    },
    { $sort: { totalProfit: -1 } }, // Sort by total profit in descending order
    {
      $group: {
        _id: null,
        users: {
          $push: {
            recipient: '$_id',
            totalProfit: '$totalProfit',
          },
        },
      },
    },
    {
      $unwind: {
        path: '$users',
        includeArrayIndex: 'rank', // Add rank as 0-indexed rank
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'users.recipient',
        foreignField: '_id',
        as: 'userDetails',
      },
    },
    { $unwind: '$userDetails' }, // Flatten the lookup result
    {
      $project: {
        rank: { $add: ['$rank', 1] }, // 1-based rank
        userId: '$userDetails.userId',
        name: '$userDetails.name',
        avatar: '$userDetails.avatar',
        frame: '$userDetails.frame',
        totalProfit: '$users.totalProfit',
        id: '$users.recipient',
      },
    },
    { $limit: 3 }, // Pagination: limit documents
  ];
  const results = await this.aggregate(pipeline).exec();
  return {
    results,
  };
};

// Optionally, add some schema methods or statics here if needed
// Example: Method to get total gifts sent by a game in a specific round
gameGiftTransactionSchema.statics.getTotalGiftsByGameAndRound = async function (gameId) {
  return this.aggregate([{ $match: { gameId } }, { $group: { _id: null, totalGifts: { $sum: '$price' } } }]);
};

/**
 * Get the profit history of a user
 * @param {ObjectId} userId - ID of the user
 * @param gameId
 * @param {number} page - Current page number
 * @param {number} limit - Limit of records per page
 * @returns {Promise<object>} - Paginated user profit history data
 */
gameGiftTransactionSchema.statics.getUserProfitHistory = async function (userId, gameId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  const pipeline = [
    {
      $match: {
        gameId: new mongoose.Types.ObjectId(gameId),
        recipient: new mongoose.Types.ObjectId(userId),
      },
    }, // Filter by recipient and gameId
    { $sort: { createdAt: -1 } }, // Sort by createdAt in descending order
    { $skip: skip }, // Pagination: skip documents
    { $limit: limit }, // Pagination: limit documents
  ];

  const results = await this.aggregate(pipeline).exec();
  const totalCount = await this.countDocuments({
    recipient: userId,
    gameId: new mongoose.Types.ObjectId(gameId),
  });

  return {
    results,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
  };
};

/**
 * Get the rank of a user in the global leaderboard
 * @param {ObjectId} gameId - ID of the game
 * @param {ObjectId} userId - ID of the user
 * @returns {Promise<object>} - User's rank and total profit
 */
gameGiftTransactionSchema.statics.getUserRank = async function (gameId, userId) {
  const matchConditions = {
    gameId: new mongoose.Types.ObjectId(gameId),
  };

  const results = await this.aggregate([
    { $match: matchConditions }, // Filter by gameId and round if provided
    {
      $group: {
        _id: '$recipient', // Group by recipient (user)
        totalProfit: { $sum: '$price' }, // Sum total gift prices for each user
      },
    },
    { $sort: { totalProfit: -1 } }, // Sort by total profit in descending order
    {
      $project: {
        recipient: '$_id',
        totalProfit: 1,
      },
    },
    {
      $group: {
        _id: null,
        users: {
          $push: { recipient: '$recipient', totalProfit: '$totalProfit' },
        },
      },
    },
    { $unwind: { path: '$users', includeArrayIndex: 'rank' } }, // Add the rank as a 0-indexed rank
    { $match: { 'users.recipient': new mongoose.Types.ObjectId(userId) } }, // Match the specific user
    {
      $lookup: {
        from: 'users', // Lookup the user details
        localField: 'users.recipient',
        foreignField: '_id',
        as: 'userDetails',
      },
    },
    { $unwind: '$userDetails' }, // Unwind the userDetails array
    {
      $project: {
        rank: { $add: ['$rank', 1] }, // Make the rank 1-based
        userId: '$userDetails.userId',
        name: '$userDetails.name',
        avatar: '$userDetails.avatar',
        frame: '$userDetails.frame',
        balance: '$userDetails.credits',
        totalProfit: '$users.totalProfit',
      },
    },
  ]).exec();

  if (results.length === 0) {
    return {
      rank: null,
      totalProfit: 0,
    };
  }

  // Return the first result if it exists, otherwise return null
  return results.length > 0 ? results[0] : null;
};

const GameGiftTransaction = mongoose.model('GameGiftTransaction', gameGiftTransactionSchema);

// Static method to delete game gift transactions when a gift is deleted
GameGiftTransaction.deleteByGift = async function (giftId) {
  const result = await this.deleteMany({ gift: giftId });
  return result;
};

module.exports = GameGiftTransaction;
