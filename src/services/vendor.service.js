import { randomUUID } from 'crypto';
import { nowPH } from '../utils/timezone.js';
import {
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
  QueryCommand,
  DeleteItemCommand,
} from '@aws-sdk/client-dynamodb';
import dynamoClient, { DYNAMO_TABLE } from '../configs/dynamo.js';
import { getEventById } from './event.service.js';
import { updateVendorSnapshot } from './dashboardAnalytics.service.js';
import {
  normalizeString,
  buildStringAttribute,
} from '../utils/dynamoHelpers.js';

function mapDynamoVendor(item) {
  if (!item) {
    return null;
  }

  const vendorName = item.vendorName?.S || item.name?.S || '';
  const contactNumber = item.contactNumber?.S || item.contactPhone?.S || '';
  const email = item.email?.S || item.contactEmail?.S || '';
  const availabilityStatus =
    item.availabilityStatus?.S || item.status?.S || 'inactive';

  return {
    id: item.PK?.S?.replace('VENDOR#', '') || '',
    vendorName,
    contactPerson: item.contactPerson?.S || '',
    contactNumber,
    email,
    typeOfSupply: item.typeOfSupply?.S || '',
    servicesOffered: item.servicesOffered?.S || '',
    pricing: item.pricing?.S || '',
    serviceType: item.serviceType?.S || '',
    price: item.price?.N ? Number(item.price.N) : null,
    availabilityStatus,
    lastEventHandled: item.lastEventHandled?.S || '',
    notes: item.notes?.S || '',
    eventId: item.eventId?.S || undefined,
    eventTitle: item.eventTitle?.S || undefined,
    eventHistory: item.eventHistory?.S
      ? safeParseEventHistory(item.eventHistory.S)
      : [],
    createdAt: item.created_at?.S || item.createdAt?.S || '',
    updatedAt: item.updated_at?.S || item.updatedAt?.S || '',
  };
}

function buildDynamoVendorItem(payload) {
  const vendorId = payload.id || randomUUID();
  const createdAt =
    normalizeString(payload.created_at || payload.createdAt) ||
    nowPH();
  const updatedAt =
    normalizeString(payload.updated_at || payload.updatedAt) ||
    nowPH();

  const item = {
    PK: { S: `VENDOR#${vendorId}` },
    SK: { S: 'PROFILE' },
    vendorName: {
      S: normalizeString(payload.vendorName || payload.name || ''),
    },
    availabilityStatus: {
      S: normalizeString(
        payload.availabilityStatus || payload.status || 'inactive'
      ),
    },
    created_at: { S: createdAt },
    updated_at: { S: updatedAt },
  };

  const contactPerson = normalizeString(
    payload.contactPerson || payload.contactName
  );
  if (contactPerson) item.contactPerson = { S: contactPerson };

  const contactNumber = normalizeString(
    payload.contactNumber || payload.phone || payload.contactPhone
  );
  if (contactNumber) item.contactNumber = { S: contactNumber };

  const email = normalizeString(payload.email || payload.contactEmail);
  if (email) item.email = { S: email };

  const typeOfSupply = normalizeString(
    payload.typeOfSupply || payload.supplyType
  );
  if (typeOfSupply) item.typeOfSupply = { S: typeOfSupply };

  const servicesOffered = normalizeString(
    payload.servicesOffered || payload.services
  );
  if (servicesOffered) item.servicesOffered = { S: servicesOffered };

  const pricing = normalizeString(payload.pricing);
  if (pricing) item.pricing = { S: pricing };

  const serviceType = normalizeString(payload.serviceType);
  if (serviceType) item.serviceType = { S: serviceType };

  const lastEventHandled = normalizeString(payload.lastEventHandled);
  if (lastEventHandled) item.lastEventHandled = { S: lastEventHandled };

  const notes = normalizeString(payload.notes);
  if (notes) item.notes = { S: notes };

  if (
    payload.price !== undefined &&
    payload.price !== null &&
    !Number.isNaN(Number(payload.price))
  ) {
    item.price = { N: String(Number(payload.price)) };
  }

  const eventId = normalizeString(payload.eventId);
  if (eventId) {
    item.eventId = { S: eventId };
  }

  const eventTitle = normalizeString(
    payload.eventTitle || payload.eventName || ''
  );
  if (eventTitle) {
    item.eventTitle = { S: eventTitle };
  }

  const eventHistory = Array.isArray(payload.eventHistory)
    ? payload.eventHistory
    : undefined;
  if (eventHistory?.length) {
    item.eventHistory = { S: JSON.stringify(eventHistory) };
  }

  return item;
}

