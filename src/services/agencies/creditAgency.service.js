const httpStatus = require('http-status');
const { CreditAgency, CreditTransaction, User } = require('../../models');
const ApiError = require('../../utils/ApiError');
const userService = require('../user.service');
const { formatUserModel } = require('../../utils/formatter');
/**
 * Get the credit balance for a user
 * @param {ObjectId} userId
 * @returns {Promise<CreditAgency>}
 */
const getCreditBalance = async (userId) => {
  const creditAgency = await CreditAgency.findOne({ user: userId });
  if (!creditAgency) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Credit agency not found', 'وكالة الشحن غير موجودة');
  }
  return creditAgency;
};

/**
 * Get the credit agency for a user
 * @param {ObjectId} userId
 * @returns {Promise<CreditAgency> }
 */
const getCreditAgency = async (userId) => {
  const creditAgency = await CreditAgency.findOne({ user: userId });
  if (!creditAgency || creditAgency.banned) {
    return null;
  }
  return creditAgency;
};

/**
 * Add or deduct credits for a user and log the transaction
 * @param {ObjectId} userId
 * @param {number} amount
 * @param {string} type - 'credit' or 'debit'
 * @param {ObjectId} relatedUserId
 * @returns {Promise<CreditAgency>}
 */
const updateCredits = async (userId, amount, type, relatedUserId = null) => {
  const creditAgency = await CreditAgency.findOneAndUpdate(
    { user: userId },
    { $inc: { balance: type === 'credit' ? amount : -amount } },
    { new: true, upsert: true }
  );

  if (!creditAgency) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Credit agency not found', 'وكالة الشحن غير موجودة');
  }

  await CreditTransaction.create({
    user: userId,
    amount,
    type,
    relatedUser: relatedUserId,
  });

  return creditAgency;
};

/**
 * Get the credit transaction history for a user
 * @param {ObjectId} userId
 * @param {number} date - Number of days to go back in history
 * @param limit
 * @param page
 * @returns {Promise<Array<CreditTransaction>>}
 */
const getCreditTransactionHistory = async (userId, date = 1, limit = 10, page = 1) => {
  if (!userId) {
    throw new Error('User ID is required');
  }
  // Get the credit agency for the user
  const creditAgency = await CreditAgency.findOne({ user: userId });
  if (!creditAgency) {
    throw new Error('Credit agency not found for this user');
  }

  // Calculate the date range based on the day of month
  const today = new Date();
  let targetDate = new Date(today.getFullYear(), today.getMonth(), date);

  // If the target day is greater than today's day, go back to previous month
  if (date > today.getDate()) {
    targetDate = new Date(today.getFullYear(), today.getMonth() - 1, date);
  }

  // Set start date to beginning of the target day
  const startDate = new Date(targetDate.setHours(0, 0, 0, 0));
  // Set end date to end of the target day
  const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

  // Find transactions in the date range with pagination
  const transactions = await CreditTransaction.find({
    creditAgency: creditAgency.id,
    createdAt: {
      $gte: startDate,
      $lt: endDate,
    },
  })
    .populate([
      {
        path: 'relatedUser',
        select: userService.userProjection,
      },
      {
        path: 'creditAgency',
        select: 'name balance _id',
      },
    ])
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  // Get the total count of transactions in the date range
  const totalCount = await CreditTransaction.countDocuments({
    creditAgency: creditAgency.id,
    createdAt: {
      $gte: startDate,
      $lt: endDate,
    },
  });

  // Format the relatedUser for each transaction
  const formattedTransactions = transactions.map((transaction) => {
    return {
      ...transaction.toObject(),
      relatedUser: formatUserModel(transaction.relatedUser),
    };
  });

  return {
    data: formattedTransactions,
    limit,
    total: totalCount,
    next_page: page < Math.ceil(totalCount / limit) ? page + 1 : null,
  };
};

/**
 * add credit agency to the user
 * @param {ObjectId} userId
 * @param {object} creditAgencyBody
 * @returns {Promise<CreditAgency>}
 */
const addCreditAgency = async (userId, creditAgencyBody) => {
  const user = await User.findById(userId).select('creditAgency');

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
  }
  const creditAgencyExists = await CreditAgency.findOne({ user });
  if (creditAgencyExists) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Credit agency already exists', 'وكالة الشحن موجودة بالفعل');
  }
  const creditAgency = CreditAgency.create({
    ...creditAgencyBody,
    user: userId,
  });
  if (!creditAgency) {
    throw new ApiError(httpStatus.NOT_FOUND, 'cannot add credit agency', 'لا يمكن اضافة وكالة ائتمان');
  }
  return creditAgency;
};

/**
 * Transfer credits between two users
 * @param {ObjectId} fromUserId - ID of the user sending credits
 * @param {Array<{toUserId: ObjectId, amount: number}>} transfers - Array of transfer objects
 * @returns {Promise<object>} - The updated sender and recipient credit agencies
 */

const transferCredits = async (fromUserId, transfers) => {
  const senderAgency = await CreditAgency.findOne({ user: fromUserId }).populate('user', 'userId _id');

  if (!senderAgency) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Sender credit agency not found', 'وكالة الشحن غير موجودة');
  }

  // Transform agency to handle deleted user
  const transformedSenderAgency = userService.transformDeletedUsers(senderAgency, 'user');

  if (transformedSenderAgency.banned) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Sender credit agency is banned', 'وكالة الشحن محظورة');
  }

  // Calculate the total amount to be transferred
  const totalAmount = transfers.reduce((sum, transfer) => sum + transfer.amount, 0);

  // Check if the sender has sufficient balance
  if (transformedSenderAgency.balance < totalAmount) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient balance', 'رصيد غير كافي');
  }

  // Perform the transfer using the model method
  const { sender, recipients } = await senderAgency.transferCredits(transfers, senderAgency.user.userId);

  // Log transactions for each transfer
  const transactions = transfers.map((transfer) => ({
    creditAgency: senderAgency.id,
    amount: -transfer.amount,
    type: 'debit',
    relatedUser: transfer.toUserId,
  }));

  await CreditTransaction.insertMany(transactions);

  return { sender, recipients };
};

const receiveCredits = async (creditAgencyId, amount, userId) => {
  const creditAgency = await CreditAgency.findById(creditAgencyId);
  if (!creditAgency) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Credit agency not found', 'وكالة الشحن غير موجودة');
  }
  creditAgency.balance += amount;
  await creditAgency.save();

  CreditTransaction.create({
    relatedUser: userId,
    amount,
    type: 'credit',
    creditAgency: creditAgency.id,
  });

  return creditAgency;
};

module.exports = {
  getCreditBalance,
  updateCredits,
  getCreditTransactionHistory,
  addCreditAgency,
  transferCredits,
  receiveCredits,
  getCreditAgency,
};
