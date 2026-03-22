import 'dotenv/config';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import routes from './routes/index.js';


const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup({
  openapi: '3.0.0',
  info: {
    title: 'Schatzies Events API',
    version: '1.0.0',
    description: 'Serverless Express API for Schatzies Events'
  },
  servers: [
    {
      url: process.env.API_BASE_URL || 'http://localhost:3000',
      description: 'API Server'
    }
  ],
  paths: {}
}));

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', routes);


// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Export for serverless-http
export default app;

// Local Development Server
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API Docs available at http://localhost:${PORT}/api-docs`);
  });
}
