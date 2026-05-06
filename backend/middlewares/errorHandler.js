const { sendError } = require('../utils/responseHelper');

const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return sendError(res, messages.join(', '), 400, 'VALIDATION_ERROR');
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return sendError(res, `Duplicate field value entered for ${field}`, 409, 'DUPLICATE_KEY');
  }

  // Joi validation error
  if (err.isJoi) {
    return sendError(res, err.details[0].message, 400, 'JOI_VALIDATION_ERROR');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token', 401, 'INVALID_TOKEN');
  }

  // Multer errors
  if (err.name === 'MulterError') {
    return sendError(res, err.message, 400, 'MULTER_ERROR');
  }
  
  if (err.message === 'Only PDF files are allowed!') {
    return sendError(res, err.message, 400, 'INVALID_FILE_TYPE');
  }

  // Default server error
  return sendError(res, err.message || 'Server Error', 500, 'SERVER_ERROR');
};

module.exports = errorHandler;
