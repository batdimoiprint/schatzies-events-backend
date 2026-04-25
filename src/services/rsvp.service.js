import { randomUUID } from 'crypto';
import {
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import dynamoClient, { DYNAMO_TABLE } from '../configs/dynamo.js';
import { getEventById as getEventByIdService } from './event.service.js';
import { normalizeString } from '../utils/dynamoHelpers.js';

import QRCode from 'qrcode';

const RSVP_SK_PREFIX = 'RSVP#';
const QR_GSI_NAME = process.env.AWS_RSVP_QR_GSI_NAME || 'GSI1';

function buildEventPK(eventId) {
  return `EVENT#${normalizeString(eventId)}`;
}

function buildGuestSK(guestId) {
  return `RSVP#${normalizeString(guestId)}`;
}

function mapRsvpItem(item) {
  if (!item) {
    return null;
  }

  return {
    guestId: item.SK?.S?.replace(`${RSVP_SK_PREFIX}`, '') || '',
    guestfirstName: item.guestfirstName?.S || '',
    guestmiddleName: item.guestmiddleName?.S || '',
    guestlastName: item.guestlastName?.S || '',
    contactNumber: item.contactNumber?.S || '',
    message: item.message?.S || '',
    status: item.status?.S || '',
    timestamp: item.timestamp?.S || '',
    qrCode: item.qrCode?.S || '',
    isScanned: item.isScanned?.BOOL || false,
    checkedInAt: item.checkedInAt?.S || null,
    eventId: item.eventId?.S || '',
  };
}

function isAttending(status) {
  return normalizeString(status).toUpperCase() === 'ATTENDING';
}

async function queryRsvpsForEvent(eventId, options = {}) {
  const params = {
    TableName: DYNAMO_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
    ExpressionAttributeValues: {
      ':pk': { S: buildEventPK(eventId) },
      ':skPrefix': { S: RSVP_SK_PREFIX },
      ...options.ExpressionAttributeValues,
    },
  };

  if (options.FilterExpression) {
    params.FilterExpression = options.FilterExpression;
    params.ExpressionAttributeNames = options.ExpressionAttributeNames;
  }

  const response = await dynamoClient.send(new QueryCommand(params));
  return (response.Items || []).map(mapRsvpItem).filter(Boolean);
}

export async function getAttendingGuests(eventId) {
  if (!normalizeString(eventId)) {
    throw new Error('Event ID is required');
  }

  return queryRsvpsForEvent(eventId, {
    FilterExpression: '#status = :attending',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':attending': { S: 'ATTENDING' },
    },
  });
}

export async function getAllRsvps(eventId) {
  if (!normalizeString(eventId)) {
    throw new Error('Event ID is required');
  }
  return queryRsvpsForEvent(eventId);
}

export async function getHeadcount(eventId) {
  if (!normalizeString(eventId)) {
    throw new Error('Event ID is required');
  }

  const rsvps = await queryRsvpsForEvent(eventId);
  let expectedGuests = 0;
  let currentHeadcount = 0;

  for (const item of rsvps) {
    if (isAttending(item.status)) {
      expectedGuests += 1;
      if (item.isScanned) {
        currentHeadcount += 1;
      }
    }
  }

  return { expectedGuests, currentHeadcount };
}

export async function getRsvpByGuestId(eventId, guestId) {
  if (!normalizeString(eventId)) {
    throw new Error('Event ID is required');
  }
  if (!normalizeString(guestId)) {
    throw new Error('Guest ID is required');
  }

  const command = new GetItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: buildEventPK(eventId) },
      SK: { S: buildGuestSK(guestId) },
    },
  });

  const response = await dynamoClient.send(command);
  return mapRsvpItem(response.Item);
}

function buildRsvpItem(eventId, payload) {
  const guestId = normalizeString(payload.guestId) || randomUUID();
  const now = new Date().toISOString();

  const baseItem = {
    PK: { S: buildEventPK(eventId) },
    SK: { S: buildGuestSK(guestId) },
    eventId: { S: normalizeString(eventId) },
    guestfirstName: { S: normalizeString(payload.guestfirstName || payload.firstName || '') },
    guestmiddleName: { S: normalizeString(payload.guestmiddleName || payload.middleName || '') },
    guestlastName: { S: normalizeString(payload.guestlastName || payload.lastName || '') },
    contactNumber: { S: normalizeString(payload.contactNumber || payload.contact_number || '') },
    message: { S: normalizeString(payload.message || '') },
    status: { S: normalizeString(payload.status || 'ATTENDING').toUpperCase() },
    timestamp: { S: now },
    isScanned: { BOOL: false },
    createdAt: { S: now },
    updatedAt: { S: now },
  };

  if (normalizeString(payload.qrCode)) {
    baseItem.qrCode = { S: normalizeString(payload.qrCode) };
  }

  return baseItem;
}

