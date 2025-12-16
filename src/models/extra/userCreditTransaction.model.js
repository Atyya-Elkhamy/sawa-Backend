const mongoose = require('mongoose');

// Define the Credit Transaction schema
const userCreditTransactionSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['credit', 'debit'], // 'credit' for adding funds, 'debit' for deducting funds
      default: 'credit',
    },
    description: {
      type: String,
      default: '',
    },
    descriptionAr: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);
userCreditTransactionSchema.index({ user: 1, createdAt: -1 });
const UserCreditTransaction = mongoose.model('UserCreditTransaction', userCreditTransactionSchema);

module.exports = UserCreditTransaction;
