import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import s3Client from '../configs/s3.js';
import env from '../configs/env.js';

const BUCKET_NAME = env.S3_BUCKET_NAME;

/**
 * Upload a file to S3
 * @param {Buffer|ReadableStream|String} fileContent - The content of the file
 * @param {String} fileName - The name/path of the file in the bucket
 * @param {String} contentType - The MIME type of the file
 * @returns {Promise<Object>} - The upload result
 */
export const uploadFile = async (fileContent, fileName, contentType) => {
  try {
    const parallelUploads3 = new Upload({
      client: s3Client,
      params: {
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: fileContent,
        ContentType: contentType,
      },
      queueSize: 4, // optional concurrency configuration
      partSize: 1024 * 1024 * 5, // optional size of each part, in bytes (5MB)
      leavePartsOnError: false, // optional manually handle dropped parts
    });

    parallelUploads3.on('httpUploadProgress', (progress) => {
      console.log(`Upload progress for ${fileName}:`, progress);
    });

    const result = await parallelUploads3.done();
    return {
      success: true,
      key: fileName,
      location: result.Location,
    };
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw error;
  }
};

/**
 * Generate a presigned URL for a file (useful for private buckets or temporary access)
 * @param {String} fileName - The name/path of the file in the bucket
 * @param {Number} expiresIn - Expiration time in seconds (default 1 hour)
 * @returns {Promise<String>} - The presigned URL
 */
export const getPresignedUrl = async (fileName, expiresIn = 3600) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('S3 Presigned URL Error:', error);
    throw error;
  }
};

/**
 * Delete a file from S3
 * @param {String} fileName - The name/path of the file in the bucket
 * @returns {Promise<Object>} - The deletion result
 */
export const deleteFile = async (fileName) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
    });

    await s3Client.send(command);
    return { success: true };
  } catch (error) {
    console.error('S3 Deletion Error:', error);
    throw error;
  }
};

/**
 * Helper to generate a unique file name for uploads
 * @param {String} originalName - Original name of the file
 * @param {String} prefix - Optional prefix/folder
 * @returns {String} - Unique file name
 */
export const generateUniqueFileName = (originalName, prefix = '') => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const cleanName = originalName.replace(/[^a-zA-Z0-9.]/g, '_');
  return prefix ? `${prefix}/${timestamp}-${randomString}-${cleanName}` : `${timestamp}-${randomString}-${cleanName}`;
};
