import {
  ScanCommand,
  BatchWriteItemCommand,
  DeleteItemCommand,
} from '@aws-sdk/client-dynamodb';
import {
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import dynamoClient, { DYNAMO_TABLE } from '../configs/dynamo.js';
import s3Client from '../configs/s3.js';
import env from '../configs/env.js';

const BACKUP_BUCKET = env.AWS_BACKUP_BUCKET;
const BACKUP_PREFIX = 'backups/';

/**
 * Scan the entire DynamoDB table and return all items (raw DynamoDB format)
 */
async function scanEntireTable() {
  const items = [];
  let lastKey = undefined;

  do {
    const result = await dynamoClient.send(
      new ScanCommand({
        TableName: DYNAMO_TABLE,
        ExclusiveStartKey: lastKey,
      })
    );
    items.push(...(result.Items || []));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return items;
}

/**
 * Create a backup of the DynamoDB table and save it to S3
 * @param {string} triggeredBy - 'manual' | 'scheduled'
 * @returns {Promise<Object>} - Backup metadata
 */
export async function createBackup(triggeredBy = 'manual') {
  const items = await scanEntireTable();

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const key = `${BACKUP_PREFIX}${timestamp}/full-backup.json`;

  const backupPayload = {
    timestamp: now.toISOString(),
    triggeredBy,
    itemCount: items.length,
    tableName: DYNAMO_TABLE,
    items,
  };

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BACKUP_BUCKET,
      Key: key,
      Body: JSON.stringify(backupPayload),
      ContentType: 'application/json',
    })
  );

  return {
    key,
    timestamp: now.toISOString(),
    triggeredBy,
    itemCount: items.length,
    sizeBytes: Buffer.byteLength(JSON.stringify(backupPayload)),
  };
}

/**
 * List all available backups from S3
 * @returns {Promise<Array>} - Array of backup metadata
 */
export async function listBackups() {
  const backups = [];
  let continuationToken = undefined;

  do {
    const result = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: BACKUP_BUCKET,
        Prefix: BACKUP_PREFIX,
        ContinuationToken: continuationToken,
      })
    );

    for (const obj of result.Contents || []) {
      // Only include actual backup files, not folder markers
      if (obj.Key.endsWith('/full-backup.json')) {
        // Extract timestamp from key: backups/2026-05-10T00-00-00-000Z/full-backup.json
        const parts = obj.Key.split('/');
        const timestampPart = parts[1]; // e.g. 2026-05-10T00-00-00-000Z
        // Convert back to ISO format
        const isoTimestamp = timestampPart
          .replace(/(\d{4}-\d{2}-\d{2}T\d{2})-(\d{2})-(\d{2})-(\d{3})Z/, '$1:$2:$3.$4Z');

        backups.push({
          key: obj.Key,
          timestamp: isoTimestamp,
          sizeBytes: obj.Size,
          lastModified: obj.LastModified?.toISOString(),
        });
      }
    }

    continuationToken = result.IsTruncated
      ? result.NextContinuationToken
      : undefined;
  } while (continuationToken);

  // Sort by timestamp descending (most recent first)
  backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return backups;
}

/**
 * Get backup details (metadata from inside the backup JSON)
 * @param {string} backupKey - S3 object key
 * @returns {Promise<Object>} - Backup metadata
 */
export async function getBackupDetails(backupKey) {
  const result = await s3Client.send(
    new GetObjectCommand({
      Bucket: BACKUP_BUCKET,
      Key: backupKey,
    })
  );

  const body = await result.Body.transformToString();
  const backup = JSON.parse(body);

  return {
    key: backupKey,
    timestamp: backup.timestamp,
    triggeredBy: backup.triggeredBy || 'unknown',
    itemCount: backup.itemCount,
    tableName: backup.tableName,
    sizeBytes: Buffer.byteLength(body),
  };
}

/**
 * Restore a backup from S3 into DynamoDB (replaces all data)
 * @param {string} backupKey - S3 object key of the backup to restore
 * @returns {Promise<Object>} - Restore result
 */
export async function restoreBackup(backupKey) {
  // 1. Fetch backup data from S3
  const result = await s3Client.send(
    new GetObjectCommand({
      Bucket: BACKUP_BUCKET,
      Key: backupKey,
    })
  );

  const body = await result.Body.transformToString();
  const backup = JSON.parse(body);

  if (!backup.items || !Array.isArray(backup.items)) {
    throw new Error('Invalid backup format: missing items array');
  }

  // 2. Scan existing table to get all keys for deletion
  const existingItems = await scanEntireTable();

  // 3. Delete all existing items in batches of 25
  if (existingItems.length > 0) {
    const deleteChunks = chunkArray(existingItems, 25);
    for (const chunk of deleteChunks) {
      const deleteRequests = chunk.map((item) => ({
        DeleteRequest: {
          Key: {
            PK: item.PK,
            SK: item.SK,
          },
        },
      }));

      await dynamoClient.send(
        new BatchWriteItemCommand({
          RequestItems: {
            [DYNAMO_TABLE]: deleteRequests,
          },
        })
      );
    }
  }

  // 4. Write backup items in batches of 25
  const writeChunks = chunkArray(backup.items, 25);
  let restoredCount = 0;

  for (const chunk of writeChunks) {
    const putRequests = chunk.map((item) => ({
      PutRequest: {
        Item: item,
      },
    }));

    await dynamoClient.send(
      new BatchWriteItemCommand({
        RequestItems: {
          [DYNAMO_TABLE]: putRequests,
        },
      })
    );
    restoredCount += chunk.length;
  }

  return {
    restoredFrom: backupKey,
    backupTimestamp: backup.timestamp,
    itemsDeleted: existingItems.length,
    itemsRestored: restoredCount,
    restoredAt: new Date().toISOString(),
  };
}

/**
 * Delete a backup from S3
 * @param {string} backupKey - S3 object key
 */
export async function deleteBackup(backupKey) {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BACKUP_BUCKET,
      Key: backupKey,
    })
  );

  return { message: 'Backup deleted successfully', key: backupKey };
}

/**
 * Split an array into chunks of a given size
 */
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
