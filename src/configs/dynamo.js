import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const isDev = process.env.NODE_ENV === 'development';
const dynamoConfig = {
  region: 'ap-southeast-1',
};
if (isDev) {
  dynamoConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

export const DYNAMO_TABLE = process.env.AWS_DYNAMO_TABLE;
export const DASHBOARD_ANALYTICS_TABLE = process.env.AWS_DASHBOARD_ANALYTICS_TABLE || DYNAMO_TABLE;
const dynamoClient = new DynamoDBClient(dynamoConfig);

export default dynamoClient;
