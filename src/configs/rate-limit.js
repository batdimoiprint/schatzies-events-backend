import rateLimit from 'express-rate-limit';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 10000 : 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

// Stricter rate limiter for authentication routes
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // Limit each IP to 100 requests per `window` (here, per 1 hour)
  standardHeaders: true,
  legacyHeaders: false,
  message:
    'Too many authentication attempts from this IP, please try again after an hour',
});

// Rate limiter for email verification (prevent spam)
export const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 50 : 5, // 5 emails per 15 min per IP in production
  standardHeaders: true,
  legacyHeaders: false,
  message:
    'Too many verification email requests from this IP, please try again in 15 minutes',
});
