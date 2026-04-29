import { randomUUID } from 'crypto';
import {
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  ScanCommand,
  DeleteItemCommand,
} from '@aws-sdk/client-dynamodb';
import dynamoClient, { DYNAMO_TABLE } from '../configs/dynamo.js';
import {
  updateKPIAnalytics,
  updateStatusAnalytics,
  updateUpcomingEventsSnapshot,
} from './dashboardAnalytics.service.js';
import { normalizeString, buildStringAttribute, buildNumberAttribute } from '../utils/dynamoHelpers.js';

function ensureWorkerAssignments(event) {
  if (!Array.isArray(event.workerOrganizerAssignments)) {
    event.workerOrganizerAssignments = Array.isArray(event.workerOrganizerIds)
      ? event.workerOrganizerIds.map((id) => ({
          organizerId: id,
          status: 'pending',
          updatedAt: event.updatedAt || new Date().toISOString(),
        }))
      : [];
  }

  if (!Array.isArray(event.workerOrganizerIds)) {
    event.workerOrganizerIds = event.workerOrganizerAssignments.map(
      (assignment) => assignment.organizerId
    );
  }

  return event;
}

function mapDynamoEvent(item) {
  if (!item) {
    return null;
  }

  return {
    event_id: item.SK?.S?.replace('EVENT#', '') || '',
    eventId: item.SK?.S?.replace('EVENT#', '') || '',
    client_id: item.client_id?.S || item.PK?.S?.replace('USER#', '') || '',
    organizer_id: item.organizer_id?.S || item.user_id?.S || '',
    eventType: item.eventType?.S || '',
    eventPackageKey: item.eventPackageKey?.S || item.eventPackage?.S || '',
    eventPax: item.eventPax?.N ? Number(item.eventPax.N) : null,
    eventDate: item.eventDate?.S || '',
    eventTime: item.eventTime?.S || '',
    startTime: item.startTime?.S || item.eventTime?.S || '',
    eventLocation: item.eventLocation?.S || item.location?.S || '',
    status: item.status?.S || '',
    id: item.SK?.S?.replace('EVENT#', '') || '',
    clientId: item.client_id?.S || item.PK?.S?.replace('USER#', '') || '',
    user_id: item.user_id?.S || '',
    title: item.title?.S || '',
    description: item.description?.S || '',
    location: item.location?.S || '',
    venue: item.venue?.S || '',
    notes: item.notes?.S || '',
    confirmedBy: item.confirmedBy?.S || '',
    startDate: item.startDate?.S || '',
    endDate: item.endDate?.S || '',
    headOrganizerId: item.organizer_id?.S || item.user_id?.S || '',
    workerOrganizerIds: Array.isArray(item.workerOrganizerIds?.L)
      ? item.workerOrganizerIds.L.map((entry) => entry.S || '')
      : [],
    workerOrganizerAssignments: Array.isArray(item.workerOrganizerAssignments?.L)
      ? item.workerOrganizerAssignments.L.map((entry) => ({
          organizerId: entry.M?.organizerId?.S || '',
          status: entry.M?.status?.S || 'pending',
          updatedAt: entry.M?.updatedAt?.S || '',
        }))
      : [],
    messages: Array.isArray(item.messages?.L)
      ? item.messages.L.map((entry) => ({
          id: entry.M?.id?.S || '',
          senderId: entry.M?.senderId?.S || '',
          senderRole: entry.M?.senderRole?.S || '',
          receiverId: entry.M?.receiverId?.S || '',
          body: entry.M?.body?.S || '',
          createdAt: entry.M?.createdAt?.S || '',
        }))
      : [],
    createdAt: item.created_at?.S || '',
    updatedAt: item.updated_at?.S || '',
  };
}

function buildMessageAttribute(message) {
  return {
    M: {
      id: { S: normalizeString(message.id) },
      senderId: { S: normalizeString(message.senderId) },
      senderRole: { S: normalizeString(message.senderRole) },
      receiverId: { S: normalizeString(message.receiverId) },
      body: { S: normalizeString(message.body) },
      createdAt: { S: normalizeString(message.createdAt) },
    },
  };
}

