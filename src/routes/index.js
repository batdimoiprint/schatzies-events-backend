import express from 'express';

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
      docs: '/api-docs'
    }
  });
});

export default router;
