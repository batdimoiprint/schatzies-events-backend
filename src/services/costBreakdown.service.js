import { randomUUID } from 'crypto';
import { nowPH } from '../utils/timezone.js';
import {
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
import dynamoClient, { DYNAMO_TABLE } from '../configs/dynamo.js';
import { getEventById as getEventByIdService } from './event.service.js';
import { normalizeString } from '../utils/dynamoHelpers.js';

function parseNumberField(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${fieldName} is required`);
  }

  const numberValue =
    typeof value === 'string' ? Number(value.trim()) : Number(value);
  if (Number.isNaN(numberValue)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  return numberValue;
}

function buildCostBreakdownKey(eventId) {
  return {
    PK: { S: `EVENT#${eventId}` },
    SK: { S: `COST#${eventId}` },
  };
}

function buildCostBreakdownItem(item) {
  return {
    PK: { S: `EVENT#${item.event_id}` },
    SK: { S: `COST#${item.event_id}` },
    costBreakdown_id: { S: normalizeString(item.costBreakdown_id) },
    event_id: { S: normalizeString(item.event_id) },
    packagePrice: { N: String(item.packagePrice) },
    eventPax: { N: String(item.eventPax) },
    organizerShare: { N: String(item.organizerShare) },
    vendorBudget: { N: String(item.vendorBudget) },
    totalVendorCost: { N: String(item.totalVendorCost) },
    vendorBalance: { N: String(item.vendorBalance) },
    organizerTotal: { N: String(item.organizerTotal) },
    additionalCharges: { N: String(item.additionalCharges) },
    created_at: { S: item.created_at },
    updated_at: { S: item.updated_at },
  };
}

function mapCostBreakdownItem(item) {
  if (!item) {
    return null;
  }

  return {
    costBreakdown_id: item.costBreakdown_id?.S || '',
    event_id: item.event_id?.S || '',
    packagePrice: item.packagePrice?.N
      ? Number(item.packagePrice.N)
      : item.totalPackageCost?.N
        ? Number(item.totalPackageCost.N)
        : item.packagePricePerPax?.N && item.eventPax?.N
          ? Number(item.packagePricePerPax.N) * Number(item.eventPax.N)
          : 0,
    eventPax: item.eventPax?.N ? Number(item.eventPax.N) : 0,
    organizerShare: item.organizerShare?.N
      ? Number(item.organizerShare.N)
      : 0,
    vendorBudget: item.vendorBudget?.N ? Number(item.vendorBudget.N) : 0,
    totalVendorCost: item.totalVendorCost?.N
      ? Number(item.totalVendorCost.N)
      : 0,
    vendorBalance: item.vendorBalance?.N ? Number(item.vendorBalance.N) : 0,
    organizerTotal: item.organizerTotal?.N ? Number(item.organizerTotal.N) : 0,
    additionalCharges: item.additionalCharges?.N
      ? Number(item.additionalCharges.N)
      : 0,
    created_at: item.created_at?.S || '',
    updated_at: item.updated_at?.S || '',
  };
}

/**
 * Scans for all vendors assigned to this event and sums their prices.
 */
async function getVendorCostTotal(eventId) {
  const command = new ScanCommand({
    TableName: DYNAMO_TABLE,
    FilterExpression: '#sk = :profile AND #eventId = :eventId',
    ExpressionAttributeNames: {
      '#sk': 'SK',
      '#eventId': 'eventId',
    },
    ExpressionAttributeValues: {
      ':profile': { S: 'PROFILE' },
      ':eventId': { S: normalizeString(eventId) },
    },
    ProjectionExpression: 'price',
  });

  const response = await dynamoClient.send(command);
  return (response.Items || []).reduce((sum, item) => {
    const price = item.price?.N ? Number(item.price.N) : 0;
    return sum + (Number.isFinite(price) ? price : 0);
  }, 0);
}

async function findCostBreakdownItem(eventId) {
  const command = new GetItemCommand({
    TableName: DYNAMO_TABLE,
    Key: buildCostBreakdownKey(eventId),
  });

  const response = await dynamoClient.send(command);
  return response.Item || null;
}

/**
 * Core computation:
 *  - packagePrice = total package price (e.g. 200,000)
 *  - organizerShare = 20% of packagePrice
 *  - vendorBudget = 80% of packagePrice
 *  - totalVendorCost = sum of assigned vendor prices (from DB)
 *  - vendorBalance = vendorBudget - totalVendorCost
 *  - organizerTotal = organizerShare + max(0, vendorBalance)
 */
