import express from 'express';
import authRoutes from './auth.routes.js';

const router = express.Router();

// Example route
router.get('/health', (req, res) => {
  res.json({ message: 'API is healthy', timestamp: new Date().toISOString() });
});

// Welcome route
router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Schatzies Events API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      docs: '/api-docs',
      login: '/api/login',
      register: '/api/register',
      refreshToken: '/api/refresh-token',
      authLogin: '/api/auth/login',
      authRegister: '/api/auth/register',
      authRefreshToken: '/api/auth/refresh-token',
    },
  });
});

router.use('/auth', authRoutes);

export default router;
