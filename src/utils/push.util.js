import webPush from 'web-push';
import { findUserByUserId } from '../services/users.service.js';
import { UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import dynamoClient, { DYNAMO_TABLE } from '../configs/dynamo.js';

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject =
  process.env.VAPID_SUBJECT || 'mailto:schatzieseventsadmin@gmail.com';

if (!vapidPublicKey || !vapidPrivateKey) {
  console.warn(
    '⚠️  VAPID keys not configured. Push notifications will not work.'
  );
} else {
  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

/**
 * Send push notification to a specific user
 * @param {string} userId - The user ID to send notification to
 * @param {object} payload - Notification payload with title, body, etc.
 * @returns {Promise<object>} Result of push notification sends
 */
export async function sendPushToUser(userId, payload) {
  try {
    if (!userId) {
      throw new Error('userId is required');
    }

    if (!payload || !payload.title) {
      throw new Error('Notification payload with title is required');
    }

    // Fetch user from DynamoDB
    const user = await findUserByUserId(userId);
    if (!user) {
      console.warn(`User ${userId} not found, cannot send push notification`);
      return { success: false, error: 'User not found' };
    }

    // Get push subscriptions from user record
    const subscriptions = user.pushSubscriptions || [];
    if (subscriptions.length === 0) {
      console.log(`User ${userId} has no push subscriptions`);
      return { success: true, sent: 0, message: 'No subscriptions found' };
    }

    console.log(
      `📤 Sending push notification to user ${userId} (${subscriptions.length} subscription(s))`
    );

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body || '',
      icon: payload.icon || '/Pictures/business-logo.png',
      badge: payload.badge || '/Pictures/business-logo.png',
      data: payload.data || {},
    });

    const results = [];
    const validSubscriptions = [];
    const expiredSubscriptions = [];

    // Send to each subscription
    for (const subscription of subscriptions) {
      try {
        await webPush.sendNotification(subscription, notificationPayload);
        results.push({ success: true, endpoint: subscription.endpoint });
        validSubscriptions.push(subscription);
      } catch (error) {
        // Check if subscription is expired (410 Gone)
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`Subscription expired for user ${userId}, removing...`);
          expiredSubscriptions.push(subscription);
          results.push({
            success: false,
            endpoint: subscription.endpoint,
            error: 'Subscription expired',
          });
        } else {
          console.error('Push notification error:', error);
          // Keep subscription for other errors (might be temporary)
          validSubscriptions.push(subscription);
          results.push({
            success: false,
            endpoint: subscription.endpoint,
            error: error.message,
          });
        }
      }
    }

    // Remove expired subscriptions from user record
    if (expiredSubscriptions.length > 0) {
      try {
        // Convert valid subscriptions to DynamoDB format
        const dynamoSubscriptions = validSubscriptions.map((sub) => ({
          M: {
            endpoint: { S: sub.endpoint },
            expirationTime:
              sub.expirationTime !== null && sub.expirationTime !== undefined
                ? { N: String(sub.expirationTime) }
                : { NULL: true },
            keys: {
              M: {
                p256dh: { S: sub.keys.p256dh },
                auth: { S: sub.keys.auth },
              },
            },
          },
        }));

        // Update user with only valid subscriptions
        const command = new UpdateItemCommand({
          TableName: DYNAMO_TABLE,
          Key: {
            PK: { S: `USER#${userId}` },
            SK: { S: 'PROFILE' },
          },
          UpdateExpression: 'SET pushSubscriptions = :subscriptions',
          ExpressionAttributeValues: {
            ':subscriptions': { L: dynamoSubscriptions },
          },
          ReturnValues: 'NONE',
        });

        await dynamoClient.send(command);
        console.log(
          `✅ Removed ${expiredSubscriptions.length} expired subscription(s) for user ${userId}. ${validSubscriptions.length} subscriptions remaining.`
        );
      } catch (dbError) {
        console.error(
          `❌ Failed to remove expired subscriptions from DynamoDB:`,
          dbError
        );
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(
      `Push notification sent to ${successCount}/${subscriptions.length} subscription(s) for user ${userId}`
    );

    return {
      success: true,
      sent: successCount,
      total: subscriptions.length,
      results,
    };
  } catch (error) {
    console.error('Error in sendPushToUser:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get admin user ID (first ADMIN user found)
 * @returns {Promise<string|null>} Admin user ID or null
 */
export async function getAdminUserId() {
  try {
    // Import here to avoid circular dependencies
    const { getAllUsers } = await import('../services/users.service.js');
    const users = await getAllUsers();
    const admin = users.find((u) => u.role === 'ADMIN');
    return admin?.user_id || null;
  } catch (error) {
    console.error('Error getting admin user ID:', error);
    return null;
  }
}
