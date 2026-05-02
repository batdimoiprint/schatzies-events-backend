import cors from 'cors';

const frontendUrl = process.env.FRONTEND_URL;
const localUrl = 'http://localhost:5173';
const localSwaggerUrl = 'http://localhost:3000';

const allowedOrigins = [frontendUrl, localUrl, localSwaggerUrl].filter(Boolean);
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push(localSwaggerUrl);
  // Add localhost:5174 for development (common Vite port)
  allowedOrigins.push('http://localhost:5174');
}

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
  ],
};

console.log('CORS allowed origins:', allowedOrigins);

export default cors(corsOptions);
