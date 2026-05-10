import * as messageService from '../services/message.service.js';
import { sendPushToUser, getAdminUserId } from '../utils/push.util.js';

// ─── GET /api/messages/conversations ────────────────────────────────────────────
// Returns all conversations for the authenticated user.
// Admin sees all conversations; clients/organizers see only their own.
export async function getConversationsController(req, res) {
  try {
    const { user_id, role } = req.user;
    const normalizedRole = String(role).toUpperCase();

    if (normalizedRole === 'ADMIN') {
      const conversations = await messageService.getAllConversations();
      return res.json({ conversations });
    }

    const conversations = await messageService.getConversationsForUser(
      user_id,
      role
    );
    return res.json({ conversations });
  } catch (error) {
    console.error('getConversationsController error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

// ─── GET /api/messages/conversations/:conversationId/messages ────────────────────
// Returns all messages within a specific conversation.
// Validates the user is a participant (or admin).
export async function getMessagesController(req, res) {
  try {
    const { conversationId } = req.params;
    const { user_id, role } = req.user;
    const normalizedRole = String(role).toUpperCase();

    let messages;
    if (normalizedRole === 'ADMIN') {
      messages = await messageService.adminGetMessages(conversationId);
    } else {
      messages = await messageService.getMessagesForConversation(
        conversationId,
        user_id
      );
    }

    console.log(
      `📨 Returning ${messages.length} message(s) for conversation ${conversationId}`
    );

    return res.json({ messages });
  } catch (error) {
    console.error('getMessagesController error:', error.message);

    if (
      error.message.includes('Access denied') ||
      error.message.includes('not a participant')
    ) {
      return res.status(403).json({ error: error.message });
    }

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    return res.status(500).json({ error: error.message });
  }
}

// ─── POST /api/messages/conversations/:conversationId/messages ──────────────────
// Send a message in an existing conversation.
// Enforces role-based restrictions:
//   - Client can only message their assigned organizer
//   - Organizer can only message assigned clients
//   - Admin cannot send messages
export async function sendMessageController(req, res) {
  try {
    const { conversationId } = req.params;
    const { body } = req.body;
    const { user_id, role } = req.user;

    if (!body || !String(body).trim()) {
      return res.status(400).json({ error: 'Message body is required' });
    }

    const message = await messageService.sendMessage(
      conversationId,
      user_id,
      role,
      body
    );

    console.log('✅ Message saved:', {
      messageId: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      receiverId: message.receiverId,
      body: message.body.substring(0, 50),
    });

    // Send push notification to recipient
    // Use req.user context directly — no extra DB lookup needed
    try {
      const recipientId = message.receiverId;
      const senderName =
        `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() ||
        'Someone';

      if (recipientId) {
        await sendPushToUser(recipientId, {
          title: `New message from ${senderName}`,
          body: body.substring(0, 100) + (body.length > 100 ? '...' : ''),
          data: {
            type: 'message',
            conversationId,
            url: `/messages/${conversationId}`,
          },
        });
      }

      // Also notify admin so they stay in the loop
      const adminUserId = await getAdminUserId();
      if (adminUserId && adminUserId !== user_id && adminUserId !== recipientId) {
        await sendPushToUser(adminUserId, {
          title: `New message from ${senderName}`,
          body: body.substring(0, 100) + (body.length > 100 ? '...' : ''),
          data: {
            type: 'message',
            conversationId,
            url: `/admin/message`,
          },
        });
      }
    } catch (pushError) {
      console.error('Failed to send push notification:', pushError);
    }

    return res.status(201).json({ message });
  } catch (error) {
    console.error('sendMessageController error:', error.message);

    if (
      error.message.includes('Access denied') ||
      error.message.includes('not a participant')
    ) {
      return res.status(403).json({ error: error.message });
    }

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    if (
      error.message.includes('Only clients, organizers, and admins') ||
      error.message.includes('can only message') ||
      error.message.includes('not assigned')
    ) {
      return res.status(403).json({ error: error.message });
    }

    return res.status(400).json({ error: error.message });
  }
}

// ─── POST /api/messages/send ────────────────────────────────────────────────────
// Client-only endpoint: auto-routes the message to the assigned organizer.
// The client does NOT choose who to message — the system resolves it from appointments.
export async function initiateConversationController(req, res) {
  try {
    const { body } = req.body;
    const { user_id, role } = req.user;
    const normalizedRole = String(role).toUpperCase();

    if (normalizedRole !== 'CLIENT') {
      return res.status(403).json({
        error:
          'Only clients can initiate conversations. Organizers should reply through existing conversations.',
      });
    }

    if (!body || !String(body).trim()) {
      return res.status(400).json({ error: 'Message body is required' });
    }

    const result = await messageService.initiateClientConversation(
      user_id,
      body
    );

    // Send push notification to organizer + admin
    try {
      const organizerId = result.conversation?.participant2Id;
      const clientName =
        `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() ||
        'A client';

      if (organizerId) {
        await sendPushToUser(organizerId, {
          title: `New message from ${clientName}`,
          body: body.substring(0, 100) + (body.length > 100 ? '...' : ''),
          data: {
            type: 'message',
            conversationId: result.conversation.id,
            url: `/messages/${result.conversation.id}`,
          },
        });
      }

      // Also notify admin
      const adminUserId = await getAdminUserId();
      if (adminUserId && adminUserId !== user_id && adminUserId !== organizerId) {
        await sendPushToUser(adminUserId, {
          title: `New message from ${clientName}`,
          body: body.substring(0, 100) + (body.length > 100 ? '...' : ''),
          data: {
            type: 'message',
            conversationId: result.conversation.id,
            url: `/admin/message`,
          },
        });
      }
    } catch (pushError) {
      console.error('Failed to send push notification:', pushError);
    }

    return res.status(201).json(result);
  } catch (error) {
    console.error('initiateConversationController error:', error.message);

    if (error.message.includes('No organizer')) {
      return res.status(404).json({ error: error.message });
    }

    return res.status(400).json({ error: error.message });
  }
}

// ─── DELETE /api/messages/conversations/:conversationId ──────────────────────────
// Admin-only: Deletes a conversation and all its messages.
export async function deleteConversationController(req, res) {
  try {
    const { conversationId } = req.params;
    const result = await messageService.deleteConversation(conversationId);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('deleteConversationController error:', error.message);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    return res.status(500).json({ error: error.message });
  }
}
