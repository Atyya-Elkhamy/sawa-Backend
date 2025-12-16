const httpStatus = require('http-status');
const catchAsync = require('../../utils/catchAsync');
const { creditAgencyService } = require('../../services');

/**
 * Get credit agency balance for a user
 */
const getCreditBalance = catchAsync(async (req, res) => {
  const creditAgency = await creditAgencyService.getCreditBalance(req.user.id);
  res.status(httpStatus.OK).send({
    balance: creditAgency.balance,
    name: creditAgency.name,
    id: creditAgency.id,
  });
});

/**
 * Get credit transaction history for a user
 */
const getCreditTransactionHistory = catchAsync(async (req, res) => {
  const { date } = req.query;
  const { limit = 10, page = 1 } = req.query;
  const transactions = await creditAgencyService.getCreditTransactionHistory(req.user.id, date, limit, page);
  res.status(httpStatus.OK).send({ ...transactions });
});

/**
 * add credit agency to the user
 */
const addCreditAgency = catchAsync(async (req, res) => {
  const creditAgency = await creditAgencyService.addCreditAgency(req.params.userId, req.body);
  res.status(httpStatus.CREATED).send(creditAgency);
});
/**
 * Transfer credits between users
 */
const transferCredits = catchAsync(async (req, res) => {
  const { transfers } = req.body;
  const fromUserId = req.user.id; // Assuming the sender's user ID is in the URL path
  const { sender, recipients } = await creditAgencyService.transferCredits(fromUserId, transfers);
  res.status(httpStatus.OK).send({ sender, recipients });
});
module.exports = {
  getCreditBalance,
  getCreditTransactionHistory,
  addCreditAgency,
  transferCredits,
};
