import 'dotenv/config';
import express from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './configs/swagger.js';
import routes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import corsMiddleware from './configs/cors.js';
import { configureHelmet } from './configs/helmet.js';
import { apiLimiter } from './configs/rate-limit.js';

const app = express();

// Security Middleware
app.use(configureHelmet());

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(corsMiddleware);

// Rate Limiting (apply globally)
app.use(apiLimiter);

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
  console.log('API Docs available at http://localhost:3000/api-docs');
});
