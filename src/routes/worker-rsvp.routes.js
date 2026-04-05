import express from 'express';
import { getRsvpStatus, respondRsvp } from '../controllers/worker-rsvp.controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/rsvp:
 *   get:
 *     tags:
 *       - RSVP
 *     summary: Get RSVP status for a worker organizer assignment
 *     parameters:
 *       - in: query
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: organizerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: RSVP status returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 event:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     startDate:
 *                       type: string
 *                     location:
 *                       type: string
 *                 organizer:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     organizerFirstName:
 *                       type: string
 *                     organizerMiddleName:
 *                       type: string
 *                     organizerLastName:
 *                       type: string
 *                     organizerName:
 *                       type: string
 *                     organizerEmail:
 *                       type: string
 *                 rsvp:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *       400:
 *         description: Missing parameters
 *       404:
 *         description: Event or organizer not found
 */
router.get('/', getRsvpStatus);

/**
 * @swagger
 * /api/rsvp:
 *   post:
 *     tags:
 *       - RSVP
 *     summary: Respond to a worker RSVP invitation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventId:
 *                 type: string
 *               organizerId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [accepted, declined]
 *             required:
 *               - eventId
 *               - organizerId
 *               - status
 *     responses:
 *       200:
 *         description: RSVP response recorded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 organizer:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     organizerFirstName:
 *                       type: string
 *                     organizerMiddleName:
 *                       type: string
 *                     organizerLastName:
 *                       type: string
 *                     organizerName:
 *                       type: string
 *                     organizerEmail:
 *                       type: string
 *                 rsvp:
 *                   type: object
 *                   properties:
 *                     organizerId:
 *                       type: string
 *                     eventId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Event or organizer not found
 */
router.post('/', respondRsvp);

export default router;