function mapDynamoVendorWorker(item) {
  if (!item) {
    return null;
  }

  return {
    id: item.SK?.S?.replace('WORKER#', '') || '',
    vendorId: item.PK?.S?.replace('VENDOR#', '') || '',
    workerName: item.workerName?.S || item.name?.S || '',
    role: item.role?.S || '',
    contactNumber: item.contactNumber?.S || '',
    email: item.email?.S || '',
    jobTitle: item.jobTitle?.S || '',
    availabilityStatus: item.availabilityStatus?.S || 'inactive',
    eventId: item.eventId?.S || undefined,
    eventTitle: item.eventTitle?.S || undefined,
    eventHistory: item.eventHistory?.S
      ? safeParseEventHistory(item.eventHistory.S)
      : [],
    notes: item.notes?.S || '',
    createdAt: item.created_at?.S || item.createdAt?.S || '',
    updatedAt: item.updated_at?.S || item.updatedAt?.S || '',
  };
}

function buildDynamoVendorWorkerItem(payload) {
  const workerId = payload.id || randomUUID();
  const vendorId = normalizeString(
    payload.vendorId || payload.vendor_id || payload.vendorId
  );
  const createdAt =
    normalizeString(payload.created_at || payload.createdAt) ||
    nowPH();
  const updatedAt =
    normalizeString(payload.updated_at || payload.updatedAt) ||
    nowPH();

  const item = {
    PK: { S: `VENDOR#${vendorId}` },
    SK: { S: `WORKER#${workerId}` },
    workerName: {
      S: normalizeString(payload.workerName || payload.name || ''),
    },
    availabilityStatus: {
      S: normalizeString(
        payload.availabilityStatus || payload.status || 'inactive'
      ),
    },
    created_at: { S: createdAt },
    updated_at: { S: updatedAt },
  };

  const role = normalizeString(payload.role);
  if (role) item.role = { S: role };

  const contactNumber = normalizeString(payload.contactNumber || payload.phone);
  if (contactNumber) item.contactNumber = { S: contactNumber };

  const email = normalizeString(payload.email);
  if (email) item.email = { S: email };

  const jobTitle = normalizeString(payload.jobTitle || payload.position);
  if (jobTitle) item.jobTitle = { S: jobTitle };

  const notes = normalizeString(payload.notes);
  if (notes) item.notes = { S: notes };

  const eventId = normalizeString(payload.eventId);
  if (eventId) {
    item.eventId = { S: eventId };
  }

  const eventTitle = normalizeString(
    payload.eventTitle || payload.eventName || ''
  );
  if (eventTitle) {
    item.eventTitle = { S: eventTitle };
  }

  const eventHistory = Array.isArray(payload.eventHistory)
    ? payload.eventHistory
    : undefined;
  if (eventHistory?.length) {
    item.eventHistory = { S: JSON.stringify(eventHistory) };
  }

  return Object.fromEntries(
    Object.entries(item).filter(([, value]) => value !== undefined)
  );
}

function safeParseEventHistory(serializedValue) {
  try {
    return JSON.parse(serializedValue || '[]');
  } catch {
    return [];
  }
}

