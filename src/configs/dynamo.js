import './env.js';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const dynamoConfig = {
  region: process.env.AWS_REGION || 'ap-southeast-1',
};

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  dynamoConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  };
}

export const DYNAMO_TABLE = process.env.AWS_DYNAMO_TABLE;
if (!DYNAMO_TABLE) {
  throw new Error('AWS_DYNAMO_TABLE env var is required');
}


export const DASHBOARD_ANALYTICS_TABLE = process.env.AWS_DASHBOARD_ANALYTICS_TABLE;
if (!DASHBOARD_ANALYTICS_TABLE) {
  throw new Error('AWS_DASHBOARD_ANALYTICS_TABLE env var is required to keep analytics in a separate table');
}
if (DASHBOARD_ANALYTICS_TABLE === DYNAMO_TABLE) {
  console.warn('AWS_DASHBOARD_ANALYTICS_TABLE is identical to AWS_DYNAMO_TABLE. Analytics will still be written to the same table.');
}

const dynamoClient = new DynamoDBClient(dynamoConfig);

export default dynamoClient;