function buildDynamoEventItem(payload) {
  const eventId = payload.id || payload.eventId || randomUUID();
  const clientId = normalizeString(payload.clientId || payload.client_id || '');

  if (!clientId) {
    throw new Error('clientId is required');
  }

  const eventDate = normalizeString(payload.eventDate || '');
  const eventTime = normalizeString(payload.eventTime || payload.startTime || payload.time || '');
  const startTime = buildStringAttribute(payload.startTime || payload.eventTime || payload.time);
  const eventLocation = normalizeString(payload.eventLocation || payload.location || '');
  const eventType = normalizeString(payload.eventType || '');
  const eventPackageKey = normalizeString(payload.eventPackageKey || payload.eventPackage || '');
  const title = normalizeString(payload.title || payload.eventTitle || '');
  const status = normalizeString(payload.status || 'Planning');
  const userId = normalizeString(payload.organizer_id || payload.organizerId || payload.user_id || payload.headOrganizerId || '');
  const eventPax =
    payload.eventPax !== undefined && payload.eventPax !== null
      ? Number(payload.eventPax)
      : null;

  const assignments = Array.isArray(payload.workerOrganizerAssignments)
    ? payload.workerOrganizerAssignments
    : [];
  const assignmentList = {
    L: assignments.map((assignment) => ({
      M: {
        organizerId: { S: normalizeString(assignment.organizerId) },
        status: { S: normalizeString(assignment.status || 'pending') },
        updatedAt: {
          S:
            normalizeString(assignment.updatedAt) || new Date().toISOString(),
        },
      },
    })),
  };

  const organizerIds = Array.isArray(payload.workerOrganizerIds)
    ? payload.workerOrganizerIds
    : assignments.map((assignment) => assignment.organizerId);

  const item = {
    PK: { S: `USER#${clientId}` },
    SK: { S: `EVENT#${eventId}` },
    event_id: { S: eventId },
    client_id: { S: clientId },
    organizer_id: { S: userId },
    status: { S: status },
    created_at: { S: payload.created_at || payload.createdAt || new Date().toISOString() },
    updated_at: { S: payload.updated_at || payload.updatedAt || new Date().toISOString() },
    workerOrganizerIds: {
      L: organizerIds.map((id) => ({ S: normalizeString(id) })),
    },
    workerOrganizerAssignments: assignmentList,
  };

  if (eventType) {
    item.eventType = { S: eventType };
  }

  if (eventPackageKey) {
    item.eventPackageKey = { S: eventPackageKey };
  }

  if (eventPax !== null) {
    item.eventPax = { N: String(eventPax) };
  }

  if (eventDate) {
    item.eventDate = { S: eventDate };
  }

  if (eventTime) {
    item.eventTime = { S: eventTime };
  }

  if (startTime) {
    item.startTime = startTime;
  }

  if (eventLocation) {
    item.eventLocation = { S: eventLocation };
  }

  if (userId) {
    item.organizer_id = { S: userId };
  }

  if (title) {
    item.title = { S: title };
  }

  const description = buildStringAttribute(payload.description);
  if (description) {
    item.description = description;
  }

  const location = buildStringAttribute(payload.location);
  if (location) {
    item.location = location;
  }

  const venue = buildStringAttribute(payload.venue);
  if (venue) {
    item.venue = venue;
  }

  const notes = buildStringAttribute(payload.notes);
  if (notes) {
    item.notes = notes;
  }

  const confirmedBy = buildStringAttribute(payload.confirmedBy || payload.confirmed_by);
  if (confirmedBy) {
    item.confirmedBy = confirmedBy;
  }

  const startDate = buildStringAttribute(payload.startDate);
  if (startDate) {
    item.startDate = startDate;
  }

  const endDate = buildStringAttribute(payload.endDate);
  if (endDate) {
    item.endDate = endDate;
  }

  if (Array.isArray(payload.messages) && payload.messages.length) {
    item.messages = {
      L: payload.messages.map((message) => buildMessageAttribute(message)),
    };
  }

  return item;
}

