import cors from 'cors';

let frontendUrls = ['http://localhost:5173'];
if (process.env.NODE_ENV === 'production' && process.env.FRONTEND_URL) {
  frontendUrls = process.env.FRONTEND_URL.split(',').map((url) => url.trim());
}

const localSwaggerUrl = 'http://localhost:3000';
const allowedOrigins = [...frontendUrls, 'http://localhost:5174'];
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push(localSwaggerUrl);
}
// Allow Swagger UI served from the deployed API Gateway origin
if (process.env.API_GATEWAY_URL) {
  allowedOrigins.push(process.env.API_GATEWAY_URL.replace(/\/+$/, ''));
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

export default cors(corsOptions);
