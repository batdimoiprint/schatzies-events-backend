import { randomUUID } from 'crypto';
import {
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import dynamoClient, { DYNAMO_TABLE } from '../configs/dynamo.js';
import { getEventById as getEventByIdService } from './event.service.js';

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseNumberField(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${fieldName} is required`);
  }

  const numberValue = typeof value === 'string' ? Number(value.trim()) : Number(value);
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
    totalVendorCost: { N: String(item.totalVendorCost) },
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
    packagePricePerPax: item.packagePricePerPax?.N ? Number(item.packagePricePerPax.N) : 0,
    eventPax: item.eventPax?.N ? Number(item.eventPax.N) : 0,
    totalPackageCost: item.totalPackageCost?.N ? Number(item.totalPackageCost.N) : 0,
    totalVendorCost: item.totalVendorCost?.N ? Number(item.totalVendorCost.N) : 0,
    manpowerCost: item.manpowerCost?.N ? Number(item.manpowerCost.N) : 0,
    additionalCharges: item.additionalCharges?.N ? Number(item.additionalCharges.N) : 0,
    revenue: item.revenue?.N ? Number(item.revenue.N) : 0,
    profit: item.profit?.N ? Number(item.profit.N) : 0,
    created_at: item.created_at?.S || '',
    updated_at: item.updated_at?.S || '',
  };
}

async function getVendorCostTotal(eventId) {
  const command = new QueryCommand({
    TableName: DYNAMO_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :vendorPrefix)',
    ExpressionAttributeValues: {
      ':pk': { S: `EVENT#${eventId}` },
      ':vendorPrefix': { S: 'VENDOR#' },
    },
    ProjectionExpression: 'agreedCost',
  });

  const response = await dynamoClient.send(command);
  return (response.Items || []).reduce((sum, item) => {
    const agreedCost = item.agreedCost?.N ? Number(item.agreedCost.N) : 0;
    return sum + (Number.isFinite(agreedCost) ? agreedCost : 0);
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

function buildComputedCostBreakdown(eventId, input, totalVendorCost, existingId) {
  const packagePricePerPax = parseNumberField(input.packagePricePerPax, 'packagePricePerPax');
  const eventPax = parseNumberField(input.eventPax, 'eventPax');
  const manpowerCost = parseNumberField(input.manpowerCost, 'manpowerCost');
  const additionalCharges = parseNumberField(input.additionalCharges, 'additionalCharges');

  const totalPackageCost = packagePricePerPax * eventPax;
  const revenue = totalPackageCost + additionalCharges;
  const profit = revenue - (totalVendorCost + manpowerCost);
  const timestamp = new Date().toISOString();

  return {
    costBreakdown_id: existingId || randomUUID(),
    event_id: eventId,
    packagePricePerPax,
    eventPax,
    totalPackageCost,
    totalVendorCost,
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
  const item = buildComputedCostBreakdown(eventId, payload, totalVendorCost, existing?.costBreakdown_id);
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
  const breakdown = buildComputedCostBreakdown(eventId, payload, totalVendorCost, existing.costBreakdown_id);

  const command = new UpdateItemCommand({
    TableName: DYNAMO_TABLE,
    Key: buildCostBreakdownKey(eventId),
    UpdateExpression:
      'SET packagePricePerPax = :packagePricePerPax, eventPax = :eventPax, totalPackageCost = :totalPackageCost, totalVendorCost = :totalVendorCost, manpowerCost = :manpowerCost, additionalCharges = :additionalCharges, revenue = :revenue, profit = :profit, updated_at = :updatedAt',
    ExpressionAttributeValues: {
      ':packagePricePerPax': { N: String(breakdown.packagePricePerPax) },
      ':eventPax': { N: String(breakdown.eventPax) },
      ':totalPackageCost': { N: String(breakdown.totalPackageCost) },
      ':totalVendorCost': { N: String(breakdown.totalVendorCost) },
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
    totalVendorCost: breakdown.totalVendorCost,
    manpowerCost: breakdown.manpowerCost,
    additionalCharges: breakdown.additionalCharges,
    revenue: breakdown.revenue,
    profit: breakdown.profit,
    generatedAt: new Date().toISOString(),
  };
}
