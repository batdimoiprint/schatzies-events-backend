import express from 'express';
import {
  createVendor,
  getVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
  getVendorsByEventId,
  assignVendorToEvent,
  unassignVendorFromEvent,
  createVendorWorker,
  getVendorWorkers,
  getAllVendorWorkers,
  getVendorWorkerById,
  getVendorEvents,
  getWorkerEvents,
  updateVendorWorker,
  deleteVendorWorker,
  assignWorkerToEvent,
  unassignWorkerFromEvent,
} from '../controllers/vendor.controller.js';
import { validateTokenMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Vendor:
 *       type: object
 *       required:
 *         - vendorName
 *         - serviceType
 *       properties:
 *         vendorName:
 *           type: string
 *           description: Name of the vendor company/individual
 *         serviceType:
 *           type: string
 *           description: Primary service category (e.g. Catering, Photography, Florals)
 *         contactPerson:
 *           type: string
 *           description: Name of the point-of-contact person
 *         contactNumber:
 *           type: string
 *           description: Phone number
 *         email:
 *           type: string
 *           description: Contact email address
 *         typeOfSupply:
 *           type: string
 *           description: Type of goods/services supplied
 *         servicesOffered:
 *           type: string
 *           description: Description of services offered
 *         pricing:
 *           type: string
 *           description: Pricing model or tier description
 *         price:
 *           type: number
 *           nullable: true
 *           description: Numeric price/rate for the vendor
 *         availabilityStatus:
 *           type: string
 *           enum: [active, inactive]
 *           default: inactive
 *           description: Whether the vendor is currently available
 *         lastEventHandled:
 *           type: string
 *           description: Name/reference of the last event this vendor was involved in
 *         notes:
 *           type: string
 *           description: Internal notes about the vendor
 *         eventId:
 *           type: string
 *           description: ID of the currently assigned event (optional)
 *     VendorWorker:
 *       type: object
 *       required:
 *         - workerName
 *       properties:
 *         workerName:
 *           type: string
 *           description: Name of the worker
 *         role:
 *           type: string
 *           description: Worker's role (e.g. Lead Photographer, Assistant)
 *         contactNumber:
 *           type: string
 *         email:
 *           type: string
 *         jobTitle:
 *           type: string
 *           description: Worker's job title
 *         availabilityStatus:
 *           type: string
 *           enum: [active, inactive]
 *           default: inactive
 *         eventId:
 *           type: string
 *           description: ID of the currently assigned event (optional)
 *         notes:
 *           type: string
 */

/**
 * @swagger
 * /api/vendors:
 *   post:
 *     tags:
 *       - Vendors
 *     summary: Create a new vendor
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Vendor'
 *     responses:
 *       201:
 *         description: Vendor created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 vendor:
 *                   type: object
 *       400:
 *         description: Invalid input (missing vendorName or serviceType) or event not found
 */
router.post('/', validateTokenMiddleware, createVendor);

/**
 * @swagger
 * /api/vendors:
 *   get:
 *     tags:
 *       - Vendors
 *     summary: Retrieve all vendors, optionally filtered by event
 *     parameters:
 *       - in: query
 *         name: eventId
 *         schema:
 *           type: string
 *         description: Filter vendors assigned to a specific event
 *     responses:
 *       200:
 *         description: List of vendors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 vendors:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Server error
 */
router.get('/', getVendors);

/**
 * @swagger
 * /api/vendors/workers:
 *   get:
 *     tags:
 *       - Vendor Workers
 *     summary: Retrieve all workers across all vendors
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: vendorId
 *         schema:
 *           type: string
 *         description: Filter workers by vendor ID
 *       - in: query
 *         name: eventId
 *         schema:
 *           type: string
 *         description: Filter workers assigned to a specific event
 *     responses:
 *       200:
 *         description: List of workers across vendors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 workers:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Server error
 */
router.get('/workers', validateTokenMiddleware, getAllVendorWorkers);

/**
 * @swagger
 * /api/vendors/workers/{id}/events:
 *   get:
 *     tags:
 *       - Vendor Workers
 *     summary: Retrieve event assignment timeline for a worker (by worker ID)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Worker ID
 *     responses:
 *       200:
 *         description: Worker event timeline
 *       404:
 *         description: Worker not found
 *       500:
 *         description: Server error
 */
router.get('/workers/:id/events', getWorkerEvents);

/**
 * @swagger
 * /api/vendors/{id}/events:
 *   get:
 *     tags:
 *       - Vendors
 *     summary: Retrieve event assignment timeline for a vendor
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     responses:
 *       200:
 *         description: Vendor event timeline (current and past assignments)
 *       404:
 *         description: Vendor not found
 *       500:
 *         description: Server error
 */
router.get('/:id/events', getVendorEvents);

/**
 * @swagger
 * /api/vendors/{id}:
 *   get:
 *     tags:
 *       - Vendors
 *     summary: Retrieve a single vendor by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     responses:
 *       200:
 *         description: Vendor found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 vendor:
 *                   type: object
 *       404:
 *         description: Vendor not found
 *       500:
 *         description: Server error
 */
router.get('/:id', getVendorById);

/**
 * @swagger
 * /api/vendors/{id}:
 *   put:
 *     tags:
 *       - Vendors
 *     summary: Update an existing vendor
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Vendor'
 *     responses:
 *       200:
 *         description: Vendor updated successfully
 *       400:
 *         description: Invalid input or event not found
 *       404:
 *         description: Vendor not found
 */
router.put('/:id', validateTokenMiddleware, updateVendor);

/**
 * @swagger
 * /api/vendors/{id}/assign-event:
 *   post:
 *     tags:
 *       - Vendors
 *     summary: Assign a vendor to an event
 *     description: Assigns the vendor to the specified event. If the vendor was previously assigned, the old assignment is closed in the event history.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventId
 *             properties:
 *               eventId:
 *                 type: string
 *                 description: The event ID to assign the vendor to
 *     responses:
 *       200:
 *         description: Vendor assigned to event successfully
 *       400:
 *         description: Missing eventId
 *       404:
 *         description: Vendor or event not found
 */
router.post('/:id/assign-event', validateTokenMiddleware, assignVendorToEvent);

/**
 * @swagger
 * /api/vendors/{id}/unassign-event:
 *   delete:
 *     tags:
 *       - Vendors
 *     summary: Unassign a vendor from its current event
 *     description: Removes the current event assignment and closes the assignment in event history.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     responses:
 *       200:
 *         description: Vendor unassigned successfully
 *       404:
 *         description: Vendor not found
 *       500:
 *         description: Server error
 */
router.delete(
  '/:id/unassign-event',
  validateTokenMiddleware,
  unassignVendorFromEvent
);

/**
 * @swagger
 * /api/vendors/{id}/workers:
 *   post:
 *     tags:
 *       - Vendor Workers
 *     summary: Create a new worker under a vendor
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VendorWorker'
 *     responses:
 *       201:
 *         description: Worker created successfully
 *       400:
 *         description: Invalid input (missing workerName) or event not found
 */
router.post('/:id/workers', validateTokenMiddleware, createVendorWorker);

/**
 * @swagger
 * /api/vendors/{id}/workers:
 *   get:
 *     tags:
 *       - Vendor Workers
 *     summary: Retrieve all workers for a specific vendor
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *       - in: query
 *         name: eventId
 *         schema:
 *           type: string
 *         description: Filter workers assigned to a specific event
 *     responses:
 *       200:
 *         description: List of workers for this vendor
 *       404:
 *         description: Vendor not found
 *       500:
 *         description: Server error
 */
router.get('/:id/workers', getVendorWorkers);

/**
 * @swagger
 * /api/vendors/{id}/workers/{workerId}:
 *   get:
 *     tags:
 *       - Vendor Workers
 *     summary: Retrieve a specific worker by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *       - in: path
 *         name: workerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Worker ID
 *     responses:
 *       200:
 *         description: Worker found
 *       404:
 *         description: Vendor or worker not found
 *       500:
 *         description: Server error
 */
router.get('/:id/workers/:workerId', getVendorWorkerById);

/**
 * @swagger
 * /api/vendors/{id}/workers/{workerId}/events:
 *   get:
 *     tags:
 *       - Vendor Workers
 *     summary: Retrieve event assignment timeline for a specific worker
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *       - in: path
 *         name: workerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Worker ID
 *     responses:
 *       200:
 *         description: Worker event timeline
 *       404:
 *         description: Vendor or worker not found
 *       500:
 *         description: Server error
 */
router.get('/:id/workers/:workerId/events', getWorkerEvents);

/**
 * @swagger
 * /api/vendors/{id}/workers/{workerId}:
 *   put:
 *     tags:
 *       - Vendor Workers
 *     summary: Update a worker's details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *       - in: path
 *         name: workerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Worker ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VendorWorker'
 *     responses:
 *       200:
 *         description: Worker updated successfully
 *       400:
 *         description: Invalid input or event not found
 *       404:
 *         description: Vendor or worker not found
 */
router.put(
  '/:id/workers/:workerId',
  validateTokenMiddleware,
  updateVendorWorker
);

/**
 * @swagger
 * /api/vendors/{id}/workers/{workerId}:
 *   delete:
 *     tags:
 *       - Vendor Workers
 *     summary: Delete a worker
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *       - in: path
 *         name: workerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Worker ID
 *     responses:
 *       200:
 *         description: Worker deleted successfully
 *       404:
 *         description: Vendor or worker not found
 *       500:
 *         description: Server error
 */
router.delete(
  '/:id/workers/:workerId',
  validateTokenMiddleware,
  deleteVendorWorker
);

/**
 * @swagger
 * /api/vendors/{id}/workers/{workerId}/assign-event:
 *   post:
 *     tags:
 *       - Vendor Workers
 *     summary: Assign a worker to an event
 *     description: Assigns the worker to the specified event. If the worker was previously assigned, the old assignment is closed in the event history.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *       - in: path
 *         name: workerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Worker ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventId
 *             properties:
 *               eventId:
 *                 type: string
 *                 description: The event ID to assign the worker to
 *     responses:
 *       200:
 *         description: Worker assigned to event successfully
 *       400:
 *         description: Missing eventId
 *       404:
 *         description: Vendor, worker, or event not found
 */
router.post(
  '/:id/workers/:workerId/assign-event',
  validateTokenMiddleware,
  assignWorkerToEvent
);

/**
 * @swagger
 * /api/vendors/{id}/workers/{workerId}/unassign-event:
 *   delete:
 *     tags:
 *       - Vendor Workers
 *     summary: Unassign a worker from its current event
 *     description: Removes the current event assignment and closes the assignment in event history.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *       - in: path
 *         name: workerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Worker ID
 *     responses:
 *       200:
 *         description: Worker unassigned from event successfully
 *       404:
 *         description: Vendor or worker not found
 *       500:
 *         description: Server error
 */
router.delete(
  '/:id/workers/:workerId/unassign-event',
  validateTokenMiddleware,
  unassignWorkerFromEvent
);

/**
 * @swagger
 * /api/vendors/{id}:
 *   delete:
 *     tags:
 *       - Vendors
 *     summary: Delete a vendor by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     responses:
 *       200:
 *         description: Vendor deleted successfully
 *       404:
 *         description: Vendor not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', validateTokenMiddleware, deleteVendor);

/**
 * @swagger
 * /api/vendors/event/{eventId}:
 *   get:
 *     tags:
 *       - Vendors
 *     summary: Retrieve all vendors assigned to a specific event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: List of vendors for the event
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 vendors:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Server error
 */
router.get('/event/:eventId', getVendorsByEventId);

export default router;
