import express from 'express';
import {
  createCalendarEntry,
  getCalendarEntries,
  updateCalendarEntry,
  deleteCalendarEntry,
  markCalendarDate,
} from '../controllers/calendar.controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/calendar/mark-date:
 *   post:
 *     tags:
 *       - Calendar
 *     summary: Mark a date quickly with a calendar tag
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CalendarMarkDateRequest'
 *     responses:
 *       201:
 *         description: Date marked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 entry:
 *                   $ref: '#/components/schemas/CalendarEntry'
 */
router.post('/mark-date', markCalendarDate);

/**
 * @swagger
 * /api/calendar:
 *   post:
 *     tags:
 *       - Calendar
 *     summary: Create a new calendar entry
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CalendarCreateRequest'
 *     responses:
 *       201:
 *         description: Calendar entry created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 entry:
 *                   $ref: '#/components/schemas/CalendarEntry'
 */
router.post('/', createCalendarEntry);

/**
 * @swagger
 * /api/calendar:
 *   get:
 *     tags:
 *       - Calendar
 *     summary: Get calendar entries with optional view and type filters
 *     parameters:
 *       - in: query
 *         name: view
 *         schema:
 *           type: string
 *           enum: [monthly, weekly]
 *         description: View mode for entries
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *           example: '01'
 *         description: Month for monthly view
 *       - in: query
 *         name: year
 *         schema:
 *           type: string
 *           example: '2026'
 *         description: Year for monthly view
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           example: '2026-01-01'
 *         description: Start date for weekly view
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [REMINDER, MEETING, TASK]
 *         description: Filter entries by type
 *     responses:
 *       200:
 *         description: Calendar entries returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 entries:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                       entries:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/CalendarEntry'
 */
router.get('/', getCalendarEntries);

/**
 * @swagger
 * /api/calendar/{entryId}:
 *   put:
 *     tags:
 *       - Calendar
 *     summary: Update a calendar entry
 *     parameters:
 *       - in: path
 *         name: entryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Calendar entry ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CalendarUpdateRequest'
 *     responses:
 *       200:
 *         description: Calendar entry updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 entry:
 *                   $ref: '#/components/schemas/CalendarEntry'
 */
router.put('/:entryId', updateCalendarEntry);

/**
 * @swagger
 * /api/calendar/{entryId}:
 *   delete:
 *     tags:
 *       - Calendar
 *     summary: Delete a calendar entry
 *     parameters:
 *       - in: path
 *         name: entryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Calendar entry ID
 *     responses:
 *       200:
 *         description: Calendar entry deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.delete('/:entryId', deleteCalendarEntry);

export default router;
