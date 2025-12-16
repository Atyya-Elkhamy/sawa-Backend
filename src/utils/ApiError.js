class ApiError extends Error {
  constructor(statusCode, message, messageAr, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.messageAr = messageAr;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      statusCode: this.statusCode,
      message: this.message,
      messageAr: this.messageAr,
    };
  }
}

module.exports = ApiError;
