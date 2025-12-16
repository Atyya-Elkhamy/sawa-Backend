const mongoose = require('mongoose');

// Define the Credit Transaction schema
const creditTransactionSchema = mongoose.Schema(
  {
    creditAgency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CreditAgency',
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['credit', 'debit'], // 'credit' for adding funds, 'debit' for deducting funds
      required: true,
    },
    relatedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);
creditTransactionSchema.index({ creditAgency: 1, createdAt: -1 });
creditTransactionSchema.index({ relatedUser: 1 });
const CreditTransaction = mongoose.model('CreditTransaction', creditTransactionSchema);

module.exports = CreditTransaction;
