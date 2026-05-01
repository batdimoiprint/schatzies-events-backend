import { S3Client } from '@aws-sdk/client-s3';
import env from './env.js';

const s3Config = {
  region: env.AWS_REGION || 'ap-southeast-1',
};

if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
  s3Config.credentials = {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  };
}

const s3Client = new S3Client(s3Config);

export default s3Client;
