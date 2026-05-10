import { randomUUID } from 'crypto';
import { nowPH } from '../utils/timezone.js';
import {
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  ScanCommand,
  UpdateItemCommand,
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
    packagePricePerPax: { N: String(item.packagePricePerPax) },
    eventPax: { N: String(item.eventPax) },
    totalPackageCost: { N: String(item.totalPackageCost) },
    organizerShare: { N: String(item.organizerShare) },
    vendorBudget: { N: String(item.vendorBudget) },
    totalVendorCost: { N: String(item.totalVendorCost) },
    vendorBalance: { N: String(item.vendorBalance) },
    organizerTotal: { N: String(item.organizerTotal) },
    manpowerCost: { N: String(item.manpowerCost) },
    additionalCharges: { N: String(item.additionalCharges) },
    revenue: { N: String(item.revenue) },
    profit: { N: String(item.profit) },
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
    packagePricePerPax: item.packagePricePerPax?.N
      ? Number(item.packagePricePerPax.N)
      : 0,
    eventPax: item.eventPax?.N ? Number(item.eventPax.N) : 0,
    totalPackageCost: item.totalPackageCost?.N
      ? Number(item.totalPackageCost.N)
      : 0,
    organizerShare: item.organizerShare?.N
      ? Number(item.organizerShare.N)
      : 0,
    vendorBudget: item.vendorBudget?.N ? Number(item.vendorBudget.N) : 0,
    totalVendorCost: item.totalVendorCost?.N
      ? Number(item.totalVendorCost.N)
      : 0,
    vendorBalance: item.vendorBalance?.N ? Number(item.vendorBalance.N) : 0,
    organizerTotal: item.organizerTotal?.N ? Number(item.organizerTotal.N) : 0,
    manpowerCost: item.manpowerCost?.N ? Number(item.manpowerCost.N) : 0,
    additionalCharges: item.additionalCharges?.N
      ? Number(item.additionalCharges.N)
      : 0,
    revenue: item.revenue?.N ? Number(item.revenue.N) : 0,
    profit: item.profit?.N ? Number(item.profit.N) : 0,
    created_at: item.created_at?.S || '',
    updated_at: item.updated_at?.S || '',
  };
}

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

function buildComputedCostBreakdown(
  eventId,
  input,
  totalVendorCost,
  existingId
) {
  const packagePricePerPax = parseNumberField(
    input.packagePricePerPax,
    'packagePricePerPax'
  );
  const eventPax = parseNumberField(input.eventPax, 'eventPax');
  const manpowerCost = parseNumberField(input.manpowerCost, 'manpowerCost');
  const additionalCharges = parseNumberField(
    input.additionalCharges,
    'additionalCharges'
  );

  const totalPackageCost = packagePricePerPax * eventPax;
  const organizerShare = totalPackageCost * 0.2;
  const vendorBudget = totalPackageCost - organizerShare;
  const vendorBalance = vendorBudget - totalVendorCost;
  const organizerTotal = organizerShare + vendorBalance;
  const revenue = totalPackageCost + additionalCharges;
  const profit = organizerTotal + additionalCharges - manpowerCost;
  const timestamp = nowPH();

  return {
    costBreakdown_id: existingId || randomUUID(),
    event_id: eventId,
    packagePricePerPax,
    eventPax,
    totalPackageCost,
    organizerShare,
    vendorBudget,
    totalVendorCost,
    vendorBalance,
    organizerTotal,
    manpowerCost,
    additionalCharges,
    revenue,
    profit,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export async function getCostBreakdown(eventId) {
  if (!normalizeString(eventId)) {
    throw new Error('Event ID is required');
  }

  const item = await findCostBreakdownItem(eventId);
  return mapCostBreakdownItem(item);
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
      'SET packagePricePerPax = :packagePricePerPax, eventPax = :eventPax, totalPackageCost = :totalPackageCost, organizerShare = :organizerShare, vendorBudget = :vendorBudget, totalVendorCost = :totalVendorCost, vendorBalance = :vendorBalance, organizerTotal = :organizerTotal, manpowerCost = :manpowerCost, additionalCharges = :additionalCharges, revenue = :revenue, profit = :profit, updated_at = :updatedAt',
    ExpressionAttributeValues: {
      ':packagePricePerPax': { N: String(breakdown.packagePricePerPax) },
      ':eventPax': { N: String(breakdown.eventPax) },
      ':totalPackageCost': { N: String(breakdown.totalPackageCost) },
      ':organizerShare': { N: String(breakdown.organizerShare) },
      ':vendorBudget': { N: String(breakdown.vendorBudget) },
      ':totalVendorCost': { N: String(breakdown.totalVendorCost) },
      ':vendorBalance': { N: String(breakdown.vendorBalance) },
      ':organizerTotal': { N: String(breakdown.organizerTotal) },
      ':manpowerCost': { N: String(breakdown.manpowerCost) },
      ':additionalCharges': { N: String(breakdown.additionalCharges) },
      ':revenue': { N: String(breakdown.revenue) },
      ':profit': { N: String(breakdown.profit) },
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
    costBreakdown_id: breakdown.costBreakdown_id,
    event_id: breakdown.event_id,
    packagePricePerPax: breakdown.packagePricePerPax,
    eventPax: breakdown.eventPax,
    totalPackageCost: breakdown.totalPackageCost,
    organizerShare: breakdown.organizerShare,
    vendorBudget: breakdown.vendorBudget,
    totalVendorCost: breakdown.totalVendorCost,
    vendorBalance: breakdown.vendorBalance,
    organizerTotal: breakdown.organizerTotal,
    manpowerCost: breakdown.manpowerCost,
    additionalCharges: breakdown.additionalCharges,
    revenue: breakdown.revenue,
    profit: breakdown.profit,
    generatedAt: nowPH(),
  };
}
