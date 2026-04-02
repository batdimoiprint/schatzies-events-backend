import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { GetItemCommand, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import dynamoClient, { DYNAMO_TABLE } from '../configs/dynamo.js';
import { randomUUID } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
// Requires process.env.AWS_ACCESS_KEY_ID and process.env.AWS_SECRET_ACCESS_KEY

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function mapDynamoUser(item) {
  if (!item) {
    return null;
  }

  return {
    user_id: item.PK?.S?.replace('USER#', '') || '',
    firstName: item.firstName?.S || '',
    middleName: item.middleName?.S || '',
    lastName: item.lastName?.S || '',
    email: item.email?.S || '',
    password: item.password?.S || '',
    role: item.role?.S || 'CLIENT',
    contactNumber: item.contactNumber?.S || '',
    birthDate: item.birthDate?.S || '',
    houseNumber: item.houseNumber?.S || '',
    street: item.street?.S || '',
    barangay: item.barangay?.S || '',
    city: item.city?.S || '',
    country: item.country?.S || '',
    gender: item.gender?.S || '',
    created_at: item.created_at?.S || '',
  };
}

function stripPassword(user) {
  if (!user) {
    return null;
  }

  const { password, ...safeUser } = user;
  return safeUser;
}

// Generate a random user ID
function createUserId() {
  return randomUUID();
}

function buildDynamoItem(payload) {
  const userId = payload.user_id || createUserId();

  return {
    PK: { S: `USER#${userId}` },
    SK: { S: 'PROFILE' },
    firstName: { S: normalizeString(payload.firstName) },
    middleName: { S: normalizeString(payload.middleName) },
    lastName: { S: normalizeString(payload.lastName) },
    email: { S: normalizeString(payload.email).toLowerCase() },
    password: { S: normalizeString(payload.password) },
    role: { S: normalizeString(payload.role) || 'CLIENT' },
    contactNumber: { S: normalizeString(payload.contactNumber) },
    birthDate: { S: normalizeString(payload.birthDate) },
    houseNumber: { S: normalizeString(payload.houseNumber) },
    street: { S: normalizeString(payload.street) },
    barangay: { S: normalizeString(payload.barangay) },
    city: { S: normalizeString(payload.city) },
    country: { S: normalizeString(payload.country) },
    gender: { S: normalizeString(payload.gender) },
    created_at: { S: payload.created_at || new Date().toISOString() },
  };
}

export async function findUserByEmail(email) {
  const normalizedEmail = normalizeString(email).toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  const command = new QueryCommand({
    TableName: DYNAMO_TABLE,
    IndexName: 'email-index',
    KeyConditionExpression: 'email = :emailValue',
    ExpressionAttributeValues: {
      ':emailValue': { S: normalizedEmail },
    },
  });

  const response = await dynamoClient.send(command);
  return mapDynamoUser(response.Items?.[0]);
}

export async function findUserByUserId(userId) {
  const normalizedUserId = normalizeString(userId);
  if (!normalizedUserId) {
    return null;
  }

  const command = new GetItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `USER#${normalizedUserId}` },
      SK: { S: 'PROFILE' },
    },
  });

  const response = await dynamoClient.send(command);
  return mapDynamoUser(response.Item);
}

export async function registerUser(payload) {
  const email = normalizeString(payload?.email).toLowerCase();
  const plainPassword = normalizeString(payload?.password);
  const firstName = normalizeString(payload?.firstName);
  const lastName = normalizeString(payload?.lastName);

  if (!email) {
    throw new Error('email is required');
  }

  if (!plainPassword) {
    throw new Error('password is required');
  }

  if (!firstName) {
    throw new Error('firstName is required');
  }

  if (!lastName) {
    throw new Error('lastName is required');
  }

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new Error('Email is already registered');
  }

  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  const userId = createUserId();

  const userPayload = {
    user_id: userId,
    firstName: payload.firstName,
    middleName: payload.middleName || '',
    lastName: payload.lastName,
    email: email,
    password: hashedPassword,
    role: payload.role || 'CLIENT',
    contactNumber: payload.contactNumber || '',
    birthDate: payload.birthDate || '',
    houseNumber: payload.houseNumber || '',
    street: payload.street || '',
    barangay: payload.barangay || '',
    city: payload.city || '',
    country: payload.country || '',
    gender: payload.gender || '',
    created_at: new Date().toISOString(),
  };

  const command = new PutItemCommand({
    TableName: DYNAMO_TABLE,
    Item: buildDynamoItem(userPayload),
    ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
  });

  await dynamoClient.send(command);
  return stripPassword(userPayload);
}

export async function authenticateUser(identifier, plainPassword) {
  const normalizedIdentifier = normalizeString(identifier).toLowerCase();
  const normalizedPassword = normalizeString(plainPassword);

  if (!normalizedIdentifier || !normalizedPassword) {
    return null;
  }

  const user = await findUserByEmail(normalizedIdentifier);
  if (!user?.password) {
    return null;
  }

  const isValid = await bcrypt.compare(normalizedPassword, user.password);
  if (!isValid) {
    return null;
  }

  return stripPassword(user);
}

export function signAuthToken(user) {
  return jwt.sign(
    {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: '7d',
    }
  );
}

export function verifyAuthToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
