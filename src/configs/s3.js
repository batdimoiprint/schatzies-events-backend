import { S3Client } from '@aws-sdk/client-s3';
import env from './env.js';

const s3Config = {
  region: env.AWS_REGION || 'ap-southeast-1',
};

// In production, we rely on the Lambda IAM Role (don't provide credentials)
// In development, we use the local .env credentials
if (env.NODE_ENV !== 'production') {
  s3Config.credentials = {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  };
}

const s3Client = new S3Client(s3Config);

export default s3Client;
