import {
  createBackup,
  listBackups,
  getBackupDetails,
  restoreBackup,
  deleteBackup,
} from '../services/backup.service.js';

/**
 * POST /api/backups - Create a manual backup
 */
export async function createBackupHandler(req, res) {
  try {
    const result = await createBackup('manual');
    return res.status(201).json({
      message: 'Backup created successfully',
      backup: result,
    });
  } catch (error) {
    console.error('Create backup error:', error);
    return res.status(500).json({ error: 'Failed to create backup', details: error.message });
  }
}

/**
 * GET /api/backups - List all backups
 */
export async function listBackupsHandler(req, res) {
  try {
    const backups = await listBackups();
    return res.json({ backups });
  } catch (error) {
    console.error('List backups error:', error);
    return res.status(500).json({ error: 'Failed to list backups', details: error.message });
  }
}

/**
 * GET /api/backups/:key - Get backup details
 */
export async function getBackupDetailsHandler(req, res) {
  try {
    const backupKey = decodeURIComponent(req.params.key);
    const details = await getBackupDetails(backupKey);
    return res.json({ backup: details });
  } catch (error) {
    console.error('Get backup details error:', error);
    return res.status(500).json({ error: 'Failed to get backup details', details: error.message });
  }
}

/**
 * POST /api/backups/restore - Restore a backup
 */
export async function restoreBackupHandler(req, res) {
  try {
    const { backupKey } = req.body;
    if (!backupKey) {
      return res.status(400).json({ error: 'backupKey is required' });
    }

    const result = await restoreBackup(backupKey);
    return res.json({
      message: 'Backup restored successfully',
      result,
    });
  } catch (error) {
    console.error('Restore backup error:', error);
    return res.status(500).json({ error: 'Failed to restore backup', details: error.message });
  }
}

/**
 * DELETE /api/backups/:key - Delete a backup
 */
export async function deleteBackupHandler(req, res) {
  try {
    const backupKey = decodeURIComponent(req.params.key);
    const result = await deleteBackup(backupKey);
    return res.json(result);
  } catch (error) {
    console.error('Delete backup error:', error);
    return res.status(500).json({ error: 'Failed to delete backup', details: error.message });
  }
}
