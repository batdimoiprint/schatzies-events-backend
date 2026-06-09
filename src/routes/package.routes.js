import express from 'express';
import upload from '../middleware/upload.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import {
  createPackage,
  getPackages,
  getPackageById,
  updatePackage,
  deletePackage,
} from '../controllers/package.controller.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     PaxOption:
 *       type: object
 *       required:
 *         - pax
 *         - price
 *       properties:
 *         pax:
 *           type: integer
 *           example: 100
 *         price:
 *           type: number
 *           example: 329000
 *     Inclusion:
 *       type: object
 *       required:
 *         - inclusionType
 *         - inclusion
 *       properties:
 *         inclusionType:
 *           type: string
 *           enum: [Professional Coordination, Catering & Dining, Styling & Production, Media & Glamour]
 *           example: Catering & Dining
 *         inclusion:
 *           type: string
 *           example: Beef, Pork, Fish, Chicken, Veg
 *     Package:
 *       type: object
 *       required:
 *         - eventType
 *         - packageName
 *       properties:
 *         id:
 *           type: string
 *           readOnly: true
 *         eventType:
 *           type: string
 *           enum: [Wedding, Debut]
 *         packageName:
 *           type: string
 *           example: Fascinating Wedding Package
 *         description:
 *           type: string
 *         imageUrl:
 *           type: string
 *           description: Public S3 URL of the package image
 *         inclusions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Inclusion'
 *         paxOptions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PaxOption'
 *         note:
 *           type: string
 *         createdAt:
 *           type: string
 *           readOnly: true
 *         updatedAt:
 *           type: string
 *           readOnly: true
 */

/**
 * @swagger
 * /api/packages:
 *   post:
 *     tags:
 *       - Packages
 *     summary: Create a new event package
 *     description: Accepts multipart/form-data. Pass `inclusions` and `paxOptions` as JSON strings.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - eventType
 *               - packageName
 *             properties:
 *               eventType:
 *                 type: string
 *                 enum: [Wedding, Debut]
 *               packageName:
 *                 type: string
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *               inclusions:
 *                 type: string
 *                 description: JSON array — e.g. [{"inclusionType":"Catering & Dining","inclusion":"Buffet"}]
 *               paxOptions:
 *                 type: string
 *                 description: JSON array — e.g. [{"pax":100,"price":329000},{"pax":150,"price":376500}]
 *               note:
 *                 type: string
 *     responses:
 *       201:
 *         description: Package created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 package:
 *                   $ref: '#/components/schemas/Package'
 *       400:
 *         description: Missing required fields or invalid eventType
 */
router.post('/', requireRole('ADMIN'), upload.single('image'), createPackage);

/**
 * @swagger
 * /api/packages:
 *   get:
 *     tags:
 *       - Packages
 *     summary: Get all packages, optionally filtered by event type
 *     parameters:
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *           enum: [Wedding, Debut]
 *         description: Filter packages by event type
 *     responses:
 *       200:
 *         description: List of packages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 packages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Package'
 *       500:
 *         description: Server error
 */
router.get('/', getPackages);

/**
 * @swagger
 * /api/packages/{id}:
 *   get:
 *     tags:
 *       - Packages
 *     summary: Get a single package by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Package ID
 *     responses:
 *       200:
 *         description: Package found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 package:
 *                   $ref: '#/components/schemas/Package'
 *       404:
 *         description: Package not found
 *       500:
 *         description: Server error
 */
router.get('/:id', getPackageById);

/**
 * @swagger
 * /api/packages/{id}:
 *   put:
 *     tags:
 *       - Packages
 *     summary: Update a package by ID
 *     description: Accepts multipart/form-data. Only include fields you want to update.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Package ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               eventType:
 *                 type: string
 *                 enum: [Wedding, Debut]
 *               packageName:
 *                 type: string
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Uploading a new image replaces the previous one
 *               inclusions:
 *                 type: string
 *                 description: JSON array replacing all inclusions
 *               paxOptions:
 *                 type: string
 *                 description: JSON array replacing all pax options
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Package updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 package:
 *                   $ref: '#/components/schemas/Package'
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Package not found
 */
router.put('/:id', requireRole('ADMIN'), upload.single('image'), updatePackage);

/**
 * @swagger
 * /api/packages/{id}:
 *   delete:
 *     tags:
 *       - Packages
 *     summary: Delete a package by ID
 *     description: Also deletes the associated image from S3 if present.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Package ID
 *     responses:
 *       200:
 *         description: Package deleted successfully
 *       404:
 *         description: Package not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', requireRole('ADMIN'), deletePackage);

export default router;
