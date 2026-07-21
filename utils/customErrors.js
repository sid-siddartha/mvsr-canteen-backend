class AppError extends Error {
  constructor(message, statusCode, location = 'Unknown') {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.location = location; // Format: 'ControllerName -> methodName'

    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message, location) {
    super(message, 400, location);
  }
}

class UnauthorizedError extends AppError {
  constructor(message, location) {
    super(message, 401, location);
  }
}

class ForbiddenError extends AppError {
  constructor(message, location) {
    super(message, 403, location);
  }
}

class NotFoundError extends AppError {
  constructor(message, location) {
    super(message, 404, location);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
};
