import { randomUUID } from 'crypto';
import {
  PutItemCommand,
  QueryCommand,
  GetItemCommand,
  ScanCommand,
  DeleteItemCommand,
  BatchWriteItemCommand,
} from '@aws-sdk/client-dynamodb';
import dynamoClient, { DYNAMO_TABLE } from '../configs/dynamo.js';
import { getEventById, getEvents } from './event.service.js';
import { findUserByUserId } from './users.service.js';
import { getInquiryByEmail } from './inquiry.service.js';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function stripSensitive(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

// ─── DynamoDB Key Design ───────────────────────────────────────────────────────
//
// Conversations (metadata):
//   PK = CHAT#<event_id>         SK = META
//
// Messages:
//   PK = CHAT#<event_id>         SK = MSG#<ISO-timestamp>
//
// Fields:
//   - sender_id (String)
//   - message (String)
//   - created_at (String)
// ────────────────────────────────────────────────────────────────────────────────

function mapConversationMeta(item) {
  if (!item) return null;

  return {
    id: item.conversationId?.S || item.PK?.S?.replace('CHAT#', '') || '',
    eventId: item.eventId?.S || item.PK?.S?.replace('CHAT#', '') || '',
    participant1Id: item.participant1Id?.S || '',
    participant1Role: item.participant1Role?.S || '',
    participant2Id: item.participant2Id?.S || '',
    participant2Role: item.participant2Role?.S || '',
    created_at: item.created_at?.S || '',
    updated_at: item.updated_at?.S || '',
    lastMessage: item.lastMessage?.S || '',
    lastMessageAt: item.lastMessageAt?.S || '',
  };
}

function mapMessage(item) {
  if (!item) return null;

  const messageId = item.messageId?.S || '';
  const senderId = item.sender_id?.S || '';
  const body = item.message?.S || '';
  const createdAt = item.created_at?.S || '';

  return {
    // Canonical fields (matches frontend ChatMessage interface)
    id: messageId,
    conversationId: item.PK?.S?.replace('CHAT#', '') || '',
    senderId,
    senderRole: item.senderRole?.S || '',
    receiverId: item.receiverId?.S || '',
    body,
    createdAt,
    // Aliased fields for stable polling contract
    messageId,
    content: body,
    created_at: createdAt,
  };
}

// ─── Appointment Validation ────────────────────────────────────────────────────

/**
 * Look up the organizer assigned to a client's event/appointment.
 * Returns { eventId, organizerId } or null if no assignment found.
 */
async function findAssignedOrganizer(clientId) {
  // 1. Check for formal events
  const events = await getEvents(clientId);
  if (events && events.length > 0) {
    for (const event of events) {
      const organizerId = event.headOrganizerId || event.organizer_id || '';
      if (organizerId) {
        return { eventId: event.eventId || event.event_id, organizerId };
      }
    }
  }

  // 2. Fallback: Check for scheduled meetings in inquiries
  const user = await findUserByUserId(clientId);
  if (user && user.email) {
    const inquiry = await getInquiryByEmail(user.email);
    if (inquiry && inquiry.meetingDetails && inquiry.meetingDetails.organizerId) {
      return { 
        eventId: `INQUIRY#${inquiry.id}`, 
        organizerId: inquiry.meetingDetails.organizerId 
      };
    }
  }

  return null;
}

/**
 * Verify that a specific organizer is assigned to a specific client.
 * Checks both head organizer and worker organizer assignments, and falls back to inquiry meetings.
 */
async function isOrganizerAssignedToClient(organizerId, clientId) {
  // 1. Check formal events
  const events = await getEvents(clientId);
  if (events && events.length > 0) {
    for (const event of events) {
      const headOrg = event.headOrganizerId || event.organizer_id || event.user_id || '';

      // Check if they are the head organizer
      if (headOrg === organizerId) return true;

      // Check worker organizer assignments
      const workerIds = Array.isArray(event.workerOrganizerIds) ? event.workerOrganizerIds : [];
      if (workerIds.includes(organizerId)) return true;
    }
  }

  // 2. Fallback: Check for scheduled meetings in inquiries
  const user = await findUserByUserId(clientId);
  if (user && user.email) {
    const inquiry = await getInquiryByEmail(user.email);
    if (inquiry && inquiry.meetingDetails && inquiry.meetingDetails.organizerId === organizerId) {
      return true;
    }
  }

  return false;
}

/**
 * Get all client IDs assigned to a specific organizer.
 */
async function getClientsForOrganizer(organizerId) {
  // Scan all events and find those where this organizer is assigned
  const allEvents = await getEvents(); // no clientId = scan all
  const clientIds = new Set();

  for (const event of allEvents) {
    const headOrg = event.headOrganizerId || event.organizer_id || event.user_id || '';
    const workerIds = Array.isArray(event.workerOrganizerIds) ? event.workerOrganizerIds : [];

    if (headOrg === organizerId || workerIds.includes(organizerId)) {
      const cId = event.clientId || event.client_id || '';
      if (cId) clientIds.add(cId);
    }
  }

  return [...clientIds];
}

// ─── Conversation Management ───────────────────────────────────────────────────

/**
 * Find or create a conversation between a client and their assigned organizer.
 * Conversations are scoped to the appointment assignment.
 */
async function findConversation(participant1Id, participant2Id) {
  // Scan for a conversation containing both participants
  const command = new ScanCommand({
    TableName: DYNAMO_TABLE,
    FilterExpression:
      'begins_with(PK, :convPrefix) AND SK = :meta AND ' +
      '((participant1Id = :p1 AND participant2Id = :p2) OR (participant1Id = :p2 AND participant2Id = :p1))',
    ExpressionAttributeValues: {
      ':convPrefix': { S: 'CHAT#' },
      ':meta': { S: 'META' },
      ':p1': { S: participant1Id },
      ':p2': { S: participant2Id },
    },
  });

  const response = await dynamoClient.send(command);
  if (response.Items && response.Items.length > 0) {
    return mapConversationMeta(response.Items[0]);
  }

  return null;
}

async function createConversation(clientId, organizerId, eventId) {
  const now = new Date().toISOString();

  const item = {
    PK: { S: `CHAT#${eventId}` },
    SK: { S: 'META' },
    conversationId: { S: eventId },
    eventId: { S: eventId },
    participant1Id: { S: clientId },
    participant1Role: { S: 'CLIENT' },
    participant2Id: { S: organizerId },
    participant2Role: { S: 'ORGANIZER' },
    created_at: { S: now },
    updated_at: { S: now },
    lastMessage: { S: '' },
    lastMessageAt: { S: '' },
  };

  await dynamoClient.send(
    new PutItemCommand({ TableName: DYNAMO_TABLE, Item: item })
  );

  return mapConversationMeta(item);
}

async function findOrCreateConversation(clientId, organizerId, eventId) {
  const existing = await findConversation(clientId, organizerId);
  if (existing) return existing;
  return createConversation(clientId, organizerId, eventId);
}

async function updateConversationLastMessage(conversationId, messageBody, timestamp) {
  // We do a full put-over for the META item
  const getCmd = new GetItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `CHAT#${conversationId}` },
      SK: { S: 'META' },
    },
  });

  const resp = await dynamoClient.send(getCmd);
  if (!resp.Item) return;

  // Update the fields in-place
  resp.Item.lastMessage = { S: messageBody.substring(0, 200) };
  resp.Item.lastMessageAt = { S: timestamp };
  resp.Item.updated_at = { S: timestamp };

  await dynamoClient.send(
    new PutItemCommand({ TableName: DYNAMO_TABLE, Item: resp.Item })
  );
}

