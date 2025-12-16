// game user transaction history model
const mongoose = require('mongoose');
const logger = require('../../config/logger');

const gameUserTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    game: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Game',
      required: true,
    },
    transactionType: {
      type: String,
      required: true,
      enum: ['credit', 'debit'],
      default: 'debit',
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      default: 'Payment on game',
    },
    descriptionAr: {
      type: String,
      default: 'دفع على اللعبة',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      // auto delete game user transaction history after 30 seconds
      index: { expires: '120s' },
    },
  },
  {
    timestamps: true,
  }
);

// static to get user payment history paginated with total count and total amount
gameUserTransactionSchema.statics.getUserPaymentHistory = async function (userId, game, page, limit) {
  const query = { user: new mongoose.Types.ObjectId(userId), game: new mongoose.Types.ObjectId(game) };
  logger.info(`getUserPaymentHistory query: ${JSON.stringify(query)}`);
  logger.info(`getUserPaymentHistory page: ${page}`);
  logger.debug(limit);

  const userPaymentHistory = await this.find(query)
    .sort({ createdAt: -1 })
    .skip(limit * (page - 1))
    .limit(limit);

  const totalAmountResult = await this.aggregate([
    {
      $match: query,
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);
  console.log(totalAmountResult);

  const totalAmount = totalAmountResult.length ? totalAmountResult[0].totalAmount : 0;
  const totalCount = totalAmountResult.length ? totalAmountResult[0].count : 0;

  const totalPages = Math.ceil(totalCount / limit);
  const nextPage = page < totalPages ? page + 1 : null;

  return {
    list: userPaymentHistory || [],
    page,
    limit,
    totalAmount: totalAmount || 0,
    totalTransactionsCount: totalCount || 0,
    totalPages,
    nextPage,
  };
};

const GameUserTransaction = mongoose.model('GameUserTransaction', gameUserTransactionSchema);
module.exports = GameUserTransaction;
