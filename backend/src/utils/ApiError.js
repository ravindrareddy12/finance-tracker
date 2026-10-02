// Error carrying an HTTP status code; thrown by controllers/services and
// rendered by the central error handler.
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }

  static badRequest(message)         { return new ApiError(400, message); }
  static unauthorized(message)       { return new ApiError(401, message); }
  static notFound(message)           { return new ApiError(404, message); }
  static conflict(message)           { return new ApiError(409, message); }
  static tooManyRequests(message)    { return new ApiError(429, message); }
  static timeout(message)            { return new ApiError(408, message); }
  static serviceUnavailable(message) { return new ApiError(503, message); }
}

module.exports = ApiError;