// ─── Public Service Methods ────────────────────────────────────────────────────

/**
 * Get all conversations for the authenticated user.
 * Filters by role and returns only conversations where the user is a participant.
 */
export async function getConversationsForUser(userId, userRole) {
  const normalizedRole = String(userRole).toUpperCase();

  const command = new ScanCommand({
    TableName: DYNAMO_TABLE,
    FilterExpression:
      'begins_with(PK, :convPrefix) AND SK = :meta AND (participant1Id = :uid OR participant2Id = :uid)',
    ExpressionAttributeValues: {
      ':convPrefix': { S: 'CHAT#' },
      ':meta': { S: 'META' },
      ':uid': { S: userId },
    },
  });

  const response = await dynamoClient.send(command);
  const conversations = (response.Items || []).map(mapConversationMeta);

  // Enrich with participant details
  const enriched = [];
  for (const conv of conversations) {
    const otherId = conv.participant1Id === userId ? conv.participant2Id : conv.participant1Id;
    const otherRole = conv.participant1Id === userId ? conv.participant2Role : conv.participant1Role;

    const otherUser = await findUserByUserId(otherId);
    const safeOther = stripSensitive(otherUser);

    enriched.push({
      ...conv,
      participants: [
        { id: userId, role: normalizedRole },
        {
          id: otherId,
          role: otherRole,
          name: safeOther ? `${safeOther.firstName} ${safeOther.lastName}`.trim() : '',
          email: safeOther?.email || '',
          contactNumber: safeOther?.contactNumber || '',
          initial: safeOther ? (safeOther.firstName?.[0] || '').toUpperCase() : '',
          profilePic: safeOther?.profilePic || '',
        },
      ],
      organizer:
        otherRole === 'ORGANIZER'
          ? {
              id: otherId,
              name: safeOther ? `${safeOther.firstName} ${safeOther.lastName}`.trim() : '',
              email: safeOther?.email || '',
              initial: safeOther ? (safeOther.firstName?.[0] || '').toUpperCase() : '',
            }
          : undefined,
    });
  }

  return enriched;
}

