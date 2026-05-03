import express from 'express';
import {
  createRsvp,
  checkEmailExistsInRsvp,
  verifyRsvpEmailController,
  deleteRsvpGuestController,
} from '../controllers/rsvp.controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/rsvp/verify:
 *   get:
 *     tags:
 *       - RSVP
 *     summary: Verify RSVP email and generate QR code
 *     parameters:
 *       - in: query
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *       - in: query
 *         name: guestId
 *         required: true
 *         schema:
 *           type: string
 *         description: Guest ID
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Verification token
 *     responses:
 *       200:
 *         description: Email verified successfully, QR code generated
 *       400:
 *         description: Invalid event or guest ID
 */
router.get('/verify', verifyRsvpEmailController);

/**
 * @swagger
 * /api/rsvp/check-email/{email}:
 *   get:
 *     tags:
 *       - RSVP
 *     summary: Check if an email is already registered for an event
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *         description: Email address to check
 *       - in: query
 *         name: eventId
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional event ID to check within a specific event
 *     responses:
 *       200:
 *         description: Email existence check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists:
 *                   type: boolean
 *       400:
 *         description: Missing or invalid email parameter
 */
router.get('/check-email/:email', checkEmailExistsInRsvp);

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
 *               email:
 *                 type: string
 *               contact_number:
 *                 type: string
 *               status:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: RSVP submitted successfully, verification email sent
 */
router.post('/', createRsvp);

/**
 * @swagger
 * /api/rsvp/{eventId}/{guestId}:
 *   delete:
 *     tags:
 *       - RSVP
 *     summary: Delete an RSVP guest
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *       - in: path
 *         name: guestId
 *         required: true
 *         schema:
 *           type: string
 *         description: Guest ID
 *     responses:
 *       200:
 *         description: RSVP guest deleted successfully
 *       400:
 *         description: Invalid parameters
 */
router.delete('/:eventId/:guestId', deleteRsvpGuestController);

export default router;
