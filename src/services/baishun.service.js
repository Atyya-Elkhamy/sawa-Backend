const httpStatus = require('http-status');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const BaishunToken = require('../models/games/baishun.token.model');
const ApiError = require('../utils/ApiError');
const userService = require('./user.service');
const config = require('../config/config');
const logger = require('../config/logger');

/**
 * Get SS Token - Exchange temporary code for long-term token
 * @param {number} app_id
 * @param {string} user_id
 * @param {string} code
 * @returns {Promise<object>}
 */
const getSsToken = async (app_id, user_id, code) => {
  try {
    // In a real implementation, you would validate the code against your auth system
    // For now, we'll create a simple mapping or validation logic

    // Check if the code is valid (you might have a temporary code system)
    // This is where you'd validate the temporary code passed from the frontend

    // Find user by some identifier (this could be phone, email, or custom user_id)
    // For this example, let's assume user_id could be our internal user ID or userId field
    const user = await User.findOne({
      $or: [{ _id: user_id }, { userId: user_id }, { phone: user_id }, { email: user_id }],
    });

    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    // Generate SS Token
    const tokenData = await BaishunToken.generateSsToken(user_id, user._id, code, app_id);

    logger.info(`SS Token generated for user ${user_id}`, { app_id, user_id });

    return tokenData;
  } catch (error) {
    logger.error('Error generating SS Token:', error);
    if (error.message === 'Code already used') {
      throw new ApiError(1001, 'Code already used'); // BAISHUN specific error code
    }
    throw error;
  }
};

/**
 * Get User Info - Retrieve user information for games
 * @param {number} app_id
 * @param {string} user_id
 * @param {string} ss_token
 * @param {string} client_ip
 * @param {number} game_id
 * @returns {Promise<object>}
 */
const getUserInfo = async (app_id, user_id, ss_token, client_ip, game_id) => {
  try {
    // Verify SS Token
    const tokenDoc = await BaishunToken.verifySsToken(ss_token);

    if (tokenDoc.userId !== user_id || tokenDoc.app_id !== app_id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Token mismatch');
    }

    const { user } = tokenDoc;

    // Determine user type based on your business logic
    const user_type = 1; // 1: Ordinary users, 2: Whitelist users, 3: Blacklist users
    const release_cond = 0;

    // You can implement whitelist/blacklist logic here
    // if (user.isWhitelisted) user_type = 2;
    // if (user.isBlacklisted) user_type = 3;

    const userInfo = {
      user_id,
      user_name: user.name,
      user_avatar: user.avatar || '',
      balance: user.credits || 0, // Using credits as game currency
      user_type,
      release_cond,
    };

    // If you support multiple currencies, you can add balance_list
    // userInfo.balance_list = [
    //   {
    //     name: "Credits",
    //     currency_type: 1,
    //     currency_amount: user.credits || 0
    //   }
    // ];

    logger.info(`User info retrieved for ${user_id}`, { game_id, balance: userInfo.balance });

    return userInfo;
  } catch (error) {
    logger.error('Error getting user info:', error);
    throw error;
  }
};

/**
 * Update SS Token - Refresh an existing SS Token
 * @param {number} app_id
 * @param {string} user_id
 * @param {string} ss_token
 * @returns {Promise<object>}
 */
const updateSsToken = async (app_id, user_id, ss_token) => {
  try {
    // Verify current token
    const tokenDoc = await BaishunToken.verifySsToken(ss_token);

    if (tokenDoc.userId !== user_id || tokenDoc.app_id !== app_id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Token mismatch');
    }

    // Generate new token
    const newTokenData = await BaishunToken.updateSsToken(ss_token);

    logger.info(`SS Token updated for user ${user_id}`, { app_id });

    return newTokenData;
  } catch (error) {
    logger.error('Error updating SS Token:', error);
    throw error;
  }
};

/**
 * Change Balance - Handle game currency transactions
 * Enhanced with proper duplicate order handling and BAISHUN error codes
 * @param {object} transactionData
 * @returns {Promise<object>}
 */
const changeBalance = async (transactionData) => {
  const {
    app_id,
    user_id,
    ss_token,
    currency_diff,
    diff_msg,
    game_id,
    game_round_id,
    room_id,
    change_time_at,
    order_id,
    extend,
    msg_type,
    currency_type,
  } = transactionData;

  try {
    // Verify SS Token
    const tokenDoc = await BaishunToken.verifySsToken(ss_token);

    if (tokenDoc.userId !== user_id || tokenDoc.app_id !== app_id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Token mismatch');
    }

    // Check for duplicate order processing
    const duplicateCheck = await BaishunToken.recordGameTransaction(ss_token, order_id, transactionData);

    if (duplicateCheck.isDuplicate) {
      // For duplicate orders (especially settlement retries), return the previous balance
      logger.info(`Duplicate order detected for user ${user_id}`, {
        order_id,
        diff_msg,
        previous_balance: duplicateCheck.previousBalance,
      });

      return {
        currency_balance: duplicateCheck.previousBalance,
      };
    }

    const { user } = tokenDoc;

    // Process the balance change
    let updatedUser;
    const description = `BAISHUN Game ${diff_msg} - Game ID: ${game_id}`;
    const descriptionAr = `لعبة بايشن ${diff_msg} - معرف اللعبة: ${game_id}`;

    if (currency_diff < 0) {
      // Deduct credits (bet, buyin, etc.)
      const amount = Math.abs(currency_diff);

      // Check sufficient balance
      if (user.credits < amount) {
        throw new ApiError(1008, 'Insufficient balance'); // BAISHUN specific error code
      }

      updatedUser = await userService.deductUserBalance(user._id, amount, description, descriptionAr);
    } else if (currency_diff > 0) {
      // Add credits (result, refund, buyout, etc.)
      const amount = currency_diff;
      updatedUser = await userService.increaseUserBalance(user._id, amount, description, descriptionAr);
    } else {
      // No change in balance
      updatedUser = user;
    }

    const finalBalance = updatedUser.credits || 0;

    // Complete the transaction recording with the resulting balance
    await BaishunToken.completeGameTransaction(ss_token, order_id, transactionData, finalBalance);

    logger.info(`Balance changed for user ${user_id}`, {
      game_id,
      currency_diff,
      diff_msg,
      order_id,
      new_balance: finalBalance,
    });

    return {
      currency_balance: finalBalance,
    };
  } catch (error) {
    logger.error('Error changing balance:', error);

    // Return BAISHUN specific error codes
    if (error.statusCode === 1008) {
      throw error; // Insufficient balance
    }

    throw error;
  }
};

module.exports = {
  getSsToken,
  getUserInfo,
  updateSsToken,
  changeBalance,
};
