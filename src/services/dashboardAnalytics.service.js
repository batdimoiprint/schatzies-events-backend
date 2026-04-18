import { BatchGetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import dynamoClient, { DASHBOARD_ANALYTICS_TABLE } from '../configs/dynamo.js';

const ZERO = { N: '0' };
const ONE = { N: '1' };
const MINUS_ONE = { N: '-1' };

const ANALYTICS_TYPES = {
  GLOBAL: 'GLOBAL',
  STATUS: 'STATUS',
  SEMI_ANNUAL: 'SEMI_ANNUAL',
  UPCOMING: 'UPCOMING',
  VENDORS: 'VENDORS',
};

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStatus(value) {
  return normalizeString(value).toUpperCase() || 'PLANNING';
}

function getMonthKey(dateString) {
  const date = normalizeString(dateString);
  return date.slice(0, 7);
}

function getYearKey(dateString) {
  const date = normalizeString(dateString);
  return date.slice(0, 4);
}

function buildKey(type, sk) {
  return {
    PK: { S: `ANALYTICS#${type}` },
    SK: { S: sk },
  };
}

function parseNumberAttribute(attr) {
  if (!attr || typeof attr.N !== 'string') {
    return 0;
  }
  return Number(attr.N);
}

function parseMapAttribute(mapAttr) {
  if (!mapAttr || typeof mapAttr.M !== 'object') {
    return {};
  }
  return Object.entries(mapAttr.M).reduce((acc, [key, value]) => {
    if (value && typeof value.N === 'string') {
      acc[key] = Number(value.N);
    }
    return acc;
  }, {});
}

async function updateAnalyticsRecord(pkType, sk, updateExpression, expressionAttributeNames, expressionAttributeValues) {
  const command = new UpdateItemCommand({
    TableName: DASHBOARD_ANALYTICS_TABLE,
    Key: buildKey(pkType, sk),
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  });

  await dynamoClient.send(command);
}

function buildStatusDeltas(oldStatus, newStatus, revenue = 0, profit = 0) {
  const statusList = ['PLANNING', 'EXECUTION', 'COMPLETED'];
  const deltas = {
    PLANNING: 0,
    EXECUTION: 0,
    COMPLETED: 0,
    revenueDelta: 0,
    profitDelta: 0,
  };

  const oldNormalized = normalizeStatus(oldStatus);
  const newNormalized = normalizeStatus(newStatus);

  if (oldNormalized && statusList.includes(oldNormalized)) {
    deltas[oldNormalized] -= 1;
    if (oldNormalized === 'COMPLETED') {
      deltas.revenueDelta -= revenue;
      deltas.profitDelta -= profit;
    }
  }

  if (newNormalized && statusList.includes(newNormalized)) {
    deltas[newNormalized] += 1;
    if (newNormalized === 'COMPLETED') {
      deltas.revenueDelta += revenue;
      deltas.profitDelta += profit;
    }
  }

  return deltas;
}

export async function updateKPIAnalytics(event) {
  const status = normalizeStatus(event.status);
  const monthKey = getMonthKey(event.startDate || event.eventDate || event.createdAt || event.created_at);
  const yearKey = getYearKey(event.startDate || event.eventDate || event.createdAt || event.created_at);
  if (!monthKey || monthKey.length !== 7 || !yearKey || yearKey.length !== 4) {
    return;
  }

  const revenue = Number(event.revenue || event.completedRevenue || 0);
  const profit = Number(event.profit || 0);
  const planning = status === 'PLANNING' ? 1 : 0;
  const execution = status === 'EXECUTION' ? 1 : 0;
  const completed = status === 'COMPLETED' ? 1 : 0;
  const completedRevenue = status === 'COMPLETED' ? revenue : 0;
  const completedProfit = status === 'COMPLETED' ? profit : 0;
  const now = new Date().toISOString();

  const updateExpression =
    'ADD #totalEvents :one, #planning :planning, #execution :execution, #completed :completed, #completedRevenue :completedRevenue, #completedProfit :completedProfit SET #updatedAt = :now';

  const expressionAttributeNames = {
    '#totalEvents': 'totalEvents',
    '#planning': 'planning',
    '#execution': 'execution',
    '#completed': 'completed',
    '#completedRevenue': 'completedRevenue',
    '#completedProfit': 'completedProfit',
    '#updatedAt': 'updatedAt',
  };

  const expressionAttributeValues = {
    ':one': ONE,
    ':planning': { N: String(planning) },
    ':execution': { N: String(execution) },
    ':completed': { N: String(completed) },
    ':completedRevenue': { N: String(completedRevenue) },
    ':completedProfit': { N: String(completedProfit) },
    ':now': { S: now },
  };

  await Promise.all([
    updateAnalyticsRecord(ANALYTICS_TYPES.GLOBAL, `MONTH#${monthKey}`, updateExpression, expressionAttributeNames, expressionAttributeValues),
    updateAnalyticsRecord(ANALYTICS_TYPES.GLOBAL, `YEAR#${yearKey}`, updateExpression, expressionAttributeNames, expressionAttributeValues),
  ]);
}

export async function updateStatusAnalytics(oldStatus, newStatus, event) {
  const monthKey = getMonthKey(event.startDate || event.eventDate || event.createdAt || event.created_at);
  const yearKey = getYearKey(event.startDate || event.eventDate || event.createdAt || event.created_at);
  if (!monthKey || monthKey.length !== 7 || !yearKey || yearKey.length !== 4) {
    return;
  }

  const revenue = Number(event.revenue || event.completedRevenue || 0);
  const profit = Number(event.profit || 0);
  const deltas = buildStatusDeltas(oldStatus, newStatus, revenue, profit);
  const now = new Date().toISOString();

  const updateExpression =
    'ADD #planning :planning, #execution :execution, #completed :completed, #completedRevenue :completedRevenue, #completedProfit :completedProfit SET #updatedAt = :now';

  const expressionAttributeNames = {
    '#planning': 'planning',
    '#execution': 'execution',
    '#completed': 'completed',
    '#completedRevenue': 'completedRevenue',
    '#completedProfit': 'completedProfit',
    '#updatedAt': 'updatedAt',
  };

  const expressionAttributeValues = {
    ':planning': { N: String(deltas.PLANNING) },
    ':execution': { N: String(deltas.EXECUTION) },
    ':completed': { N: String(deltas.COMPLETED) },
    ':completedRevenue': { N: String(deltas.revenueDelta) },
    ':completedProfit': { N: String(deltas.profitDelta) },
    ':now': { S: now },
  };

  await Promise.all([
    updateAnalyticsRecord(ANALYTICS_TYPES.STATUS, `MONTH#${monthKey}`, updateExpression, expressionAttributeNames, expressionAttributeValues),
    updateAnalyticsRecord(ANALYTICS_TYPES.STATUS, `YEAR#${yearKey}`, updateExpression, expressionAttributeNames, expressionAttributeValues),
  ]);
}

export async function updateSemiAnnualAnalytics(year, month, value) {
  const yearKey = normalizeString(year).slice(0, 4);
  const monthKey = normalizeString(month).padStart(2, '0');
  if (!yearKey || !/^\d{4}$/.test(yearKey) || !/^\d{2}$/.test(monthKey)) {
    throw new Error('Invalid year or month for semi-annual analytics');
  }

  const attributeName = `#month${monthKey}`;
  const expressionAttributeNames = {
    '#monthlyGraph': 'monthlyGraph',
    '#updatedAt': 'updatedAt',
    '#monthKey': monthKey,
  };

  const expressionAttributeValues = {
    ':emptyMap': { M: {} },
    ':zero': ZERO,
    ':value': { N: String(value) },
    ':now': { S: new Date().toISOString() },
  };

  const updateExpression =
    'SET #monthlyGraph = if_not_exists(#monthlyGraph, :emptyMap), #monthlyGraph.#monthKey = if_not_exists(#monthlyGraph.#monthKey, :zero) + :value, #updatedAt = :now';

  await updateAnalyticsRecord(ANALYTICS_TYPES.SEMI_ANNUAL, `YEAR#${yearKey}`, updateExpression, expressionAttributeNames, expressionAttributeValues);
}

export async function updateUpcomingEventsSnapshot(events = []) {
  if (!Array.isArray(events)) {
    throw new Error('Events must be an array');
  }

  const uniqueEvents = [];
  const seen = new Set();

  events
    .filter((event) => event && event.id)
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
    .forEach((event) => {
      if (!seen.has(event.id)) {
        seen.add(event.id);
        uniqueEvents.push({
          id: event.id,
          title: event.title || '',
          date: event.date || '',
          status: event.status || '',
          eventId: event.eventId || null,
        });
      }
    });

  const snapshot = uniqueEvents.slice(0, 10);
  const now = new Date().toISOString();

  const command = new UpdateItemCommand({
    TableName: DASHBOARD_ANALYTICS_TABLE,
    Key: buildKey(ANALYTICS_TYPES.UPCOMING, 'SNAPSHOT#CURRENT'),
    UpdateExpression: 'SET #upcomingEvents = :events, #updatedAt = :now',
    ExpressionAttributeNames: {
      '#upcomingEvents': 'upcomingEvents',
      '#updatedAt': 'updatedAt',
    },
    ExpressionAttributeValues: {
      ':events': {
        L: snapshot.map((entry) => ({
          M: {
            id: { S: entry.id },
            title: { S: normalizeString(entry.title) },
            date: { S: normalizeString(entry.date) },
            status: { S: normalizeString(entry.status) },
            eventId: { S: normalizeString(entry.eventId || '') },
          },
        })),
      },
      ':now': { S: now },
    },
  });

  await dynamoClient.send(command);
}

export async function updateVendorSnapshot(vendorId, isActive) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }

  const now = new Date().toISOString();
  const key = buildKey(ANALYTICS_TYPES.VENDORS, 'SNAPSHOT#CURRENT');
  const vendorSet = { SS: [normalizeString(vendorId)] };

  if (isActive) {
    const command = new UpdateItemCommand({
      TableName: DASHBOARD_ANALYTICS_TABLE,
      Key: key,
      UpdateExpression: 'ADD #activeVendorCount :one, #activeVendorIds :vendorSet SET #updatedAt = :now',
      ConditionExpression: 'attribute_not_exists(#activeVendorIds) OR NOT contains(#activeVendorIds, :vendorId)',
      ExpressionAttributeNames: {
        '#activeVendorCount': 'activeVendorCount',
        '#activeVendorIds': 'activeVendorIds',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':one': ONE,
        ':vendorSet': vendorSet,
        ':vendorId': { S: normalizeString(vendorId) },
        ':now': { S: now },
      },
    });

    await dynamoClient.send(command);
    return;
  }

  const command = new UpdateItemCommand({
    TableName: DASHBOARD_ANALYTICS_TABLE,
    Key: key,
    UpdateExpression: 'ADD #activeVendorCount :minusOne DELETE #activeVendorIds :vendorSet SET #updatedAt = :now',
    ConditionExpression: 'contains(#activeVendorIds, :vendorId)',
    ExpressionAttributeNames: {
      '#activeVendorCount': 'activeVendorCount',
      '#activeVendorIds': 'activeVendorIds',
      '#updatedAt': 'updatedAt',
    },
    ExpressionAttributeValues: {
      ':minusOne': MINUS_ONE,
      ':vendorSet': vendorSet,
      ':vendorId': { S: normalizeString(vendorId) },
      ':now': { S: now },
    },
  });

  await dynamoClient.send(command);
}

