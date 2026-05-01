import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  ScanCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import dynamoClient, { DYNAMO_TABLE } from '../configs/dynamo.js';
import { randomUUID } from 'crypto';
import { normalizeString } from '../utils/dynamoHelpers.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET env var is required');
}

const PASSWORD_RESET_CODE_TTL_MS = 15 * 60 * 1000;
const PASSWORD_RESET_TOKEN_TTL_SECONDS = 15 * 60;

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
    profilePic: item.profilePic?.S || '',
    created_at: item.created_at?.S || '',
    passwordResetCodeHash: item.passwordResetCodeHash?.S || '',
    passwordResetCodeExpiresAt: item.passwordResetCodeExpiresAt?.S || '',
    passwordResetCodeIssuedAt: item.passwordResetCodeIssuedAt?.S || '',
  };
}

function stripPassword(user) {
  if (!user) {
    return null;
  }

  const {
    password,
    passwordResetCodeHash,
    passwordResetCodeExpiresAt,
    passwordResetCodeIssuedAt,
    ...safeUser
  } = user;
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
    profilePic: { S: normalizeString(payload.profilePic) },
    created_at: { S: payload.created_at || new Date().toISOString() },
  };
}

async function scanUserByEmail(email) {
  const command = new ScanCommand({
    TableName: DYNAMO_TABLE,
    FilterExpression: '#email = :emailValue',
    ExpressionAttributeNames: {
      '#email': 'email',
    },
    ExpressionAttributeValues: {
      ':emailValue': { S: email },
    },
  });

  const response = await dynamoClient.send(command);
  return mapDynamoUser(response.Items?.[0]);
}

async function queryUserRecordByEmail(email) {
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

  try {
    const response = await dynamoClient.send(command);
    const userItem = (response.Items || []).find(
      (item) => item.PK?.S?.startsWith('USER#') && item.SK?.S === 'PROFILE'
    );
    return userItem ? mapDynamoUser(userItem) : null;
  } catch (error) {
    if (
      error.name === 'ValidationException' ||
      error.name === 'ResourceNotFoundException'
    ) {
      return scanUserByEmail(normalizedEmail);
    }
    throw error;
  }
}

async function updateUserFields(userId, updateFields) {
  const normalizedUserId = normalizeString(userId);
  if (!normalizedUserId) {
    throw new Error('userId is required');
  }

  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  for (const [field, value] of Object.entries(updateFields)) {
    updateExpressions.push(`#${field} = :${field}`);
    expressionAttributeNames[`#${field}`] = field;
    expressionAttributeValues[`:${field}`] = { S: value };
  }

  if (updateExpressions.length === 0) {
    return null;
  }

  const command = new UpdateItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `USER#${normalizedUserId}` },
      SK: { S: 'PROFILE' },
    },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  });

  const response = await dynamoClient.send(command);
  return mapDynamoUser(response.Attributes);
}

async function clearPasswordResetFields(userId) {
  const normalizedUserId = normalizeString(userId);
  if (!normalizedUserId) {
    throw new Error('userId is required');
  }

  const command = new UpdateItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `USER#${normalizedUserId}` },
      SK: { S: 'PROFILE' },
    },
    UpdateExpression:
      'REMOVE #passwordResetCodeHash, #passwordResetCodeExpiresAt, #passwordResetCodeIssuedAt',
    ExpressionAttributeNames: {
      '#passwordResetCodeHash': 'passwordResetCodeHash',
      '#passwordResetCodeExpiresAt': 'passwordResetCodeExpiresAt',
      '#passwordResetCodeIssuedAt': 'passwordResetCodeIssuedAt',
    },
    ReturnValues: 'ALL_NEW',
  });

  const response = await dynamoClient.send(command);
  return mapDynamoUser(response.Attributes);
}

function createPasswordResetCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function createPasswordResetToken(user) {
  return jwt.sign(
    {
      user_id: user.user_id,
      email: user.email,
      purpose: 'password-reset',
    },
    JWT_SECRET,
    {
      expiresIn: `${PASSWORD_RESET_TOKEN_TTL_SECONDS}s`,
    }
  );
}

export async function findUserByEmail(email) {
  const user = await queryUserRecordByEmail(email);
  return stripPassword(user);
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
    ConditionExpression:
      'attribute_not_exists(PK) AND attribute_not_exists(SK)',
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

  const user = await queryUserRecordByEmail(normalizedIdentifier);
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

export async function createPasswordResetChallenge(email) {
  const user = await queryUserRecordByEmail(email);
  if (!user?.user_id) {
    return null;
  }

  const code = createPasswordResetCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(
    Date.now() + PASSWORD_RESET_CODE_TTL_MS
  ).toISOString();
  const issuedAt = new Date().toISOString();

  const updatedUser = await updateUserFields(user.user_id, {
    passwordResetCodeHash: codeHash,
    passwordResetCodeExpiresAt: expiresAt,
    passwordResetCodeIssuedAt: issuedAt,
  });

  return {
    user: stripPassword(updatedUser || user),
    code,
    expiresAt,
  };
}

export async function verifyPasswordResetCode(email, code) {
  const user = await queryUserRecordByEmail(email);
  const providedCode = normalizeString(code);

  if (
    !user?.user_id ||
    !user.passwordResetCodeHash ||
    !user.passwordResetCodeExpiresAt ||
    !providedCode
  ) {
    return null;
  }

  const expiresAt = new Date(user.passwordResetCodeExpiresAt).getTime();
  if (Number.isNaN(expiresAt) || expiresAt < Date.now()) {
    await clearPasswordResetFields(user.user_id);
    return null;
  }

  const isValid = await bcrypt.compare(
    providedCode,
    user.passwordResetCodeHash
  );
  if (!isValid) {
    return null;
  }

  const resetToken = createPasswordResetToken(user);
  await clearPasswordResetFields(user.user_id);

  return {
    user: stripPassword(user),
    resetToken,
  };
}

export async function resetPasswordWithToken(resetToken, newPassword) {
  if (!resetToken || !newPassword) {
    return null;
  }

  let payload;
  try {
    payload = jwt.verify(resetToken, JWT_SECRET);
  } catch {
    return null;
  }

  if (
    !payload ||
    payload.purpose !== 'password-reset' ||
    !payload.email ||
    !payload.user_id
  ) {
    return null;
  }

  const user = await queryUserRecordByEmail(payload.email);
  if (!user || user.user_id !== payload.user_id) {
    return null;
  }

  const hashedPassword = await bcrypt.hash(normalizeString(newPassword), 10);
  const command = new UpdateItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `USER#${user.user_id}` },
      SK: { S: 'PROFILE' },
    },
    UpdateExpression:
      'SET #password = :password REMOVE #passwordResetCodeHash, #passwordResetCodeExpiresAt, #passwordResetCodeIssuedAt',
    ExpressionAttributeNames: {
      '#password': 'password',
      '#passwordResetCodeHash': 'passwordResetCodeHash',
      '#passwordResetCodeExpiresAt': 'passwordResetCodeExpiresAt',
      '#passwordResetCodeIssuedAt': 'passwordResetCodeIssuedAt',
    },
    ExpressionAttributeValues: {
      ':password': { S: hashedPassword },
    },
    ReturnValues: 'ALL_NEW',
  });

  const response = await dynamoClient.send(command);
  return stripPassword(mapDynamoUser(response.Attributes));
}

export function verifyAuthToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
