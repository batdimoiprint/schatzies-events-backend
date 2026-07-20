import express from 'express';
import {
  createPackage,
  getPackages,
  getPackageById,
  updatePackage,
  deletePackage,
  addPackagePax,
  updatePackagePax,
  deletePackagePax,
  addPackageInclusion,
  updatePackageInclusion,
  deletePackageInclusion,
  copyPackageInclusions,
  reorderPackageInclusions,
} from '../controllers/package.controller.js';
import { validateTokenMiddleware } from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Package:
 *       type: object
 *       required:
 *         - eventType
 *         - packageName
 *       properties:
 *         eventType:
 *           type: string
 *           enum: [Debut, Wedding]
 *         packageName:
 *           type: string
 *           example: Blooms
 *         description:
 *           type: string
 *         images:
 *           type: array
 *           description: List of uploaded images for this package
 *           items:
 *             type: object
 *             properties:
 *               key:
 *                 type: string
 *                 description: S3 key of the image
 *               url:
 *                 type: string
 *                 description: Public URL of the image
 *         pax:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PackagePax'
 *         inclusions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PackageInclusion'
 *     PackagePax:
 *       type: object
 *       required:
 *         - pax
 *         - paxPrice
 *       properties:
 *         pax:
 *           type: number
 *           example: 100
 *           description: Number of guests
 *         paxPrice:
 *           type: number
 *           example: 329000
 *           description: Price for this pax count
 *         note:
 *           type: string
 *           description: Optional note for this pax tier
 *     PackageInclusion:
 *       type: object
 *       required:
 *         - inclusionType
 *         - inclusion
 *       properties:
 *         inclusionType:
 *           type: string
 *           description: Free-form inclusion category (e.g. Reception Styling)
 *           example: Reception Styling
 *         inclusion:
 *           type: string
 *           description: Description of what is included
 */

/**
 * @swagger
 * /api/packages:
 *   post:
 *     tags:
 *       - Packages
 *     summary: Create a new package
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
 *                 enum: [Debut, Wedding]
 *               packageName:
 *                 type: string
 *               description:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: One or more package images
 *     responses:
 *       201:
 *         description: Package created successfully
 *       400:
 *         description: Invalid input
 */
router.post('/', validateTokenMiddleware, upload.array('images', 20), createPackage);

/**
 * @swagger
 * /api/packages:
 *   get:
 *     tags:
 *       - Packages
 *     summary: List all packages
 *     parameters:
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *           enum: [Debut, Wedding]
 *         description: Filter by event type
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
 */
router.get('/', getPackages);

/**
 * @swagger
 * /api/packages/{id}:
 *   get:
 *     tags:
 *       - Packages
 *     summary: Get a single package with its pax tiers and inclusions
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Package with pax and inclusions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 package:
 *                   $ref: '#/components/schemas/Package'
 *       404:
 *         description: Package not found
 */
router.get('/:id', getPackageById);

/**
 * @swagger
 * /api/packages/{id}:
 *   patch:
 *     tags:
 *       - Packages
 *     summary: Update a package
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               eventType:
 *                 type: string
 *                 enum: [Debut, Wedding]
 *               packageName:
 *                 type: string
 *               description:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Upload new images to replace existing ones
 *     responses:
 *       200:
 *         description: Package updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Package not found
 */
router.patch('/:id', validateTokenMiddleware, upload.array('images', 20), updatePackage);

/**
 * @swagger
 * /api/packages/{id}:
 *   delete:
 *     tags:
 *       - Packages
 *     summary: Delete a package and all its pax tiers and inclusions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Package deleted successfully
 *       404:
 *         description: Package not found
 */
router.delete('/:id', validateTokenMiddleware, deletePackage);

// ---- Pax ----

/**
 * @swagger
 * /api/packages/{id}/pax:
 *   post:
 *     tags:
 *       - Package Pax
 *     summary: Add a pax tier to a package
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
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PackagePax'
 *     responses:
 *       201:
 *         description: Pax tier added successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Package not found
 */
router.post('/:id/pax', validateTokenMiddleware, addPackagePax);

/**
 * @swagger
 * /api/packages/{id}/pax/{paxId}:
 *   patch:
 *     tags:
 *       - Package Pax
 *     summary: Update a pax tier
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Package ID
 *       - in: path
 *         name: paxId
 *         required: true
 *         schema:
 *           type: string
 *         description: Pax ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PackagePax'
 *     responses:
 *       200:
 *         description: Pax updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Package or pax not found
 */
router.patch('/:id/pax/:paxId', validateTokenMiddleware, updatePackagePax);

/**
 * @swagger
 * /api/packages/{id}/pax/{paxId}:
 *   delete:
 *     tags:
 *       - Package Pax
 *     summary: Delete a pax tier
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Package ID
 *       - in: path
 *         name: paxId
 *         required: true
 *         schema:
 *           type: string
 *         description: Pax ID
 *     responses:
 *       200:
 *         description: Pax deleted successfully
 *       404:
 *         description: Package or pax not found
 */
router.delete('/:id/pax/:paxId', validateTokenMiddleware, deletePackagePax);

// ---- Inclusions ----

/**
 * @swagger
 * /api/packages/{id}/inclusions:
 *   post:
 *     tags:
 *       - Package Inclusions
 *     summary: Add an inclusion to a package
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
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PackageInclusion'
 *     responses:
 *       201:
 *         description: Inclusion added successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Package not found
 */
router.post('/:id/inclusions', validateTokenMiddleware, addPackageInclusion);

/**
 * @swagger
 * /api/packages/{id}/inclusions/{inclusionId}:
 *   patch:
 *     tags:
 *       - Package Inclusions
 *     summary: Update an inclusion
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Package ID
 *       - in: path
 *         name: inclusionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Inclusion ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PackageInclusion'
 *     responses:
 *       200:
 *         description: Inclusion updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Package or inclusion not found
 */
router.patch(
  '/:id/inclusions/:inclusionId',
  validateTokenMiddleware,
  updatePackageInclusion
);

/**
 * @swagger
 * /api/packages/{id}/inclusions/{inclusionId}:
 *   delete:
 *     tags:
 *       - Package Inclusions
 *     summary: Delete an inclusion
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Package ID
 *       - in: path
 *         name: inclusionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Inclusion ID
 *     responses:
 *       200:
 *         description: Inclusion deleted successfully
 *       404:
 *         description: Package or inclusion not found
 */
router.delete(
  '/:id/inclusions/:inclusionId',
  validateTokenMiddleware,
  deletePackageInclusion
);

router.post(
  '/:id/inclusions/copy',
  validateTokenMiddleware,
  copyPackageInclusions
);

router.put(
  '/:id/inclusions/reorder',
  validateTokenMiddleware,
  reorderPackageInclusions
);

export default router;
