import express from 'express';
import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getEventMessages,
  sendEventMessage,
} from '../controllers/event.controller.js';
import {
  confirmEvent,
  getConfirmedEvents,
  createEventAllocation,
  getEventAllocation,
  updateEventAllocation,
  deleteEventAllocation,
  getEventNotes,
  updateEventNotes,
  deleteEventNotes,
  getEventChecklist,
  createEventChecklist,
  updateEventChecklist,
  patchEventChecklist,
  deleteEventChecklist,
  createPrecheck,
  getPrecheck,
  updatePrecheck,
  createProgramFlow,
  getProgramFlow,
  updateProgramFlow,
  deleteProgramFlow,
  createTimelineTask,
  getTimelineTasks,
  updateTimelineTask,
  createResourceStatus,
  getResourceStatuses,
  updateResourceStatus,
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  moveTask,
  changeEventStatus,
} from '../controllers/eventPlanner.controller.js';
import { getVendorsByEventId } from '../controllers/vendor.controller.js';
import {
  getRsvpList,
  getEventHeadcount,
  manualCheckIn,
  createRsvpGuest,
  generateRsvpQr,
  getEventRsvps
} from '../controllers/rsvp.controller.js';
import costBreakdownRoutes from './costBreakdown.routes.js';
import { validateTokenMiddleware } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/events:
 *   post:
 *     tags:
 *       - Events
 *     summary: Create a new event
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEventRequest'
 *     responses:
 *       201:
 *         description: Event created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 event:
 *                   $ref: '#/components/schemas/Event'
 *       400:
 *         description: Invalid input
 */
router.post('/', validateTokenMiddleware, createEvent);

/**
 * @swagger
 * /api/events/{eventId}:
 *   get:
 *     tags:
 *       - Events
 *     summary: Retrieve event details (name, description, attendees count)
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event details
 *       404:
 *         description: Event not found
 */
router.get('/:eventId', getEventById);

/**
 * @swagger
 * /api/events/{eventId}/rsvp-qr:
 *   post:
 *     tags:
 *       - Events - QR
 *     summary: Generate a QR code for RSVP
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: QR code generated
 */
router.post('/:eventId/rsvp-qr', validateTokenMiddleware, generateRsvpQr);

/**
 * @swagger
 * /api/events/{eventId}/rsvps:
 *   get:
 *     tags:
 *       - Events - QR
 *     summary: Fetch the list of guests (RSVPs) for a specific event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of RSVPs
 */
router.get('/:eventId/rsvps', validateTokenMiddleware, getEventRsvps);

/**
 * @swagger
 * /api/events/{eventId}/confirm:
 *   post:
 *     tags:
 *       - Events
 *     summary: Confirm an event with final details
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConfirmEventRequest'
 *     responses:
 *       200:
 *         description: Event confirmed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 event:
 *                   $ref: '#/components/schemas/Event'
 */
router.post('/:eventId/confirm', requireRole('ADMIN'), confirmEvent);

/**
 * @swagger
 * /api/events/confirmed:
 *   get:
 *     tags:
 *       - Events
 *     summary: Retrieve all confirmed events
 *     responses:
 *       200:
 *         description: List of confirmed events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 events:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Event'
 */
router.get('/confirmed', requireRole('ADMIN'), getConfirmedEvents);

/**
 * @swagger
 * /api/events/{eventId}/tasks:
 *   post:
 *     tags:
 *       - Events - Kanban Task
 *     summary: Create a new kanban task for an event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskRequest'
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 task:
 *                   $ref: '#/components/schemas/Task'
 */
router.post('/:eventId/tasks', requireRole('ADMIN', 'ORGANIZER'), createTask);

/**
 * @swagger
 * /api/events/{eventId}/tasks:
 *   get:
 *     tags:
 *       - Events - Kanban Task
 *     summary: Retrieve all tasks for an event grouped by status
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Task groups returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tasks:
 *                   type: object
 *                   properties:
 *                     TODO:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Task'
 *                     IN_PROGRESS:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Task'
 *                     COMPLETED:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Task'
 */
router.get('/:eventId/tasks', getTasks);

