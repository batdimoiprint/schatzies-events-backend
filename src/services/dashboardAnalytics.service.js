import {
  BatchGetItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import dynamoClient, {
  DASHBOARD_ANALYTICS_TABLE,
  DYNAMO_TABLE,
} from '../configs/dynamo.js';
import { normalizeString } from '../utils/dynamoHelpers.js';
import { findUserByUserId } from './users.service.js';

const ZERO = { N: '0' };
const ONE = { N: '1' };
const MINUS_ONE = { N: '-1' };
const MAX_ACTIVE_VENDOR_DISPLAY = 3;

const ANALYTICS_TYPES = {
  GLOBAL: 'GLOBAL',
  STATUS: 'STATUS',
  WEEKLY: 'WEEKLY',
  SEMI_ANNUAL: 'SEMI_ANNUAL',
  UPCOMING: 'UPCOMING',
  VENDORS: 'VENDORS',
};

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

function getWeekKey(dateString) {
  const normalizedDate = normalizeString(dateString);
  const date = new Date(normalizedDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const shiftedDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const dayOfWeek = (shiftedDate.getUTCDay() + 6) % 7;
  shiftedDate.setUTCDate(shiftedDate.getUTCDate() - dayOfWeek + 3);

  const firstThursday = new Date(Date.UTC(shiftedDate.getUTCFullYear(), 0, 4));
  const firstThursdayDayOfWeek = (firstThursday.getUTCDay() + 6) % 7;
  const weekNumber =
    1 +
    Math.round(
      ((shiftedDate - firstThursday) / 86400000 - 3 + firstThursdayDayOfWeek) /
        7
    );

  return `${shiftedDate.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
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

async function updateAnalyticsRecord(
  pkType,
  sk,
  updateExpression,
  expressionAttributeNames,
  expressionAttributeValues
) {
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
  const monthKey = getMonthKey(
    event.startDate || event.eventDate || event.createdAt || event.created_at
  );
  const yearKey = getYearKey(
    event.startDate || event.eventDate || event.createdAt || event.created_at
  );
  const weekKey = getWeekKey(
    event.startDate || event.eventDate || event.createdAt || event.created_at
  );
  if (
    !monthKey ||
    monthKey.length !== 7 ||
    !yearKey ||
    yearKey.length !== 4 ||
    !weekKey
  ) {
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
    updateAnalyticsRecord(
      ANALYTICS_TYPES.GLOBAL,
      `MONTH#${monthKey}`,
      updateExpression,
      expressionAttributeNames,
      expressionAttributeValues
    ),
    updateAnalyticsRecord(
      ANALYTICS_TYPES.GLOBAL,
      `YEAR#${yearKey}`,
      updateExpression,
      expressionAttributeNames,
      expressionAttributeValues
    ),
    updateAnalyticsRecord(
      ANALYTICS_TYPES.GLOBAL,
      `WEEK#${weekKey}`,
      updateExpression,
      expressionAttributeNames,
      expressionAttributeValues
    ),
  ]);
}

