const crypto = require('crypto');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const config = require('../config/config');

/**
 * BAISHUN signature validation middleware
 * Validates the signature based on BAISHUN's authentication algorithm
 */
const validateBaishunSignature = (req, res, next) => {
  try {
    const { signature_nonce, timestamp, signature, app_id } = req.body;
    console.log('BAISHUN validateBaishunSignature', { signature_nonce, timestamp, signature, app_id });
    console.log('request body', req.body);

    // Check if all required parameters are present
    if (!signature_nonce || !timestamp || !signature || !app_id) {
      return next(new ApiError(httpStatus.BAD_REQUEST, 'Missing required authentication parameters'));
    }

    // Check if app_id matches our configured APP_ID
    if (parseInt(app_id) !== parseInt(process.env.APP_ID)) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid app_id'));
    }

    // Check timestamp validity (within 15 seconds)
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const requestTimestamp = parseInt(timestamp);

    if (Math.abs(currentTimestamp - requestTimestamp) > 15) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Request timestamp expired'));
    }

    // Calculate expected signature
    const data = `${signature_nonce}${process.env.APP_KEY}${timestamp}`;
    const expectedSignature = crypto.createHash('md5').update(data).digest('hex');

    // Verify signature
    if (signature !== expectedSignature) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid signature'));
    }

    // Store validated data for use in controllers
    req.baishun = {
      app_id: parseInt(app_id),
      signature_nonce,
      timestamp: requestTimestamp,
      validated: true
    };

    next();
  } catch (error) {
    return next(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Authentication error'));
  }
};

/**
 * Generate response signature for BAISHUN
 * @param {string} nonce 
 * @param {number} timestamp 
 * @returns {string} signature
 */
const generateResponseSignature = (nonce, timestamp) => {
  const data = `${nonce}${process.env.APP_KEY}${timestamp}`;
  return crypto.createHash('md5').update(data).digest('hex');
};

/**
 * Generate unique request ID
 * @returns {string} unique ID
 */
const generateUniqueId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

module.exports = {
  validateBaishunSignature,
  generateResponseSignature,
  generateUniqueId
};
