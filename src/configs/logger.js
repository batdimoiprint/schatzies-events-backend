import morgan from 'morgan';

/**
 * Get Morgan middleware based on environment
 * Simple setup that works in both local and Lambda environments
 * @returns {Function} Morgan middleware
 */
export const getLogger = () => {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'development') {
    // In development, log to console with colored output
    return morgan('dev');
  } else {
    // In production/Lambda, use combined format to stdout (CloudWatch)
    return morgan('combined');
  }
};

/**
 * Get Morgan middleware for error logging
 * @returns {Function} Morgan middleware that only logs errors
 */
export const getErrorLogger = () => {
  return morgan('combined', {
    skip: (req, res) => res.statusCode < 400, // Only log errors (4xx and 5xx)
  });
};

/**
 * Skip logging for specific routes (like health checks)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {boolean} Whether to skip logging
 */
export const skipHealthCheck = (req, res) => {
  return req.url === '/health' || req.url === '/api/health';
};

export default getLogger;