/**
 * @swagger
 * /api/events/{eventId}/tasks/{task_id}:
 *   put:
 *     tags:
 *       - Events - Kanban Task
 *     summary: Update an existing task for an event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: task_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskUpdateRequest'
 *     responses:
 *       200:
 *         description: Task updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 task:
 *                   $ref: '#/components/schemas/Task'
 */
router.put('/:eventId/tasks/:task_id', requireRole('ADMIN', 'ORGANIZER'), updateTask);

/**
 * @swagger
 * /api/events/{eventId}/tasks/{task_id}:
 *   delete:
 *     tags:
 *       - Events - Kanban Task
 *     summary: Delete a task from an event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: task_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task deleted successfully
 */
router.delete('/:eventId/tasks/:task_id', requireRole('ADMIN', 'ORGANIZER'), deleteTask);

/**
 * @swagger
 * /api/events/{eventId}/tasks/{task_id}/move:
 *   put:
 *     tags:
 *       - Events - Kanban Task
 *     summary: Move a task to a new status and order position
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: task_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MoveTaskRequest'
 *     responses:
 *       200:
 *         description: Task moved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 task:
 *                   $ref: '#/components/schemas/Task'
 */
router.put('/:eventId/tasks/:task_id/move', requireRole('ADMIN', 'ORGANIZER'), moveTask);

/**
 * @swagger
 * /api/events/{eventId}/status:
 *   put:
 *     tags:
 *       - Events - Planning
 *     summary: Change the event lifecycle status
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EventStatusRequest'
 *     responses:
 *       200:
 *         description: Event status updated successfully
 */
router.put('/:eventId/status', requireRole('ADMIN', 'ORGANIZER'), changeEventStatus);

/**
 * @swagger
 * /api/events/{eventId}/allocation:
 *   post:
 *     tags:
 *       - Events - Planning
 *     summary: Create or update event allocation details
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AllocationRequest'
 *     responses:
 *       201:
 *         description: Event allocation saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 allocation:
 *                   $ref: '#/components/schemas/Allocation'
 */
router.post('/:eventId/allocation', createEventAllocation);

/**
 * @swagger
 * /api/events/{eventId}/allocation:
 *   get:
 *     tags:
 *       - Events - Planning
 *     summary: Retrieve allocation details for an event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Allocation details returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 allocation:
 *                   $ref: '#/components/schemas/Allocation'
 */
router.get('/:eventId/allocation', getEventAllocation);

/**
 * @swagger
 * /api/events/{eventId}/allocation:
 *   put:
 *     tags:
 *       - Events - Planning
 *     summary: Update event allocation details
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AllocationRequest'
 *     responses:
 *       200:
 *         description: Event allocation updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 allocation:
 *                   $ref: '#/components/schemas/Allocation'
 */
router.put('/:eventId/allocation', updateEventAllocation);

/**
 * @swagger
 * /api/events/{eventId}/allocation:
 *   delete:
 *     tags:
 *       - Events - Planning
 *     summary: Delete event allocation details
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event allocation deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.delete('/:eventId/allocation', deleteEventAllocation);

/**
 * @swagger
 * /api/events/{eventId}/notes:
 *   get:
 *     tags:
 *       - Events - Planning
 *     summary: Retrieve notes for an event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event notes returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notes:
 *                   type: string
 */
router.get('/:eventId/notes', getEventNotes);

/**
 * @swagger
 * /api/events/{eventId}/notes:
 *   put:
 *     tags:
 *       - Events - Planning
 *     summary: Update notes for an event
 *     parameters:
 *       - in: path
 *         name: eventId
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
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Event notes updated successfully
 */
router.put('/:eventId/notes', updateEventNotes);

/**
 * @swagger
 * /api/events/{eventId}/notes:
 *   delete:
 *     tags:
 *       - Events - Planning
 *     summary: Delete notes for an event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event notes deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.delete('/:eventId/notes', deleteEventNotes);

/**
 * @swagger
 * /api/events/{eventId}/checklist:
 *   get:
 *     tags:
 *       - Events - Planning
 *     summary: Retrieve checklist items for an event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event checklist returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 checklist:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       label:
 *                         type: string
 *                       done:
 *                         type: boolean
 */
router.get('/:eventId/checklist', getEventChecklist);

