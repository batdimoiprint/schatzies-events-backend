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

const dynamoClient = new DynamoDBClient(dynamoConfig);

export default dynamoClient;
