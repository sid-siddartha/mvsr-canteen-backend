const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let friendlyMessage = 'Something went wrong. Please try again later.';
  
  // Developer log formatting
  const location = err.location || 'UnknownRouteHandler';
  console.error({
    controller: location.split(' -> ')[0] || 'AppError',
    function: location.split(' -> ')[1] || 'Handler',
    message: err.message || err.description || (err.error && err.error.description) || 'No message available',
    stack: err.stack,
  });

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    friendlyMessage = 'Some information is missing or invalid.';
  }

  // Handle Mongoose Cast Error (Invalid Object ID)
  else if (err.name === 'CastError') {
    statusCode = 400;
    friendlyMessage = "We couldn't find the requested item.";
  }

  // Handle MongoDB Duplicate Key Error (Code 11000)
  else if (err.code === 11000) {
    statusCode = 400;
    friendlyMessage = 'This item already exists in the system.';
  }

  // Handle JWT Expiration / Invalid Token
  else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    friendlyMessage = 'Your session has expired. Please sign in again.';
  }

  // Handle Mongo Network / Selection Error
  else if (
    err.name === 'MongoNetworkError' ||
    err.name === 'MongooseServerSelectionError' ||
    (err.message && err.message.includes('connect ECONNREFUSED'))
  ) {
    statusCode = 503;
    friendlyMessage = 'Unable to connect to the server. Please try again in a moment.';
  }

  // Operational Errors (Custom AppErrors with explicit messages)
  else if (err.isOperational) {
    friendlyMessage = err.message || friendlyMessage;
  }

  // Respond to frontend with custom clean format
  res.status(statusCode).json({
    success: false,
    message: friendlyMessage,
  });
};

module.exports = errorHandler;
