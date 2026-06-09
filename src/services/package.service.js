import { randomUUID } from 'crypto';
import { nowPH } from '../utils/timezone.js';
import {
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
  DeleteItemCommand,
} from '@aws-sdk/client-dynamodb';
import dynamoClient, { DYNAMO_TABLE } from '../configs/dynamo.js';
import { normalizeString } from '../utils/dynamoHelpers.js';

const VALID_EVENT_TYPES = ['Wedding', 'Debut'];

function safeParseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mapDynamoPackage(item) {
  if (!item) return null;
  return {
    id: item.PK?.S?.replace('PACKAGE#', '') || '',
    eventType: item.eventType?.S || '',
    packageName: item.packageName?.S || '',
    description: item.description?.S || '',
    imageUrl: item.imageUrl?.S || '',
    imageKey: item.imageKey?.S || '',
    inclusions: item.inclusions?.S ? safeParseJson(item.inclusions.S, []) : [],
    paxOptions: item.paxOptions?.S ? safeParseJson(item.paxOptions.S, []) : [],
    note: item.note?.S || '',
    createdAt: item.createdAt?.S || '',
    updatedAt: item.updatedAt?.S || '',
  };
}

function buildDynamoPackageItem(payload) {
  const packageId = normalizeString(payload.id);
  const item = {
    PK: { S: `PACKAGE#${packageId}` },
    SK: { S: 'PROFILE' },
    eventType: { S: normalizeString(payload.eventType) },
    packageName: { S: normalizeString(payload.packageName) },
    inclusions: { S: JSON.stringify(Array.isArray(payload.inclusions) ? payload.inclusions : []) },
    paxOptions: { S: JSON.stringify(Array.isArray(payload.paxOptions) ? payload.paxOptions : []) },
    createdAt: { S: payload.createdAt || nowPH() },
    updatedAt: { S: payload.updatedAt || nowPH() },
  };

  const description = normalizeString(payload.description);
  if (description) item.description = { S: description };

  const imageUrl = normalizeString(payload.imageUrl);
  if (imageUrl) item.imageUrl = { S: imageUrl };

  const imageKey = normalizeString(payload.imageKey);
  if (imageKey) item.imageKey = { S: imageKey };

  const note = normalizeString(payload.note);
  if (note) item.note = { S: note };

  return item;
}

export async function createPackage(packageData) {
  const packageName = normalizeString(packageData.packageName);
  const eventType = normalizeString(packageData.eventType);

  if (!packageName) throw new Error('packageName is required');
  if (!eventType) throw new Error('eventType is required');
  if (!VALID_EVENT_TYPES.includes(eventType)) {
    throw new Error(`eventType must be one of: ${VALID_EVENT_TYPES.join(', ')}`);
  }

  const newPackage = {
    ...packageData,
    id: randomUUID(),
    createdAt: nowPH(),
    updatedAt: nowPH(),
  };

  await dynamoClient.send(
    new PutItemCommand({
      TableName: DYNAMO_TABLE,
      Item: buildDynamoPackageItem(newPackage),
      ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
    })
  );

  return mapDynamoPackage(buildDynamoPackageItem(newPackage));
}

export async function getPackages(eventType) {
  const params = {
    TableName: DYNAMO_TABLE,
    FilterExpression: '#sk = :profile AND begins_with(#pk, :pkgPrefix)',
    ExpressionAttributeNames: {
      '#sk': 'SK',
      '#pk': 'PK',
    },
    ExpressionAttributeValues: {
      ':profile': { S: 'PROFILE' },
      ':pkgPrefix': { S: 'PACKAGE#' },
    },
  };

  if (eventType) {
    params.FilterExpression += ' AND #eventType = :eventType';
    params.ExpressionAttributeNames['#eventType'] = 'eventType';
    params.ExpressionAttributeValues[':eventType'] = { S: normalizeString(eventType) };
  }

  const response = await dynamoClient.send(new ScanCommand(params));
  return (response.Items || []).map(mapDynamoPackage);
}

export async function getPackageById(packageId) {
  if (!packageId) throw new Error('Package ID is required');

  const response = await dynamoClient.send(
    new GetItemCommand({
      TableName: DYNAMO_TABLE,
      Key: {
        PK: { S: `PACKAGE#${normalizeString(packageId)}` },
        SK: { S: 'PROFILE' },
      },
    })
  );

  return mapDynamoPackage(response.Item);
}

export async function updatePackage(packageId, updateData) {
  if (!packageId) throw new Error('Package ID is required');

  const existing = await getPackageById(packageId);
  if (!existing) throw new Error('Package not found');

  const eventType = normalizeString(updateData.eventType || existing.eventType);
  if (eventType && !VALID_EVENT_TYPES.includes(eventType)) {
    throw new Error(`eventType must be one of: ${VALID_EVENT_TYPES.join(', ')}`);
  }

  const updated = {
    ...existing,
    ...updateData,
    id: packageId,
    eventType,
    createdAt: existing.createdAt,
    updatedAt: nowPH(),
  };

  await dynamoClient.send(
    new PutItemCommand({
      TableName: DYNAMO_TABLE,
      Item: buildDynamoPackageItem(updated),
    })
  );

  return mapDynamoPackage(buildDynamoPackageItem(updated));
}

export async function deletePackage(packageId) {
  if (!packageId) throw new Error('Package ID is required');

  const existing = await getPackageById(packageId);
  if (!existing) throw new Error('Package not found');

  await dynamoClient.send(
    new DeleteItemCommand({
      TableName: DYNAMO_TABLE,
      Key: {
        PK: { S: `PACKAGE#${normalizeString(packageId)}` },
        SK: { S: 'PROFILE' },
      },
    })
  );

  return existing;
}
