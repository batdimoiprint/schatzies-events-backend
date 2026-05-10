import express from 'express';
import {
  currentUser,
  forceChangePasswordHandler,
  login,
  logout,
  requestPasswordReset,
  resetPassword,
  verifyPasswordReset,
} from '../controllers/auth.controller.js';
import { validateTokenMiddleware } from '../middleware/auth.middleware.js';
import tokenRoutes from './token.routes.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: 'Invalid credentials'
 *     User:
 *       type: object
 *       properties:
 *         user_id:
 *           type: string
 *           format: uuid
 *           example: '550e8400-e29b-41d4-a716-446655440000'
 *         firstName:
 *           type: string
 *           example: 'Juan'
 *         middleName:
 *           type: string
 *           example: 'Santos'
 *         lastName:
 *           type: string
 *           example: 'dela Cruz'
 *         birthDate:
 *           type: string
 *           example: '1995-06-15'
 *         houseNumber:
 *           type: string
 *           example: '12'
 *         street:
 *           type: string
 *           example: 'Mabini St'
 *         barangay:
 *           type: string
 *           example: 'Bagong Silang'
 *         city:
 *           type: string
 *           example: 'Quezon City'
 *         country:
 *           type: string
 *           example: 'Philippines'
 *         gender:
 *           type: string
 *           example: 'Male'
 *         contactNumber:
 *           type: string
 *           example: '9171234567'
 *         email:
 *           type: string
 *           format: email
 *           example: 'juan@email.com'
 *         role:
 *           type: string
 *           example: 'ADMIN'
 *         created_at:
 *           type: string
 *           format: date-time
 *     LoginRequest:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: 'juan@email.com'
 *         password:
 *           type: string
 *           format: password
 *           example: 'admin123'
 *     LoginResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: 'Login successful'
 *         token:
 *           type: string
 *           example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
 *         user:
 *           $ref: '#/components/schemas/User'
 *     ValidateTokenSuccess:
 *       type: object
 *       properties:
 *         valid:
 *           type: boolean
 *           example: true
 *         user:
 *           $ref: '#/components/schemas/User'
 *     ValidateTokenFailure:
 *       type: object
 *       properties:
 *         valid:
 *           type: boolean
 *           example: false
 *     RefreshTokenResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: 'Token refreshed'
 *         user:
 *           $ref: '#/components/schemas/User'
 *
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login user with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             description: HttpOnly auth cookie
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Missing email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', login);
router.post('/force-change-password', forceChangePasswordHandler);
router.post('/forgot-password', requestPasswordReset);
router.post('/forgot-password/verify', verifyPasswordReset);
router.post('/forgot-password/reset', resetPassword);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Logout and clear auth cookie
 *     responses:
 *       204:
 *         description: Logged out successfully
 */
router.post('/logout', logout);
router.get('/me', validateTokenMiddleware, currentUser);
router.use('/', tokenRoutes);

export default router;
