import { randomUUID } from 'crypto';
import { nowPH } from '../utils/timezone.js';
import bcrypt from 'bcryptjs';
import {
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  ScanCommand,
  UpdateItemCommand,
  DeleteItemCommand,
} from '@aws-sdk/client-dynamodb';
import dynamoClient, { DYNAMO_TABLE } from '../configs/dynamo.js';
import { getEventById } from './event.service.js';
import {
  normalizeString,
  buildStringAttribute,
  buildNumberAttribute,
} from '../utils/dynamoHelpers.js';

function mapDynamoOrganizer(item) {
  if (!item) {
    return null;
  }

  const firstName = item.firstName?.S || '';
  const lastName = item.lastName?.S || '';
  const fullName =
    item.name?.S || [firstName, lastName].filter(Boolean).join(' ');

  return {
    id: item.PK?.S?.replace('USER#', '') || '',
    name: fullName,
    firstName,
    middleName: item.middleName?.S || '',
    lastName,
    email: item.email?.S || '',
    phone: item.contactNumber?.S || '',
    role: item.role?.S || 'ORGANIZER',
    contactNumber: item.contactNumber?.S || '',
    birthDate: item.birthDate?.S || '',
    houseNumber: item.houseNumber?.S || '',
    street: item.street?.S || '',
    barangay: item.barangay?.S || '',
    city: item.city?.S || '',
    country: item.country?.S || '',
    gender: item.gender?.S || '',
    createdAt: item.created_at?.S || '',
    updatedAt: item.updated_at?.S || '',
  };
}

function buildDynamoOrganizerItem(payload) {
  const organizerId = payload.id || randomUUID();
  const name = normalizeString(payload.name || payload.firstName || '');
  const firstName = normalizeString(payload.firstName || name);
  const lastName = normalizeString(payload.lastName || '');

  const item = {
    PK: { S: `USER#${organizerId}` },
    SK: { S: 'PROFILE' },
    role: { S: 'ORGANIZER' },
    created_at: {
      S: payload.created_at || payload.createdAt || nowPH(),
    },
    updated_at: {
      S: payload.updated_at || payload.updatedAt || nowPH(),
    },
  };

  if (firstName) {
    item.firstName = { S: firstName };
  }

  if (lastName) {
    item.lastName = { S: lastName };
  }

  const resolvedName = name || [firstName, lastName].filter(Boolean).join(' ');
  if (resolvedName) {
    item.name = { S: resolvedName };
  }

  const email = normalizeString(payload.email).toLowerCase();
  if (email) {
    item.email = { S: email };
  }

  const password = normalizeString(payload.password || '');
  if (password) {
    item.password = { S: password };
  }

  item.contactNumber = buildStringAttribute(
    payload.phone || payload.contactNumber
  );
  item.middleName = buildStringAttribute(payload.middleName);
  item.birthDate = buildStringAttribute(payload.birthDate);
  item.houseNumber = buildStringAttribute(payload.houseNumber);
  item.street = buildStringAttribute(payload.street);
  item.barangay = buildStringAttribute(payload.barangay);
  item.city = buildStringAttribute(payload.city);
  item.country = buildStringAttribute(payload.country);
  item.gender = buildStringAttribute(payload.gender);

  return Object.fromEntries(
    Object.entries(item).filter(([, value]) => value !== undefined)
  );
}

export async function getOrganizers() {
  const command = new ScanCommand({
    TableName: DYNAMO_TABLE,
    FilterExpression: '#sk = :profile AND #role = :organizer',
    ExpressionAttributeNames: {
      '#sk': 'SK',
      '#role': 'role',
    },
    ExpressionAttributeValues: {
      ':profile': { S: 'PROFILE' },
      ':organizer': { S: 'ORGANIZER' },
    },
  });

  const response = await dynamoClient.send(command);
  return (response.Items || []).map(mapDynamoOrganizer);
}

export async function getOrganizersByIds(ids) {
  if (!Array.isArray(ids)) {
    return [];
  }

  const organizerPromises = ids.map((id) => getOrganizerById(id));
  const results = await Promise.all(organizerPromises);
  return results.filter(Boolean);
}

export async function getHeadOrganizerByEventId(eventId) {
  if (!eventId) {
    throw new Error('Event ID is required');
  }

  const event = await getEventById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  if (!event.headOrganizerId) {
    return null;
  }

  return getOrganizerById(event.headOrganizerId);
}