/**
 * Get all messages in a conversation.
 * Validates that the requesting user is a participant.
 */
export async function getMessagesForConversation(conversationId, userId) {
  // Verify the user is a participant
  const metaCmd = new GetItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `CHAT#${conversationId}` },
      SK: { S: 'META' },
    },
  });

  const metaResp = await dynamoClient.send(metaCmd);
  const convMeta = mapConversationMeta(metaResp.Item);
  if (!convMeta) {
    throw new Error('Conversation not found');
  }

  if (convMeta.participant1Id !== userId && convMeta.participant2Id !== userId) {
    console.log('[DEBUG] Participant mismatch (GET):', {
      conversationId,
      userId,
      participant1Id: convMeta.participant1Id,
      participant2Id: convMeta.participant2Id
    });
    throw new Error('Access denied: you are not a participant of this conversation');
  }

  // Query all MSG# items — ascending order, capped at 50 for stable polling
  const msgCmd = new QueryCommand({
    TableName: DYNAMO_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :msgPrefix)',
    ExpressionAttributeValues: {
      ':pk': { S: `CHAT#${conversationId}` },
      ':msgPrefix': { S: 'MSG#' },
    },
    ScanIndexForward: true,   // ascending by SK (timestamp-based)
    Limit: 50,                // cap to prevent unbounded responses
  });

  const msgResp = await dynamoClient.send(msgCmd);
  return (msgResp.Items || []).map(mapMessage);
}

/**
 * Send a message in a conversation.
 *
 * ROLE VALIDATION:
 *   - CLIENT: can only send to their assigned organizer. Auto-routes.
 *   - ORGANIZER: can only reply to clients assigned to them.
 *   - ADMIN: can read all but does not send messages in conversations.
 *
 * The conversationId MUST reference a valid conversation where the sender is a participant.
 */
export async function sendMessage(conversationId, senderId, senderRole, body) {
  const normalizedRole = String(senderRole).toUpperCase();
  const normalizedBody = String(body).trim();

  if (!normalizedBody) {
    throw new Error('Message body is required');
  }

  if (!['CLIENT', 'ORGANIZER', 'ADMIN'].includes(normalizedRole)) {
    throw new Error('Only clients, organizers, and admins can send messages');
  }

  // Retrieve conversation metadata
  const metaCmd = new GetItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `CHAT#${conversationId}` },
      SK: { S: 'META' },
    },
  });

  const metaResp = await dynamoClient.send(metaCmd);
  const convMeta = mapConversationMeta(metaResp.Item);
  if (!convMeta) {
    throw new Error('Conversation not found');
  }

  // Verify sender is a participant (bypass for ADMIN)
  if (
    normalizedRole !== 'ADMIN' &&
    convMeta.participant1Id !== senderId &&
    convMeta.participant2Id !== senderId
  ) {
    console.log('[DEBUG] Participant mismatch:', {
      conversationId,
      senderId,
      participant1Id: convMeta.participant1Id,
      participant2Id: convMeta.participant2Id,
    });
    throw new Error('Access denied: you are not a participant of this conversation');
  }

  // Determine receiver
  const receiverId =
    convMeta.participant1Id === senderId ? convMeta.participant2Id : convMeta.participant1Id;

  // Role-specific validation
  if (normalizedRole === 'CLIENT') {
    // Client must be participant1 (or participant2) and receiver must be ORGANIZER
    const receiverRole =
      convMeta.participant1Id === receiverId ? convMeta.participant1Role : convMeta.participant2Role;

    if (String(receiverRole).toUpperCase() !== 'ORGANIZER') {
      throw new Error('Clients can only message their assigned organizer');
    }

    // Verify the organizer is actually assigned to this client via an appointment
    const isAssigned = await isOrganizerAssignedToClient(receiverId, senderId);
    if (!isAssigned) {
      throw new Error('No active appointment with this organizer');
    }
  }

  if (normalizedRole === 'ORGANIZER') {
    // Organizer must only reply to assigned clients
    const receiverRole =
      convMeta.participant1Id === receiverId ? convMeta.participant1Role : convMeta.participant2Role;

    if (String(receiverRole).toUpperCase() !== 'CLIENT') {
      throw new Error('Organizers can only message assigned clients');
    }

    const isAssigned = await isOrganizerAssignedToClient(senderId, receiverId);
    if (!isAssigned) {
      throw new Error('This client is not assigned to you');
    }
  }

  // Persist the message — UUID in SK prevents duplicates even on retry
  const messageId = randomUUID();
  const now = new Date().toISOString();

  const msgItem = {
    PK: { S: `CHAT#${conversationId}` },
    SK: { S: `MSG#${now}#${messageId}` },
    messageId: { S: messageId },
    sender_id: { S: senderId },
    senderRole: { S: normalizedRole },
    receiverId: { S: receiverId },
    message: { S: normalizedBody },
    created_at: { S: now },
  };

  // ConditionExpression prevents duplicate writes on network retries
  await dynamoClient.send(new PutItemCommand({
    TableName: DYNAMO_TABLE,
    Item: msgItem,
    ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
  }));

  // Update conversation metadata with last message preview
  await updateConversationLastMessage(conversationId, normalizedBody, now);

  return mapMessage(msgItem);
}

