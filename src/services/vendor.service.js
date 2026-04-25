import { randomUUID } from 'crypto';
import {
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
  QueryCommand,
  DeleteItemCommand,
} from '@aws-sdk/client-dynamodb';
import dynamoClient, { DYNAMO_TABLE } from '../configs/dynamo.js';
import { getEventById } from './event.service.js';
import { updateVendorSnapshot } from './dashboardAnalytics.service.js';
import { normalizeString, buildStringAttribute } from '../utils/dynamoHelpers.js';

function mapDynamoVendor(item) {
  if (!item) {
    return null;
  }

  return {
    id: item.PK?.S?.replace('VENDOR#', '') || '',
    vendorName: item.vendorName?.S || '',
    contactPerson: item.contactPerson?.S || '',
    contactNumber: item.contactNumber?.S || '',
    email: item.email?.S || '',
    typeOfSupply: item.typeOfSupply?.S || '',
    servicesOffered: item.servicesOffered?.S || '',
    pricing: item.pricing?.S || '',
    serviceType: item.serviceType?.S || '',
    price: item.price?.N ? Number(item.price.N) : null,
    availabilityStatus: item.availabilityStatus?.S || 'inactive',
    lastEventHandled: item.lastEventHandled?.S || '',
    notes: item.notes?.S || '',
    eventId: item.eventId?.S || undefined,
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
    vendorName: { S: normalizeString(payload.vendorName || payload.name || '') },
    contactPerson: { S: normalizeString(payload.contactPerson || payload.contactName || '') },
    contactNumber: { S: normalizeString(payload.contactNumber || payload.phone || payload.contactPhone || '') },
    email: { S: normalizeString(payload.email || payload.contactEmail || '') },
    typeOfSupply: { S: normalizeString(payload.typeOfSupply || payload.supplyType || '') },
    servicesOffered: { S: normalizeString(payload.servicesOffered || payload.services || '') },
    pricing: { S: normalizeString(payload.pricing || '') },
    serviceType: { S: normalizeString(payload.serviceType || '') },
    availabilityStatus: { S: normalizeString(payload.availabilityStatus || payload.status || 'inactive') },
    lastEventHandled: { S: normalizeString(payload.lastEventHandled || '') },
    notes: { S: normalizeString(payload.notes || '') },
    created_at: { S: createdAt },
    updated_at: { S: updatedAt },
  };

  if (payload.price !== undefined && payload.price !== null && !Number.isNaN(Number(payload.price))) {
    item.price = { N: String(Number(payload.price)) };
  }

  const eventId = normalizeString(payload.eventId);
  if (eventId) {
    item.eventId = { S: eventId };
  }

  return item;
}

function mapDynamoVendorWorker(item) {
  if (!item) {
    return null;
  }

  return {
    id: item.SK?.S?.replace('WORKER#', '') || '',
    vendorId: item.PK?.S?.replace('VENDOR#', '') || '',
    workerName: item.workerName?.S || item.name?.S || '',
    role: item.role?.S || '',
    contactNumber: item.contactNumber?.S || '',
    email: item.email?.S || '',
    jobTitle: item.jobTitle?.S || '',
    availabilityStatus: item.availabilityStatus?.S || 'inactive',
    eventId: item.eventId?.S || undefined,
    notes: item.notes?.S || '',
    createdAt: item.created_at?.S || item.createdAt?.S || '',
    updatedAt: item.updated_at?.S || item.updatedAt?.S || '',
  };
}

