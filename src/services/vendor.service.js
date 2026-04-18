import { randomUUID } from 'crypto';
import {
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
  DeleteItemCommand,
} from '@aws-sdk/client-dynamodb';
import dynamoClient, { DYNAMO_TABLE } from '../configs/dynamo.js';
import { getEventById } from './event.service.js';
import { updateVendorSnapshot } from './dashboardAnalytics.service.js';

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function buildStringAttribute(value) {
  const normalized = normalizeString(value);
  return normalized ? { S: normalized } : undefined;
}

function mapDynamoVendor(item) {
  if (!item) {
    return null;
  }

  return {
    id: item.PK?.S?.replace('VENDOR#', '') || '',
    name: item.name?.S || '',
    serviceType: item.serviceType?.S || '',
    eventId: item.eventId?.S || undefined,
    contactEmail: item.contactEmail?.S || '',
    contactPhone: item.contactPhone?.S || '',
    status: item.status?.S || 'inactive',
    createdAt: item.created_at?.S || '',
    updatedAt: item.updated_at?.S || '',
  };
}

function buildDynamoVendorItem(payload) {
  const vendorId = payload.id || randomUUID();
  const createdAt = normalizeString(payload.created_at || payload.createdAt) || new Date().toISOString();
  const updatedAt = normalizeString(payload.updated_at || payload.updatedAt) || new Date().toISOString();

  const item = {
    PK: { S: `VENDOR#${vendorId}` },
    SK: { S: 'PROFILE' },
    name: { S: normalizeString(payload.name || '') },
    serviceType: { S: normalizeString(payload.serviceType || '') },
    status: { S: normalizeString(payload.status || 'inactive') },
    created_at: { S: createdAt },
    updated_at: { S: updatedAt },
  };

  const eventId = normalizeString(payload.eventId);
  if (eventId) {
    item.eventId = { S: eventId };
  }

  const contactEmail = buildStringAttribute(payload.contactEmail || payload.email);
  if (contactEmail) {
    item.contactEmail = contactEmail;
  }

  const contactPhone = buildStringAttribute(payload.contactPhone || payload.phone);
  if (contactPhone) {
    item.contactPhone = contactPhone;
  }

  return item;
}

export async function createVendor(vendorData) {
  if (!vendorData || typeof vendorData !== 'object') {
    throw new Error('Invalid vendor data');
  }

  const name = normalizeString(vendorData.name);
  const serviceType = normalizeString(vendorData.serviceType);
  const eventId = normalizeString(vendorData.eventId);
  const status = normalizeString(vendorData.status || 'inactive');

  if (!name || !serviceType) {
    throw new Error('name and serviceType are required');
  }

  if (eventId) {
    const event = await getEventById(eventId);
    if (!event) {
      throw new Error('Associated event not found');
    }
  }

  const newVendor = {
    ...vendorData,
    id: randomUUID(),
    status: status.toLowerCase(),
    eventId: eventId || undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const command = new PutItemCommand({
    TableName: DYNAMO_TABLE,
    Item: buildDynamoVendorItem(newVendor),
    ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
  });

  await dynamoClient.send(command);

  if (newVendor.status === 'active') {
    await updateVendorSnapshot(newVendor.id, true);
  }

  return mapDynamoVendor(buildDynamoVendorItem(newVendor));
}

export async function getVendors(eventId) {
  const params = {
    TableName: DYNAMO_TABLE,
    FilterExpression: '#sk = :profile',
    ExpressionAttributeNames: {
      '#sk': 'SK',
    },
    ExpressionAttributeValues: {
      ':profile': { S: 'PROFILE' },
    },
  };

  if (eventId) {
    params.FilterExpression += ' AND #eventId = :eventId';
    params.ExpressionAttributeNames['#eventId'] = 'eventId';
    params.ExpressionAttributeValues[':eventId'] = { S: normalizeString(eventId) };
  }

  const command = new ScanCommand(params);
  const response = await dynamoClient.send(command);
  return (response.Items || []).map(mapDynamoVendor);
}

export async function getVendorById(vendorId) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }

  const command = new GetItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `VENDOR#${normalizeString(vendorId)}` },
      SK: { S: 'PROFILE' },
    },
  });

  const response = await dynamoClient.send(command);
  return mapDynamoVendor(response.Item);
}

export async function updateVendor(vendorId, updateData) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }

  if (!updateData || typeof updateData !== 'object') {
    throw new Error('Invalid update data');
  }

  const existingVendor = await getVendorById(vendorId);
  if (!existingVendor) {
    throw new Error('Vendor not found');
  }

  const eventId = normalizeString(updateData.eventId);
  if (eventId && eventId !== existingVendor.eventId) {
    const event = await getEventById(eventId);
    if (!event) {
      throw new Error('Associated event not found');
    }
  }

  const status = normalizeString(updateData.status || existingVendor.status).toLowerCase();
  const updatedVendor = {
    ...existingVendor,
    ...updateData,
    eventId: updateData.eventId !== undefined ? (eventId || undefined) : existingVendor.eventId,
    status,
    updated_at: new Date().toISOString(),
  };

  const command = new PutItemCommand({
    TableName: DYNAMO_TABLE,
    Item: buildDynamoVendorItem(updatedVendor),
  });

  await dynamoClient.send(command);

  if (existingVendor.status !== status) {
    const wasActive = existingVendor.status === 'active';
    const nowActive = status === 'active';
    if (wasActive !== nowActive) {
      await updateVendorSnapshot(updatedVendor.id, nowActive);
    }
  }

  return mapDynamoVendor(buildDynamoVendorItem(updatedVendor));
}

export async function assignVendorToEvent(vendorId, eventId) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }
  if (!eventId || !normalizeString(eventId)) {
    throw new Error('Event ID is required');
  }

  const existingVendor = await getVendorById(vendorId);
  if (!existingVendor) {
    throw new Error('Vendor not found');
  }

  const event = await getEventById(eventId);
  if (!event) {
    throw new Error('Associated event not found');
  }

  const updatedVendor = {
    ...existingVendor,
    eventId: normalizeString(eventId),
    updated_at: new Date().toISOString(),
  };

  await dynamoClient.send(
    new PutItemCommand({
      TableName: DYNAMO_TABLE,
      Item: buildDynamoVendorItem(updatedVendor),
    })
  );

  return mapDynamoVendor(buildDynamoVendorItem(updatedVendor));
}

export async function deleteVendor(vendorId) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }

  const existingVendor = await getVendorById(vendorId);
  if (!existingVendor) {
    throw new Error('Vendor not found');
  }

  await dynamoClient.send(
    new DeleteItemCommand({
      TableName: DYNAMO_TABLE,
      Key: {
        PK: { S: `VENDOR#${normalizeString(vendorId)}` },
        SK: { S: 'PROFILE' },
      },
    })
  );

  return existingVendor;
}

export async function getVendorsByEventId(eventId) {
  if (!eventId) {
    throw new Error('Event ID is required');
  }

  return getVendors(eventId);
}
