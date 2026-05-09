import express from 'express';
import {
  createBackupHandler,
  listBackupsHandler,
  getBackupDetailsHandler,
  restoreBackupHandler,
  deleteBackupHandler,
} from '../controllers/backup.controller.js';

const router = express.Router();

/**
 * @route   GET /api/backups
 * @desc    List all available backups from S3
 * @access  Admin only
 */
router.get('/', listBackupsHandler);

/**
 * @route   POST /api/backups
 * @desc    Create a manual backup of DynamoDB to S3
 * @access  Admin only
 */
router.post('/', createBackupHandler);

/**
 * @route   POST /api/backups/restore
 * @desc    Restore DynamoDB from an S3 backup
 * @access  Admin only
 */
router.post('/restore', restoreBackupHandler);

/**
 * @route   GET /api/backups/details/:key
 * @desc    Get details of a specific backup
 * @access  Admin only
 */
router.get('/details/:key', getBackupDetailsHandler);

/**
 * @route   DELETE /api/backups/:key
 * @desc    Delete a specific backup from S3
 * @access  Admin only
 */
router.delete('/:key', deleteBackupHandler);

export default router;
