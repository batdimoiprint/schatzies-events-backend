import express from 'express';
import {
  createAttendee,
  getAttendees,
  getAttendeeById,
  updateAttendee,
  deleteAttendee,
  checkInAttendee,
  checkInAttendeeByQr,
  getAttendeesByEventId,
} from '../controllers/attendee.controller.js';
import { validateTokenMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/attendees:
 *   post:
 *     tags:
 *       - Attendees
 *     summary: Register a new attendee for an event
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               eventId:
 *                 type: string
 *             required:
 *               - name
 *               - email
 *               - eventId
 *     responses:
 *       201:
 *         description: Attendee created successfully
 *       400:
 *         description: Invalid input or event not found
 */
router.post('/', validateTokenMiddleware, createAttendee);

/**
 * @swagger
 * /api/attendees:
 *   get:
 *     tags:
 *       - Attendees
 *     summary: Retrieve all attendees or filter by eventId query
 *     parameters:
 *       - in: query
 *         name: eventId
 *         schema:
 *           type: string
 *         description: Filter attendees by event
 *     responses:
 *       200:
 *         description: List of attendees
 *       500:
 *         description: Server error
 */
router.get('/', getAttendees);

/**
 * @swagger
 * /api/attendees/{id}:
 *   get:
 *     tags:
 *       - Attendees
 *     summary: Get attendee by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attendee found
 *       404:
 *         description: Attendee not found
 *       500:
 *         description: Server error
 */
router.get('/:id', getAttendeeById);

/**
 * @swagger
 * /api/attendees/{id}:
 *   put:
 *     tags:
 *       - Attendees
 *     summary: Update attendee by ID
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               eventId:
 *                 type: string
 *               status:
 *                 type: string
 *               checkinTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Attendee updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Attendee not found
 */
router.put('/:id', validateTokenMiddleware, updateAttendee);

/**
 * @swagger
 * /api/attendees/{id}:
 *   delete:
 *     tags:
 *       - Attendees
 *     summary: Delete attendee by ID
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attendee deleted successfully
 *       404:
 *         description: Attendee not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', validateTokenMiddleware, deleteAttendee);

/**
 * @swagger
 * /api/attendees/{id}/checkin:
 *   post:
 *     tags:
 *       - Attendees
 *     summary: Mark attendee as checked in
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attendee checked in successfully
 *       404:
 *         description: Attendee not found
 */
router.post('/:id/checkin', validateTokenMiddleware, checkInAttendee);

/**
 * @swagger
 * /api/attendees/checkin:
 *   post:
 *     tags:
 *       - Attendees
 *     summary: Check in an attendee with event ID and QR code
 *     security:
 *       - cookieAuth: []
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
 *         description: Attendee checked in via QR successfully
 *       400:
 *         description: Invalid request/QR
 */
router.post('/checkin', validateTokenMiddleware, checkInAttendeeByQr);

/**
 * @swagger
 * /api/events/{id}/attendees:
 *   get:
 *     tags:
 *       - Attendees
 *     summary: Get attendees for event ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attendees for event
 *       500:
 *         description: Server error
 */
router.get('/event/:id', getAttendeesByEventId);

export default router;