export async function getEvents(clientId) {
  if (clientId) {
    const command = new QueryCommand({
      TableName: DYNAMO_TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :eventPrefix)',
      ExpressionAttributeValues: {
        ':pk': { S: `USER#${normalizeString(clientId)}` },
        ':eventPrefix': { S: 'EVENT#' },
      },
    });

    const response = await dynamoClient.send(command);
    return (response.Items || []).map(mapDynamoEvent);
  }

  const command = new ScanCommand({
    TableName: DYNAMO_TABLE,
    FilterExpression: 'begins_with(SK, :eventPrefix)',
    ExpressionAttributeValues: {
      ':eventPrefix': { S: 'EVENT#' },
    },
  });

  const response = await dynamoClient.send(command);
  return (response.Items || []).map(mapDynamoEvent);
}

export async function getEventById(eventId) {
  if (!eventId) {
    throw new Error('Event ID is required');
  }

  const command = new ScanCommand({
    TableName: DYNAMO_TABLE,
    FilterExpression: 'SK = :sk',
    ExpressionAttributeValues: {
      ':sk': { S: `EVENT#${normalizeString(eventId)}` },
    },
  });

  const response = await dynamoClient.send(command);
  return mapDynamoEvent(response.Items?.[0]);
}

export async function createEvent(eventData, clientId) {
  if (!eventData || typeof eventData !== 'object') {
    throw new Error('Invalid event data');
  }

  const effectiveClientId = normalizeString(clientId || eventData.clientId || eventData.client_id);
  if (!effectiveClientId) {
    throw new Error('clientId is required');
  }

  if (!normalizeString(eventData.eventType) || !normalizeString(eventData.eventDate)) {
    throw new Error('eventType and eventDate are required');
  }

  const eventPayload = {
    ...eventData,
    id: normalizeString(eventData.id || eventData.eventId || randomUUID()),
    clientId: effectiveClientId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const command = new PutItemCommand({
    TableName: DYNAMO_TABLE,
    Item: buildDynamoEventItem(eventPayload),
    ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
  });

  await dynamoClient.send(command);
  await updateKPIAnalytics({
    ...eventPayload,
    status: eventPayload.status || 'PLANNING',
  });
  await updateUpcomingEventsSnapshot(await getEventsService());

  return mapDynamoEvent(buildDynamoEventItem(eventPayload));
}

export async function updateEvent(eventId, updateData) {
  if (!eventId) {
    throw new Error('Event ID is required');
  }

  if (!updateData || typeof updateData !== 'object') {
    throw new Error('Invalid update data');
  }

  const existingEvent = await getEventById(eventId);
  if (!existingEvent) {
    throw new Error('Event not found');
  }

  const mergedEvent = ensureWorkerAssignments({
    ...existingEvent,
    ...updateData,
    id: eventId,
    clientId: existingEvent.clientId,
    createdAt: existingEvent.createdAt,
    created_at: existingEvent.createdAt,
    updated_at: new Date().toISOString(),
  });

  const command = new PutItemCommand({
    TableName: DYNAMO_TABLE,
    Item: buildDynamoEventItem(mergedEvent),
  });

  await dynamoClient.send(command);

  if (normalizeString(existingEvent.status).toUpperCase() !== normalizeString(mergedEvent.status).toUpperCase()) {
    await updateStatusAnalytics(existingEvent.status, mergedEvent.status, mergedEvent);
  }
  await updateUpcomingEventsSnapshot(await getEventsService());

  return mapDynamoEvent(buildDynamoEventItem(mergedEvent));
}

export async function addEventMessage(eventId, senderId, senderRole, body, receiverId) {
  if (!eventId) {
    throw new Error('Event ID is required');
  }

  if (!senderId) {
    throw new Error('Sender ID is required');
  }

  if (!body || !String(body).trim()) {
    throw new Error('Message body is required');
  }

  const existingEvent = await getEventById(eventId);
  if (!existingEvent) {
    throw new Error('Event not found');
  }

  const normalizedBody = String(body).trim();
  const message = {
    id: randomUUID(),
    senderId: normalizeString(senderId),
    senderRole: normalizeString(senderRole || 'ORGANIZER'),
    receiverId: normalizeString(receiverId || existingEvent.clientId || ''),
    body: normalizedBody,
    createdAt: new Date().toISOString(),
  };

  const updatedEvent = {
    ...existingEvent,
    messages: [
      ...(Array.isArray(existingEvent.messages) ? existingEvent.messages : []),
      message,
    ],
  };

  await updateEvent(eventId, updatedEvent);
  return message;
}

export async function getEventMessages(eventId) {
  if (!eventId) {
    throw new Error('Event ID is required');
  }

  const event = await getEventById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  return Array.isArray(event.messages) ? event.messages : [];
}

export async function assignWorkerOrganizer(eventId, organizerId) {
  if (!eventId) {
    throw new Error('Event ID is required');
  }

  if (!organizerId) {
    throw new Error('Organizer ID is required');
  }

  const event = await getEventById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  const updatedEvent = ensureWorkerAssignments({ ...event });
  const assignmentExists = updatedEvent.workerOrganizerAssignments.some(
    (assignment) => assignment.organizerId === organizerId
  );

  if (!assignmentExists) {
    updatedEvent.workerOrganizerAssignments.push({
      organizerId,
      status: 'pending',
      updatedAt: new Date().toISOString(),
    });
  }

  updatedEvent.workerOrganizerIds = updatedEvent.workerOrganizerAssignments.map(
    (assignment) => assignment.organizerId
  );
  updatedEvent.updated_at = new Date().toISOString();

  return updateEvent(eventId, updatedEvent);
}

export async function unassignWorkerOrganizer(eventId, organizerId) {
  if (!eventId) {
    throw new Error('Event ID is required');
  }

  if (!organizerId) {
    throw new Error('Organizer ID is required');
  }

  const event = await getEventById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  const updatedEvent = ensureWorkerAssignments({ ...event });
  updatedEvent.workerOrganizerAssignments = updatedEvent.workerOrganizerAssignments.filter(
    (assignment) => assignment.organizerId !== organizerId
  );
  updatedEvent.workerOrganizerIds = updatedEvent.workerOrganizerAssignments.map(
    (assignment) => assignment.organizerId
  );
  updatedEvent.updated_at = new Date().toISOString();

  return updateEvent(eventId, updatedEvent);
}

export async function respondWorkerRsvp(eventId, organizerId, status) {
  if (!eventId) {
    throw new Error('Event ID is required');
  }

  if (!organizerId) {
    throw new Error('Organizer ID is required');
  }

  const normalizedStatus = String(status).toLowerCase();
  if (!['accepted', 'declined'].includes(normalizedStatus)) {
    throw new Error('Invalid RSVP status');
  }

  const event = await getEventById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  const updatedEvent = ensureWorkerAssignments({ ...event });
  const assignmentIndex = updatedEvent.workerOrganizerAssignments.findIndex(
    (assignment) => assignment.organizerId === organizerId
  );

  if (assignmentIndex === -1) {
    throw new Error('Worker assignment not found');
  }

  updatedEvent.workerOrganizerAssignments[assignmentIndex] = {
    ...updatedEvent.workerOrganizerAssignments[assignmentIndex],
    status: normalizedStatus,
    updatedAt: new Date().toISOString(),
  };
  updatedEvent.workerOrganizerIds = updatedEvent.workerOrganizerAssignments.map(
    (assignment) => assignment.organizerId
  );
  updatedEvent.updated_at = new Date().toISOString();

  return updateEvent(eventId, updatedEvent);
}

export async function deleteEvent(eventId) {
  if (!eventId) {
    throw new Error('Event ID is required');
  }

  const existingEvent = await getEventById(eventId);
  if (!existingEvent) {
    throw new Error('Event not found');
  }

  const command = new DeleteItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `USER#${normalizeString(existingEvent.clientId)}` },
      SK: { S: `EVENT#${normalizeString(eventId)}` },
    },
  });

  await dynamoClient.send(command);
  await updateUpcomingEventsSnapshot(await getEventsService());
  return existingEvent;
}