export async function createRsvpGuest(eventId, payload) {
  if (!normalizeString(eventId)) {
    throw new Error('Event ID is required');
  }

  const event = await getEventByIdService(eventId);
  if (!event) {
    const error = new Error('Event not found');
    error.status = 404;
    throw error;
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid RSVP payload');
  }

  // Add the capacity validation check here
  const { expectedGuests: currentAttending } = await getHeadcount(eventId);
  const eventPax = Number(event.eventPax) || 0;
  
  if (isAttending(payload.status || 'ATTENDING') && eventPax > 0 && currentAttending >= eventPax) {
    throw new Error('Event capacity has been reached. RSVP rejected.');
  }

  const firstName = normalizeString(payload.guestfirstName || payload.firstName || '');
  const lastName = normalizeString(payload.guestlastName || payload.lastName || '');

  if (!firstName || !lastName) {
    throw new Error('Guest first name and last name are required');
  }

  const item = buildRsvpItem(eventId, payload);
  const guestId = item.SK.S.replace(RSVP_SK_PREFIX, '');

  if (isAttending(payload.status || 'ATTENDING')) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const checkInUrl = `${baseUrl}/checkin?eventId=${eventId}&guestId=${guestId}`;
    const qrCodeImage = await QRCode.toDataURL(checkInUrl);
    item.qrCode = { S: qrCodeImage };
  }

  const command = new PutItemCommand({
    TableName: DYNAMO_TABLE,
    Item: item,
    ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
  });

  await dynamoClient.send(command);
  return mapRsvpItem(item);
}

async function getRsvpByQrCodeUsingGsi(eventId, qrCode) {
  const params = {
    TableName: DYNAMO_TABLE,
    IndexName: QR_GSI_NAME,
    KeyConditionExpression: '#qrCode = :qrCode AND #eventId = :eventId',
    ExpressionAttributeNames: {
      '#qrCode': 'qrCode',
      '#eventId': 'eventId',
    },
    ExpressionAttributeValues: {
      ':qrCode': { S: normalizeString(qrCode) },
      ':eventId': { S: normalizeString(eventId) },
    },
    Limit: 1,
  };

  const response = await dynamoClient.send(new QueryCommand(params));
  return mapRsvpItem(response.Items?.[0]);
}

export async function findRsvpByQrCode(eventId, qrCode) {
  if (!normalizeString(eventId)) {
    throw new Error('Event ID is required');
  }
  if (!normalizeString(qrCode)) {
    throw new Error('QR code is required');
  }

  try {
    return await getRsvpByQrCodeUsingGsi(eventId, qrCode);
  } catch (error) {
    if (
      error.name === 'ValidationException' ||
      error.name === 'ResourceNotFoundException' ||
      error.name === 'UnknownOperationException'
    ) {
      const items = await queryRsvpsForEvent(eventId, {
        FilterExpression: '#qrCode = :qrCode',
        ExpressionAttributeNames: {
          '#qrCode': 'qrCode',
        },
        ExpressionAttributeValues: {
          ':qrCode': { S: normalizeString(qrCode) },
        },
      });
      return items[0] || null;
    }
    throw error;
  }
}

export async function checkInRsvpGuest(eventId, guestId) {
  if (!normalizeString(eventId)) {
    throw new Error('Event ID is required');
  }
  if (!normalizeString(guestId)) {
    throw new Error('Guest ID is required');
  }

  const now = new Date().toISOString();
  const params = {
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: buildEventPK(eventId) },
      SK: { S: buildGuestSK(guestId) },
    },
    UpdateExpression: 'SET isScanned = :true, checkedInAt = :now, #timestamp = :now',
    ConditionExpression: '#status = :attending AND isScanned = :false',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#timestamp': 'timestamp',
    },
    ExpressionAttributeValues: {
      ':true': { BOOL: true },
      ':false': { BOOL: false },
      ':attending': { S: 'ATTENDING' },
      ':now': { S: now },
    },
    ReturnValues: 'ALL_NEW',
  };

  try {
    const response = await dynamoClient.send(new UpdateItemCommand(params));
    return mapRsvpItem(response.Attributes);
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      const existing = await getRsvpByGuestId(eventId, guestId);
      if (!existing) {
        throw new Error('Guest not found');
      }
      if (existing.isScanned) {
        throw new Error('Already checked in');
      }
      if (!isAttending(existing.status)) {
        throw new Error('Guest is not attending');
      }
      throw new Error('Unable to check in guest');
    }
    throw error;
  }
}
