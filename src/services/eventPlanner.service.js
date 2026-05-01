import { randomUUID } from 'crypto';
import {
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
import dynamoClient, { DYNAMO_TABLE } from '../configs/dynamo.js';
import {
  getEventById as getEventByIdService,
  updateEvent as updateEventService,
  getEvents as getEventsService,
} from './event.service.js';
import { getVendorsByEventId } from './vendor.service.js';
import { normalizeString } from '../utils/dynamoHelpers.js';

function parseJsonAttribute(attr) {
  if (!attr || typeof attr.S !== 'string') {
    return [];
  }

  try {
    return JSON.parse(attr.S);
  } catch {
    return [];
  }
}

function sanitizeChecklistItem(item) {
  if (!item || typeof item !== 'object') return null;
  return {
    id: normalizeString(item.id),
    label: normalizeString(item.label || item.task || ''),
    done: Boolean(item.done),
  };
}

function normalizeAllocationVendors(vendors) {
  if (!Array.isArray(vendors)) return [];
  return vendors
    .map((vendor) => {
      if (!vendor || typeof vendor !== 'object') return null;
      const id = normalizeString(vendor.id || vendor.vendorId || vendor.vendor_id || '');
      const name = normalizeString(
        vendor.name || vendor.vendorName || vendor.businessName || vendor.clientName || ''
      );
      return {
        ...vendor,
        id,
        name,
      };
    })
    .filter((vendor) => vendor && vendor.id);
}

function mapAllocationItem(item) {
  if (!item) return null;

  return {
    event_id: item.event_id?.S || '',
    vendors: normalizeAllocationVendors(parseJsonAttribute(item.vendors)),
    manpower: parseJsonAttribute(item.manpower),
    supplies: parseJsonAttribute(item.supplies),
    decorations: parseJsonAttribute(item.decorations),
    flow_type: item.flow_type?.S || '',
    food_package: item.food_package?.S || '',
    created_at: item.created_at?.S || '',
    updated_at: item.updated_at?.S || '',
  };
}

function mapPrecheckItem(item) {
  if (!item) return null;

  return {
    event_id: item.event_id?.S || '',
    venue_secured: item.venue_secured?.BOOL === true,
    vendors_ready: item.vendors_ready?.BOOL === true,
    manpower_ready: item.manpower_ready?.BOOL === true,
    supplies_ready: item.supplies_ready?.BOOL === true,
    remarks: item.remarks?.S || '',
    created_at: item.created_at?.S || '',
    updated_at: item.updated_at?.S || '',
  };
}

function mapFlowItem(item) {
  if (!item) return null;
  const pk = item.PK?.S || '';
  const id = pk.startsWith('PROGRAM_FLOW#') ? pk.replace('PROGRAM_FLOW#', '') : '';

  return {
    id,
    event_id: item.event_id?.S || '',
    title: item.title?.S || '',
    description: item.description?.S || '',
    start_time: item.start_time?.S || '',
    end_time: item.end_time?.S || '',
    created_at: item.created_at?.S || '',
    updated_at: item.updated_at?.S || '',
  };
}

function mapTimelineTaskItem(item) {
  if (!item) return null;
  const pk = item.PK?.S || '';
  const id = pk.startsWith('TIMELINE_TASK#') ? pk.replace('TIMELINE_TASK#', '') : '';

  return {
    id,
    event_id: item.event_id?.S || '',
    task_name: item.task_name?.S || '',
    scheduled_time: item.scheduled_time?.S || '',
    is_completed: item.is_completed?.BOOL === true,
    created_at: item.created_at?.S || '',
    updated_at: item.updated_at?.S || '',
  };
}

function mapResourceStatusItem(item) {
  if (!item) return null;
  const pk = item.PK?.S || '';
  const id = pk.startsWith('RESOURCE_STATUS#') ? pk.replace('RESOURCE_STATUS#', '') : '';

  return {
    id,
    event_id: item.event_id?.S || '',
    assignee_type: item.assignee_type?.S || '',
    assignee_id: item.assignee_id?.S || null,
    assignee_name: item.assignee_name?.S || null,
    status: item.status?.S || '',
    created_at: item.created_at?.S || '',
    updated_at: item.updated_at?.S || '',
  };
}

const VALID_TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'COMPLETED'];
const VALID_EVENT_STATUS_TRANSITIONS = {
  PLANNING: ['EXECUTION'],
  EXECUTION: ['COMPLETED'],
  COMPLETED: [],
};

