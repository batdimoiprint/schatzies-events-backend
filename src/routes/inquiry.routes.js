import express from 'express';
import {
  createInquiryController,
  getInquiriesController,
  getInquiryByIdController,
  updateInquiryController,
  deleteInquiryController
} from '../controllers/inquiry.controller.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Inquiries
 *   description: API for handling event inquiries
 */

/**
 * @swagger
 * /api/inquiries:
 *   post:
 *     summary: Create a new inquiry
 *     tags: [Inquiries]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - date
 *               - eventType
 *               - eventPackage
 *               - eventPax
 *             properties:
 *               firstName:
 *                 type: string
 *               middleName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               eventType:
 *                 type: string
 *                 enum: [Wedding, Debut]
 *               eventPackage:
 *                 type: string
 *               eventPax:
 *                 type: integer
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Inquiry created successfully
 *       400:
 *         description: Invalid input
 */
router.post('/', createInquiryController);

/**
 * @swagger
 * /api/inquiries:
 *   get:
 *     summary: Get all inquiries
 *     tags: [Inquiries]
 *     responses:
 *       200:
 *         description: List of inquiries
 */
router.get('/', getInquiriesController);

/**
 * @swagger
 * /api/inquiries/{id}:
 *   get:
 *     summary: Get an inquiry by ID
 *     tags: [Inquiries]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inquiry found
 *       404:
 *         description: Inquiry not found
 */
router.get('/:id', getInquiryByIdController);

/**
 * @swagger
 * /api/inquiries/{id}:
 *   put:
 *     summary: Update an inquiry
 *     tags: [Inquiries]
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
 *               firstName:
 *                 type: string
 *               middleName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               eventType:
 *                 type: string
 *                 enum: [Wedding, Debut]
 *               eventPackage:
 *                 type: string
 *               eventPax:
 *                 type: integer
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Inquiry updated
 *       404:
 *         description: Inquiry not found
 */
router.put('/:id', updateInquiryController);

/**
 * @swagger
 * /api/inquiries/{id}:
 *   delete:
 *     summary: Delete an inquiry
 *     tags: [Inquiries]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inquiry deleted
 *       404:
 *         description: Inquiry not found
 */
router.delete('/:id', deleteInquiryController);

export default router;