function buildDynamoVendorWorkerItem(payload) {
  const workerId = payload.id || randomUUID();
  const vendorId = normalizeString(payload.vendorId || payload.vendor_id || payload.vendorId);
  const createdAt = normalizeString(payload.created_at || payload.createdAt) || new Date().toISOString();
  const updatedAt = normalizeString(payload.updated_at || payload.updatedAt) || new Date().toISOString();

  const item = {
    PK: { S: `VENDOR#${vendorId}` },
    SK: { S: `WORKER#${workerId}` },
    workerName: { S: normalizeString(payload.workerName || payload.name || '') },
    availabilityStatus: { S: normalizeString(payload.availabilityStatus || payload.status || 'inactive') },
    created_at: { S: createdAt },
    updated_at: { S: updatedAt },
  };

  const role = normalizeString(payload.role);
  if (role) item.role = { S: role };

  const contactNumber = normalizeString(payload.contactNumber || payload.phone);
  if (contactNumber) item.contactNumber = { S: contactNumber };

  const email = normalizeString(payload.email);
  if (email) item.email = { S: email };

  const jobTitle = normalizeString(payload.jobTitle || payload.position);
  if (jobTitle) item.jobTitle = { S: jobTitle };

  const notes = normalizeString(payload.notes);
  if (notes) item.notes = { S: notes };

  const eventId = normalizeString(payload.eventId);
  if (eventId) {
    item.eventId = { S: eventId };
  }

  return Object.fromEntries(Object.entries(item).filter(([, value]) => value !== undefined));
}

async function ensureVendorExists(vendorId) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }

  const vendor = await getVendorById(vendorId);
  if (!vendor) {
    throw new Error('Vendor not found');
  }

  return vendor;
}

export async function getVendorWorkers(vendorId, eventId) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }

  await ensureVendorExists(vendorId);

  const query = {
    TableName: DYNAMO_TABLE,
    KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :workerPrefix)',
    ExpressionAttributeNames: {
      '#pk': 'PK',
      '#sk': 'SK',
    },
    ExpressionAttributeValues: {
      ':pk': { S: `VENDOR#${normalizeString(vendorId)}` },
      ':workerPrefix': { S: 'WORKER#' },
    },
  };

  if (eventId) {
    query.FilterExpression = '#eventId = :eventId';
    query.ExpressionAttributeNames['#eventId'] = 'eventId';
    query.ExpressionAttributeValues[':eventId'] = { S: normalizeString(eventId) };
  }

  const command = new QueryCommand(query);
  const response = await dynamoClient.send(command);
  return (response.Items || []).map(mapDynamoVendorWorker);
}

export async function getVendorWorkerById(vendorId, workerId) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }
  if (!workerId) {
    throw new Error('Worker ID is required');
  }

  await ensureVendorExists(vendorId);

  const command = new GetItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `VENDOR#${normalizeString(vendorId)}` },
      SK: { S: `WORKER#${normalizeString(workerId)}` },
    },
  });

  const response = await dynamoClient.send(command);
  return mapDynamoVendorWorker(response.Item);
}

export async function createVendorWorker(vendorId, workerData) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }
  if (!workerData || typeof workerData !== 'object') {
    throw new Error('Invalid worker data');
  }

  await ensureVendorExists(vendorId);

  const workerName = normalizeString(workerData.workerName || workerData.name);
  if (!workerName) {
    throw new Error('workerName is required');
  }

  const eventId = normalizeString(workerData.eventId);
  if (eventId) {
    const event = await getEventById(eventId);
    if (!event) {
      throw new Error('Associated event not found');
    }
  }

  const newWorker = {
    ...workerData,
    id: randomUUID(),
    vendorId: normalizeString(vendorId),
    availabilityStatus: normalizeString(workerData.availabilityStatus || workerData.status || 'inactive').toLowerCase(),
    eventId: eventId || undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const command = new PutItemCommand({
    TableName: DYNAMO_TABLE,
    Item: buildDynamoVendorWorkerItem(newWorker),
    ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
  });

  await dynamoClient.send(command);
  return mapDynamoVendorWorker(buildDynamoVendorWorkerItem(newWorker));
}

