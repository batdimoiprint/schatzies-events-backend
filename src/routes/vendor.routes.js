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
  getVendorWorkerById,
  updateVendorWorker,
  deleteVendorWorker,
  assignWorkerToEvent,
  unassignWorkerFromEvent,
} from '../controllers/vendor.controller.js';
import { validateTokenMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/vendors:
 *   post:
 *     tags:
 *       - Vendors
 *     summary: Create a new vendor
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vendorName:
 *                 type: string
 *               contactPerson:
 *                 type: string
 *               contactNumber:
 *                 type: string
 *               email:
 *                 type: string
 *               typeOfSupply:
 *                 type: string
 *               servicesOffered:
 *                 type: string
 *               pricing:
 *                 type: string
 *               serviceType:
 *                 type: string
 *               price:
 *                 type: number
 *               availabilityStatus:
 *                 type: string
 *               lastEventHandled:
 *                 type: string
 *               notes:
 *                 type: string
 *               eventId:
 *                 type: string
 *                 description: Optional event assignment
 *             required:
 *               - vendorName
 *               - serviceType
 *     responses:
 *       201:
 *         description: Vendor created successfully
 *       400:
 *         description: Invalid input or event not found
 */
router.post('/', validateTokenMiddleware, createVendor);

/**
 * @swagger
 * /api/vendors:
 *   get:
 *     tags:
 *       - Vendors
 *     summary: Retrieve all vendors or filter by eventId with query string
 *     parameters:
 *       - in: query
 *         name: eventId
 *         schema:
 *           type: string
 *         description: Filter vendors by event ID
 *     responses:
 *       200:
 *         description: List of vendors
 *       500:
 *         description: Server error
 */
router.get('/', getVendors);

/**
 * @swagger
 * /api/vendors/{id}:
 *   get:
 *     tags:
 *       - Vendors
 *     summary: Retrieve vendor by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vendor found
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
 *     summary: Update a vendor by ID
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
 *               vendorName:
 *                 type: string
 *               contactPerson:
 *                 type: string
 *               contactNumber:
 *                 type: string
 *               email:
 *                 type: string
 *               typeOfSupply:
 *                 type: string
 *               servicesOffered:
 *                 type: string
 *               pricing:
 *                 type: string
 *               serviceType:
 *                 type: string
 *               price:
 *                 type: number
 *               availabilityStatus:
 *                 type: string
 *               lastEventHandled:
 *                 type: string
 *               notes:
 *                 type: string
 *               eventId:
 *                 type: string
 *                 description: Optional event assignment
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
 *     summary: Assign an existing vendor to an event
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
 *               eventId:
 *                 type: string
 *             required:
 *               - eventId
 *     responses:
 *       200:
 *         description: Vendor assigned successfully
 *       400:
 *         description: Invalid input
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vendor unassigned successfully
 *       404:
 *         description: Vendor not found
 *       500:
 *         description: Server error
 */
router.delete('/:id/unassign-event', validateTokenMiddleware, unassignVendorFromEvent);

/**
 * @swagger
 * /api/vendors/{id}/workers:
 *   post:
 *     tags:
 *       - Vendors
 *     summary: Create a new worker for a vendor
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
 *               workerName:
 *                 type: string
 *               role:
 *                 type: string
 *               contactNumber:
 *                 type: string
 *               email:
 *                 type: string
 *               jobTitle:
 *                 type: string
 *               availabilityStatus:
 *                 type: string
 *               eventId:
 *                 type: string
 *               notes:
 *                 type: string
 *             required:
 *               - workerName
 *     responses:
 *       201:
 *         description: Worker created successfully
 *       400:
 *         description: Invalid input or event not found
 */
router.post('/:id/workers', validateTokenMiddleware, createVendorWorker);

/**
 * @swagger
 * /api/vendors/{id}/workers:
 *   get:
 *     tags:
 *       - Vendors
 *     summary: Retrieve all workers for a vendor
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: eventId
 *         schema:
 *           type: string
 *         description: Filter workers by assigned event
 *     responses:
 *       200:
 *         description: List of workers
 *       500:
 *         description: Server error
 */
router.get('/:id/workers', getVendorWorkers);

/**
 * @swagger
 * /api/vendors/{id}/workers/{workerId}:
 *   get:
 *     tags:
 *       - Vendors
 *     summary: Retrieve a worker by ID for a vendor
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: workerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Worker found
 *       404:
 *         description: Worker not found
 *       500:
 *         description: Server error
 */
router.get('/:id/workers/:workerId', getVendorWorkerById);

/**
 * @swagger
 * /api/vendors/{id}/workers/{workerId}:
 *   put:
 *     tags:
 *       - Vendors
 *     summary: Update a worker for a vendor
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: workerId
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
 *               workerName:
 *                 type: string
 *               role:
 *                 type: string
 *               contactNumber:
 *                 type: string
 *               email:
 *                 type: string
 *               jobTitle:
 *                 type: string
 *               availabilityStatus:
 *                 type: string
 *               eventId:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Worker updated successfully
 *       400:
 *         description: Invalid input or event not found
 *       404:
 *         description: Worker not found
 */
router.put('/:id/workers/:workerId', validateTokenMiddleware, updateVendorWorker);

/**
 * @swagger
 * /api/vendors/{id}/workers/{workerId}:
 *   delete:
 *     tags:
 *       - Vendors
 *     summary: Delete a worker for a vendor
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: workerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Worker deleted successfully
 *       404:
 *         description: Worker not found
 *       500:
 *         description: Server error
 */
router.delete('/:id/workers/:workerId', validateTokenMiddleware, deleteVendorWorker);

/**
 * @swagger
 * /api/vendors/{id}/workers/{workerId}/assign-event:
 *   post:
 *     tags:
 *       - Vendors
 *     summary: Assign an existing worker to an event
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: workerId
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
 *               eventId:
 *                 type: string
 *             required:
 *               - eventId
 *     responses:
 *       200:
 *         description: Worker assigned successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Worker or event not found
 */
router.post('/:id/workers/:workerId/assign-event', validateTokenMiddleware, assignWorkerToEvent);

/**
 * @swagger
 * /api/vendors/{id}/workers/{workerId}/unassign-event:
 *   delete:
 *     tags:
 *       - Vendors
 *     summary: Unassign a worker from its current event
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: workerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Worker unassigned successfully
 *       404:
 *         description: Vendor or worker not found
 *       500:
 *         description: Server error
 */
router.delete('/:id/workers/:workerId/unassign-event', validateTokenMiddleware, unassignWorkerFromEvent);

/**
 * @swagger
 * /api/vendors/{id}:
 *   delete:
 *     tags:
 *       - Vendors
 *     summary: Delete a vendor by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *     summary: Retrieve all vendors assigned to an event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of vendors for an event
 *       500:
 *         description: Server error
 */
router.get('/event/:eventId', getVendorsByEventId);

export default router;