/**
 * @swagger
 * /api/events/{eventId}/checklist:
 *   post:
 *     tags:
 *       - Events - Planning
 *     summary: Add new checklist items for an event
 *     parameters:
 *       - in: path
 *         name: eventId
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
 *               checklist:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     label:
 *                       type: string
 *                     done:
 *                       type: boolean
 *     responses:
 *       201:
 *         description: Checklist items added successfully
 */
router.post('/:eventId/checklist', createEventChecklist);

/**
 * @swagger
 * /api/events/{eventId}/checklist/{itemId}:
 *   delete:
 *     tags:
 *       - Events - Planning
 *     summary: Delete a checklist item from an event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Checklist item deleted successfully
 */
router.delete('/:eventId/checklist/:itemId', deleteEventChecklist);

/**
 * @swagger
 * /api/events/{eventId}/checklist:
 *   put:
 *     tags:
 *       - Events - Planning
 *     summary: Update checklist items for an event
 *     parameters:
 *       - in: path
 *         name: eventId
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
 *               checklist:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     label:
 *                       type: string
 *                     done:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Event checklist updated successfully
 */
router.put('/:eventId/checklist', updateEventChecklist);

/**
 * @swagger
 * /api/events/{eventId}/checklist:
 *   patch:
 *     tags:
 *       - Events - Planning
 *     summary: Partially update checklist items for an event
 *     parameters:
 *       - in: path
 *         name: eventId
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
 *               checklist:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     label:
 *                       type: string
 *                     done:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Event checklist partially updated successfully
 */
router.patch('/:eventId/checklist', patchEventChecklist);

/**
 * @swagger
 * /api/events/{eventId}/precheck:
 *   post:
 *     tags:
 *       - Events - Planning
 *     summary: Create pre-event verification data
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PrecheckRequest'
 *     responses:
 *       201:
 *         description: Pre-event verification created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 precheck:
 *                   $ref: '#/components/schemas/Precheck'
 */
router.post('/:eventId/precheck', createPrecheck);

/**
 * @swagger
 * /api/events/{eventId}/precheck:
 *   get:
 *     tags:
 *       - Events - Planning
 *     summary: Retrieve pre-event verification data
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Pre-event verification returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 precheck:
 *                   $ref: '#/components/schemas/Precheck'
 */
router.get('/:eventId/precheck', getPrecheck);

/**
 * @swagger
 * /api/events/{eventId}/precheck:
 *   put:
 *     tags:
 *       - Events - Planning
 *     summary: Update pre-event verification data
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PrecheckRequest'
 *     responses:
 *       200:
 *         description: Pre-event verification updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 precheck:
 *                   $ref: '#/components/schemas/Precheck'
 */
router.put('/:eventId/precheck', updatePrecheck);

/**
 * @swagger
 * /api/events/{eventId}/program-flow:
 *   post:
 *     tags:
 *       - Events - Planning
 *     summary: Create a program flow entry for an event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProgramFlowRequest'
 *     responses:
 *       201:
 *         description: Program flow entry created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 flow:
 *                   $ref: '#/components/schemas/ProgramFlow'
 */
router.post('/:eventId/program-flow', createProgramFlow);

/**
 * @swagger
 * /api/events/{eventId}/program-flow:
 *   get:
 *     tags:
 *       - Events - Planning
 *     summary: Retrieve program flow entries for an event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Program flow entries returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 flows:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProgramFlow'
 */
router.get('/:eventId/program-flow', getProgramFlow);

/**
 * @swagger
 * /api/events/program-flow/{flow_id}:
 *   put:
 *     tags:
 *       - Events - Planning
 *     summary: Update a program flow entry
 *     parameters:
 *       - in: path
 *         name: flow_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Program flow ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProgramFlowRequest'
 *     responses:
 *       200:
 *         description: Program flow entry updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 flow:
 *                   $ref: '#/components/schemas/ProgramFlow'
 */
router.put('/program-flow/:flow_id', updateProgramFlow);