function normalizeStatus(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function mapTaskItem(item) {
  if (!item) return null;
  const pk = item.PK?.S || '';
  const id = pk.startsWith('TASK#') ? pk.replace('TASK#', '') : '';

  return {
    id,
    event_id: item.event_id?.S || '',
    title: item.title?.S || '',
    description: item.description?.S || '',
    status: normalizeStatus(item.status?.S || 'TODO'),
    order: item.order?.N ? Number(item.order.N) : 0,
    createdAt: item.created_at?.S || '',
    updatedAt: item.updated_at?.S || '',
  };
}

function buildTaskKey(eventId, taskId) {
  return {
    PK: { S: `EVENT#${eventId}` },
    SK: { S: `TASK#${taskId}` },
  };
}

async function getTaskById(eventId, taskId) {
  const command = new GetItemCommand({
    TableName: DYNAMO_TABLE,
    Key: buildTaskKey(eventId, taskId),
  });

  const response = await dynamoClient.send(command);
  return mapTaskItem(response.Item);
}

async function queryTasksByEventId(eventId) {
  const command = new QueryCommand({
    TableName: DYNAMO_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :taskPrefix)',
    ExpressionAttributeValues: {
      ':pk': { S: `EVENT#${eventId}` },
      ':taskPrefix': { S: 'TASK#' },
    },
  });

  const response = await dynamoClient.send(command);
  return (response.Items || [])
    .map(mapTaskItem)
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);
}

export async function getTasksByEventId(eventId) {
  if (!eventId) {
    throw new Error('Event ID is required');
  }

  await getEventByIdService(eventId);
  return queryTasksByEventId(eventId);
}

export async function createTask(eventId, payload) {
  if (!eventId) {
    throw new Error('Event ID is required');
  }

  const event = await getEventByIdService(eventId);
  if (!event) {
    const error = new Error('Event not found');
    error.status = 404;
    throw error;
  }

  const title = normalizeString(payload.title || '');
  if (!title) {
    throw new Error('Task title is required');
  }

  const status = VALID_TASK_STATUSES.includes(normalizeStatus(payload.status))
    ? normalizeStatus(payload.status)
    : 'TODO';

  const tasks = await queryTasksByEventId(eventId);
  const sameStatusTasks = tasks.filter((task) => task.status === status);
  const nextOrder = Math.max(0, ...sameStatusTasks.map((task) => task.order)) + 1;
  const taskId = randomUUID();
  const now = new Date().toISOString();

  const command = new PutItemCommand({
    TableName: DYNAMO_TABLE,
    Item: {
      ...buildTaskKey(eventId, taskId),
      event_id: { S: eventId },
      title: { S: title },
      description: { S: normalizeString(payload.description || '') },
      status: { S: status },
      order: { N: String(nextOrder) },
      created_at: { S: now },
      updated_at: { S: now },
    },
  });

  await dynamoClient.send(command);
  return getTaskById(eventId, taskId);
}

