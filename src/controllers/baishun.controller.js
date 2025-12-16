const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const baishunService = require('../services/baishun.service');
const { generateResponseSignature, generateUniqueId } = require('../middlewares/baishunAuth');
const logger = require('../config/logger');

/**
 * Generate standard BAISHUN response format
 * @param {number} code - Error code (0 for success)
 * @param {string} message - Response message
 * @param {object} data - Response data
 * @param {object} req - Request object for signature generation
 * @returns {object} Formatted response
 */
const generateBaishunResponse = (code, message, data = null, req = null) => {
  const response = {
    code,
    message,
    unique_id: generateUniqueId()
  };

  if (data) {
    response.data = data;
  }

  // Add signature if needed for response authentication
  if (req && req.baishun) {
    const timestamp = Math.floor(Date.now() / 1000);
    response.timestamp = timestamp;
    response.signature = generateResponseSignature(req.baishun.signature_nonce, timestamp);
  }

  return response;
};

/**
 * Get SS Token endpoint
 * POST /v1/baishun-games/get-sstoken
 */
const getSsToken = catchAsync(async (req, res) => {
  const { app_id, user_id, code } = req.body;

  logger.info('gameRequest')
  console.log('BAISHUN getSsToken request ', { app_id, user_id });

  try {
    const tokenData = await baishunService.getSsToken(app_id, user_id, code);

    const response = generateBaishunResponse(0, 'succeed', tokenData, req);
    res.status(httpStatus.OK).send(response);

  } catch (error) {
    logger.error('getSsToken error:', error);

    let errorCode = 500; // Default server error
    let errorMessage = 'Internal server error';

    if (error.statusCode === 1001) {
      errorCode = 1001;
      errorMessage = 'Code already used';
    } else if (error.statusCode === httpStatus.NOT_FOUND) {
      errorCode = 404;
      errorMessage = 'User not found';
    } else if (error.message === 'Code already used') {
      errorCode = 1001;
      errorMessage = 'Code already used';
    }

    // Ensure error code is never 0 (0 means success in BAISHUN)
    if (errorCode === 0) {
      errorCode = 500;
    }

    const response = generateBaishunResponse(errorCode, errorMessage, null, req);
    res.status(httpStatus.OK).send(response); // BAISHUN expects 200 OK even for errors
  }
});

/**
 * Get User Info endpoint
 * POST /v1/baishun-games/get-user-info
 */
const getUserInfo = catchAsync(async (req, res) => {
  const { app_id, user_id, ss_token, client_ip, game_id } = req.body;

  logger.info('BAISHUN getUserInfo request', { app_id, user_id, game_id });

  try {
    const userInfo = await baishunService.getUserInfo(app_id, user_id, ss_token, client_ip, game_id);

    const response = generateBaishunResponse(0, 'succeed', userInfo, req);
    res.status(httpStatus.OK).send(response);

  } catch (error) {
    logger.error('getUserInfo error:', error);

    let errorCode = 500; // Default server error
    let errorMessage = 'Internal server error';

    if (error.statusCode === httpStatus.UNAUTHORIZED) {
      errorCode = 401;
      errorMessage = 'Invalid token';
    } else if (error.statusCode === httpStatus.NOT_FOUND) {
      errorCode = 404;
      errorMessage = 'User not found';
    } else if (error.message === 'Token not found or expired' || error.message === 'Invalid token') {
      errorCode = 401;
      errorMessage = 'Invalid token';
    } else if (error.message === 'Token mismatch') {
      errorCode = 401;
      errorMessage = 'Token mismatch';
    }

    // Ensure error code is never 0 (0 means success in BAISHUN)
    if (errorCode === 0) {
      errorCode = 500;
    }

    const response = generateBaishunResponse(errorCode, errorMessage, null, req);
    res.status(httpStatus.OK).send(response);
  }
});

/**
 * Update SS Token endpoint
 * POST /v1/baishun-games/update-sstoken
 */