/**
 * Initiate a conversation from the client side.
 * The system auto-routes to the assigned organizer — the client does NOT choose.
 */
export async function initiateClientConversation(clientId, messageBody) {
  const normalizedBody = String(messageBody).trim();
  if (!normalizedBody) {
    throw new Error('Message body is required');
  }

  // Find the organizer assigned to this client
  const assignment = await findAssignedOrganizer(clientId);
  if (!assignment) {
    throw new Error('No organizer is assigned to your appointment. Please contact admin.');
  }

  const { eventId, organizerId } = assignment;

  // Find or create the conversation
  const conversation = await findOrCreateConversation(clientId, organizerId, eventId);

  // Send the message
  const message = await sendMessage(conversation.id, clientId, 'CLIENT', normalizedBody);

  return { conversation, message };
}

/**
 * Admin-only: Get all conversations across the system.
 */
export async function getAllConversations() {
  const command = new ScanCommand({
    TableName: DYNAMO_TABLE,
    FilterExpression: 'begins_with(PK, :convPrefix) AND SK = :meta',
    ExpressionAttributeValues: {
      ':convPrefix': { S: 'CHAT#' },
      ':meta': { S: 'META' },
    },
  });

  const response = await dynamoClient.send(command);
  const conversations = (response.Items || []).map(mapConversationMeta);

  // Enrich with participant names
  const enriched = [];
  for (const conv of conversations) {
    const user1 = await findUserByUserId(conv.participant1Id);
    const user2 = await findUserByUserId(conv.participant2Id);
    const safe1 = stripSensitive(user1);
    const safe2 = stripSensitive(user2);

    enriched.push({
      ...conv,
      participants: [
        {
          id: conv.participant1Id,
          role: conv.participant1Role,
          name: safe1 ? `${safe1.firstName} ${safe1.lastName}`.trim() : '',
          email: safe1?.email || '',
          contactNumber: safe1?.contactNumber || '',
          initial: safe1 ? (safe1.firstName?.[0] || '').toUpperCase() : '',
          profilePic: safe1?.profilePic || '',
        },
        {
          id: conv.participant2Id,
          role: conv.participant2Role,
          name: safe2 ? `${safe2.firstName} ${safe2.lastName}`.trim() : '',
          email: safe2?.email || '',
          contactNumber: safe2?.contactNumber || '',
          initial: safe2 ? (safe2.firstName?.[0] || '').toUpperCase() : '',
          profilePic: safe2?.profilePic || '',
        },
      ],
    });
  }

  return enriched;
}

/**
 * Admin-only: Read messages in any conversation (monitoring/support).
 */
export async function adminGetMessages(conversationId) {
  const msgCmd = new QueryCommand({
    TableName: DYNAMO_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :msgPrefix)',
    ExpressionAttributeValues: {
      ':pk': { S: `CHAT#${conversationId}` },
      ':msgPrefix': { S: 'MSG#' },
    },
    ScanIndexForward: true,
    Limit: 50,
  });

  const msgResp = await dynamoClient.send(msgCmd);
  return (msgResp.Items || []).map(mapMessage);
}

/**
 * Admin-only: Delete a conversation and all its messages.
 */
export async function deleteConversation(conversationId) {
  // 1. Query ALL items with PK = CHAT#<conversationId> (META + all MSG# items)
  const queryCmd = new QueryCommand({
    TableName: DYNAMO_TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: {
      ':pk': { S: `CHAT#${conversationId}` },
    },
  });

  const queryResp = await dynamoClient.send(queryCmd);
  const items = queryResp.Items || [];

  if (items.length === 0) {
    throw new Error('Conversation not found');
  }

  // 2. Batch delete in groups of 25 (DynamoDB limit)
  const batches = [];
  for (let i = 0; i < items.length; i += 25) {
    const batch = items.slice(i, i + 25).map((item) => ({
      DeleteRequest: {
        Key: {
          PK: item.PK,
          SK: item.SK,
        },
      },
    }));
    batches.push(batch);
  }

  for (const batch of batches) {
    await dynamoClient.send(
      new BatchWriteItemCommand({
        RequestItems: {
          [DYNAMO_TABLE]: batch,
        },
      })
    );
  }

  return { deleted: items.length };
}
