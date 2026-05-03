import morgan from 'morgan';
import { createWriteStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = join(__dirname, '../../logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

// Create a write stream for access logs (append mode)
const accessLogStream = createWriteStream(join(logsDir, 'access.log'), {
  flags: 'a',
});

// Custom token for response time in milliseconds
morgan.token('response-time-ms', (req, res) => {
  if (!req._startAt || !res._startAt) {
    return '0';
  }
  const ms = (res._startAt[0] - req._startAt[0]) * 1e3 +
    (res._startAt[1] - req._startAt[1]) * 1e-6;
  return ms.toFixed(3);
});

// Custom token for request body (be careful with sensitive data)
morgan.token('body', (req) => {
  if (req.body && Object.keys(req.body).length > 0) {
    // Filter out sensitive fields
    const sanitizedBody = { ...req.body };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization'];
    sensitiveFields.forEach(field => {
      if (sanitizedBody[field]) {
        sanitizedBody[field] = '[REDACTED]';
      }
    });
    return JSON.stringify(sanitizedBody);
  }
  return '-';
});

// Custom format for development
const devFormat = ':method :url :status :response-time ms - :res[content-length]';

// Custom format for production with more details
const prodFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time-ms ms';

// Combined format with custom additions
const combinedFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms';

/**
 * Get Morgan middleware based on environment
 * @returns {Function} Morgan middleware
 */
export const getLogger = () => {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'production') {
    // In production, log to file and use combined format
    return morgan(combinedFormat, { stream: accessLogStream });
  } else if (env === 'development') {
    // In development, log to console with colored output
    return morgan('dev');
  } else {
    // For other environments (test, staging), use combined format to console
    return morgan(combinedFormat);
  }
};

/**
 * Get Morgan middleware for error logging
 * @returns {Function} Morgan middleware that only logs errors
 */
export const getErrorLogger = () => {
  const errorLogStream = createWriteStream(join(logsDir, 'error.log'), {
    flags: 'a',
  });

  return morgan(combinedFormat, {
    stream: errorLogStream,
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
