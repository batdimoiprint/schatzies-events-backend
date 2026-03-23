import express from 'express';
import {
  refreshTokenMiddleware,
  validateTokenMiddleware,
} from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/auth/validate-token:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Validate auth token from cookie
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidateTokenSuccess'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidateTokenFailure'
 */
router.get('/validate-token', validateTokenMiddleware);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Refresh auth token cookie
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefreshTokenResponse'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/refresh-token', refreshTokenMiddleware);

export default router;