export async function updateTask(eventId, taskId, payload) {
  if (!eventId) {
    throw new Error('Event ID is required');
  }

  const existingTask = await getTaskById(eventId, taskId);
  if (!existingTask) {
    const error = new Error('Task not found');
    error.status = 404;
    throw error;
  }

  const updates = [];
  const values = {};
  const names = {};

  if (payload.title !== undefined) {
    updates.push('#title = :title');
    names['#title'] = 'title';
    values[':title'] = { S: normalizeString(payload.title || '') };
  }
  if (payload.description !== undefined) {
    updates.push('#description = :description');
    names['#description'] = 'description';
    values[':description'] = { S: normalizeString(payload.description || '') };
  }

  if (!updates.length) {
    throw new Error('No task fields provided');
  }

  updates.push('#updated_at = :updated_at');
  names['#updated_at'] = 'updated_at';
  values[':updated_at'] = { S: new Date().toISOString() };

  const command = new UpdateItemCommand({
    TableName: DYNAMO_TABLE,
    Key: buildTaskKey(eventId, taskId),
    UpdateExpression: `SET ${updates.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ReturnValues: 'ALL_NEW',
  });

  const response = await dynamoClient.send(command);
  return mapTaskItem(response.Attributes);
}

export async function deleteTask(eventId, taskId) {
  if (!eventId) {
    throw new Error('Event ID is required');
  }

  const existingTask = await getTaskById(eventId, taskId);
  if (!existingTask) {
    const error = new Error('Task not found');
    error.status = 404;
    throw error;
  }

  const command = new DeleteItemCommand({
    TableName: DYNAMO_TABLE,
    Key: buildTaskKey(eventId, taskId),
  });

  await dynamoClient.send(command);
}

export async function moveTask(eventId, taskId, payload) {
  if (!eventId) {
    throw new Error('Event ID is required');
  }

  const currentTask = await getTaskById(eventId, taskId);
  if (!currentTask) {
    const error = new Error('Task not found');
    error.status = 404;
    throw error;
  }

  const newStatus = normalizeStatus(payload.newStatus);
  if (!VALID_TASK_STATUSES.includes(newStatus)) {
    const error = new Error('Invalid task status');
    error.status = 400;
    throw error;
  }

  const newOrder = Number(payload.newOrder);
  if (!Number.isInteger(newOrder) || newOrder < 1) {
    const error = new Error('newOrder must be a positive integer');
    error.status = 400;
    throw error;
  }

  const tasks = await queryTasksByEventId(eventId);
  const sourceTasks = tasks
    .filter((task) => task.status === currentTask.status && task.id !== taskId)
    .sort((a, b) => a.order - b.order);

  const destinationTasks = tasks
    .filter((task) => task.status === newStatus && task.id !== taskId)
    .sort((a, b) => a.order - b.order);

  const movedTask = {
    ...currentTask,
    status: newStatus,
  };

  const insertionIndex = Math.min(Math.max(newOrder - 1, 0), destinationTasks.length);
  destinationTasks.splice(insertionIndex, 0, movedTask);

  const updates = [];

  if (currentTask.status !== newStatus) {
    sourceTasks.forEach((task, index) => {
      const expectedOrder = index + 1;
      if (task.order !== expectedOrder) {
        updates.push({ ...task, order: expectedOrder });
      }
    });
  }

  destinationTasks.forEach((task, index) => {
    const expectedOrder = index + 1;
    if (task.id === taskId || task.order !== expectedOrder) {
      updates.push({ ...task, order: expectedOrder, status: newStatus });
    }
  });

  const uniqueUpdates = new Map();
  for (const task of updates) {
    uniqueUpdates.set(task.id, task);
  }

  const writePromises = Array.from(uniqueUpdates.values()).map((task) => {
    const expressionNames = {
      '#status': 'status',
      '#order': 'order',
      '#updated_at': 'updated_at',
    };

    const expressionValues = {
      ':status': { S: task.status },
      ':order': { N: String(task.order) },
      ':updated_at': { S: new Date().toISOString() },
    };

    const updateExpression = 'SET #status = :status, #order = :order, #updated_at = :updated_at';
    return dynamoClient.send(
      new UpdateItemCommand({
        TableName: DYNAMO_TABLE,
        Key: buildTaskKey(eventId, task.id),
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionNames,
        ExpressionAttributeValues: expressionValues,
      })
    );
  });

  await Promise.all(writePromises);
  return getTaskById(eventId, taskId);
}

export async function getEventsByFilter(filter) {
  const normalizedFilter = typeof filter === 'string' ? filter.trim().toLowerCase() : '';
  const allEvents = await getEventsService();

  if (!normalizedFilter) {
    return allEvents;
  }

  const now = new Date();
  return allEvents.filter((event) => {
    const eventStatus = normalizeStatus(event.status || '');
    const eventStart = event.startDate || event.eventDate || '';
    const eventStartDate = eventStart ? new Date(eventStart) : null;

    if (normalizedFilter === 'completed') {
      return eventStatus === 'COMPLETED';
    }

    if (normalizedFilter === 'active') {
      return eventStatus === 'EXECUTION';
    }

    if (normalizedFilter === 'upcoming') {
      return (
        eventStartDate instanceof Date &&
        !Number.isNaN(eventStartDate.getTime()) &&
        eventStartDate > now &&
        eventStatus !== 'COMPLETED'
      );
    }

    return true;
  });
}

export async function changeEventStatus(eventId, status) {
  if (!eventId) {
    throw new Error('Event ID is required');
  }

  const nextStatus = normalizeStatus(status);
  if (!Object.keys(VALID_EVENT_STATUS_TRANSITIONS).includes(nextStatus)) {
    const error = new Error('Invalid event status');
    error.status = 400;
    throw error;
  }

  const existingEvent = await getEventByIdService(eventId);
  if (!existingEvent) {
    const error = new Error('Event not found');
    error.status = 404;
    throw error;
  }

  const currentStatus = normalizeStatus(existingEvent.status || '');
  const allowed = VALID_EVENT_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    const error = new Error(`Invalid status transition from ${currentStatus} to ${nextStatus}`);
    error.status = 400;
    throw error;
  }

  return updateEventService(eventId, { status: nextStatus });
}

async function findAllocationByEventId(eventId) {
  const command = new GetItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `EVENT#${eventId}` },
      SK: { S: 'ALLOCATION' },
    },
  });
  const response = await dynamoClient.send(command);
  return mapAllocationItem(response.Item);
}

