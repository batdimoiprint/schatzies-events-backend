import { findUserByUserId } from '../services/users.service.js';
import { UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import dynamoClient, { DYNAMO_TABLE } from '../configs/dynamo.js';

/**
 * POST /api/push/subscribe
 * Subscribe a user to push notifications
 */
export async function subscribeToPushController(req, res) {
  try {
    const { user_id } = req.user;
    const subscription = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        error: 'Invalid subscription object. Must include endpoint.',
      });
    }

    // Validate subscription structure
    if (
      !subscription.keys ||
      !subscription.keys.p256dh ||
      !subscription.keys.auth
    ) {
      return res.status(400).json({
        error:
          'Invalid subscription object. Must include keys.p256dh and keys.auth.',
      });
    }

    // Verify user exists
    const user = await findUserByUserId(user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if this subscription already exists (by endpoint)
    const existingSubscriptions = user.pushSubscriptions || [];
    const subscriptionExists = existingSubscriptions.some(
      (sub) => sub.endpoint === subscription.endpoint
    );

    if (subscriptionExists) {
      console.log(`Subscription already exists for user ${user_id}`);
      return res.status(200).json({
        message: 'Subscription already registered',
        subscription,
      });
    }

    // Convert subscription to DynamoDB format
    const subscriptionItem = {
      M: {
        endpoint: { S: subscription.endpoint },
        expirationTime: subscription.expirationTime
          ? { N: String(subscription.expirationTime) }
          : { NULL: true },
        keys: {
          M: {
            p256dh: { S: subscription.keys.p256dh },
            auth: { S: subscription.keys.auth },
          },
        },
      },
    };

    // Use list_append to add subscription to the array
    // If pushSubscriptions doesn't exist, create it as empty list first
    const command = new UpdateItemCommand({
      TableName: DYNAMO_TABLE,
      Key: {
        PK: { S: `USER#${user_id}` },
        SK: { S: 'PROFILE' },
      },
      UpdateExpression:
        'SET pushSubscriptions = list_append(if_not_exists(pushSubscriptions, :empty_list), :new_subscription)',
      ExpressionAttributeValues: {
        ':empty_list': { L: [] },
        ':new_subscription': { L: [subscriptionItem] },
      },
      ReturnValues: 'NONE',
    });

    await dynamoClient.send(command);

    console.log(`Push subscription added for user ${user_id}`);

    return res.status(201).json({
      message: 'Push subscription registered successfully',
      subscription,
    });
  } catch (error) {
    console.error('Error in subscribeToPushController:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /api/push/unsubscribe
 * Unsubscribe a user from push notifications
 */
export async function unsubscribeFromPushController(req, res) {
  try {
    const { user_id } = req.user;
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        error: 'Endpoint is required to unsubscribe',
      });
    }

    // Get current subscriptions for this user
    const user = await findUserByUserId(user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existingSubscriptions = user.pushSubscriptions || [];
    const subscriptionExists = existingSubscriptions.some(
      (sub) => sub.endpoint === endpoint
    );

    if (!subscriptionExists) {
      // Already removed — treat as success (idempotent)
      return res.status(200).json({ message: 'Subscription removed successfully' });
    }

    // Filter out the target endpoint and overwrite the entire list.
    // This avoids the race condition of index-based REMOVE where two
    // concurrent unsubscribes can delete the wrong entry.
    const remaining = existingSubscriptions.filter(
      (sub) => sub.endpoint !== endpoint
    );

    const dynamoRemaining = remaining.map((sub) => ({
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

    const command = new UpdateItemCommand({
      TableName: DYNAMO_TABLE,
      Key: {
        PK: { S: `USER#${user_id}` },
        SK: { S: 'PROFILE' },
      },
      UpdateExpression: 'SET pushSubscriptions = :remaining',
      ExpressionAttributeValues: {
        ':remaining': { L: dynamoRemaining },
      },
      ReturnValues: 'NONE',
    });

    await dynamoClient.send(command);

    console.log(`Push subscription removed for user ${user_id}. ${remaining.length} subscription(s) remaining.`);

    return res.status(200).json({
      message: 'Push subscription removed successfully',
    });
  } catch (error) {
    console.error('Error in unsubscribeFromPushController:', error);
    return res.status(500).json({ error: error.message });
  }
}
