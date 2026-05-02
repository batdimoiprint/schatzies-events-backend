import { randomUUID } from 'crypto';
import {
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
  ScanCommand,
  DeleteItemCommand,
} from '@aws-sdk/client-dynamodb';
import dynamoClient, { DYNAMO_TABLE } from '../configs/dynamo.js';
import { getEventById as getEventByIdService } from './event.service.js';
import { normalizeString } from '../utils/dynamoHelpers.js';

import QRCode from 'qrcode';
import { uploadFile, getPresignedUrl } from './s3.service.js';

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
    email: item.email?.S || '',
    contactNumber: item.contactNumber?.S || '',
    message: item.message?.S || '',
    status: item.status?.S || '',
    timestamp: item.timestamp?.S || '',
    qrCode: item.qrCode?.S || '',
    qrCodeS3Key: item.qrCodeS3Key?.S || '',
    isScanned: item.isScanned?.BOOL || false,
    isVerified: item.isVerified?.BOOL || false,
    verificationToken: item.verificationToken?.S || null,
    checkedInAt: item.checkedInAt?.S || null,
    eventId: item.eventId?.S || '',
    ownerId: item.ownerId?.S || '',
    createdBy: item.createdBy?.S || '',
    createdAt: item.createdAt?.S || '',
    checkedInBy: item.checkedInBy?.S || null,
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

function buildRsvpItem(eventId, payload, ownerId = '', createdBy = '', verificationToken = null) {
  const guestId = normalizeString(payload.guestId) || randomUUID();
  const now = new Date().toISOString();

  const baseItem = {
    PK: { S: buildEventPK(eventId) },
    SK: { S: buildGuestSK(guestId) },
    eventId: { S: normalizeString(eventId) },
    ownerId: { S: normalizeString(ownerId) },
    guestfirstName: { S: normalizeString(payload.guestfirstName || payload.firstName || '') },
    guestmiddleName: { S: normalizeString(payload.guestmiddleName || payload.middleName || '') },
    guestlastName: { S: normalizeString(payload.guestlastName || payload.lastName || '') },
    email: { S: normalizeString(payload.email || '') },
    contactNumber: { S: normalizeString(payload.contactNumber || payload.contact_number || '') },
    message: { S: normalizeString(payload.message || '') },
    status: { S: normalizeString(payload.status || 'ATTENDING').toUpperCase() },
    timestamp: { S: now },
    isScanned: { BOOL: false },
    isVerified: { BOOL: false },
    createdAt: { S: now },
    createdBy: { S: normalizeString(createdBy) },
    updatedAt: { S: now },
  };

  if (verificationToken) {
    baseItem.verificationToken = { S: verificationToken };
  }

  if (normalizeString(payload.qrCode)) {
    baseItem.qrCode = { S: normalizeString(payload.qrCode) };
  }

  return baseItem;
}

export async function createRsvpGuest(eventId, payload, verificationToken = null) {
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

  const item = buildRsvpItem(eventId, payload, event.clientId || event.client_id || '', payload.createdBy || '', verificationToken);
  const guestId = item.SK.S.replace(RSVP_SK_PREFIX, '');

  // QR code will be generated after email verification
  // if (isAttending(payload.status || 'ATTENDING')) {
  //   const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  //   const checkInUrl = `${baseUrl}/checkin?eventId=${eventId}&guestId=${guestId}`;
  //   const qrCodeImage = await QRCode.toDataURL(checkInUrl);
  //   item.qrCode = { S: qrCodeImage };
  // }

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

export async function checkInRsvpGuest(eventId, guestId, checkedInBy = '') {
  if (!normalizeString(eventId)) {
    throw new Error('Event ID is required');
  }
  if (!normalizeString(guestId)) {
    throw new Error('Guest ID is required');
  }

  const now = new Date().toISOString();
  const updateExpr = normalizeString(checkedInBy) 
    ? 'SET isScanned = :true, checkedInAt = :now, checkedInBy = :checkedBy, #timestamp = :now'
    : 'SET isScanned = :true, checkedInAt = :now, #timestamp = :now';
  
  const exprAttrValues = {
    ':true': { BOOL: true },
    ':false': { BOOL: false },
    ':attending': { S: 'ATTENDING' },
    ':now': { S: now },
  };
  
  if (normalizeString(checkedInBy)) {
    exprAttrValues[':checkedBy'] = { S: normalizeString(checkedInBy) };
  }
  
  const params = {
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: buildEventPK(eventId) },
      SK: { S: buildGuestSK(guestId) },
    },
    UpdateExpression: updateExpr,
    ConditionExpression: '#status = :attending AND isScanned = :false',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#timestamp': 'timestamp',
    },
    ExpressionAttributeValues: exprAttrValues,
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

