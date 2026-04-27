import express from 'express';
import { scanQrCode } from '../controllers/scanner.controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/scanner/scan:
 *   post:
 *     tags:
 *       - Scanner
 *     summary: Scan an RSVP guest QR code for event check-in
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventId:
 *                 type: string
 *               qrCode:
 *                 type: string
 *             required:
 *               - eventId
 *               - qrCode
 *     responses:
 *       200:
 *         description: Guest checked in successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 guestName:
 *                   type: string
 *       400:
 *         description: Invalid QR or guest not eligible for check-in
 */
router.post('/scan', scanQrCode);

export default router;
