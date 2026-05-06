const sendSuccess = (res, data, message = 'Success', statusCode = 200, pagination = null) => {
  const response = {
    success: true,
    message,
    data
  };
  
  if (pagination) {
    response.pagination = pagination;
  }
  
  return res.status(statusCode).json(response);
};

const sendError = (res, message = 'Internal Server Error', statusCode = 500, code = null) => {
  const response = {
    success: false,
    error: {
      message,
      code: code || statusCode
    }
  };
  
  return res.status(statusCode).json(response);
};

module.exports = {
  sendSuccess,
  sendError
};