async function upsertAllocation(eventId, payload) {
  const now = new Date().toISOString();
  const command = new PutItemCommand({
    TableName: DYNAMO_TABLE,
    Item: {
      PK: { S: `EVENT#${eventId}` },
      SK: { S: 'ALLOCATION' },
      event_id: { S: eventId },
      vendors: { S: JSON.stringify(payload.vendors || []) },
      manpower: { S: JSON.stringify(payload.manpower || []) },
      supplies: { S: JSON.stringify(payload.supplies || []) },
      decorations: { S: JSON.stringify(payload.decorations || {}) },
      flow_type: { S: normalizeString(payload.flow_type || '') },
      food_package: { S: normalizeString(payload.food_package || '') },
      created_at: { S: now },
      updated_at: { S: now },
    },
  });
  await dynamoClient.send(command);
  return findAllocationByEventId(eventId);
}

async function findPrecheckByEventId(eventId) {
  const command = new GetItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `EVENT#${eventId}` },
      SK: { S: 'PRECHECK' },
    },
  });
  const response = await dynamoClient.send(command);
  return mapPrecheckItem(response.Item);
}

async function createPrecheckRecord(eventId, payload) {
  const now = new Date().toISOString();
  const command = new PutItemCommand({
    TableName: DYNAMO_TABLE,
    Item: {
      PK: { S: `EVENT#${eventId}` },
      SK: { S: 'PRECHECK' },
      event_id: { S: eventId },
      venue_secured: { BOOL: Boolean(payload.venue_secured) },
      vendors_ready: { BOOL: Boolean(payload.vendors_ready) },
      manpower_ready: { BOOL: Boolean(payload.manpower_ready) },
      supplies_ready: { BOOL: Boolean(payload.supplies_ready) },
      remarks: { S: normalizeString(payload.remarks || '') },
      created_at: { S: now },
      updated_at: { S: now },
    },
    ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
  });
  await dynamoClient.send(command);
  return findPrecheckByEventId(eventId);
}

async function updatePrecheckRecord(eventId, payload) {
  const updates = [];
  const values = {};
  const names = {};

  if (payload.venue_secured !== undefined) {
    updates.push('#venue_secured = :venue_secured');
    values[':venue_secured'] = { BOOL: Boolean(payload.venue_secured) };
    names['#venue_secured'] = 'venue_secured';
  }
  if (payload.vendors_ready !== undefined) {
    updates.push('#vendors_ready = :vendors_ready');
    values[':vendors_ready'] = { BOOL: Boolean(payload.vendors_ready) };
    names['#vendors_ready'] = 'vendors_ready';
  }
  if (payload.manpower_ready !== undefined) {
    updates.push('#manpower_ready = :manpower_ready');
    values[':manpower_ready'] = { BOOL: Boolean(payload.manpower_ready) };
    names['#manpower_ready'] = 'manpower_ready';
  }
  if (payload.supplies_ready !== undefined) {
    updates.push('#supplies_ready = :supplies_ready');
    values[':supplies_ready'] = { BOOL: Boolean(payload.supplies_ready) };
    names['#supplies_ready'] = 'supplies_ready';
  }
  if (payload.remarks !== undefined) {
    updates.push('#remarks = :remarks');
    values[':remarks'] = { S: normalizeString(payload.remarks || '') };
    names['#remarks'] = 'remarks';
  }

  if (!updates.length) {
    throw new Error('No precheck fields provided');
  }

  updates.push('#updated_at = :updated_at');
  values[':updated_at'] = { S: new Date().toISOString() };
  names['#updated_at'] = 'updated_at';

  const command = new UpdateItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `EVENT#${eventId}` },
      SK: { S: 'PRECHECK' },
    },
    UpdateExpression: `SET ${updates.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ReturnValues: 'ALL_NEW',
  });
  const response = await dynamoClient.send(command);
  return mapPrecheckItem(response.Attributes);
}

async function findProgramFlowsByEventId(eventId) {
  const command = new ScanCommand({
    TableName: DYNAMO_TABLE,
    FilterExpression: 'event_id = :event_id AND begins_with(PK, :pkPrefix)',
    ExpressionAttributeValues: {
      ':event_id': { S: eventId },
      ':pkPrefix': { S: 'PROGRAM_FLOW#' },
    },
  });
  const response = await dynamoClient.send(command);
  return (response.Items || []).map(mapFlowItem);
}

async function createProgramFlowRecord(eventId, payload) {
  const flowId = randomUUID();
  const now = new Date().toISOString();
  const command = new PutItemCommand({
    TableName: DYNAMO_TABLE,
    Item: {
      PK: { S: `PROGRAM_FLOW#${flowId}` },
      SK: { S: 'METADATA' },
      event_id: { S: eventId },
      title: { S: normalizeString(payload.title) },
      description: { S: normalizeString(payload.description || '') },
      start_time: { S: normalizeString(payload.start_time) },
      end_time: { S: normalizeString(payload.end_time) },
      created_at: { S: now },
      updated_at: { S: now },
    },
  });
  await dynamoClient.send(command);
  return {
    id: flowId,
    event_id: eventId,
    title: normalizeString(payload.title),
    description: normalizeString(payload.description || ''),
    start_time: normalizeString(payload.start_time),
    end_time: normalizeString(payload.end_time),
    created_at: now,
    updated_at: now,
  };
}