const updateSsToken = catchAsync(async (req, res) => {
  const { app_id, user_id, ss_token } = req.body;

  logger.info('BAISHUN updateSsToken request', { app_id, user_id });

  try {
    const newTokenData = await baishunService.updateSsToken(app_id, user_id, ss_token);

    const response = generateBaishunResponse(0, 'succeed', newTokenData, req);
    res.status(httpStatus.OK).send(response);

  } catch (error) {
    logger.error('updateSsToken error:', error);

    let errorCode = 500; // Default server error
    let errorMessage = 'Internal server error';

    if (error.statusCode === httpStatus.UNAUTHORIZED) {
      errorCode = 401;
      errorMessage = 'Invalid token';
    } else if (error.message === 'Token not found or expired' || error.message === 'Invalid token') {
      errorCode = 401;
      errorMessage = 'Invalid token';
    } else if (error.message === 'Token mismatch') {
      errorCode = 401;
      errorMessage = 'Token mismatch';
    }

    // Ensure error code is never 0 (0 means success in BAISHUN)
    if (errorCode === 0) {
      errorCode = 500;
    }

    const response = generateBaishunResponse(errorCode, errorMessage, null, req);
    res.status(httpStatus.OK).send(response);
  }
});

/**
 * Change Balance endpoint
 * POST /v1/baishun-games/change-balance
 * Enhanced with proper duplicate order handling and BAISHUN error codes
 */
const changeBalance = catchAsync(async (req, res) => {
  const {
    app_id,
    user_id,
    ss_token,
    currency_diff,
    diff_msg,
    game_id,
    order_id
  } = req.body;

  logger.info('BAISHUN changeBalance request', {
    app_id,
    user_id,
    game_id,
    currency_diff,
    diff_msg,
    order_id
  });

  try {
    const balanceResult = await baishunService.changeBalance(req.body);

    const response = generateBaishunResponse(0, 'succeed', balanceResult, req);
    res.status(httpStatus.OK).send(response);

  } catch (error) {
    logger.error('changeBalance error:', error);

    let errorCode = 500; // Default server error
    let errorMessage = 'Internal server error';

    // Handle BAISHUN specific error codes
    if (error.statusCode === 1008) {
      errorCode = 1008;
      errorMessage = 'Insufficient balance';
    } else if (error.statusCode === httpStatus.UNAUTHORIZED) {
      errorCode = 401;
      errorMessage = 'Invalid token';
    } else if (error.statusCode === httpStatus.BAD_REQUEST) {
      errorCode = 400;
      errorMessage = 'Bad request';
    } else if (error.statusCode === httpStatus.NOT_FOUND) {
      errorCode = 404;
      errorMessage = 'User not found';
    } else if (error.message === 'Token not found') {
      errorCode = 401;
      errorMessage = 'Invalid token';
    } else if (error.message === 'Token mismatch') {
      errorCode = 401;
      errorMessage = 'Token mismatch';
    } else if (error.message === 'Invalid token') {
      errorCode = 401;
      errorMessage = 'Invalid token';
    }

    // Ensure error code is never 0 (0 means success in BAISHUN)
    if (errorCode === 0) {
      errorCode = 500;
    }

    const response = generateBaishunResponse(errorCode, errorMessage, null, req);
    res.status(httpStatus.OK).send(response); // BAISHUN expects 200 OK even for errors
  }
});

/**
 * Health check endpoint for BAISHUN integration
 * GET /v1/baishun-games/health
 */
const healthCheck = catchAsync(async (req, res) => {
  const response = {
    status: 'ok',
    service: 'BAISHUN Games Integration',
    timestamp: new Date().toISOString(),
    app_channel: process.env.APP_CHANNEL,
    app_id: process.env.APP_ID
  };

  res.status(httpStatus.OK).send(response);
});

module.exports = {
  getSsToken,
  getUserInfo,
  updateSsToken,
  changeBalance,
  healthCheck
};
