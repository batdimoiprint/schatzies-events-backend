import dynamoClient, { DYNAMO_TABLE } from './src/configs/dynamo.js';
import { ScanCommand } from '@aws-sdk/client-dynamodb';
import 'dotenv/config';

async function checkUser() {
  const email = 'organizer@gmail.com';
  console.log(`Checking user with email: ${email}`);
  
  const command = new ScanCommand({
    TableName: DYNAMO_TABLE,
    FilterExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': { S: email }
    }
  });

  try {
    const response = await dynamoClient.send(command);
    if (response.Items && response.Items.length > 0) {
      console.log('User found:');
      console.log(JSON.stringify(response.Items[0], null, 2));
    } else {
      console.log('User not found.');
    }
  } catch (error) {
    console.error('Error scanning DynamoDB:', error);
  }
}

checkUser();