async function updateProgramFlowRecord(flowId, payload) {
  const updates = [];
  const values = {};
  const names = {};

  if (payload.title !== undefined) {
    updates.push('#title = :title');
    values[':title'] = { S: normalizeString(payload.title) };
    names['#title'] = 'title';
  }
  if (payload.description !== undefined) {
    updates.push('#description = :description');
    values[':description'] = { S: normalizeString(payload.description || '') };
    names['#description'] = 'description';
  }
  if (payload.start_time !== undefined) {
    updates.push('#start_time = :start_time');
    values[':start_time'] = { S: normalizeString(payload.start_time) };
    names['#start_time'] = 'start_time';
  }
  if (payload.end_time !== undefined) {
    updates.push('#end_time = :end_time');
    values[':end_time'] = { S: normalizeString(payload.end_time) };
    names['#end_time'] = 'end_time';
  }

  if (!updates.length) {
    throw new Error('No program flow fields provided');
  }

  updates.push('#updated_at = :updated_at');
  values[':updated_at'] = { S: new Date().toISOString() };
  names['#updated_at'] = 'updated_at';

  const command = new UpdateItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `PROGRAM_FLOW#${flowId}` },
      SK: { S: 'METADATA' },
    },
    UpdateExpression: `SET ${updates.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ReturnValues: 'ALL_NEW',
  });
  const response = await dynamoClient.send(command);
  return mapFlowItem(response.Attributes);
}

async function deleteProgramFlowRecord(flowId) {
  const command = new DeleteItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `PROGRAM_FLOW#${flowId}` },
      SK: { S: 'METADATA' },
    },
  });
  await dynamoClient.send(command);
}

async function findTimelineTasksByEventId(eventId) {
  const command = new ScanCommand({
    TableName: DYNAMO_TABLE,
    FilterExpression: 'event_id = :event_id AND begins_with(PK, :pkPrefix)',
    ExpressionAttributeValues: {
      ':event_id': { S: eventId },
      ':pkPrefix': { S: 'TIMELINE_TASK#' },
    },
  });
  const response = await dynamoClient.send(command);
  return (response.Items || []).map(mapTimelineTaskItem);
}

async function createTimelineTaskRecord(eventId, payload) {
  const taskId = randomUUID();
  const now = new Date().toISOString();
  const command = new PutItemCommand({
    TableName: DYNAMO_TABLE,
    Item: {
      PK: { S: `TIMELINE_TASK#${taskId}` },
      SK: { S: 'METADATA' },
      event_id: { S: eventId },
      task_name: { S: normalizeString(payload.task_name) },
      scheduled_time: { S: normalizeString(payload.scheduled_time) },
      is_completed: { BOOL: Boolean(payload.is_completed) },
      created_at: { S: now },
      updated_at: { S: now },
    },
  });
  await dynamoClient.send(command);
  return {
    id: taskId,
    event_id: eventId,
    task_name: normalizeString(payload.task_name),
    scheduled_time: normalizeString(payload.scheduled_time),
    is_completed: Boolean(payload.is_completed),
    created_at: now,
    updated_at: now,
  };
}

