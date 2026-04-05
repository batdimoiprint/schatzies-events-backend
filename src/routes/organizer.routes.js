import express from 'express';
import {
  createOrganizer,
  getOrganizers,
  getOrganizerById,
  getHeadOrganizerByEvent,
  updateOrganizer,
  deleteOrganizer,
  assignHeadOrganizer,
  unassignHeadOrganizer,
  assignWorkerOrganizer,
  unassignWorkerOrganizer,
} from '../controllers/organizer.controller.js';
import { validateTokenMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/organizers:
 *   post:
 *     tags:
 *       - Organizers
 *     summary: Create a new organizer
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Organizer'
 *     responses:
 *       201:
 *         description: Organizer created successfully
 *       400:
 *         description: Invalid input
 */
router.post('/', validateTokenMiddleware, createOrganizer);

/**
 * @swagger
 * /api/organizers:
 *   get:
 *     tags:
 *       - Organizers
 *     summary: Get all organizers
 *     responses:
 *       200:
 *         description: List of organizers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 organizers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Organizer'
 *       500:
 *         description: Server error
 */
router.get('/', getOrganizers);

/**
 * @swagger
 * /api/organizers/{id}:
 *   get:
 *     tags:
 *       - Organizers
 *     summary: Get organizer by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Organizer found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 organizer:
 *                   $ref: '#/components/schemas/Organizer'
 *       404:
 *         description: Organizer not found
 */
router.get('/:id', getOrganizerById);

/**
 * @swagger
 * /api/organizers/event/{eventId}:
 *   get:
 *     tags:
 *       - Organizers
 *     summary: Get head organizer by event ID
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Head organizer retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 organizer:
 *                   $ref: '#/components/schemas/Organizer'
 *       404:
 *         description: No head organizer assigned or event not found
 */
router.get('/event/:eventId', getHeadOrganizerByEvent);

/**
 * @swagger
 * /api/organizers/{id}:
 *   put:
 *     tags:
 *       - Organizers
 *     summary: Update an organizer by ID
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
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Organizer updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Organizer not found
 */
router.put('/:id', validateTokenMiddleware, updateOrganizer);

/**
 * @swagger
 * /api/organizers/{id}:
 *   delete:
 *     tags:
 *       - Organizers
 *     summary: Delete an organizer by ID
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
 *         description: Organizer deleted successfully
 *       404:
 *         description: Organizer not found
 */
router.delete('/:id', validateTokenMiddleware, deleteOrganizer);

/**
 * @swagger
 * /api/organizers/{id}/assign-event/{eventId}:
 *   post:
 *     tags:
 *       - Organizers
 *     summary: Assign a head organizer to an event
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Head organizer assigned
 *       404:
 *         description: Organizer or event not found
 */
router.post('/:id/assign-event/:eventId', validateTokenMiddleware, assignHeadOrganizer);

/**
 * @swagger
 * /api/organizers/{id}/assign-worker/{eventId}:
 *   post:
 *     tags:
 *       - Organizers
 *     summary: Assign a worker organizer to an event and send RSVP email
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Worker organizer assigned and email sent
 *       400:
 *         description: Invalid request or missing head organizer
 *       404:
 *         description: Organizer or event not found
 */
router.post('/:id/assign-worker/:eventId', validateTokenMiddleware, assignWorkerOrganizer);

/**
 * @swagger
 * /api/organizers/{id}/unassign-worker/{eventId}:
 *   delete:
 *     tags:
 *       - Organizers
 *     summary: Unassign a worker organizer from an event
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Worker unassigned
 *       404:
 *         description: Organizer or event not found
 */
router.delete('/:id/unassign-worker/:eventId', validateTokenMiddleware, unassignWorkerOrganizer);

/**
 * @swagger
 * /api/organizers/{id}/unassign-event/{eventId}:
 *   delete:
 *     tags:
 *       - Organizers
 *     summary: Unassign head organizer from an event
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Head organizer unassigned
 *       400:
 *         description: Not assigned or invalid request
 *       404:
 *         description: Organizer or event not found
 */
router.delete('/:id/unassign-event/:eventId', validateTokenMiddleware, unassignHeadOrganizer);

export default router;
