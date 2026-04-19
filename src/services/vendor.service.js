import { randomUUID } from 'crypto';
import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
import dynamoClient, { DYNAMO_TABLE } from '../configs/dynamo.js';
import { getEventById } from './event.service.js';
import { updateVendorSnapshot } from './dashboardAnalytics.service.js';

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function buildVendorKey(vendorId) {
  return {
    PK: { S: `VENDOR#${normalizeString(vendorId)}` },
    SK: { S: 'PROFILE' },
  };
}

function mapDynamoVendor(item) {
  if (!item) {
    return null;
  }

  return {
    id: item.id?.S || item.PK?.S?.replace('VENDOR#', '') || '',
    name: item.name?.S || '',
    serviceType: item.serviceType?.S || '',
    eventId: item.eventId?.S || '',
    contactEmail: item.contactEmail?.S || '',
    contactPhone: item.contactPhone?.S || '',
    status: item.status?.S || 'inactive',
    createdAt: item.createdAt?.S || '',
    updatedAt: item.updatedAt?.S || '',
  };
}

function buildDynamoVendorItem(payload) {
  const id = normalizeString(payload.id || randomUUID());
  const now = new Date().toISOString();

  return {
    ...buildVendorKey(id),
    id: { S: id },
    entityType: { S: 'VENDOR' },
    name: { S: normalizeString(payload.name) },
    serviceType: { S: normalizeString(payload.serviceType) },
    eventId: { S: normalizeString(payload.eventId) },
    contactEmail: { S: normalizeString(payload.contactEmail) },
    contactPhone: { S: normalizeString(payload.contactPhone) },
    status: { S: normalizeString(payload.status || 'inactive') || 'inactive' },
    createdAt: { S: payload.createdAt || now },
    updatedAt: { S: payload.updatedAt || now },
  };
}

export async function createVendor(vendorData) {
  if (!vendorData || typeof vendorData !== 'object') {
    throw new Error('Invalid vendor data');
  }

  const { name, serviceType, eventId, contactEmail, contactPhone, status } = vendorData;

  const normalizedName = normalizeString(name);
  const normalizedServiceType = normalizeString(serviceType);
  const normalizedEventId = normalizeString(eventId);

  if (!normalizedName || !normalizedServiceType || !normalizedEventId) {
    throw new Error('name, serviceType and eventId are required');
  }

  const event = await getEventById(normalizedEventId);
  if (!event) {
    throw new Error('Associated event not found');
  }

  const normalizedStatus = normalizeString(status).toLowerCase() || 'inactive';
  const newVendor = {
    id: randomUUID(),
    name: normalizedName,
    serviceType: normalizedServiceType,
    eventId: normalizedEventId,
    contactEmail: normalizeString(contactEmail),
    contactPhone: normalizeString(contactPhone),
    status: normalizedStatus,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const command = new PutItemCommand({
    TableName: DYNAMO_TABLE,
    Item: buildDynamoVendorItem(newVendor),
    ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
  });
  await dynamoClient.send(command);

  if (normalizedStatus === 'active') {
    await updateVendorSnapshot(newVendor.id, true);
  }

  return newVendor;
}

export async function createVendorPool(vendorData) {
  if (!vendorData || typeof vendorData !== 'object') {
    throw new Error('Invalid vendor data');
  }

  const { name, serviceType, eventId, contactEmail, contactPhone, status } = vendorData;

  const normalizedName = normalizeString(name);
  const normalizedServiceType = normalizeString(serviceType);

  if (!normalizedName || !normalizedServiceType) {
    throw new Error('name and serviceType are required');
  }

  const normalizedEventId = normalizeString(eventId);
  if (normalizedEventId) {
    const event = await getEventById(normalizedEventId);
    if (!event) {
      throw new Error('Associated event not found');
    }
  }

  const normalizedStatus = normalizeString(status).toLowerCase() || 'inactive';
  const newVendor = {
    id: randomUUID(),
    name: normalizedName,
    serviceType: normalizedServiceType,
    eventId: normalizedEventId,
    contactEmail: normalizeString(contactEmail),
    contactPhone: normalizeString(contactPhone),
    status: normalizedStatus,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const command = new PutItemCommand({
    TableName: DYNAMO_TABLE,
    Item: buildDynamoVendorItem(newVendor),
    ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
  });
  await dynamoClient.send(command);

  if (normalizedStatus === 'active') {
    await updateVendorSnapshot(newVendor.id, true);
  }

  return newVendor;
}

export async function getVendors(eventId) {
  const normalizedEventId = normalizeString(eventId);
  const scanInput = {
    TableName: DYNAMO_TABLE,
    FilterExpression: 'begins_with(PK, :vendorPrefix)',
    ExpressionAttributeValues: {
      ':vendorPrefix': { S: 'VENDOR#' },
    },
  };

  if (normalizedEventId) {
    scanInput.FilterExpression = 'begins_with(PK, :vendorPrefix) AND eventId = :eventId';
    scanInput.ExpressionAttributeValues[':eventId'] = { S: normalizedEventId };
  }

  const response = await dynamoClient.send(new ScanCommand(scanInput));
  return (response.Items || []).map(mapDynamoVendor);
}

export async function getVendorById(vendorId) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }

  const command = new GetItemCommand({
    TableName: DYNAMO_TABLE,
    Key: buildVendorKey(vendorId),
  });

  const response = await dynamoClient.send(command);
  return mapDynamoVendor(response.Item);
}

