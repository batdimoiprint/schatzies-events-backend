import { S3Client } from '@aws-sdk/client-s3';
import env from './env.js';

const s3Config = {
  region: env.AWS_REGION || 'ap-southeast-1',
};

// Only pass explicit credentials when both keys are set in the environment.
// Otherwise fall back to the SDK default provider chain: shared
// ~/.aws/credentials locally, Lambda IAM role in production. Passing a
// credentials object with undefined fields makes the SDK throw
// "Resolved credential object is not valid".
if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
  s3Config.credentials = {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    sessionToken: env.AWS_SESSION_TOKEN,
  };
}

const s3Client = new S3Client(s3Config);

export default s3Client;