function parseDashboardItem(item) {
  if (!item) {
    return null;
  }

  return {
    pk: item.PK?.S || '',
    sk: item.SK?.S || '',
    totalEvents: parseNumberAttribute(item.totalEvents),
    planning: parseNumberAttribute(item.planning),
    execution: parseNumberAttribute(item.execution),
    completed: parseNumberAttribute(item.completed),
    completedRevenue: parseNumberAttribute(item.completedRevenue),
    completedProfit: parseNumberAttribute(item.completedProfit),
    monthlyGraph: parseMapAttribute(item.monthlyGraph),
    upcomingEvents: Array.isArray(item.upcomingEvents?.L)
      ? item.upcomingEvents.L.map((entry) => ({
          id: entry.M?.id?.S || '',
          title: entry.M?.title?.S || '',
          date: entry.M?.date?.S || '',
          status: entry.M?.status?.S || '',
          eventId: entry.M?.eventId?.S || '',
        }))
      : [],
    activeVendorCount: parseNumberAttribute(item.activeVendorCount),
    updatedAt: item.updatedAt?.S || '',
  };
}

export async function getDashboardSummary() {
  const now = new Date();
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const yearKey = String(now.getUTCFullYear());

  const requestItems = {
    [DASHBOARD_ANALYTICS_TABLE]: {
      Keys: [
        buildKey(ANALYTICS_TYPES.GLOBAL, `MONTH#${monthKey}`),
        buildKey(ANALYTICS_TYPES.GLOBAL, `YEAR#${yearKey}`),
        buildKey(ANALYTICS_TYPES.STATUS, `MONTH#${monthKey}`),
        buildKey(ANALYTICS_TYPES.STATUS, `YEAR#${yearKey}`),
        buildKey(ANALYTICS_TYPES.SEMI_ANNUAL, `YEAR#${yearKey}`),
        buildKey(ANALYTICS_TYPES.UPCOMING, 'SNAPSHOT#CURRENT'),
        buildKey(ANALYTICS_TYPES.VENDORS, 'SNAPSHOT#CURRENT'),
      ],
    },
  };

  const command = new BatchGetItemCommand({
    RequestItems: requestItems,
  });

  const response = await dynamoClient.send(command);
  const returned = response.Responses?.[DASHBOARD_ANALYTICS_TABLE] || [];

  const items = returned.map(parseDashboardItem);

  const find = (pk, sk) => items.find((item) => item.pk === `ANALYTICS#${pk}` && item.sk === sk) || null;

  const monthlyKpi = find('GLOBAL', `MONTH#${monthKey}`) || {};
  const yearlyKpi = find('GLOBAL', `YEAR#${yearKey}`) || {};
  const monthlyStatus = find('STATUS', `MONTH#${monthKey}`) || {};
  const yearlyStatus = find('STATUS', `YEAR#${yearKey}`) || {};
  const semiAnnual = find('SEMI_ANNUAL', `YEAR#${yearKey}`) || {};
  const upcoming = find('UPCOMING', 'SNAPSHOT#CURRENT') || {};
  const vendors = find('VENDORS', 'SNAPSHOT#CURRENT') || {};

  return {
    kpi: {
      month: {
        totalEvents: monthlyKpi.totalEvents || 0,
        planning: monthlyKpi.planning || 0,
        execution: monthlyKpi.execution || 0,
        completed: monthlyKpi.completed || 0,
        completedRevenue: monthlyKpi.completedRevenue || 0,
        completedProfit: monthlyKpi.completedProfit || 0,
      },
      year: {
        totalEvents: yearlyKpi.totalEvents || 0,
        planning: yearlyKpi.planning || 0,
        execution: yearlyKpi.execution || 0,
        completed: yearlyKpi.completed || 0,
        completedRevenue: yearlyKpi.completedRevenue || 0,
        completedProfit: yearlyKpi.completedProfit || 0,
      },
    },
    status: {
      month: {
        planning: monthlyStatus.planning || 0,
        execution: monthlyStatus.execution || 0,
        completed: monthlyStatus.completed || 0,
        completedRevenue: monthlyStatus.completedRevenue || 0,
        completedProfit: monthlyStatus.completedProfit || 0,
      },
      year: {
        planning: yearlyStatus.planning || 0,
        execution: yearlyStatus.execution || 0,
        completed: yearlyStatus.completed || 0,
        completedRevenue: yearlyStatus.completedRevenue || 0,
        completedProfit: yearlyStatus.completedProfit || 0,
      },
    },
    semiAnnual: {
      year: yearKey,
      monthlyGraph: semiAnnual.monthlyGraph || {},
    },
    upcomingEvents: upcoming.upcomingEvents || [],
    activeVendors: vendors.activeVendorCount || 0,
  };
}
