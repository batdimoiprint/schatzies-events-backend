import './configs/env.js';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './configs/swagger.js';
import routes from './routes/index.js';

import corsMiddleware from './configs/cors.js';
import { configureHelmet } from './configs/helmet.js';
import { apiLimiter } from './configs/rate-limit.js';
import errorHandler from './middleware/error.middleware.js';
import {
  getLogger,
  getErrorLogger,
  skipHealthCheck,
} from './configs/logger.js';

const app = express();

// HTTP Request Logger - Morgan
app.use(getLogger());

// Error Logger - logs only 4xx and 5xx responses
app.use(getErrorLogger());

// Security Middleware
app.use(configureHelmet());

// Middleware
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(corsMiddleware);

// Rate Limiting (apply globally)
app.use(apiLimiter);

// Swagger Documentation
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
      requestInterceptor: (request) => {
        request.credentials = 'include';
        return request;
      },
    },
  })
);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes
const apiPrefix = process.env.API_PREFIX || '/api';
const normalizedPrefix = apiPrefix.startsWith('/')
  ? apiPrefix
  : `/${apiPrefix}`;
// Mount all API feature routes under the shared prefix.
app.use(normalizedPrefix, routes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use(errorHandler);

// Export for serverless-http
export default app;

app.listen(3000, () => {
  console.log('API Docs: http://localhost:3000/api-docs');
});