export async function updateVendorWorker(vendorId, workerId, updateData) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }
  if (!workerId) {
    throw new Error('Worker ID is required');
  }
  if (!updateData || typeof updateData !== 'object') {
    throw new Error('Invalid update data');
  }

  await ensureVendorExists(vendorId);

  const existing = await getVendorWorkerById(vendorId, workerId);
  if (!existing) {
    throw new Error('Worker not found');
  }

  const eventId = normalizeString(updateData.eventId);
  if (updateData.eventId !== undefined && eventId) {
    const event = await getEventById(eventId);
    if (!event) {
      throw new Error('Associated event not found');
    }
  }

  const updatedWorker = {
    ...existing,
    ...updateData,
    vendorId: normalizeString(vendorId),
    id: workerId,
    availabilityStatus: normalizeString(updateData.availabilityStatus || updateData.status || existing.availabilityStatus || 'inactive').toLowerCase(),
    eventId: updateData.eventId !== undefined ? (eventId || undefined) : existing.eventId,
    updated_at: new Date().toISOString(),
  };

  const command = new PutItemCommand({
    TableName: DYNAMO_TABLE,
    Item: buildDynamoVendorWorkerItem(updatedWorker),
  });

  await dynamoClient.send(command);
  return mapDynamoVendorWorker(buildDynamoVendorWorkerItem(updatedWorker));
}

export async function deleteVendorWorker(vendorId, workerId) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }
  if (!workerId) {
    throw new Error('Worker ID is required');
  }

  await ensureVendorExists(vendorId);

  const existing = await getVendorWorkerById(vendorId, workerId);
  if (!existing) {
    throw new Error('Worker not found');
  }

  const command = new DeleteItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `VENDOR#${normalizeString(vendorId)}` },
      SK: { S: `WORKER#${normalizeString(workerId)}` },
    },
  });

  await dynamoClient.send(command);
  return existing;
}

export async function assignWorkerToEvent(vendorId, workerId, eventId) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }
  if (!workerId) {
    throw new Error('Worker ID is required');
  }
  if (!eventId || !normalizeString(eventId)) {
    throw new Error('Event ID is required');
  }

  await ensureVendorExists(vendorId);

  const existing = await getVendorWorkerById(vendorId, workerId);
  if (!existing) {
    throw new Error('Worker not found');
  }

  const event = await getEventById(eventId);
  if (!event) {
    throw new Error('Associated event not found');
  }

  const updatedWorker = {
    ...existing,
    vendorId: normalizeString(vendorId),
    id: workerId,
    eventId: normalizeString(eventId),
    updated_at: new Date().toISOString(),
  };

  await dynamoClient.send(
    new PutItemCommand({
      TableName: DYNAMO_TABLE,
      Item: buildDynamoVendorWorkerItem(updatedWorker),
    })
  );

  return mapDynamoVendorWorker(buildDynamoVendorWorkerItem(updatedWorker));
}

export async function createVendor(vendorData) {
  if (!vendorData || typeof vendorData !== 'object') {
    throw new Error('Invalid vendor data');
  }

  const vendorName = normalizeString(vendorData.vendorName || vendorData.name);
  const serviceType = normalizeString(vendorData.serviceType);
  const eventId = normalizeString(vendorData.eventId);
  const availabilityStatus = normalizeString(vendorData.availabilityStatus || vendorData.status || 'inactive');

  if (!vendorName || !serviceType) {
    throw new Error('vendorName and serviceType are required');
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
    availabilityStatus: availabilityStatus.toLowerCase(),
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

  if (newVendor.availabilityStatus === 'active') {
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

  const availabilityStatus = normalizeString(
    updateData.availabilityStatus || updateData.status || existingVendor.availabilityStatus || 'inactive'
  ).toLowerCase();

  const updatedVendor = {
    ...existingVendor,
    ...updateData,
    eventId: updateData.eventId !== undefined ? (eventId || undefined) : existingVendor.eventId,
    availabilityStatus,
    updated_at: new Date().toISOString(),
  };

  const command = new PutItemCommand({
    TableName: DYNAMO_TABLE,
    Item: buildDynamoVendorItem(updatedVendor),
  });

  await dynamoClient.send(command);

  if (existingVendor.availabilityStatus !== availabilityStatus) {
    const wasActive = existingVendor.availabilityStatus === 'active';
    const nowActive = availabilityStatus === 'active';
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