function closeCurrentAssignment(history, currentEventId) {
  if (!Array.isArray(history) || history.length === 0 || !currentEventId) {
    return Array.isArray(history) ? history : [];
  }

  const lastEntry = history[history.length - 1];
  if (lastEntry?.eventId === currentEventId && !lastEntry.endedAt) {
    return [
      ...history.slice(0, -1),
      {
        ...lastEntry,
        endedAt: nowPH(),
      },
    ];
  }

  return history;
}

function recordAssignment(history, eventId, eventTitle) {
  const normalizedHistory = Array.isArray(history) ? history : [];
  if (!eventId) {
    return normalizedHistory;
  }

  return [
    ...normalizedHistory,
    {
      eventId,
      eventTitle,
      assignedAt: nowPH(),
    },
  ];
}

async function enrichEventHistory(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return [];
  }

  return Promise.all(
    history.map(async (entry) => ({
      ...entry,
      eventDetails: entry?.eventId ? await getEventById(entry.eventId) : null,
    }))
  );
}

async function buildEventTimeline(history, currentEventId) {
  const entries = Array.isArray(history) ? history : [];
  const formatted = await Promise.all(
    entries.map(async (entry) => {
      const event = entry?.eventId ? await getEventById(entry.eventId) : null;
      return {
        id: entry?.eventId || '',
        title: entry?.eventTitle || event?.title || event?.eventTitle || '',
        eventDate:
          event?.eventDate || event?.startDate || event?.startTime || '',
        status:
          !entry?.endedAt && entry?.eventId === currentEventId
            ? 'Execution'
            : 'Completed',
        assignedAt: entry?.assignedAt || null,
        endedAt: entry?.endedAt || null,
      };
    })
  );

  let current = formatted.filter((entry) => entry.status === 'Execution');
  const completed = formatted
    .filter((entry) => entry.status !== 'Execution')
    .sort((a, b) =>
      (b.endedAt || b.assignedAt || '').localeCompare(
        a.endedAt || a.assignedAt || ''
      )
    );

  if (current.length === 0 && currentEventId) {
    const event = await getEventById(currentEventId);
    if (event) {
      current = [
        {
          id: currentEventId,
          title: event.title || event.eventTitle || '',
          eventDate:
            event.eventDate || event.startDate || event.startTime || '',
          status: 'Execution',
          assignedAt: null,
          endedAt: null,
        },
      ];
    }
  }

  return [...current, ...completed];
}

async function ensureVendorExists(vendorId) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }

  const vendor = await getVendorById(vendorId);
  if (!vendor) {
    throw new Error('Vendor not found');
  }

  return vendor;
}

async function enrichWorkersWithEventTitles(workers) {
  if (!Array.isArray(workers) || workers.length === 0) {
    return workers;
  }

  const eventIds = [
    ...new Set(
      workers.filter((worker) => worker.eventId).map((worker) => worker.eventId)
    ),
  ];
  if (eventIds.length === 0) {
    return workers;
  }

  const eventTitles = {};
  await Promise.all(
    eventIds.map(async (eventId) => {
      try {
        const event = await getEventById(eventId);
        eventTitles[eventId] = event?.title || event?.eventTitle || '';
      } catch {
        eventTitles[eventId] = '';
      }
    })
  );

  return workers.map((worker) => ({
    ...worker,
    eventTitle: worker.eventId
      ? worker.eventTitle || eventTitles[worker.eventId] || ''
      : undefined,
  }));
}

export async function getVendorWorkers(vendorId, eventId) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }

  await ensureVendorExists(vendorId);

  const query = {
    TableName: DYNAMO_TABLE,
    KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :workerPrefix)',
    ExpressionAttributeNames: {
      '#pk': 'PK',
      '#sk': 'SK',
    },
    ExpressionAttributeValues: {
      ':pk': { S: `VENDOR#${normalizeString(vendorId)}` },
      ':workerPrefix': { S: 'WORKER#' },
    },
  };

  if (eventId) {
    query.FilterExpression = '#eventId = :eventId';
    query.ExpressionAttributeNames['#eventId'] = 'eventId';
    query.ExpressionAttributeValues[':eventId'] = {
      S: normalizeString(eventId),
    };
  }

  const command = new QueryCommand(query);
  const response = await dynamoClient.send(command);
  const workers = (response.Items || []).map(mapDynamoVendorWorker);
  return enrichWorkersWithEventTitles(workers);
}

