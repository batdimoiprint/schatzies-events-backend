import express from 'express';
import { validateTokenMiddleware } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import {
  validateSendMessage,
  validateConversationId,
} from '../validators/message.validator.js';
import {
  getConversationsController,
  getMessagesController,
  sendMessageController,
  initiateConversationController,
  deleteConversationController,
} from '../controllers/message.controller.js';

const router = express.Router();

// Disable ETag caching for real-time messages
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Appointment-based messaging between clients and organizers
 */

/**
 * @swagger
 * /api/messages/conversations:
 *   get:
 *     summary: Get all conversations for the authenticated user
 *     tags: [Messages]
 *     description: >
 *       Returns conversations relevant to the authenticated user.
 *       Clients see conversations with their assigned organizer.
 *       Organizers see conversations with their assigned clients.
 *       Admins see all conversations.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of conversations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       eventId:
 *                         type: string
 *                       participants:
 *                         type: array
 *                         items:
 *                           type: object
 *                       lastMessage:
 *                         type: string
 *                       lastMessageAt:
 *                         type: string
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/conversations',
  validateTokenMiddleware,
  requireRole('CLIENT', 'ORGANIZER', 'ADMIN'),
  getConversationsController
);

/**
 * @swagger
 * /api/messages/conversations/{conversationId}/messages:
 *   get:
 *     summary: Get all messages in a conversation
 *     tags: [Messages]
 *     description: >
 *       Returns all messages for a conversation.
 *       Only participants (or admin) can view messages.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of messages
 *       403:
 *         description: Access denied — not a participant
 *       404:
 *         description: Conversation not found
 */
router.get(
  '/conversations/:conversationId/messages',
  validateTokenMiddleware,
  requireRole('CLIENT', 'ORGANIZER', 'ADMIN'),
  validateConversationId,
  getMessagesController
);

/**
 * @swagger
 * /api/messages/conversations/{conversationId}/messages:
 *   post:
 *     summary: Send a message in a conversation
 *     tags: [Messages]
 *     description: >
 *       Send a message in an existing conversation.
 *       Clients can only message their assigned organizer.
 *       Organizers can only message their assigned clients.
 *       Admins cannot send messages.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - body
 *             properties:
 *               body:
 *                 type: string
 *                 maxLength: 5000
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Access denied — role restriction or not assigned
 *       404:
 *         description: Conversation not found
 */
router.post(
  '/conversations/:conversationId/messages',
  validateTokenMiddleware,
  requireRole('CLIENT', 'ORGANIZER', 'ADMIN'),
  validateConversationId,
  validateSendMessage,
  sendMessageController
);

/**
 * @swagger
 * /api/messages/send:
 *   post:
 *     summary: Client auto-routed message (creates conversation if needed)
 *     tags: [Messages]
 *     description: >
 *       Client-only endpoint. Sends a message that auto-routes to the
 *       organizer assigned to the client's appointment. The client does
 *       NOT choose the organizer — it is resolved from admin-assigned appointments.
 *       Creates a new conversation if one does not exist.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - body
 *             properties:
 *               body:
 *                 type: string
 *                 maxLength: 5000
 *     responses:
 *       201:
 *         description: Message sent and conversation created/used
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversation:
 *                   type: object
 *                 message:
 *                   type: object
 *       403:
 *         description: Only clients can use this endpoint
 *       404:
 *         description: No organizer assigned to your appointment
 */
router.post(
  '/send',
  validateTokenMiddleware,
  requireRole('CLIENT'),
  validateSendMessage,
  initiateConversationController
);

/**
 * @swagger
 * /api/messages/conversations/{conversationId}:
 *   delete:
 *     summary: Delete a conversation (admin only)
 *     tags: [Messages]
 *     description: >
 *       Permanently deletes a conversation and all its messages.
 *       Only admins can perform this action.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation deleted successfully
 *       403:
 *         description: Only admins can delete conversations
 *       404:
 *         description: Conversation not found
 */
router.delete(
  '/conversations/:conversationId',
  validateTokenMiddleware,
  requireRole('ADMIN'),
  validateConversationId,
  deleteConversationController
);

export default router;