export async function updateVendor(vendorId, updateData) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }

  const existingVendor = await getVendorById(vendorId);
  if (!existingVendor) {
    throw new Error('Vendor not found');
  }

  if (!updateData || typeof updateData !== 'object') {
    throw new Error('Invalid update data');
  }

  const { name, serviceType, eventId, contactEmail, contactPhone, status } = updateData;

  if (eventId !== undefined && eventId !== existingVendor.eventId) {
    const normalizedEventId = normalizeString(eventId);
    if (normalizedEventId) {
      const event = await getEventById(normalizedEventId);
      if (!event) {
        throw new Error('Associated event not found');
      }
    }
  }

  const normalizedStatus =
    status !== undefined ? normalizeString(status).toLowerCase() : existingVendor.status;

  const updatedVendor = {
    ...existingVendor,
    name: name !== undefined ? normalizeString(name) : existingVendor.name,
    serviceType:
      serviceType !== undefined ? normalizeString(serviceType) : existingVendor.serviceType,
    eventId: eventId !== undefined ? normalizeString(eventId) : existingVendor.eventId,
    contactEmail:
      contactEmail !== undefined ? normalizeString(contactEmail) : existingVendor.contactEmail,
    contactPhone:
      contactPhone !== undefined ? normalizeString(contactPhone) : existingVendor.contactPhone,
    status: normalizedStatus,
    updatedAt: new Date().toISOString(),
  };

  const command = new PutItemCommand({
    TableName: DYNAMO_TABLE,
    Item: buildDynamoVendorItem(updatedVendor),
  });

  await dynamoClient.send(command);

  if (existingVendor.status !== normalizedStatus) {
    const wasActive = existingVendor.status === 'active';
    const nowActive = normalizedStatus === 'active';

    if (wasActive !== nowActive) {
      await updateVendorSnapshot(updatedVendor.id, nowActive);
    }
  }

  return updatedVendor;
}

export async function deleteVendor(vendorId) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }

  const existingVendor = await getVendorById(vendorId);
  if (!existingVendor) {
    throw new Error('Vendor not found');
  }

  const command = new DeleteItemCommand({
    TableName: DYNAMO_TABLE,
    Key: buildVendorKey(vendorId),
    ReturnValues: 'ALL_OLD',
  });

  const response = await dynamoClient.send(command);
  return mapDynamoVendor(response.Attributes);
}

export async function getVendorsByEventId(eventId) {
  if (!eventId) {
    throw new Error('Event ID is required');
  }

  const normalizedEventId = normalizeString(eventId);
  const command = new ScanCommand({
    TableName: DYNAMO_TABLE,
    FilterExpression: 'begins_with(PK, :vendorPrefix) AND eventId = :eventId',
    ExpressionAttributeValues: {
      ':vendorPrefix': { S: 'VENDOR#' },
      ':eventId': { S: normalizedEventId },
    },
  });

  const response = await dynamoClient.send(command);
  return (response.Items || []).map(mapDynamoVendor);
}
