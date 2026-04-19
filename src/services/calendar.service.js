import { randomUUID } from 'crypto';
import { PutItemCommand, QueryCommand, UpdateItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import dynamoClient, { DYNAMO_TABLE } from '../configs/dynamo.js';

const buildPK = () => 'CALENDAR';
const buildSK = (entryId) => `CALENDAR#${entryId}`;

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function mapCalendarItem(item) {
  if (!item) {
    return null;
  }

  return {
    entryId: item.entryId?.S || item.SK?.S?.replace('CALENDAR#', '') || '',
    userId: item.userId?.S || '',
    title: item.title?.S || '',
    description: item.description?.S || '',
    date: item.date?.S || '',
    type: item.type?.S || '',
    eventId: item.eventId?.S || null,
    createdAt: item.createdAt?.S || '',
    updatedAt: item.updatedAt?.S || '',
  };
}

function groupEntriesByDate(entries) {
  return Object.values(
    entries.reduce((groups, entry) => {
      const dateKey = entry.date || '';
      if (!groups[dateKey]) {
        groups[dateKey] = { date: dateKey, entries: [] };
      }
      groups[dateKey].entries.push(entry);
      return groups;
    }, {})
  ).sort((a, b) => a.date.localeCompare(b.date));
}

function buildQueryFilters(filters) {
  const expressionParts = [];
  const values = {};
  const names = {};

  if (filters.type) {
    expressionParts.push('#type = :type');
    names['#type'] = 'type';
    values[':type'] = { S: filters.type };
  }

  if (filters.startDate && filters.endDate) {
    expressionParts.push('#date BETWEEN :startDate AND :endDate');
    names['#date'] = 'date';
    values[':startDate'] = { S: filters.startDate };
    values[':endDate'] = { S: filters.endDate };
  }

  const FilterExpression = expressionParts.length ? expressionParts.join(' AND ') : undefined;

  return {
    FilterExpression,
    ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
    ExpressionAttributeValues: Object.keys(values).length ? values : undefined,
  };
}

export async function createCalendarEntry(userId, payload) {
  const entryId = randomUUID();
  const now = new Date().toISOString();
  const item = {
    PK: { S: buildPK() },
    SK: { S: buildSK(entryId) },
    entryId: { S: entryId },
    userId: { S: normalizeString(userId) },
    title: { S: normalizeString(payload.title) },
    description: { S: normalizeString(payload.description || '') },
    date: { S: normalizeString(payload.date) },
    type: { S: normalizeString(payload.type) },
    createdAt: { S: now },
    updatedAt: { S: now },
  };

  if (payload.eventId) {
    item.eventId = { S: normalizeString(payload.eventId) };
  }

  await dynamoClient.send(
    new PutItemCommand({
      TableName: DYNAMO_TABLE,
      Item: item,
    })
  );

  return mapCalendarItem(item);
}

export async function getCalendarEntries(userId, filters = {}) {
  const queryInput = {
    TableName: DYNAMO_TABLE,
    KeyConditionExpression: 'PK = :pk',
    FilterExpression: '#userId = :userId',
    ExpressionAttributeNames: {
      '#userId': 'userId',
    },
    ExpressionAttributeValues: {
      ':pk': { S: buildPK() },
      ':userId': { S: normalizeString(userId) },
    },
    ScanIndexForward: true,
  };

  const { FilterExpression, ExpressionAttributeNames, ExpressionAttributeValues } = buildQueryFilters(filters);
  if (FilterExpression) {
    queryInput.FilterExpression = [queryInput.FilterExpression, FilterExpression]
      .filter(Boolean)
      .join(' AND ');
    queryInput.ExpressionAttributeNames = {
      ...queryInput.ExpressionAttributeNames,
      ...ExpressionAttributeNames,
    };
    queryInput.ExpressionAttributeValues = {
      ...queryInput.ExpressionAttributeValues,
      ...ExpressionAttributeValues,
    };
  }

  const response = await dynamoClient.send(new QueryCommand(queryInput));
  const items = response.Items || [];
  const entries = items
    .map(mapCalendarItem)
    .filter(Boolean)
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      return byDate || a.createdAt.localeCompare(b.createdAt);
    });

  return groupEntriesByDate(entries);
}

export async function updateCalendarEntry(userId, entryId, payload) {
  const key = {
    PK: { S: buildPK() },
    SK: { S: buildSK(entryId) },
  };

  const updates = [];
  const values = {};
  const names = {};

  if (payload.title !== undefined) {
    updates.push('#title = :title');
    names['#title'] = 'title';
    values[':title'] = { S: normalizeString(payload.title) };
  }
  if (payload.description !== undefined) {
    updates.push('#description = :description');
    names['#description'] = 'description';
    values[':description'] = { S: normalizeString(payload.description || '') };
  }
  if (payload.date !== undefined) {
    updates.push('#date = :date');
    names['#date'] = 'date';
    values[':date'] = { S: normalizeString(payload.date) };
  }
  if (payload.type !== undefined) {
    updates.push('#type = :type');
    names['#type'] = 'type';
    values[':type'] = { S: normalizeString(payload.type) };
  }
  if (payload.eventId !== undefined) {
    updates.push('#eventId = :eventId');
    names['#eventId'] = 'eventId';
    values[':eventId'] = { S: normalizeString(payload.eventId || '') };
  }

  if (!updates.length) {
    throw new Error('No update fields provided');
  }

  updates.push('#updatedAt = :updatedAt');
  names['#updatedAt'] = 'updatedAt';
  values[':updatedAt'] = { S: new Date().toISOString() };

  const command = new UpdateItemCommand({
    TableName: DYNAMO_TABLE,
    Key: key,
    UpdateExpression: `SET ${updates.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ReturnValues: 'ALL_NEW',
  });

  const response = await dynamoClient.send(command);
  return mapCalendarItem(response.Attributes);
}

export async function deleteCalendarEntry(userId, entryId) {
  await dynamoClient.send(
    new DeleteItemCommand({
      TableName: DYNAMO_TABLE,
      Key: {
        PK: { S: buildPK() },
        SK: { S: buildSK(entryId) },
      },
    })
  );
}

export async function markCalendarDate(userId, payload) {
  const markPayload = {
    title: payload.title || `Marked ${payload.type}`,
    description: payload.description || '',
    date: payload.date,
    type: payload.type,
    eventId: payload.eventId,
  };
  return createCalendarEntry(userId, markPayload);
}
