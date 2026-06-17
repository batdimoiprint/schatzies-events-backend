import { nowPH } from '../utils/timezone.js';
import { PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import dynamoClient, { DYNAMO_TABLE } from '../configs/dynamo.js';
import { normalizeString } from '../utils/dynamoHelpers.js';

function mapContentItem(item) {
  if (!item) return null;
  return {
    pageId: item.PK?.S?.replace('CONTENT#', '') || '',
    sectionId: item.SK?.S?.replace('SECTION#', '') || '',
    title: item.title?.S || '',
    body: item.body?.S || '',
    createdAt: item.created_at?.S || '',
    updatedAt: item.updated_at?.S || '',
  };
}

export async function getPageContents(pageId) {
  if (!pageId) throw new Error('Page ID is required');
  const response = await dynamoClient.send(
    new QueryCommand({
      TableName: DYNAMO_TABLE,
      KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :skPrefix)',
      ExpressionAttributeNames: {
        '#pk': 'PK',
        '#sk': 'SK',
      },
      ExpressionAttributeValues: {
        ':pk': { S: `CONTENT#${normalizeString(pageId)}` },
        ':skPrefix': { S: 'SECTION#' },
      },
    })
  );
  return (response.Items || []).map(mapContentItem).filter(Boolean);
}

export async function updateSectionContent(pageId, sectionId, { title, body }) {
  if (!pageId) throw new Error('Page ID is required');
  if (!sectionId) throw new Error('Section ID is required');

  const now = nowPH();
  const item = {
    PK: { S: `CONTENT#${normalizeString(pageId)}` },
    SK: { S: `SECTION#${normalizeString(sectionId)}` },
    title: { S: title || '' },
    body: { S: body || '' },
    created_at: { S: now },
    updated_at: { S: now },
  };

  await dynamoClient.send(
    new PutItemCommand({
      TableName: DYNAMO_TABLE,
      Item: item,
    })
  );
  return mapContentItem(item);
}
