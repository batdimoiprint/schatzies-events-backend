import express from 'express';
import { fetchDashboardSummary } from '../controllers/dashboard.controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/dashboard/summary:
 *   get:
 *     tags:
 *       - Dashboard
 *     summary: Retrieve dashboard analytics summary
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard analytics summary returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   $ref: '#/components/schemas/DashboardSummary'
 *       500:
 *         description: Server error
 */
router.get('/summary', fetchDashboardSummary);

export default router;