/**
 * @swagger
 * /api/events/program-flow/{flow_id}:
 *   delete:
 *     tags:
 *       - Events - Planning
 *     summary: Delete a program flow entry
 *     parameters:
 *       - in: path
 *         name: flow_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Program flow ID
 *     responses:
 *       200:
 *         description: Program flow entry deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.delete('/program-flow/:flow_id', deleteProgramFlow);

/**
 * @swagger
 * /api/events/{eventId}/timeline:
 *   post:
 *     tags:
 *       - Events - Planning
 *     summary: Create a timeline task for an event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TimelineTaskRequest'
 *     responses:
 *       201:
 *         description: Timeline task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 task:
 *                   $ref: '#/components/schemas/TimelineTask'
 */
router.post('/:eventId/timeline', createTimelineTask);

/**
 * @swagger
 * /api/events/{eventId}/timeline:
 *   get:
 *     tags:
 *       - Events - Planning
 *     summary: Retrieve timeline tasks for an event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Timeline tasks returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tasks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TimelineTask'
 */
router.get('/:eventId/timeline', getTimelineTasks);

/**
 * @swagger
 * /api/events/timeline/{task_id}:
 *   put:
 *     tags:
 *       - Events - Planning
 *     summary: Update a timeline task
 *     parameters:
 *       - in: path
 *         name: task_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Timeline task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTimelineTaskRequest'
 *     responses:
 *       200:
 *         description: Timeline task updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 task:
 *                   $ref: '#/components/schemas/TimelineTask'
 */
router.put('/timeline/:task_id', updateTimelineTask);

/**
 * @swagger
 * /api/events/{eventId}/status:
 *   post:
 *     tags:
 *       - Events - Planning
 *     summary: Create a resource status entry for an event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResourceStatusRequest'
 *     responses:
 *       201:
 *         description: Resource status entry created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 status:
 *                   $ref: '#/components/schemas/ResourceStatus'
 */
router.post('/:eventId/status', createResourceStatus);

/**
 * @swagger
 * /api/events/{eventId}/status:
 *   get:
 *     tags:
 *       - Events - Planning
 *     summary: Retrieve resource status entries for an event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Resource statuses returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statuses:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ResourceStatus'
 */
router.get('/:eventId/status', getResourceStatuses);

/**
 * @swagger
 * /api/events/status/{id}:
 *   put:
 *     tags:
 *       - Events - Planning
 *     summary: Update a resource status entry
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Resource status ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateResourceStatusRequest'
 *     responses:
 *       200:
 *         description: Resource status entry updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 status:
 *                   $ref: '#/components/schemas/ResourceStatus'
 */
router.put('/status/:id', updateResourceStatus);

/**
 * @swagger
 * /api/events:
 *   get:
 *     tags:
 *       - Events
 *     summary: Retrieve all events
 *     responses:
 *       200:
 *         description: List of events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 events:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Event'
 *       500:
 *         description: Server error
 */
router.get('/', getEvents);

/**
 * @swagger
 * /api/events/{eventId}:
 *   get:
 *     tags:
 *       - Events
 *     summary: Retrieve a single event by ID
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 event:
 *                   $ref: '#/components/schemas/Event'
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
router.get('/:eventId', getEventById);

/**
 * @swagger
 * /api/events/{eventId}/messages:
 *   get:
 *     tags:
 *       - Events - Messages
 *     summary: Retrieve chat messages for an event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       senderId:
 *                         type: string
 *                       senderRole:
 *                         type: string
 *                       receiverId:
 *                         type: string
 *                       body:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Event not found
 */
router.get('/:eventId/messages', validateTokenMiddleware, getEventMessages);

/**
 * @swagger
 * /api/events/{eventId}/messages:
 *   post:
 *     tags:
 *       - Events - Messages
 *     summary: Send a message from head organizer to the assigned client
 *     parameters:
 *       - in: path
 *         name: eventId
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
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Event not found
 */
router.post('/:eventId/messages', validateTokenMiddleware, sendEventMessage);

/**
 * @swagger
 * /api/events/{eventId}:
 *   put:
 *     tags:
 *       - Events
 *     summary: Update an existing event by ID
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateEventRequest'
 *     responses:
 *       200:
 *         description: Event updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 event:
 *                   $ref: '#/components/schemas/Event'
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Event not found
 */
router.put('/:eventId', validateTokenMiddleware, updateEvent);

/**
 * @swagger
 * /api/events/{eventId}:
 *   delete:
 *     tags:
 *       - Events
 *     summary: Delete an event by ID
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *       404:
 *         description: Event not found
 */
