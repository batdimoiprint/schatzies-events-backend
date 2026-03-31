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
    username: item.username?.S || '',
    fname: item.fname?.S || '',
    mname: item.mname?.S || '',
    lname: item.lname?.S || '',
    suffix: item.suffix?.S || '',
    password: item.password?.S || '',
    birthdate: item.birthdate?.S || '',
    house_no: item.house_no?.S || '',
    street_name: item.street_name?.S || '',
    barangay: item.barangay?.S || '',
    city: item.city?.S || '',
    country: item.country?.S || '',
    gender: item.gender?.S || '',
    contact_number: item.contact_number?.N || '',
    email: item.email?.S || '',
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

// Generate a random client ID using bcryptjs hash of a random value
function createClientId() {
  const randomValue = `${Date.now()}-${Math.random()}-${Math.floor(Math.random() * 1000000)}`;
  // Use bcryptjs to hash the random value synchronously (saltRounds = 6 for speed, not for security)
  const salt = bcrypt.genSaltSync(6);
  const hash = bcrypt.hashSync(randomValue, salt);
  // Remove non-alphanumeric characters for DynamoDB compatibility, keep it short
  const safeHash = hash.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
  return `USER#${safeHash}`;
}

function buildDynamoItem(payload) {
  const contactNumber = toNumberString(payload.contact_number);

  return {
    client_id: { S: normalizeString(payload.client_id) },
    username: { S: normalizeString(payload.username) },
    fname: { S: normalizeString(payload.fname) },
    mname: { S: normalizeString(payload.mname) },
    lname: { S: normalizeString(payload.lname) },
    suffix: { S: normalizeString(payload.suffix) },
    password: { S: normalizeString(payload.password) },
    birthdate: { S: normalizeString(payload.birthdate) },
    house_no: { S: normalizeString(payload.house_no) },
    street_name: { S: normalizeString(payload.street_name) },
    barangay: { S: normalizeString(payload.barangay) },
    city: { S: normalizeString(payload.city) },
    country: { S: normalizeString(payload.country) },
    gender: { S: normalizeString(payload.gender) },
    contact_number: { N: contactNumber || '0' },
    email: { S: normalizeString(payload.email).toLowerCase() },
    role: { S: normalizeString(payload.role) || 'CLIENT' },
    created_at: {
      S: new Date().toISOString(),
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
      '#email': 'email',
    },
    ExpressionAttributeValues: {
      ':emailValue': { S: normalizedEmail },
    },
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
  const email = normalizeString(payload?.email).toLowerCase();
  const plainPassword = normalizeString(payload?.password);
  const username = normalizeString(payload?.username);

  if (!email) {
    throw new Error('email is required');
  }

  if (!plainPassword) {
    throw new Error('password is required');
  }

  if (!username) {
    throw new Error('username is required');
  }

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new Error('Email is already registered');
  }

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const userPayload = {
    client_id:  createClientId(),
    username: payload.username,
    fname: payload.fname,
    mname: payload.mname,
    lname: payload.lname,
    suffix: payload.suffix,
    password: hashedPassword,
    birthdate: payload.birthdate,
    house_no: payload.house_no,
    street_name: payload.street_name,
    barangay: payload.barangay,
    city: payload.city,
    country: payload.country,
    gender: payload.gender,
    contact_number: payload.contact_number,
    email: email,
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