export async function updateStatusAnalytics(oldStatus, newStatus, event) {
  const monthKey = getMonthKey(
    event.startDate || event.eventDate || event.createdAt || event.created_at
  );
  const yearKey = getYearKey(
    event.startDate || event.eventDate || event.createdAt || event.created_at
  );
  const weekKey = getWeekKey(
    event.startDate || event.eventDate || event.createdAt || event.created_at
  );
  if (
    !monthKey ||
    monthKey.length !== 7 ||
    !yearKey ||
    yearKey.length !== 4 ||
    !weekKey
  ) {
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
    updateAnalyticsRecord(
      ANALYTICS_TYPES.STATUS,
      `MONTH#${monthKey}`,
      updateExpression,
      expressionAttributeNames,
      expressionAttributeValues
    ),
    updateAnalyticsRecord(
      ANALYTICS_TYPES.STATUS,
      `YEAR#${yearKey}`,
      updateExpression,
      expressionAttributeNames,
      expressionAttributeValues
    ),
    updateAnalyticsRecord(
      ANALYTICS_TYPES.STATUS,
      `WEEK#${weekKey}`,
      updateExpression,
      expressionAttributeNames,
      expressionAttributeValues
    ),
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

  await updateAnalyticsRecord(
    ANALYTICS_TYPES.SEMI_ANNUAL,
    `YEAR#${yearKey}`,
    updateExpression,
    expressionAttributeNames,
    expressionAttributeValues
  );
}

export async function updateUpcomingEventsSnapshot(events = []) {
  if (!Array.isArray(events)) {
    throw new Error('Events must be an array');
  }

  const uniqueEvents = [];
  const seen = new Set();

  for (const event of events
    .filter((entry) => entry && (entry.id || entry.eventId))
    .sort((a, b) =>
      String(a.date || a.eventDate || a.startDate || '').localeCompare(
        String(b.date || b.eventDate || b.startDate || '')
      )
    )) {
    const eventKey = event.id || event.eventId;
    if (!seen.has(eventKey)) {
      seen.add(eventKey);
      uniqueEvents.push({
        id: eventKey,
        title: event.title || event.name || '',
        eventTitle: event.title || event.name || '',
        date: event.date || event.eventDate || event.startDate || '',
        startTime: event.eventTime || event.time || event.startTime || '',
        status: event.status || '',
        eventId: event.eventId || event.id || null,
        eventType: event.eventType || '',
        clientId: event.clientId || event.client_id || '',
        clientName: event.clientName || '',
      });
    }
  }

  const snapshot = uniqueEvents.slice(0, 10);
  const now = new Date().toISOString();

  await Promise.all(
    snapshot.map(async (entry) => {
      if (!entry.clientName && entry.clientId) {
        const client = await findUserByUserId(entry.clientId);
        if (client) {
          entry.clientName =
            `${client.firstName || ''}${client.lastName ? ` ${client.lastName}` : ''}`.trim();
        }
      }
    })
  );

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
            eventTitle: { S: normalizeString(entry.eventTitle) },
            date: { S: normalizeString(entry.date) },
            startTime: { S: normalizeString(entry.startTime) },
            status: { S: normalizeString(entry.status) },
            eventId: { S: normalizeString(entry.eventId || '') },
            eventType: { S: normalizeString(entry.eventType || '') },
            clientId: { S: normalizeString(entry.clientId || '') },
            clientName: { S: normalizeString(entry.clientName || '') },
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
      UpdateExpression:
        'ADD #activeVendorCount :one, #activeVendorIds :vendorSet SET #updatedAt = :now',
      ConditionExpression:
        'attribute_not_exists(#activeVendorIds) OR NOT contains(#activeVendorIds, :vendorId)',
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
    UpdateExpression:
      'ADD #activeVendorCount :minusOne DELETE #activeVendorIds :vendorSet SET #updatedAt = :now',
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
          eventTitle: entry.M?.eventTitle?.S || '',
          date: entry.M?.date?.S || '',
          startTime: entry.M?.startTime?.S || '',
          status: entry.M?.status?.S || '',
          eventId: entry.M?.eventId?.S || '',
          eventType: entry.M?.eventType?.S || '',
          clientName: entry.M?.clientName?.S || '',
          clientId: entry.M?.clientId?.S || '',
        }))
      : [],
    activeVendorCount: parseNumberAttribute(item.activeVendorCount),
    activeVendorIds: Array.isArray(item.activeVendorIds?.SS)
      ? item.activeVendorIds.SS
      : [],
    updatedAt: item.updatedAt?.S || '',
  };
}