function buildComputedCostBreakdown(
  eventId,
  input,
  totalVendorCost,
  existingId
) {
  const packagePrice = parseNumberField(input.packagePrice, 'packagePrice');
  const eventPax = parseNumberField(input.eventPax, 'eventPax');
  const additionalCharges = input.additionalCharges != null
    ? parseNumberField(input.additionalCharges, 'additionalCharges')
    : 0;

  const organizerShare = packagePrice * 0.2;
  const vendorBudget = packagePrice * 0.8;
  const vendorBalance = vendorBudget - totalVendorCost;
  const organizerTotal = organizerShare + Math.max(0, vendorBalance);
  const timestamp = nowPH();

  return {
    costBreakdown_id: existingId || randomUUID(),
    event_id: eventId,
    packagePrice,
    eventPax,
    organizerShare,
    vendorBudget,
    totalVendorCost,
    vendorBalance,
    organizerTotal,
    additionalCharges,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export async function getCostBreakdown(eventId) {
  if (!normalizeString(eventId)) {
    throw new Error('Event ID is required');
  }

  // Always recalculate live from current vendor assignments
  const item = await findCostBreakdownItem(eventId);
  const stored = mapCostBreakdownItem(item);

  if (!stored) return null;

  // Re-fetch live vendor total so cost breakdown is always current
  const totalVendorCost = await getVendorCostTotal(eventId);
  const vendorBalance = stored.vendorBudget - totalVendorCost;
  const organizerTotal = stored.organizerShare + Math.max(0, vendorBalance);

  return {
    ...stored,
    totalVendorCost,
    vendorBalance,
    organizerTotal,
  };
}

export async function createCostBreakdown(eventId, payload) {
  if (!normalizeString(eventId)) {
    throw new Error('Event ID is required');
  }

  const event = await getEventByIdService(eventId);
  if (!event) {
    const error = new Error('Event not found');
    error.status = 404;
    throw error;
  }

  const existing = await getCostBreakdown(eventId);
  const totalVendorCost = await getVendorCostTotal(eventId);
  const item = buildComputedCostBreakdown(
    eventId,
    payload,
    totalVendorCost,
    existing?.costBreakdown_id
  );
  await dynamoClient.send(
    new PutItemCommand({
      TableName: DYNAMO_TABLE,
      Item: buildCostBreakdownItem(item),
    })
  );

  return item;
}

export async function updateCostBreakdown(eventId, payload) {
  if (!normalizeString(eventId)) {
    throw new Error('Event ID is required');
  }

  const existing = await getCostBreakdown(eventId);
  if (!existing) {
    const error = new Error('Cost breakdown not found');
    error.status = 404;
    throw error;
  }

  const totalVendorCost = await getVendorCostTotal(eventId);
  const breakdown = buildComputedCostBreakdown(
    eventId,
    payload,
    totalVendorCost,
    existing.costBreakdown_id
  );

  const command = new UpdateItemCommand({
    TableName: DYNAMO_TABLE,
    Key: buildCostBreakdownKey(eventId),
    UpdateExpression:
      'SET packagePrice = :packagePrice, eventPax = :eventPax, organizerShare = :organizerShare, vendorBudget = :vendorBudget, totalVendorCost = :totalVendorCost, vendorBalance = :vendorBalance, organizerTotal = :organizerTotal, additionalCharges = :additionalCharges, updated_at = :updatedAt',
    ExpressionAttributeValues: {
      ':packagePrice': { N: String(breakdown.packagePrice) },
      ':eventPax': { N: String(breakdown.eventPax) },
      ':organizerShare': { N: String(breakdown.organizerShare) },
      ':vendorBudget': { N: String(breakdown.vendorBudget) },
      ':totalVendorCost': { N: String(breakdown.totalVendorCost) },
      ':vendorBalance': { N: String(breakdown.vendorBalance) },
      ':organizerTotal': { N: String(breakdown.organizerTotal) },
      ':additionalCharges': { N: String(breakdown.additionalCharges) },
      ':updatedAt': { S: breakdown.updated_at },
    },
    ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK)',
    ReturnValues: 'ALL_NEW',
  });

  const response = await dynamoClient.send(command);
  return mapCostBreakdownItem(response.Attributes);
}

export async function exportCostBreakdown(eventId) {
  const breakdown = await getCostBreakdown(eventId);
  if (!breakdown) {
    return null;
  }

  return {
    ...breakdown,
    generatedAt: nowPH(),
  };
}
