/**
 * Global error handling middleware
 */
function errorHandler(err, req, res, next) {
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default error response
  let statusCode = 500;
  let message = 'Internal server error';
  let details = 'An unexpected error occurred';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = err.message;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
    details = 'Authentication required';
  } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Service unavailable';
    details = 'External service is currently unavailable';
  } else if (err.message.includes('API key')) {
    statusCode = 401;
    message = 'Authentication failed';
    details = 'Invalid or missing API key';
  } else if (err.message.includes('quota') || err.message.includes('limit')) {
    statusCode = 429;
    message = 'Rate limit exceeded';
    details = 'API quota exceeded. Please try again later.';
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: message,
    details: details,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

/**
 * Handle 404 errors for undefined routes
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'Not found',
    details: `Route ${req.method} ${req.url} not found`
  });
}

/**
 * Async error wrapper to catch errors in async route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};