export async function getAllVendorWorkers({ vendorId, eventId } = {}) {
  const params = {
    TableName: DYNAMO_TABLE,
    FilterExpression: 'begins_with(#sk, :workerPrefix)',
    ExpressionAttributeNames: {
      '#sk': 'SK',
    },
    ExpressionAttributeValues: {
      ':workerPrefix': { S: 'WORKER#' },
    },
  };

  if (vendorId) {
    const normalizedVendorId = normalizeString(vendorId);
    params.FilterExpression += ' AND #pk = :pk';
    params.ExpressionAttributeNames['#pk'] = 'PK';
    params.ExpressionAttributeValues[':pk'] = {
      S: `VENDOR#${normalizedVendorId}`,
    };
  }

  if (eventId) {
    params.FilterExpression += ' AND #eventId = :eventId';
    params.ExpressionAttributeNames['#eventId'] = 'eventId';
    params.ExpressionAttributeValues[':eventId'] = {
      S: normalizeString(eventId),
    };
  }

  const command = new ScanCommand(params);
  const response = await dynamoClient.send(command);
  const workers = (response.Items || []).map(mapDynamoVendorWorker);
  return enrichWorkersWithEventTitles(workers);
}

export async function getVendorWorkerById(vendorId, workerId) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }
  if (!workerId) {
    throw new Error('Worker ID is required');
  }

  await ensureVendorExists(vendorId);

  const command = new GetItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `VENDOR#${normalizeString(vendorId)}` },
      SK: { S: `WORKER#${normalizeString(workerId)}` },
    },
  });

  const response = await dynamoClient.send(command);
  return mapDynamoVendorWorker(response.Item);
}

export async function createVendorWorker(vendorId, workerData) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }
  if (!workerData || typeof workerData !== 'object') {
    throw new Error('Invalid worker data');
  }

  await ensureVendorExists(vendorId);

  const workerName = normalizeString(workerData.workerName || workerData.name);
  if (!workerName) {
    throw new Error('workerName is required');
  }

  const eventId = normalizeString(workerData.eventId);
  let eventTitle;
  let eventHistory = [];
  if (eventId) {
    const event = await getEventById(eventId);
    if (!event) {
      throw new Error('Associated event not found');
    }
    eventTitle = event.title || event.eventTitle || '';
    eventHistory = recordAssignment([], eventId, eventTitle);
  }

  const newWorker = {
    ...workerData,
    id: randomUUID(),
    vendorId: normalizeString(vendorId),
    availabilityStatus: normalizeString(
      workerData.availabilityStatus || workerData.status || 'inactive'
    ).toLowerCase(),
    eventId: eventId || undefined,
    eventTitle: eventTitle || undefined,
    eventHistory,
    created_at: nowPH(),
    updated_at: nowPH(),
  };

  const command = new PutItemCommand({
    TableName: DYNAMO_TABLE,
    Item: buildDynamoVendorWorkerItem(newWorker),
    ConditionExpression:
      'attribute_not_exists(PK) AND attribute_not_exists(SK)',
  });

  await dynamoClient.send(command);
  return mapDynamoVendorWorker(buildDynamoVendorWorkerItem(newWorker));
}