async function updateTimelineTaskRecord(taskId, payload) {
  const updates = [];
  const values = {};
  const names = {};

  if (payload.task_name !== undefined) {
    updates.push('#task_name = :task_name');
    values[':task_name'] = { S: normalizeString(payload.task_name) };
    names['#task_name'] = 'task_name';
  }
  if (payload.scheduled_time !== undefined) {
    updates.push('#scheduled_time = :scheduled_time');
    values[':scheduled_time'] = { S: normalizeString(payload.scheduled_time) };
    names['#scheduled_time'] = 'scheduled_time';
  }
  if (payload.is_completed !== undefined) {
    updates.push('#is_completed = :is_completed');
    values[':is_completed'] = { BOOL: Boolean(payload.is_completed) };
    names['#is_completed'] = 'is_completed';
  }

  if (!updates.length) {
    throw new Error('No timeline task fields provided');
  }

  updates.push('#updated_at = :updated_at');
  values[':updated_at'] = { S: new Date().toISOString() };
  names['#updated_at'] = 'updated_at';

  const command = new UpdateItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `TIMELINE_TASK#${taskId}` },
      SK: { S: 'METADATA' },
    },
    UpdateExpression: `SET ${updates.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ReturnValues: 'ALL_NEW',
  });
  const response = await dynamoClient.send(command);
  return mapTimelineTaskItem(response.Attributes);
}

async function findResourceStatusesByEventId(eventId) {
  const command = new ScanCommand({
    TableName: DYNAMO_TABLE,
    FilterExpression: 'event_id = :event_id AND begins_with(PK, :pkPrefix)',
    ExpressionAttributeValues: {
      ':event_id': { S: eventId },
      ':pkPrefix': { S: 'RESOURCE_STATUS#' },
    },
  });
  const response = await dynamoClient.send(command);
  return (response.Items || []).map(mapResourceStatusItem);
}

async function createResourceStatusRecord(eventId, payload) {
  const statusId = randomUUID();
  const now = new Date().toISOString();

  const command = new PutItemCommand({
    TableName: DYNAMO_TABLE,
    Item: {
      PK: { S: `RESOURCE_STATUS#${statusId}` },
      SK: { S: 'METADATA' },
      event_id: { S: eventId },
      assignee_type: { S: normalizeString(payload.assignee_type) },
      assignee_id: { S: normalizeString(payload.assignee_id || '') },
      assignee_name: { S: normalizeString(payload.assignee_name || '') },
      status: { S: normalizeString(payload.status) },
      created_at: { S: now },
      updated_at: { S: now },
    },
  });
  await dynamoClient.send(command);
  return {
    id: statusId,
    event_id: eventId,
    assignee_type: normalizeString(payload.assignee_type),
    assignee_id: normalizeString(payload.assignee_id || ''),
    assignee_name: normalizeString(payload.assignee_name || ''),
    status: normalizeString(payload.status),
    created_at: now,
    updated_at: now,
  };
}

async function updateResourceStatusRecord(statusId, payload) {
  const updates = [];
  const values = {};
  const names = {};

  if (payload.assignee_type !== undefined) {
    updates.push('#assignee_type = :assignee_type');
    values[':assignee_type'] = { S: normalizeString(payload.assignee_type) };
    names['#assignee_type'] = 'assignee_type';
  }
  if (payload.assignee_id !== undefined) {
    updates.push('#assignee_id = :assignee_id');
    values[':assignee_id'] = { S: normalizeString(payload.assignee_id || '') };
    names['#assignee_id'] = 'assignee_id';
  }
  if (payload.assignee_name !== undefined) {
    updates.push('#assignee_name = :assignee_name');
    values[':assignee_name'] = { S: normalizeString(payload.assignee_name || '') };
    names['#assignee_name'] = 'assignee_name';
  }
  if (payload.status !== undefined) {
    updates.push('#status = :status');
    values[':status'] = { S: normalizeString(payload.status) };
    names['#status'] = 'status';
  }

  if (!updates.length) {
    throw new Error('No resource status fields provided');
  }

  updates.push('#updated_at = :updated_at');
  values[':updated_at'] = { S: new Date().toISOString() };
  names['#updated_at'] = 'updated_at';

  const command = new UpdateItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `RESOURCE_STATUS#${statusId}` },
      SK: { S: 'METADATA' },
    },
    UpdateExpression: `SET ${updates.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ReturnValues: 'ALL_NEW',
  });
  const response = await dynamoClient.send(command);
  return mapResourceStatusItem(response.Attributes);
}

export async function confirmEvent(eventId, payload, adminId) {
  const existingEvent = await getEventByIdService(eventId);
  if (!existingEvent) {
    const error = new Error('Event not found');
    error.status = 404;
    throw error;
  }
  return updateEventService(eventId, {
    eventDate: payload.event_date,
    venue: payload.venue,
    notes: payload.notes,
    confirmedBy: adminId,
    status: 'confirmed',
  });
}

export async function getConfirmedEvents() {
  const events = await getEventsService();
  return (events || []).filter(
    (event) => String(event.status || '').toLowerCase() === 'confirmed'
  );
}

export async function createOrUpdateAllocation(eventId, payload) {
  const event = await getEventByIdService(eventId);
  if (!event) {
    const error = new Error('Event not found');
    error.status = 404;
    throw error;
  }
  return upsertAllocation(eventId, payload);
}

export async function getAllocation(eventId) {
  const allocation = await findAllocationByEventId(eventId);
  const assignedVendors = await getVendorsByEventId(eventId);
  const assignedVendorEntries = assignedVendors.map((vendor) => ({
    id: vendor.id,
    name: vendor.vendorName || vendor.name || '',
    contactNumber: vendor.contactNumber,
    email: vendor.email,
    eventId: vendor.eventId,
    eventTitle: vendor.eventTitle,
    availabilityStatus: vendor.availabilityStatus,
  }));

  if (!allocation) {
    return {
      event_id: eventId,
      vendors: assignedVendorEntries,
      manpower: [],
      supplies: [],
      decorations: [],
      flow_type: '',
      food_package: '',
      created_at: '',
      updated_at: '',
    };
  }

  if (!Array.isArray(allocation.vendors) || allocation.vendors.length === 0) {
    allocation.vendors = assignedVendorEntries;
  } else {
    const existingIds = new Set(allocation.vendors.map((vendor) => vendor.id));
    allocation.vendors = [
      ...allocation.vendors,
      ...assignedVendorEntries.filter((vendor) => vendor.id && !existingIds.has(vendor.id)),
    ];
  }

  return allocation;
}

export async function deleteAllocation(eventId) {
  const allocation = await findAllocationByEventId(eventId);
  if (!allocation) {
    const error = new Error('Allocation not found');
    error.status = 404;
    throw error;
  }

  const command = new DeleteItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `EVENT#${eventId}` },
      SK: { S: 'ALLOCATION' },
    },
  });

  await dynamoClient.send(command);
  return { message: 'Allocation deleted successfully' };
}

