import cors from 'cors';

const frontendUrl =
  process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : 'http://localhost:5173';

const localSwaggerUrl = 'http://localhost:3000';
const allowedOrigins = [frontendUrl, 'http://localhost:5174'];
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push(localSwaggerUrl);
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