export async function updateVendorWorker(vendorId, workerId, updateData) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }
  if (!workerId) {
    throw new Error('Worker ID is required');
  }
  if (!updateData || typeof updateData !== 'object') {
    throw new Error('Invalid update data');
  }

  await ensureVendorExists(vendorId);

  const existing = await getVendorWorkerById(vendorId, workerId);
  if (!existing) {
    throw new Error('Worker not found');
  }

  const eventId = normalizeString(updateData.eventId);
  let eventTitle;
  if (updateData.eventId !== undefined) {
    if (eventId) {
      const event = await getEventById(eventId);
      if (!event) {
        throw new Error('Associated event not found');
      }
      eventTitle = event.title || event.eventTitle || '';
    } else {
      eventTitle = undefined;
    }
  }

  let updatedEventHistory = Array.isArray(existing.eventHistory)
    ? existing.eventHistory
    : [];

  if (updateData.eventId !== undefined) {
    if (eventId && existing.eventId && existing.eventId !== eventId) {
      updatedEventHistory = closeCurrentAssignment(
        updatedEventHistory,
        existing.eventId
      );
    }

    if (eventId && existing.eventId !== eventId) {
      updatedEventHistory = recordAssignment(
        updatedEventHistory,
        eventId,
        eventTitle || existing.eventTitle || ''
      );
    }

    if (!eventId && existing.eventId) {
      updatedEventHistory = closeCurrentAssignment(
        updatedEventHistory,
        existing.eventId
      );
    }
  }

  const updatedWorker = {
    ...existing,
    ...updateData,
    vendorId: normalizeString(vendorId),
    id: workerId,
    availabilityStatus: normalizeString(
      updateData.availabilityStatus ||
        updateData.status ||
        existing.availabilityStatus ||
        'inactive'
    ).toLowerCase(),
    eventId:
      updateData.eventId !== undefined
        ? eventId || undefined
        : existing.eventId,
    eventTitle:
      updateData.eventId !== undefined
        ? eventTitle || undefined
        : existing.eventTitle,
    eventHistory:
      updateData.eventId !== undefined
        ? updatedEventHistory
        : existing.eventHistory,
    updated_at: nowPH(),
  };

  const command = new PutItemCommand({
    TableName: DYNAMO_TABLE,
    Item: buildDynamoVendorWorkerItem(updatedWorker),
  });

  await dynamoClient.send(command);
  return mapDynamoVendorWorker(buildDynamoVendorWorkerItem(updatedWorker));
}

export async function deleteVendorWorker(vendorId, workerId) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }
  if (!workerId) {
    throw new Error('Worker ID is required');
  }

  await ensureVendorExists(vendorId);

  const existing = await getVendorWorkerById(vendorId, workerId);
  if (!existing) {
    throw new Error('Worker not found');
  }

  const command = new DeleteItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `VENDOR#${normalizeString(vendorId)}` },
      SK: { S: `WORKER#${normalizeString(workerId)}` },
    },
  });

  await dynamoClient.send(command);
  return existing;
}

export async function assignWorkerToEvent(vendorId, workerId, eventId) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }
  if (!workerId) {
    throw new Error('Worker ID is required');
  }
  if (!eventId || !normalizeString(eventId)) {
    throw new Error('Event ID is required');
  }

  await ensureVendorExists(vendorId);

  const existing = await getVendorWorkerById(vendorId, workerId);
  if (!existing) {
    throw new Error('Worker not found');
  }

  const event = await getEventById(eventId);
  if (!event) {
    throw new Error('Associated event not found');
  }

  let updatedEventHistory = Array.isArray(existing.eventHistory)
    ? existing.eventHistory
    : [];
  const normalizedEventId = normalizeString(eventId);
  const eventTitleValue = event.title || event.eventTitle || undefined;

  if (existing.eventId && existing.eventId !== normalizedEventId) {
    updatedEventHistory = closeCurrentAssignment(
      updatedEventHistory,
      existing.eventId
    );
  }

  if (existing.eventId !== normalizedEventId) {
    updatedEventHistory = recordAssignment(
      updatedEventHistory,
      normalizedEventId,
      eventTitleValue || ''
    );
  }

  const updatedWorker = {
    ...existing,
    vendorId: normalizeString(vendorId),
    id: workerId,
    eventId: normalizedEventId,
    eventTitle: eventTitleValue,
    eventHistory: updatedEventHistory,
    updated_at: nowPH(),
  };

  await dynamoClient.send(
    new PutItemCommand({
      TableName: DYNAMO_TABLE,
      Item: buildDynamoVendorWorkerItem(updatedWorker),
    })
  );

  return mapDynamoVendorWorker(buildDynamoVendorWorkerItem(updatedWorker));
}

