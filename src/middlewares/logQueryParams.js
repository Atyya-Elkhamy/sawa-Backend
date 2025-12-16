// middleware/logQueryParams.js

const logger = require('../config/logger');

const logQueryParams = (req, res, next) => {
  if (Object.keys(req.query).length > 0) {
    logger.info(`Query Parameters: ${JSON.stringify(req.query)}`);
  }
  next();
};

module.exports = logQueryParams;
