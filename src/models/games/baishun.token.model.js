const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const config = require('../../config/config');

const baishunTokenSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userId: {
      type: String,
      required: true, // This is the user_id from BAISHUN (could be different from our internal ID)
    },
    ss_token: {
      type: String,
      required: true,
      unique: true,
    },
    code: {
      type: String,
      required: true, // The temporary code used to generate this token
    },
    app_id: {
      type: Number,
      required: true,
    },
    expirationDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    gameTransactions: [{
      order_id: String,
      game_id: Number,
      currency_diff: Number,
      diff_msg: String,
      change_time_at: Number,
      resulting_balance: Number, // Store the balance after this transaction
      processed: { type: Boolean, default: false },
      processed_at: { type: Date, default: Date.now }
    }]
  },
  {
    timestamps: true,
  }
);

// Index for performance
// Note: ss_token already has index due to unique: true
baishunTokenSchema.index({ userId: 1, app_id: 1 });
baishunTokenSchema.index({ user: 1, isActive: 1 });
baishunTokenSchema.index({ expirationDate: 1 });

/**
 * Generate SS Token
 * @param {string} userId - BAISHUN user ID
 * @param {ObjectId} userObjectId - Our internal user object ID
 * @param {string} code - Temporary code
 * @param {number} appId - App ID
 * @returns {object} Token data
 */
baishunTokenSchema.statics.generateSsToken = async function(userId, userObjectId, code, appId) {
  // Check if code was already used
  const existingToken = await this.findOne({ code, app_id: appId });
  if (existingToken) {
    throw new Error('Code already used');
  }

  // Generate JWT token as ss_token
  const payload = {
    userId: userId,
    userObjectId: userObjectId,
    app_id: appId,
    type: 'baishun_ss_token'
  };
  
  const expirationTime = new Date();
  expirationTime.setDate(expirationTime.getDate() + 30); // 30 days expiration
  
  const ss_token = jwt.sign(payload, config.jwt.secret, { 
    expiresIn: '30d'
  });

  // Save token to database
  const tokenDoc = await this.create({
    user: userObjectId,
    userId: userId,
    ss_token: ss_token,
    code: code,
    app_id: appId,
    expirationDate: expirationTime
  });

  return {
    ss_token: ss_token,
    expire_date: expirationTime.getTime() // Return in milliseconds as required by BAISHUN
  };
};

/**
 * Verify SS Token
 * @param {string} ss_token 
 * @returns {object} Token document
 */
baishunTokenSchema.statics.verifySsToken = async function(ss_token) {
  try {
    // Verify JWT
    const payload = jwt.verify(ss_token, config.jwt.secret);
    
    // Find token in database
    const tokenDoc = await this.findOne({ 
      ss_token: ss_token, 
      isActive: true,
      expirationDate: { $gt: new Date() }
    }).populate('user');

    if (!tokenDoc) {
      throw new Error('Token not found or expired');
    }

    return tokenDoc;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

/**
 * Update SS Token
 * @param {string} oldSsToken 
 * @returns {object} New token data
 */
baishunTokenSchema.statics.updateSsToken = async function(oldSsToken) {
  const tokenDoc = await this.verifySsToken(oldSsToken);
  
  // Generate new token
  const payload = {
    userId: tokenDoc.userId,
    userObjectId: tokenDoc.user._id,
    app_id: tokenDoc.app_id,
    type: 'baishun_ss_token'
  };
  
  const expirationTime = new Date();
  expirationTime.setDate(expirationTime.getDate() + 30); // 30 days expiration
  
  const new_ss_token = jwt.sign(payload, config.jwt.secret, { 
    expiresIn: '30d'
  });

  // Update token document
  tokenDoc.ss_token = new_ss_token;
  tokenDoc.expirationDate = expirationTime;
  await tokenDoc.save();

  return {
    ss_token: new_ss_token,
    expire_date: expirationTime.getTime()
  };
};

/**
 * Record game transaction to prevent duplicate processing
 * Enhanced to handle settlement order retries correctly
 * @param {string} ss_token 
 * @param {string} order_id 
 * @param {object} transactionData 
 * @returns {Promise<{isDuplicate: boolean, previousBalance?: number}>} Transaction processing result
 */
baishunTokenSchema.statics.recordGameTransaction = async function(ss_token, order_id, transactionData) {
  const tokenDoc = await this.findOne({ ss_token: ss_token });
  if (!tokenDoc) {
    throw new Error('Token not found');
  }

  // Check if order_id already exists
  const existingTransaction = tokenDoc.gameTransactions.find(tx => tx.order_id === order_id);
  
  if (existingTransaction) {
    // For settlement messages (diff_msg = 'result'), return the previous balance without processing again
    if (transactionData.diff_msg === 'result') {
      // Return the balance that was calculated when this order was first processed
      return {
        isDuplicate: true,
        previousBalance: existingTransaction.resulting_balance
      };
    }
    
    // For other transaction types, also treat as duplicate
    return {
      isDuplicate: true,
      previousBalance: existingTransaction.resulting_balance
    };
  }

  // This is a new transaction - we'll record it after balance processing
  return {
    isDuplicate: false
  };
};

/**
 * Complete transaction recording after successful balance change
 * @param {string} ss_token 
 * @param {string} order_id 
 * @param {object} transactionData 
 * @param {number} resultingBalance 
 * @returns {Promise<void>}
 */
baishunTokenSchema.statics.completeGameTransaction = async function(ss_token, order_id, transactionData, resultingBalance) {
  const tokenDoc = await this.findOne({ ss_token: ss_token });
  if (!tokenDoc) {
    throw new Error('Token not found');
  }

  // Add the completed transaction with resulting balance
  tokenDoc.gameTransactions.push({
    order_id: order_id,
    game_id: transactionData.game_id,
    currency_diff: transactionData.currency_diff,
    diff_msg: transactionData.diff_msg,
    change_time_at: transactionData.change_time_at,
    resulting_balance: resultingBalance,
    processed: true,
    processed_at: new Date()
  });

  await tokenDoc.save();
};

const BaishunToken = mongoose.model('BaishunToken', baishunTokenSchema);

module.exports = BaishunToken;