export async function unassignWorkerFromEvent(vendorId, workerId) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }
  if (!workerId) {
    throw new Error('Worker ID is required');
  }

  await ensureVendorExists(vendorId);

  const existing = await getVendorWorkerById(vendorId, workerId);
  if (!existing) {
    throw new Error('Worker not found');
  }

  const updatedWorker = {
    ...existing,
    vendorId: normalizeString(vendorId),
    id: workerId,
    eventId: undefined,
    eventTitle: undefined,
    eventHistory: closeCurrentAssignment(
      Array.isArray(existing.eventHistory) ? existing.eventHistory : [],
      existing.eventId
    ),
    updated_at: nowPH(),
  };

  await dynamoClient.send(
    new PutItemCommand({
      TableName: DYNAMO_TABLE,
      Item: buildDynamoVendorWorkerItem(updatedWorker),
    })
  );

  return mapDynamoVendorWorker(buildDynamoVendorWorkerItem(updatedWorker));
}

export async function createVendor(vendorData) {
  if (!vendorData || typeof vendorData !== 'object') {
    throw new Error('Invalid vendor data');
  }

  const vendorName = normalizeString(vendorData.vendorName || vendorData.name);
  const serviceType = normalizeString(vendorData.serviceType);
  const eventId = normalizeString(vendorData.eventId);
  const availabilityStatus = normalizeString(
    vendorData.availabilityStatus || vendorData.status || 'inactive'
  );

  if (!vendorName || !serviceType) {
    throw new Error('vendorName and serviceType are required');
  }

  if (eventId) {
    const event = await getEventById(eventId);
    if (!event) {
      throw new Error('Associated event not found');
    }
  }

  let eventHistory = [];
  let eventTitle = undefined;

  if (eventId) {
    const event = await getEventById(eventId);
    eventTitle = event?.title || event?.eventTitle || undefined;
    eventHistory = recordAssignment([], eventId, eventTitle || '');
  }

  const newVendor = {
    ...vendorData,
    id: randomUUID(),
    availabilityStatus: availabilityStatus.toLowerCase(),
    eventId: eventId || undefined,
    eventTitle,
    eventHistory,
    created_at: nowPH(),
    updated_at: nowPH(),
  };

  const command = new PutItemCommand({
    TableName: DYNAMO_TABLE,
    Item: buildDynamoVendorItem(newVendor),
    ConditionExpression:
      'attribute_not_exists(PK) AND attribute_not_exists(SK)',
  });

  await dynamoClient.send(command);

  if (newVendor.availabilityStatus === 'active') {
    await updateVendorSnapshot(newVendor.id, true);
  }

  return mapDynamoVendor(buildDynamoVendorItem(newVendor));
}

export async function getVendors(eventId) {
  const params = {
    TableName: DYNAMO_TABLE,
    FilterExpression: '#sk = :profile AND begins_with(#pk, :vendorPrefix)',
    ExpressionAttributeNames: {
      '#sk': 'SK',
      '#pk': 'PK',
    },
    ExpressionAttributeValues: {
      ':profile': { S: 'PROFILE' },
      ':vendorPrefix': { S: 'VENDOR#' },
    },
  };

  if (eventId) {
    params.FilterExpression += ' AND #eventId = :eventId';
    params.ExpressionAttributeNames['#eventId'] = 'eventId';
    params.ExpressionAttributeValues[':eventId'] = {
      S: normalizeString(eventId),
    };
  }

  const command = new ScanCommand(params);
  const response = await dynamoClient.send(command);
  return (response.Items || []).map(mapDynamoVendor);
}