export async function checkEmailExists(email, eventId = null) {
  if (!normalizeString(email)) {
    throw new Error('Email is required');
  }

  const normalizedEmail = normalizeString(email).toLowerCase();

  if (eventId) {
    // Search within a specific event
    const rsvps = await queryRsvpsForEvent(eventId);
    return rsvps.some(rsvp => normalizeString(rsvp.email).toLowerCase() === normalizedEmail);
  } else {
    // Search globally across all events using Scan
    const scanParams = {
      TableName: DYNAMO_TABLE,
      FilterExpression: '#email = :email',
      ExpressionAttributeNames: {
        '#email': 'email',
      },
      ExpressionAttributeValues: {
        ':email': { S: normalizedEmail },
      },
    };

    try {
      const scanResponse = await dynamoClient.send(new ScanCommand(scanParams));
      return (scanResponse.Items && scanResponse.Items.length > 0) || false;
    } catch (error) {
      throw error;
    }
  }
}

export async function verifyRsvpEmail(eventId, guestId, token) {
  if (!normalizeString(eventId)) {
    throw new Error('Event ID is required');
  }
  if (!normalizeString(guestId)) {
    throw new Error('Guest ID is required');
  }
  if (!normalizeString(token)) {
    throw new Error('Verification token is required');
  }

  const guest = await getRsvpByGuestId(eventId, guestId);
  if (!guest) {
    throw new Error('RSVP guest not found');
  }

  if (guest.isVerified) {
    return guest;
  }

  if (guest.verificationToken !== token) {
    throw new Error('Invalid verification token');
  }

  const now = new Date().toISOString();
  
  // Generate QR code for check-in
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const checkInUrl = `${baseUrl}/checkin?eventId=${eventId}&guestId=${guestId}`;

  const qrCodeBuffer = await QRCode.toBuffer(checkInUrl, {
    errorCorrectionLevel: 'M',
    type: 'png',
    width: 400,
    margin: 4,
  });

  // Upload QR code to S3
  const s3Key = `rsvp-qr/${eventId}/guest-${guestId}.png`;
  await uploadFile(qrCodeBuffer, s3Key, 'image/png');

  // Get presigned URL for the QR code
  const qrCodeUrl = await getPresignedUrl(s3Key, 86400);

  const params = {
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: buildEventPK(eventId) },
      SK: { S: buildGuestSK(guestId) },
    },
    UpdateExpression: 'SET isVerified = :true, qrCode = :qrCode, qrCodeS3Key = :s3Key, #timestamp = :now, updatedAt = :now REMOVE verificationToken',
    ExpressionAttributeNames: {
      '#timestamp': 'timestamp',
    },
    ExpressionAttributeValues: {
      ':true': { BOOL: true },
      ':qrCode': { S: qrCodeUrl },
      ':s3Key': { S: s3Key },
      ':now': { S: now },
    },
    ReturnValues: 'ALL_NEW',
  };

  const response = await dynamoClient.send(new UpdateItemCommand(params));
  return mapRsvpItem(response.Attributes);
}

export async function deleteRsvpGuest(eventId, guestId) {
  if (!normalizeString(eventId)) {
    throw new Error('Event ID is required');
  }
  if (!normalizeString(guestId)) {
    throw new Error('Guest ID is required');
  }

  const deleteCommand = new DeleteItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: buildEventPK(eventId) },
      SK: { S: buildGuestSK(guestId) },
    },
  });

  await dynamoClient.send(deleteCommand);
  return { success: true };
}