export async function getEventNotes(eventId) {
  const event = await getEventByIdService(eventId);
  if (!event) {
    const error = new Error('Event not found');
    error.status = 404;
    throw error;
  }
  return { notes: event.notes || '' };
}

export async function updateEventNotes(eventId, payload) {
  const event = await getEventByIdService(eventId);
  if (!event) {
    const error = new Error('Event not found');
    error.status = 404;
    throw error;
  }
  return updateEventService(eventId, { notes: payload.notes });
}

export async function deleteEventNotes(eventId) {
  const event = await getEventByIdService(eventId);
  if (!event) {
    const error = new Error('Event not found');
    error.status = 404;
    throw error;
  }
  return updateEventService(eventId, { notes: '' });
}

export async function getEventChecklist(eventId) {
  const event = await getEventByIdService(eventId);
  if (!event) {
    const error = new Error('Event not found');
    error.status = 404;
    throw error;
  }
  const checklist = Array.isArray(event.checklist) ? event.checklist : [];
  return {
    checklist: checklist.map((item) => ({
      ...item,
      label: item.label || item.task || '',
    })),
  };
}

export async function updateEventChecklist(eventId, payload) {
  const event = await getEventByIdService(eventId);
  if (!event) {
    const error = new Error('Event not found');
    error.status = 404;
    throw error;
  }
  const sanitizedChecklist = payload.checklist
    .map(sanitizeChecklistItem)
    .filter((item) => item && item.id && item.label !== '');
  return updateEventService(eventId, { checklist: sanitizedChecklist });
}

export async function createEventChecklist(eventId, payload) {
  const event = await getEventByIdService(eventId);
  if (!event) {
    const error = new Error('Event not found');
    error.status = 404;
    throw error;
  }

  const existingChecklist = Array.isArray(event.checklist) ? event.checklist : [];
  const newItems = payload.checklist
    .map((item) => ({
      id: normalizeString(item.id),
      label: normalizeString(item.label || item.task || ''),
      done: Boolean(item.done),
    }))
    .filter((item) => item.id && item.label !== '');

  const mergedChecklist = [
    ...existingChecklist.filter(
      (item) => !newItems.some((newItem) => newItem.id === item.id)
    ),
    ...newItems,
  ];

  return updateEventService(eventId, { checklist: mergedChecklist });
}

export async function deleteEventChecklistItem(eventId, itemId) {
  const event = await getEventByIdService(eventId);
  if (!event) {
    const error = new Error('Event not found');
    error.status = 404;
    throw error;
  }

  const existingChecklist = Array.isArray(event.checklist) ? event.checklist : [];
  const filteredChecklist = existingChecklist.filter(
    (item) => normalizeString(item.id) !== normalizeString(itemId)
  );

  return updateEventService(eventId, { checklist: filteredChecklist });
}

