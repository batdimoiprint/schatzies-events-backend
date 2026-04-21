import express from 'express';
import { createRsvp } from '../controllers/rsvp.controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/rsvp:
 *   post:
 *     tags:
 *       - RSVP
 *     summary: Submit RSVP form data
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event_id:
 *                 type: string
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               contact_number:
 *                 type: string
 *               status:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: RSVP submitted successfully
 */
router.post('/', createRsvp);

export default router;
