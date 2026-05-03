import express from 'express';
import { validateTokenMiddleware } from '../middleware/auth.middleware.js';
import {
  subscribeToPushController,
  unsubscribeFromPushController,
} from '../controllers/push.controller.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Push Notifications
 *   description: Web push notification subscription management
 */

/**
 * @swagger
 * /api/push/subscribe:
 *   post:
 *     summary: Subscribe to push notifications
 *     tags: [Push Notifications]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - endpoint
 *               - keys
 *             properties:
 *               endpoint:
 *                 type: string
 *               expirationTime:
 *                 type: number
 *                 nullable: true
 *               keys:
 *                 type: object
 *                 required:
 *                   - p256dh
 *                   - auth
 *                 properties:
 *                   p256dh:
 *                     type: string
 *                   auth:
 *                     type: string
 *     responses:
 *       201:
 *         description: Subscription registered successfully
 *       200:
 *         description: Subscription already exists
 *       400:
 *         description: Invalid subscription object
 *       401:
 *         description: Unauthorized
 */
router.post('/subscribe', validateTokenMiddleware, subscribeToPushController);

/**
 * @swagger
 * /api/push/unsubscribe:
 *   delete:
 *     summary: Unsubscribe from push notifications
 *     tags: [Push Notifications]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - endpoint
 *             properties:
 *               endpoint:
 *                 type: string
 *     responses:
 *       200:
 *         description: Subscription removed successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.delete(
  '/unsubscribe',
  validateTokenMiddleware,
  unsubscribeFromPushController
);

export default router;