export async function patchEventChecklist(eventId, payload) {
  const event = await getEventByIdService(eventId);
  if (!event) {
    const error = new Error('Event not found');
    error.status = 404;
    throw error;
  }

  const existingChecklist = Array.isArray(event.checklist) ? event.checklist : [];
  const updatedChecklist = existingChecklist.map((item) => {
    const patchItem = payload.checklist.find((patch) => patch.id === item.id);
    if (!patchItem) {
      return item;
    }
    return {
      ...item,
      label: patchItem.label !== undefined ? normalizeString(patchItem.label) : item.label || item.task || '',
      done: patchItem.done !== undefined ? patchItem.done : item.done,
    };
  });

  const newItems = payload.checklist
    .filter((patchItem) => !existingChecklist.some((item) => item.id === patchItem.id))
    .map(sanitizeChecklistItem)
    .filter((item) => item && item.id && item.label !== '');

  const finalChecklist = [...updatedChecklist, ...newItems];
  return updateEventService(eventId, { checklist: finalChecklist });
}

export async function createPrecheck(eventId, payload) {
  const event = await getEventByIdService(eventId);
  if (!event) {
    const error = new Error('Event not found');
    error.status = 404;
    throw error;
  }
  const existing = await findPrecheckByEventId(eventId);
  if (existing) {
    const error = new Error('Pre-event verification already exists');
    error.status = 409;
    throw error;
  }
  return createPrecheckRecord(eventId, payload);
}

export async function updatePrecheck(eventId, payload) {
  const existing = await findPrecheckByEventId(eventId);
  if (!existing) {
    const error = new Error('Pre-event verification not found');
    error.status = 404;
    throw error;
  }
  return updatePrecheckRecord(eventId, payload);
}

export async function getPrecheck(eventId) {
  const precheck = await findPrecheckByEventId(eventId);
  if (!precheck) {
    const error = new Error('Pre-event verification not found');
    error.status = 404;
    throw error;
  }
  return precheck;
}

export async function createProgramFlow(eventId, payload) {
  const event = await getEventByIdService(eventId);
  if (!event) {
    const error = new Error('Event not found');
    error.status = 404;
    throw error;
  }
  return createProgramFlowRecord(eventId, payload);
}

export async function getProgramFlows(eventId) {
  const event = await getEventByIdService(eventId);
  if (!event) {
    const error = new Error('Event not found');
    error.status = 404;
    throw error;
  }
  return findProgramFlowsByEventId(eventId);
}

export async function updateProgramFlow(flowId, payload) {
  const updated = await updateProgramFlowRecord(flowId, payload);
  if (!updated) {
    const error = new Error('Program flow entry not found');
    error.status = 404;
    throw error;
  }
  return updated;
}

export async function deleteProgramFlow(flowId) {
  await deleteProgramFlowRecord(flowId);
}

export async function createTimelineTask(eventId, payload) {
  const event = await getEventByIdService(eventId);
  if (!event) {
    const error = new Error('Event not found');
    error.status = 404;
    throw error;
  }
  return createTimelineTaskRecord(eventId, payload);
}

export async function getTimelineTasks(eventId) {
  const event = await getEventByIdService(eventId);
  if (!event) {
    const error = new Error('Event not found');
    error.status = 404;
    throw error;
  }
  return findTimelineTasksByEventId(eventId);
}

export async function updateTimelineTask(taskId, payload) {
  const updated = await updateTimelineTaskRecord(taskId, payload);
  if (!updated) {
    const error = new Error('Timeline task not found');
    error.status = 404;
    throw error;
  }
  return updated;
}

export async function createResourceStatus(eventId, payload) {
  const event = await getEventByIdService(eventId);
  if (!event) {
    const error = new Error('Event not found');
    error.status = 404;
    throw error;
  }
  return createResourceStatusRecord(eventId, payload);
}

export async function getResourceStatuses(eventId) {
  const event = await getEventByIdService(eventId);
  if (!event) {
    const error = new Error('Event not found');
    error.status = 404;
    throw error;
  }
  return findResourceStatusesByEventId(eventId);
}

export async function updateResourceStatus(statusId, payload) {
  const updated = await updateResourceStatusRecord(statusId, payload);
  if (!updated) {
    const error = new Error('Resource status entry not found');
    error.status = 404;
    throw error;
  }
  return updated;
}