export async function getOrganizerById(organizerId) {
  if (!organizerId) {
    throw new Error('Organizer ID is required');
  }

  const command = new GetItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `USER#${normalizeString(organizerId)}` },
      SK: { S: 'PROFILE' },
    },
  });

  const response = await dynamoClient.send(command);
  return mapDynamoOrganizer(response.Item);
}

async function scanOrganizerByEmail(email) {
  const command = new ScanCommand({
    TableName: DYNAMO_TABLE,
    FilterExpression: '#email = :emailValue AND #role = :organizer',
    ExpressionAttributeNames: {
      '#email': 'email',
      '#role': 'role',
    },
    ExpressionAttributeValues: {
      ':emailValue': { S: email },
      ':organizer': { S: 'ORGANIZER' },
    },
  });

  const response = await dynamoClient.send(command);
  return mapDynamoOrganizer(response.Items?.[0]);
}

export async function findOrganizerByEmail(email) {
  const normalizedEmail = normalizeString(email).toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  const command = new QueryCommand({
    TableName: DYNAMO_TABLE,
    IndexName: 'email-index',
    KeyConditionExpression: '#email = :emailValue',
    ExpressionAttributeNames: {
      '#email': 'email',
    },
    ExpressionAttributeValues: {
      ':emailValue': { S: normalizedEmail },
    },
  });

  try {
    const response = await dynamoClient.send(command);
    const found = (response.Items || []).find(
      (item) => item.role?.S === 'ORGANIZER'
    );
    
    if (!found) {
      return null;
    }

    // GSI might not project all attributes. Fetch full record.
    const getCommand = new GetItemCommand({
      TableName: DYNAMO_TABLE,
      Key: {
        PK: found.PK,
        SK: found.SK || { S: 'PROFILE' },
      },
    });

    const getResponse = await dynamoClient.send(getCommand);
    return getResponse.Item ? mapDynamoOrganizer(getResponse.Item) : null;
  } catch (error) {
    if (
      error.name === 'ValidationException' ||
      error.name === 'ResourceNotFoundException'
    ) {
      return scanOrganizerByEmail(normalizedEmail);
    }
    throw error;
  }
}

export async function createOrganizer(organizerData) {
  if (!organizerData || typeof organizerData !== 'object') {
    throw new Error('Invalid organizer data');
  }

  const email = normalizeString(organizerData.email).toLowerCase();
  if (!email) {
    throw new Error('email is required');
  }

  const existing = await findOrganizerByEmail(email);
  if (existing) {
    throw new Error('Organizer email is already registered');
  }

  const organizerPayload = {
    ...organizerData,
    id: randomUUID(),
    password: organizerData.password
      ? await bcrypt.hash(normalizeString(organizerData.password), 10)
      : undefined,
    created_at: nowPH(),
    updated_at: nowPH(),
  };

  const command = new PutItemCommand({
    TableName: DYNAMO_TABLE,
    Item: buildDynamoOrganizerItem(organizerPayload),
    ConditionExpression:
      'attribute_not_exists(PK) AND attribute_not_exists(SK)',
  });

  await dynamoClient.send(command);
  return mapDynamoOrganizer(buildDynamoOrganizerItem(organizerPayload));
}

export async function updateOrganizer(organizerId, updateData) {
  if (!organizerId) {
    throw new Error('Organizer ID is required');
  }

  if (!updateData || typeof updateData !== 'object') {
    throw new Error('Invalid update data');
  }

  const existing = await getOrganizerById(organizerId);
  if (!existing) {
    throw new Error('Organizer not found');
  }

  const updatedPayload = {
    ...existing,
    ...updateData,
    updated_at: nowPH(),
  };

  if (updateData.password) {
    updatedPayload.password = await bcrypt.hash(
      normalizeString(updateData.password),
      10
    );
  }

  const command = new PutItemCommand({
    TableName: DYNAMO_TABLE,
    Item: buildDynamoOrganizerItem(updatedPayload),
  });

  await dynamoClient.send(command);
  return mapDynamoOrganizer(buildDynamoOrganizerItem(updatedPayload));
}

export async function deleteOrganizer(organizerId) {
  if (!organizerId) {
    throw new Error('Organizer ID is required');
  }

  const existing = await getOrganizerById(organizerId);
  if (!existing) {
    throw new Error('Organizer not found');
  }

  const command = new DeleteItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `USER#${normalizeString(organizerId)}` },
      SK: { S: 'PROFILE' },
    },
  });

  await dynamoClient.send(command);
  return existing;
}
