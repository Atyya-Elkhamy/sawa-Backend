const httpStatus = require('http-status');
const mongoose = require('mongoose');
const ApiError = require('../../utils/ApiError');
const User = require('../user.model');
const chargeService = require('../../services/charge.service');

// Define the Credit Agency schema
const creditAgencySchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    name: {
      type: String,
      required: true,
    },
    banned: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Transfer credits to multiple users with retry logic
 * @param {Array} transfers - Array of transfer objects { toUserId: ObjectId, amount: number }
 * @param creditAgencyUserId
 * @returns {Promise<object>} - Details of the transactions including sender and recipients
 */
creditAgencySchema.methods.transferCredits = async function (transfers, creditAgencyUserId) {
  const totalAmount = transfers.reduce((sum, transfer) => sum + transfer.amount, 0);

  if (this.balance < totalAmount) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient balance', 'رصيد غير كافي');
  }

  for (const transfer of transfers) {
    const { toUserId, amount } = transfer;

    const recipientUser = await User.findById(toUserId);
    if (!recipientUser) {
      throw new ApiError(httpStatus.NOT_FOUND, `Recipient user not found for ID ${toUserId}`, 'المستلم غير موجود');
    }
    if (this.balance < amount) {
      break;
    }

    this.balance -= amount;

    await chargeService.addCreditsToUser(toUserId, amount, creditAgencyUserId);
  }

  await this.save();
  return {
    sender: {
      name: this.name,
      balance: this.balance,
      id: this._id,
    },
  };
};

/**
 * Add credits to the user's balance
 * @param {number} amount - Amount to add
 * @returns {Promise<CreditAgency>}
 */

creditAgencySchema.methods.addCredits = async function (amount) {
  this.balance += amount;
  await this.save();
  return this;
};

/**
 * Deduct credits from the user's balance
 * @param {number} amount - Amount to deduct
 * @returns {Promise<CreditAgency>}
 */
creditAgencySchema.methods.deductCredits = async function (amount) {
  if (this.balance < amount) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient balance', 'رصيد غير كافي');
  }
  this.balance -= amount;
  await this.save();
  return this;
};

const CreditAgency = mongoose.model('CreditAgency', creditAgencySchema);

module.exports = CreditAgency;
