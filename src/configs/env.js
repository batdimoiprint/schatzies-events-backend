import dotenv from 'dotenv';

const result = dotenv.config();
if (result.error && process.env.NODE_ENV !== 'production') {
  console.warn('dotenv config failed:', result.error);
}

const requiredEnv = ['AWS_DYNAMO_TABLE', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter((name) => !process.env[name]);
if (missingEnv.length) {
  throw new Error(
    `Missing required environment variables: ${missingEnv.join(', ')}`
  );
}

export default process.env;
