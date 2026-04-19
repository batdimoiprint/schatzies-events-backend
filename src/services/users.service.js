import bcrypt from 'bcryptjs';
import { GetItemCommand, PutItemCommand, QueryCommand, ScanCommand, DeleteItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import dynamoClient, { DYNAMO_TABLE } from '../configs/dynamo.js';
import { randomUUID } from 'crypto';

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

export async function getAllUsers() {
  const command = new ScanCommand({
    TableName: DYNAMO_TABLE,
    FilterExpression: 'begins_with(PK, :pkPrefix) AND SK = :sk',
    ExpressionAttributeValues: {
      ':pkPrefix': { S: 'USER#' },
      ':sk': { S: 'PROFILE' },
    },
  });

  const response = await dynamoClient.send(command);
  return (response.Items || []).map(mapDynamoUser);
}

export async function getUsersByRole(role) {
  const normalizedRole = normalizeString(role).toUpperCase();
  if (!normalizedRole) {
    return [];
  }

  const command = new ScanCommand({
    TableName: DYNAMO_TABLE,
    FilterExpression: 'begins_with(PK, :pkPrefix) AND SK = :sk AND #role = :role',
    ExpressionAttributeNames: {
      '#role': 'role',
    },
    ExpressionAttributeValues: {
      ':pkPrefix': { S: 'USER#' },
      ':sk': { S: 'PROFILE' },
      ':role': { S: normalizedRole },
    },
  });

  const response = await dynamoClient.send(command);
  return (response.Items || []).map(mapDynamoUser);
}

export async function createUser(payload) {
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
  
  // Return user without password
  const { password, ...safeUser } = userPayload;
  return safeUser;
}

export async function updateUser(userId, payload) {
  const normalizedUserId = normalizeString(userId);
  if (!normalizedUserId) {
    throw new Error('userId is required');
  }

  const existingUser = await findUserByUserId(normalizedUserId);
  if (!existingUser) {
    throw new Error('User not found');
  }

  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  const updatableFields = [
    'firstName', 'middleName', 'lastName', 'birthDate', 'houseNumber',
    'street', 'barangay', 'city', 'country', 'gender', 'contactNumber', 'role'
  ];

  for (const field of updatableFields) {
    if (payload[field] !== undefined) {
      updateExpressions.push(`#${field} = :${field}`);
      expressionAttributeNames[`#${field}`] = field;
      expressionAttributeValues[`:${field}`] = { S: normalizeString(payload[field]) };
    }
  }

  // Handle password separately (needs hashing)
  if (payload.password) {
    const hashedPassword = await bcrypt.hash(normalizeString(payload.password), 10);
    updateExpressions.push('#password = :password');
    expressionAttributeNames['#password'] = 'password';
    expressionAttributeValues[':password'] = { S: hashedPassword };
  }

  if (updateExpressions.length === 0) {
    throw new Error('No fields to update');
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

export async function deleteUser(userId) {
  const normalizedUserId = normalizeString(userId);
  if (!normalizedUserId) {
    throw new Error('userId is required');
  }

  const existingUser = await findUserByUserId(normalizedUserId);
  if (!existingUser) {
    throw new Error('User not found');
  }

  const command = new DeleteItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `USER#${normalizedUserId}` },
      SK: { S: 'PROFILE' },
    },
  });

  await dynamoClient.send(command);
  return { message: 'User deleted successfully' };
}