export async function getVendorById(vendorId) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }

  const command = new GetItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `VENDOR#${normalizeString(vendorId)}` },
      SK: { S: 'PROFILE' },
    },
  });

  const response = await dynamoClient.send(command);
  return mapDynamoVendor(response.Item);
}

export async function updateVendor(vendorId, updateData) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }

  if (!updateData || typeof updateData !== 'object') {
    throw new Error('Invalid update data');
  }

  const existingVendor = await getVendorById(vendorId);
  if (!existingVendor) {
    throw new Error('Vendor not found');
  }

  const eventId = normalizeString(updateData.eventId);
  if (eventId && eventId !== existingVendor.eventId) {
    const event = await getEventById(eventId);
    if (!event) {
      throw new Error('Associated event not found');
    }
  }

  const availabilityStatus = normalizeString(
    updateData.availabilityStatus ||
      updateData.status ||
      existingVendor.availabilityStatus ||
      'inactive'
  ).toLowerCase();

  let updatedEventHistory = Array.isArray(existingVendor.eventHistory)
    ? existingVendor.eventHistory
    : [];

  if (updateData.eventId !== undefined) {
    if (
      eventId &&
      existingVendor.eventId &&
      existingVendor.eventId !== eventId
    ) {
      updatedEventHistory = closeCurrentAssignment(
        updatedEventHistory,
        existingVendor.eventId
      );
    }

    if (eventId && existingVendor.eventId !== eventId) {
      updatedEventHistory = recordAssignment(updatedEventHistory, eventId, '');
    }

    if (!eventId && existingVendor.eventId) {
      updatedEventHistory = closeCurrentAssignment(
        updatedEventHistory,
        existingVendor.eventId
      );
    }
  }

  let updatedEventTitle = existingVendor.eventTitle;
  if (eventId && eventId !== existingVendor.eventId) {
    const event = await getEventById(eventId);
    if (!event) {
      throw new Error('Associated event not found');
    }
    updatedEventTitle = event.title || event.eventTitle || undefined;
  }

  const updatedVendor = {
    ...existingVendor,
    ...updateData,
    eventId:
      updateData.eventId !== undefined
        ? eventId || undefined
        : existingVendor.eventId,
    eventTitle:
      updateData.eventId !== undefined
        ? updatedEventTitle
        : existingVendor.eventTitle,
    availabilityStatus,
    eventHistory:
      updateData.eventId !== undefined
        ? updatedEventHistory
        : existingVendor.eventHistory,
    updated_at: nowPH(),
  };

  const command = new PutItemCommand({
    TableName: DYNAMO_TABLE,
    Item: buildDynamoVendorItem(updatedVendor),
  });

  await dynamoClient.send(command);

  if (existingVendor.availabilityStatus !== availabilityStatus) {
    const wasActive = existingVendor.availabilityStatus === 'active';
    const nowActive = availabilityStatus === 'active';
    if (wasActive !== nowActive) {
      await updateVendorSnapshot(updatedVendor.id, nowActive);
    }
  }

  return mapDynamoVendor(buildDynamoVendorItem(updatedVendor));
}