async function refreshUpcomingSnapshotIfMissing(upcoming) {
  if (
    Array.isArray(upcoming.upcomingEvents) &&
    upcoming.upcomingEvents.length > 0
  ) {
    return upcoming;
  }

  const { getEvents } = await import('./event.service.js');
  const events = await getEvents();
  await updateUpcomingEventsSnapshot(events);

  const refreshCommand = new BatchGetItemCommand({
    RequestItems: {
      [DASHBOARD_ANALYTICS_TABLE]: {
        Keys: [buildKey(ANALYTICS_TYPES.UPCOMING, 'SNAPSHOT#CURRENT')],
      },
    },
  });

  const refreshResponse = await dynamoClient.send(refreshCommand);
  const refreshedItem =
    refreshResponse.Responses?.[DASHBOARD_ANALYTICS_TABLE]?.[0] || null;
  return parseDashboardItem(refreshedItem) || {};
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
  const analyticsReturned =
    response.Responses?.[DASHBOARD_ANALYTICS_TABLE] || [];
  const analyticsItems = analyticsReturned
    .filter((item) => item.PK?.S?.startsWith('ANALYTICS#'))
    .map(parseDashboardItem);

  const find = (pk, sk) =>
    analyticsItems.find(
      (item) => item.pk === `ANALYTICS#${pk}` && item.sk === sk
    ) || null;

  const monthlyKpi = find('GLOBAL', `MONTH#${monthKey}`) || {};
  const yearlyKpi = find('GLOBAL', `YEAR#${yearKey}`) || {};
  const weeklyKpi =
    find('GLOBAL', `WEEK#${getWeekKey(now.toISOString())}`) || {};
  const monthlyStatus = find('STATUS', `MONTH#${monthKey}`) || {};
  const yearlyStatus = find('STATUS', `YEAR#${yearKey}`) || {};
  const weeklyStatus =
    find('STATUS', `WEEK#${getWeekKey(now.toISOString())}`) || {};
  const semiAnnual = find('SEMI_ANNUAL', `YEAR#${yearKey}`) || {};
  let upcoming = find('UPCOMING', 'SNAPSHOT#CURRENT') || {};
  const vendors = find('VENDORS', 'SNAPSHOT#CURRENT') || {};

  upcoming = await refreshUpcomingSnapshotIfMissing(upcoming);

  const activeVendorIds = Array.isArray(vendors.activeVendorIds)
    ? vendors.activeVendorIds
    : [];
  const topVendorIds = activeVendorIds.slice(0, MAX_ACTIVE_VENDOR_DISPLAY);

  let topActiveVendors = [];
  if (topVendorIds.length > 0) {
    const vendorRequestItems = {
      Keys: topVendorIds.map((vendorId) => ({
        PK: { S: `VENDOR#${normalizeString(vendorId)}` },
        SK: { S: 'PROFILE' },
      })),
    };

    if (DYNAMO_TABLE === DASHBOARD_ANALYTICS_TABLE) {
      requestItems[DASHBOARD_ANALYTICS_TABLE].Keys.push(
        ...vendorRequestItems.Keys
      );
    } else {
      requestItems[DYNAMO_TABLE] = vendorRequestItems;
    }

    const vendorCommand = new BatchGetItemCommand({
      RequestItems: requestItems,
    });
    const vendorResponse = await dynamoClient.send(vendorCommand);
    const vendorResponseItems =
      DYNAMO_TABLE === DASHBOARD_ANALYTICS_TABLE
        ? vendorResponse.Responses?.[DASHBOARD_ANALYTICS_TABLE] || []
        : vendorResponse.Responses?.[DYNAMO_TABLE] || [];

    topActiveVendors = vendorResponseItems
      .filter((item) => item.PK?.S?.startsWith('VENDOR#'))
      .map((item) => ({
        id: item.PK?.S?.replace('VENDOR#', '') || '',
        vendorName: item.vendorName?.S || item.name?.S || '',
      }))
      .sort((a, b) => a.vendorName.localeCompare(b.vendorName))
      .slice(0, MAX_ACTIVE_VENDOR_DISPLAY);
  }

  return {
    kpi: {
      week: {
        totalEvents: weeklyKpi.totalEvents || 0,
        planning: weeklyKpi.planning || 0,
        execution: weeklyKpi.execution || 0,
        completed: weeklyKpi.completed || 0,
        completedRevenue: weeklyKpi.completedRevenue || 0,
        completedProfit: weeklyKpi.completedProfit || 0,
      },
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
      semiAnnual: {
        year: yearKey,
        monthlyGraph: semiAnnual.monthlyGraph || {},
      },
    },
    status: {
      week: {
        planning: weeklyStatus.planning || 0,
        execution: weeklyStatus.execution || 0,
        completed: weeklyStatus.completed || 0,
        completedRevenue: weeklyStatus.completedRevenue || 0,
        completedProfit: weeklyStatus.completedProfit || 0,
      },
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
    activeVendors: {
      count: vendors.activeVendorCount || 0,
      topVendors: topActiveVendors,
    },
  };
}
