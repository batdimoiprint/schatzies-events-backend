import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { GetItemCommand, PutItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import dynamoClient from '../configs/dynamo.js';

const JWT_SECRET = process.env.JWT_SECRET;
// Requires process.env.AWS_ACCESS_KEY_ID and process.env.AWS_SECRET_ACCESS_KEY

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toNumberString(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return '';
  }

  if (!/^\d+$/.test(normalized)) {
    throw new Error('contact_number must be numeric');
  }

  return normalized;
}

function mapDynamoUser(item) {
  if (!item) {
    return null;
  }

  return {
    client_id: item.client_id?.S || '',
    c_fname: item.c_fname?.S || '',
    c_mname: item.c_mname?.S || '',
    c_lname: item.c_lname?.S || '',
    c_suffix: item.c_suffix?.S || '',
    password: item.password?.S || '',
    birthdate: item.birthdate?.S || '',
    house_no: item.house_no?.S || '',
    street_name: item.street_name?.S || '',
    barangay: item.barangay?.S || '',
    city: item.city?.S || '',
    country: item.country?.S || '',
    gender: item.gender?.S || '',
    contact_number: item.contact_number?.N || '',
    c_email: item.c_email?.S || '',
    role: item.role?.S || 'CLIENT',
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

function createClientId() {
  const uniquePart = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return `USER#${uniquePart}`;
}

function buildDynamoItem(payload) {
  const contactNumber = toNumberString(payload.contact_number);

  return {
    client_id: { S: normalizeString(payload.client_id) },
    c_fname: { S: normalizeString(payload.c_fname) },
    c_mname: { S: normalizeString(payload.c_mname) },
    c_lname: { S: normalizeString(payload.c_lname) },
    c_suffix: { S: normalizeString(payload.c_suffix) },
    password: { S: normalizeString(payload.password) },
    birthdate: { S: normalizeString(payload.birthdate) },
    house_no: { S: normalizeString(payload.house_no) },
    street_name: { S: normalizeString(payload.street_name) },
    barangay: { S: normalizeString(payload.barangay) },
    city: { S: normalizeString(payload.city) },
    country: { S: normalizeString(payload.country) },
    gender: { S: normalizeString(payload.gender) },
    contact_number: { N: contactNumber || '0' },
    c_email: { S: normalizeString(payload.c_email).toLowerCase() },
    role: { S: normalizeString(payload.role) || 'CLIENT' },
    created_at: {
      S: normalizeString(payload.created_at) || new Date().toISOString(),
    },
  };
}

export async function findUserByEmail(email) {
  const normalizedEmail = normalizeString(email).toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  const command = new ScanCommand({
    TableName: 'users_table',
    FilterExpression: '#email = :emailValue',
    ExpressionAttributeNames: {
      '#email': 'c_email',
    },
    ExpressionAttributeValues: {
      ':emailValue': { S: normalizedEmail },
    },
    Limit: 1,
  });

  const response = await dynamoClient.send(command);
  return mapDynamoUser(response.Items?.[0]);
}

export async function findUserByClientId(clientId) {
  const normalizedClientId = normalizeString(clientId);
  if (!normalizedClientId) {
    return null;
  }

  const command = new GetItemCommand({
    TableName: 'users_table',
    Key: {
      client_id: { S: normalizedClientId },
    },
  });

  const response = await dynamoClient.send(command);
  return mapDynamoUser(response.Item);
}

export async function registerUser(payload) {
  const email = normalizeString(payload?.c_email).toLowerCase();
  const plainPassword = normalizeString(payload?.password);

  if (!email) {
    throw new Error('c_email is required');
  }

  if (!plainPassword) {
    throw new Error('password is required');
  }

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new Error('Email is already registered');
  }

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const userPayload = {
    client_id: normalizeString(payload.client_id) || createClientId(),
    c_fname: payload.c_fname,
    c_mname: payload.c_mname,
    c_lname: payload.c_lname,
    c_suffix: payload.c_suffix,
    password: hashedPassword,
    birthdate: payload.birthdate,
    house_no: payload.house_no,
    street_name: payload.street_name,
    barangay: payload.barangay,
    city: payload.city,
    country: payload.country,
    gender: payload.gender,
    contact_number: payload.contact_number,
    c_email: email,
    role: payload.role || 'CLIENT',
    created_at: payload.created_at || new Date().toISOString(),
  };

  const command = new PutItemCommand({
    TableName: 'users_table',
    Item: buildDynamoItem(userPayload),
    ConditionExpression: 'attribute_not_exists(client_id)',
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
      sub: user.client_id,
      email: user.c_email,
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