export async function assignVendorToEvent(vendorId, eventId) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }
  if (!eventId || !normalizeString(eventId)) {
    throw new Error('Event ID is required');
  }

  const existingVendor = await getVendorById(vendorId);
  if (!existingVendor) {
    throw new Error('Vendor not found');
  }

  const event = await getEventById(eventId);
  if (!event) {
    throw new Error('Associated event not found');
  }

  const normalizedEventId = normalizeString(eventId);
  let updatedEventHistory = Array.isArray(existingVendor.eventHistory)
    ? existingVendor.eventHistory
    : [];

  if (existingVendor.eventId && existingVendor.eventId !== normalizedEventId) {
    updatedEventHistory = closeCurrentAssignment(
      updatedEventHistory,
      existingVendor.eventId
    );
  }

  if (existingVendor.eventId !== normalizedEventId) {
    updatedEventHistory = recordAssignment(
      updatedEventHistory,
      normalizedEventId,
      event.title || event.eventTitle || ''
    );
  }

  const updatedVendor = {
    ...existingVendor,
    eventId: normalizedEventId,
    eventTitle: event.title || event.eventTitle || undefined,
    eventHistory: updatedEventHistory,
    updated_at: nowPH(),
  };

  await dynamoClient.send(
    new PutItemCommand({
      TableName: DYNAMO_TABLE,
      Item: buildDynamoVendorItem(updatedVendor),
    })
  );

  return mapDynamoVendor(buildDynamoVendorItem(updatedVendor));
}

export async function getVendorEvents(vendorId) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }

  const vendor = await getVendorById(vendorId);
  if (!vendor) {
    throw new Error('Vendor not found');
  }

  return {
    events: await buildEventTimeline(vendor.eventHistory, vendor.eventId),
  };
}

export async function getWorkerEvents(vendorId, workerId) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }
  if (!workerId) {
    throw new Error('Worker ID is required');
  }

  const worker = await getVendorWorkerById(vendorId, workerId);
  if (!worker) {
    throw new Error('Worker not found');
  }

  return {
    events: await buildEventTimeline(worker.eventHistory, worker.eventId),
  };
}

export async function getWorkerById(workerId) {
  if (!workerId) {
    throw new Error('Worker ID is required');
  }

  const params = {
    TableName: DYNAMO_TABLE,
    FilterExpression: '#sk = :sk AND begins_with(#pk, :pkPrefix)',
    ExpressionAttributeNames: {
      '#sk': 'SK',
      '#pk': 'PK',
    },
    ExpressionAttributeValues: {
      ':sk': { S: `WORKER#${normalizeString(workerId)}` },
      ':pkPrefix': { S: 'VENDOR#' },
    },
  };

  const command = new ScanCommand(params);
  const response = await dynamoClient.send(command);
  const item = (response.Items || [])[0];
  return mapDynamoVendorWorker(item);
}

export async function getWorkerEventsByWorkerId(workerId) {
  const worker = await getWorkerById(workerId);
  if (!worker) {
    throw new Error('Worker not found');
  }

  return {
    events: await buildEventTimeline(worker.eventHistory, worker.eventId),
  };
}

export async function unassignVendorFromEvent(vendorId) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }

  const existingVendor = await getVendorById(vendorId);
  if (!existingVendor) {
    throw new Error('Vendor not found');
  }

  const updatedVendor = {
    ...existingVendor,
    eventId: undefined,
    eventTitle: undefined,
    eventHistory: closeCurrentAssignment(
      Array.isArray(existingVendor.eventHistory)
        ? existingVendor.eventHistory
        : [],
      existingVendor.eventId
    ),
    updated_at: nowPH(),
  };

  await dynamoClient.send(
    new PutItemCommand({
      TableName: DYNAMO_TABLE,
      Item: buildDynamoVendorItem(updatedVendor),
    })
  );

  return mapDynamoVendor(buildDynamoVendorItem(updatedVendor));
}

export async function deleteVendor(vendorId) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }

  const existingVendor = await getVendorById(vendorId);
  if (!existingVendor) {
    throw new Error('Vendor not found');
  }

  await dynamoClient.send(
    new DeleteItemCommand({
      TableName: DYNAMO_TABLE,
      Key: {
        PK: { S: `VENDOR#${normalizeString(vendorId)}` },
        SK: { S: 'PROFILE' },
      },
    })
  );

  return existingVendor;
}

export async function getVendorsByEventId(eventId) {
  if (!eventId) {
    throw new Error('Event ID is required');
  }

  return getVendors(eventId);
}
