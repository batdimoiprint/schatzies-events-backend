import rateLimit from 'express-rate-limit';

const jsonHandler = (req, res, next, options) => {
  res.status(options.statusCode).json({ error: options.message });
};

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 10000 : 2000, // 2000 requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
  message: 'Too many API requests, please try again in a few minutes',
});

// Stricter rate limiter for authentication routes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: process.env.NODE_ENV === 'development' ? 5000 : 200, // 200 auth attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for token verification check on page load / route navigation
  skip: (req) => req.method === 'GET' && req.path.includes('/validate-token'),
  handler: jsonHandler,
  message: 'Too many authentication attempts, please try again in 15 minutes',
});

// Rate limiter for email verification (prevent spam)
export const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 100 : 15, // 15 emails per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
  message: 'Too many verification email requests, please try again in 15 minutes',
});
