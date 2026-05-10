/**
 * Morgan Logger Usage Examples
 * 
 * This file demonstrates various ways to use the Morgan logger
 * in the Schatzies Events Backend application.
 */

import express from 'express';
import { getLogger, getErrorLogger, skipHealthCheck } from '../src/configs/logger.js';

const app = express();

// Example 1: Basic usage (already implemented in server.js)
// Logs all requests to console (dev) or file (production)
app.use(getLogger());

// Example 2: Skip health check endpoints
// Useful to reduce noise in logs
app.use(getLogger({
  skip: skipHealthCheck
}));

// Example 3: Custom skip function
// Skip logging for specific routes or conditions
app.use(getLogger({
  skip: (req, res) => {
    // Skip logging for static assets
    return req.url.startsWith('/static/') || 
           req.url.startsWith('/images/') ||
           req.url === '/favicon.ico';
  }
}));

// Example 4: Log only errors (4xx and 5xx)
app.use(getErrorLogger());

// Example 5: Custom Morgan format
import morgan from 'morgan';

// Log only POST requests
app.use(morgan('dev', {
  skip: (req, res) => req.method !== 'POST'
}));

// Example 6: Log with custom tokens
morgan.token('user-id', (req) => {
  return req.user ? req.user.id : 'anonymous';
});

app.use(morgan(':method :url :status :user-id - :response-time ms'));

// Example 7: Conditional logging based on status code
app.use(morgan('dev', {
  skip: (req, res) => res.statusCode < 400 // Only log errors
}));

// Example 8: Multiple loggers for different purposes
app.use(getLogger()); // All requests
app.use(getErrorLogger()); // Errors to separate file

// Example 9: Custom format for API endpoints only
app.use('/api', morgan('combined'));

// Example 10: Immediate logging (before response)
app.use(morgan('dev', {
  immediate: true // Log when request is received, not when response is sent
}));

/**
 * Best Practices:
 * 
 * 1. Use environment-based configuration (already done in logger.js)
 * 2. Filter sensitive data (already done in logger.js)
 * 3. Skip health checks to reduce log noise
 * 4. Use separate error logs for easier debugging
 * 5. Consider log rotation in production
 * 6. Monitor log file sizes
 * 7. Use structured logging for better parsing
 * 8. Add request IDs for tracing across services
 */

export default app;