router.delete('/:eventId', validateTokenMiddleware, deleteEvent);

/**
 * @swagger
 * /api/events/{eventId}/rsvp:
 *   post:
 *     tags:
 *       - Events - QR
 *     summary: Create a new RSVP guest for an event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event identifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               guestfirstName:
 *                 type: string
 *               guestmiddleName:
 *                 type: string
 *               guestlastName:
 *                 type: string
 *               message:
 *                 type: string
 *               status:
 *                 type: string
 *                 example: ATTENDING
 *               qrCode:
 *                 type: string
 *             required:
 *               - guestfirstName
 *               - guestlastName
 *     responses:
 *       201:
 *         description: RSVP guest created successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Event not found
 */
router.post('/:eventId/rsvp', validateTokenMiddleware, createRsvpGuest);

/**
 * @swagger
 * /api/events/{eventId}/rsvp:
 *   get:
 *     tags:
 *       - Events - QR
 *     summary: Retrieve attending RSVP guests for an event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of attending RSVP guests
 *       400:
 *         description: Invalid event ID
 */
router.get('/:eventId/rsvp', validateTokenMiddleware, getRsvpList);
/**
 * @swagger
 * /api/events/{eventId}/rsvp/{guestId}/checkin:
 *   put:
 *     tags:
 *       - Events - QR
 *     summary: Manually check in an attending RSVP guest
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: guestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Guest checked in successfully
 *       400:
 *         description: Invalid request or guest not attending
 */
router.put('/:eventId/rsvp/:guestId/checkin', validateTokenMiddleware, manualCheckIn);

/**
 * @swagger
 * /api/events/{eventId}/headcount:
 *   get:
 *     tags:
 *       - Events - QR
 *     summary: Get live RSVP headcount for an event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event identifier
 *     responses:
 *       200:
 *         description: Current headcount and expected guest count
 *       400:
 *         description: Invalid event ID
 *       500:
 *         description: Server error
 */
router.get('/:eventId/headcount', getEventHeadcount);

/**
 * @swagger
 * /api/events/{eventId}/vendors:
 *   get:
 *     tags:
 *       - Events
 *     summary: Get list of vendors for an event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event identifier
 *     responses:
 *       200:
 *         description: List of vendors for event
 *       500:
 *         description: Server error
 */
router.get('/:eventId/vendors', getVendorsByEventId);

/**
 * @swagger
 * /api/events/{eventId}/cost-breakdown:
 *   post:
 *     tags:
 *       - Events - Cost Breakdown
 *     summary: Create or compute a cost breakdown for an event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event identifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CostBreakdownRequest'
 *     responses:
 *       201:
 *         description: Cost breakdown created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 costBreakdown:
 *                   $ref: '#/components/schemas/CostBreakdown'
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Event not found
 */

/**
 * @swagger
 * /api/events/{eventId}/cost-breakdown:
 *   get:
 *     tags:
 *       - Events - Cost Breakdown
 *     summary: Retrieve the cost breakdown for an event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event identifier
 *     responses:
 *       200:
 *         description: Cost breakdown retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 costBreakdown:
 *                   $ref: '#/components/schemas/CostBreakdown'
 *       404:
 *         description: Cost breakdown not found
 */

/**
 * @swagger
 * /api/events/{eventId}/cost-breakdown:
 *   put:
 *     tags:
 *       - Events - Cost Breakdown
 *     summary: Recalculate and update the cost breakdown for an event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event identifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CostBreakdownRequest'
 *     responses:
 *       200:
 *         description: Cost breakdown updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 costBreakdown:
 *                   $ref: '#/components/schemas/CostBreakdown'
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Cost breakdown not found
 */

/**
 * @swagger
 * /api/events/{eventId}/cost-breakdown/export:
 *   get:
 *     tags:
 *       - Events - Cost Breakdown
 *     summary: Export cost breakdown data for printing or export
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event identifier
 *     responses:
 *       200:
 *         description: Cost breakdown export data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 export:
 *                   $ref: '#/components/schemas/CostBreakdownExport'
 *       404:
 *         description: Cost breakdown not found
 */
router.use('/:eventId/cost-breakdown', costBreakdownRoutes);

export default router;
