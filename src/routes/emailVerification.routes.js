import express from 'express';
import {
  checkOrSendVerificationController,
  verifyEmailController,
  verifyEmailApiController,
  checkEmailVerifiedController,
  getVerifiedEmailsController,
} from '../controllers/emailVerification.controller.js';
import { verificationLimiter } from '../configs/rate-limit.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Email Verification
 *   description: Email verification via clickable link (Gmail SMTP)
 */

/**
 * @swagger
 * /api/auth/check-or-send-verification:
 *   post:
 *     tags: [Email Verification]
 *     summary: Check if email is verified or send verification email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 */
router.post(
  '/check-or-send-verification',
  verificationLimiter,
  checkOrSendVerificationController
);

/**
 * @swagger
 * /api/auth/verify-email:
 *   get:
 *     tags: [Email Verification]
 *     summary: Verify email via token (GET redirect)
 */
router.get('/verify-email', verifyEmailController);

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     tags: [Email Verification]
 *     summary: Verify email via token (POST API)
 */
router.post('/verify-email', verifyEmailApiController);

/**
 * @swagger
 * /api/auth/check-email-verified:
 *   get:
 *     tags: [Email Verification]
 *     summary: Check if an email is verified
 */
router.get('/check-email-verified', checkEmailVerifiedController);

/**
 * @swagger
 * /api/auth/verified-emails:
 *   get:
 *     tags: [Email Verification]
 *     summary: Get all verified email addresses (admin)
 */
router.get('/verified-emails', getVerifiedEmailsController);

export default router;
