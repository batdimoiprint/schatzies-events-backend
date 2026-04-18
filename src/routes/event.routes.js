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
 * /api/events/{id}/confirm:
 *   post:
 *     tags:
 *       - Events
 *     summary: Confirm an event with final details
 *     parameters:
 *       - in: path
 *         name: id
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
router.post('/:id/confirm', requireRole('ADMIN'), confirmEvent);

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
 * /api/events/{id}/tasks:
 *   post:
 *     tags:
 *       - Events
 *     summary: Create a new kanban task for an event
 *     parameters:
 *       - in: path
 *         name: id
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
router.post('/:id/tasks', requireRole('ADMIN', 'ORGANIZER'), createTask);

/**
 * @swagger
 * /api/events/{id}/tasks:
 *   get:
 *     tags:
 *       - Events
 *     summary: Retrieve all tasks for an event grouped by status
 *     parameters:
 *       - in: path
 *         name: id
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
router.get('/:id/tasks', getTasks);

/**
 * @swagger
 * /api/events/{id}/tasks/{task_id}:
 *   put:
 *     tags:
 *       - Events
 *     summary: Update an existing task for an event
 *     parameters:
 *       - in: path
 *         name: id
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
router.put('/:id/tasks/:task_id', requireRole('ADMIN', 'ORGANIZER'), updateTask);

/**
 * @swagger
 * /api/events/{id}/tasks/{task_id}:
 *   delete:
 *     tags:
 *       - Events
 *     summary: Delete a task from an event
 *     parameters:
 *       - in: path
 *         name: id
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
router.delete('/:id/tasks/:task_id', requireRole('ADMIN', 'ORGANIZER'), deleteTask);

/**
 * @swagger
 * /api/events/{id}/tasks/{task_id}/move:
 *   put:
 *     tags:
 *       - Events
 *     summary: Move a task to a new status and order position
 *     parameters:
 *       - in: path
 *         name: id
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
router.put('/:id/tasks/:task_id/move', requireRole('ADMIN', 'ORGANIZER'), moveTask);

/**
 * @swagger
 * /api/events/{id}/status:
 *   put:
 *     tags:
 *       - Events
 *     summary: Change the event lifecycle status
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
 *             $ref: '#/components/schemas/EventStatusRequest'
 *     responses:
 *       200:
 *         description: Event status updated successfully
 */
router.put('/:id/status', requireRole('ADMIN', 'ORGANIZER'), changeEventStatus);

/**
 * @swagger
 * /api/events/{id}/allocation:
 *   post:
 *     tags:
 *       - Events
 *     summary: Create or update event allocation details
 *     parameters:
 *       - in: path
 *         name: id
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
router.post('/:id/allocation', createEventAllocation);

/**
 * @swagger
 * /api/events/{id}/allocation:
 *   get:
 *     tags:
 *       - Events
 *     summary: Retrieve allocation details for an event
 *     parameters:
 *       - in: path
 *         name: id
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
router.get('/:id/allocation', getEventAllocation);

/**
 * @swagger
 * /api/events/{id}/allocation:
 *   put:
 *     tags:
 *       - Events
 *     summary: Update event allocation details
 *     parameters:
 *       - in: path
 *         name: id
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
router.put('/:id/allocation', updateEventAllocation);

/**
 * @swagger
 * /api/events/{id}/precheck:
 *   post:
 *     tags:
 *       - Events
 *     summary: Create pre-event verification data
 *     parameters:
 *       - in: path
 *         name: id
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
router.post('/:id/precheck', createPrecheck);

/**
 * @swagger
 * /api/events/{id}/precheck:
 *   get:
 *     tags:
 *       - Events
 *     summary: Retrieve pre-event verification data
 *     parameters:
 *       - in: path
 *         name: id
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
router.get('/:id/precheck', getPrecheck);

/**
 * @swagger
 * /api/events/{id}/precheck:
 *   put:
 *     tags:
 *       - Events
 *     summary: Update pre-event verification data
 *     parameters:
 *       - in: path
 *         name: id
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
router.put('/:id/precheck', updatePrecheck);

/**
 * @swagger
 * /api/events/{id}/program-flow:
 *   post:
 *     tags:
 *       - Events
 *     summary: Create a program flow entry for an event
 *     parameters:
 *       - in: path
 *         name: id
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
router.post('/:id/program-flow', createProgramFlow);

/**
 * @swagger
 * /api/events/{id}/program-flow:
 *   get:
 *     tags:
 *       - Events
 *     summary: Retrieve program flow entries for an event
 *     parameters:
 *       - in: path
 *         name: id
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
router.get('/:id/program-flow', getProgramFlow);

/**
 * @swagger
 * /api/events/program-flow/{flow_id}:
 *   put:
 *     tags:
 *       - Events
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
 *       - Events
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
 * /api/events/{id}/timeline:
 *   post:
 *     tags:
 *       - Events
 *     summary: Create a timeline task for an event
 *     parameters:
 *       - in: path
 *         name: id
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
router.post('/:id/timeline', createTimelineTask);

/**
 * @swagger
 * /api/events/{id}/timeline:
 *   get:
 *     tags:
 *       - Events
 *     summary: Retrieve timeline tasks for an event
 *     parameters:
 *       - in: path
 *         name: id
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
router.get('/:id/timeline', getTimelineTasks);

/**
 * @swagger
 * /api/events/timeline/{task_id}:
 *   put:
 *     tags:
 *       - Events
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
 * /api/events/{id}/status:
 *   post:
 *     tags:
 *       - Events
 *     summary: Create a resource status entry for an event
 *     parameters:
 *       - in: path
 *         name: id
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
router.post('/:id/status', createResourceStatus);

/**
 * @swagger
 * /api/events/{id}/status:
 *   get:
 *     tags:
 *       - Events
 *     summary: Retrieve resource status entries for an event
 *     parameters:
 *       - in: path
 *         name: id
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
router.get('/:id/status', getResourceStatuses);

/**
 * @swagger
 * /api/events/status/{id}:
 *   put:
 *     tags:
 *       - Events
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
 * /api/events/{id}:
 *   get:
 *     tags:
 *       - Events
 *     summary: Retrieve a single event by ID
 *     parameters:
 *       - in: path
 *         name: id
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
router.get('/:id', getEventById);

/**
 * @swagger
 * /api/events/{id}/messages:
 *   get:
 *     tags:
 *       - Events
 *     summary: Retrieve chat messages for an event
 *     parameters:
 *       - in: path
 *         name: id
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
router.get('/:id/messages', validateTokenMiddleware, getEventMessages);

/**
 * @swagger
 * /api/events/{id}/messages:
 *   post:
 *     tags:
 *       - Events
 *     summary: Send a message from head organizer to the assigned client
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
router.post('/:id/messages', validateTokenMiddleware, sendEventMessage);

/**
 * @swagger
 * /api/events/{id}:
 *   put:
 *     tags:
 *       - Events
 *     summary: Update an existing event by ID
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
router.put('/:id', validateTokenMiddleware, updateEvent);

/**
 * @swagger
 * /api/events/{id}:
 *   delete:
 *     tags:
 *       - Events
 *     summary: Delete an event by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *       404:
 *         description: Event not found
 */
router.delete('/:id', validateTokenMiddleware, deleteEvent);

/**
 * @swagger
 * /api/events/{id}/vendors:
 *   get:
 *     tags:
 *       - Events
 *     summary: Retrieve vendors assigned to an event
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of vendors for event
 *       500:
 *         description: Server error
 */
router.get('/:id/vendors', getVendorsByEventId);

export default router;
