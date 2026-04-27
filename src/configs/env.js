import dotenv from 'dotenv';

const result = dotenv.config();
if (result.error && process.env.NODE_ENV !== 'production') {
  console.warn('dotenv config failed:', result.error);
}

console.log('dotenv loaded:', {
  NODE_ENV: process.env.NODE_ENV,
  AWS_REGION: process.env.AWS_REGION,
  AWS_DYNAMO_TABLE: process.env.AWS_DYNAMO_TABLE,
  AWS_DASHBOARD_ANALYTICS_TABLE: process.env.AWS_DASHBOARD_ANALYTICS_TABLE,
  JWT_SECRET_EXISTS: Boolean(process.env.JWT_SECRET),
  FRONTEND_URL: process.env.FRONTEND_URL,
});

const requiredEnv = ['AWS_DYNAMO_TABLE', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter((name) => !process.env[name]);
if (missingEnv.length) {
  throw new Error(`Missing required environment variables: ${missingEnv.join(', ')}`);
}

export default process.env;
