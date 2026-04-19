import express from 'express';
import {
  createCostBreakdown,
  getCostBreakdown,
  updateCostBreakdown,
  exportCostBreakdown,
} from '../controllers/costBreakdown.controller.js';

const router = express.Router({ mergeParams: true });

router.post('/', createCostBreakdown);
router.get('/', getCostBreakdown);
router.put('/', updateCostBreakdown);
router.get('/export', exportCostBreakdown);

export default router;
