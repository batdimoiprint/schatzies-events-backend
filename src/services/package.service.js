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
import { normalizeString } from '../utils/dynamoHelpers.js';

const VALID_EVENT_TYPES = ['Debut', 'Wedding'];
const VALID_INCLUSION_TYPES = [
  'Professional Coordination',
  'Catering & Dining',
  'Styling & Production',
  'Media & Glamour',
];

// ---- Mappers ----

function mapPackageMetadata(item) {
  if (!item) return null;
  let images = [];
  if (item.images?.S) {
    try {
      images = JSON.parse(item.images.S);
    } catch {
      images = [];
    }
  }
  return {
    id: item.PK?.S?.replace('PACKAGE#', '') || '',
    eventType: item.eventType?.S || '',
    packageName: item.packageName?.S || '',
    description: item.description?.S || '',
    images,
    createdAt: item.created_at?.S || '',
    updatedAt: item.updated_at?.S || '',
  };
}

function mapPackagePax(item) {
  if (!item) return null;
  return {
    id: item.SK?.S?.replace('PAX#', '') || '',
    packageId: item.PK?.S?.replace('PACKAGE#', '') || '',
    pax: item.pax?.N ? Number(item.pax.N) : null,
    paxPrice: item.paxPrice?.N ? Number(item.paxPrice.N) : null,
    note: item.note?.S || '',
    createdAt: item.created_at?.S || '',
    updatedAt: item.updated_at?.S || '',
  };
}

function mapPackageInclusion(item) {
  if (!item) return null;
  return {
    id: item.SK?.S?.replace('INCLUSION#', '') || '',
    packageId: item.PK?.S?.replace('PACKAGE#', '') || '',
    inclusionType: item.inclusionType?.S || '',
    inclusion: item.inclusion?.S || '',
    createdAt: item.created_at?.S || '',
    updatedAt: item.updated_at?.S || '',
  };
}

// ---- Item Builders ----

function buildPackageMetadataItem(data) {
  const item = {
    PK: { S: `PACKAGE#${normalizeString(data.id)}` },
    SK: { S: 'METADATA' },
    eventType: { S: normalizeString(data.eventType) },
    packageName: { S: normalizeString(data.packageName) },
    created_at: { S: data.createdAt || nowPH() },
    updated_at: { S: data.updatedAt || nowPH() },
  };

  const description = normalizeString(data.description);
  if (description) item.description = { S: description };

  const images = Array.isArray(data.images) ? data.images : [];
  item.images = { S: JSON.stringify(images) };

  return item;
}

function buildPackagePaxItem(packageId, data) {
  const item = {
    PK: { S: `PACKAGE#${normalizeString(packageId)}` },
    SK: { S: `PAX#${normalizeString(data.id)}` },
    created_at: { S: data.createdAt || nowPH() },
    updated_at: { S: data.updatedAt || nowPH() },
  };

  if (data.pax !== undefined && data.pax !== null && !Number.isNaN(Number(data.pax))) {
    item.pax = { N: String(Number(data.pax)) };
  }
  if (
    data.paxPrice !== undefined &&
    data.paxPrice !== null &&
    !Number.isNaN(Number(data.paxPrice))
  ) {
    item.paxPrice = { N: String(Number(data.paxPrice)) };
  }

  const note = normalizeString(data.note);
  if (note) item.note = { S: note };

  return item;
}

function buildPackageInclusionItem(packageId, data) {
  return {
    PK: { S: `PACKAGE#${normalizeString(packageId)}` },
    SK: { S: `INCLUSION#${normalizeString(data.id)}` },
    inclusionType: { S: normalizeString(data.inclusionType) },
    inclusion: { S: normalizeString(data.inclusion) },
    created_at: { S: data.createdAt || nowPH() },
    updated_at: { S: data.updatedAt || nowPH() },
  };
}

// ---- Internal helpers ----

async function queryPackageItems(packageId) {
  const command = new QueryCommand({
    TableName: DYNAMO_TABLE,
    KeyConditionExpression: '#pk = :pk',
    ExpressionAttributeNames: { '#pk': 'PK' },
    ExpressionAttributeValues: {
      ':pk': { S: `PACKAGE#${normalizeString(packageId)}` },
    },
  });
  const response = await dynamoClient.send(command);
  return response.Items || [];
}

function assemblePackage(items) {
  const metadata = items.find((item) => item.SK?.S === 'METADATA');
  if (!metadata) return null;

  const pax = items
    .filter((item) => item.SK?.S?.startsWith('PAX#'))
    .map(mapPackagePax)
    .sort((a, b) => (a.pax || 0) - (b.pax || 0));

  const inclusions = items
    .filter((item) => item.SK?.S?.startsWith('INCLUSION#'))
    .map(mapPackageInclusion);

  return {
    ...mapPackageMetadata(metadata),
    pax,
    inclusions,
  };
}

// ---- Package CRUD ----

export async function createPackage(packageData, images = []) {
  const eventType = normalizeString(packageData.eventType);
  const packageName = normalizeString(packageData.packageName);

  if (!eventType) throw new Error('eventType is required');
  if (!packageName) throw new Error('packageName is required');
  if (!VALID_EVENT_TYPES.includes(eventType)) {
    throw new Error(`eventType must be one of: ${VALID_EVENT_TYPES.join(', ')}`);
  }

  const id = normalizeString(packageData.id) || randomUUID();
  const now = nowPH();

  const pkg = {
    id,
    eventType,
    packageName,
    description: normalizeString(packageData.description),
    images: Array.isArray(images) ? images : [],
    createdAt: now,
    updatedAt: now,
  };

  await dynamoClient.send(
    new PutItemCommand({
      TableName: DYNAMO_TABLE,
      Item: buildPackageMetadataItem(pkg),
      ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
    })
  );

  return mapPackageMetadata(buildPackageMetadataItem(pkg));
}

export async function getPackages(eventType = null) {
  const params = {
    TableName: DYNAMO_TABLE,
    FilterExpression: '#sk = :metadata AND begins_with(#pk, :prefix)',
    ExpressionAttributeNames: { '#sk': 'SK', '#pk': 'PK' },
    ExpressionAttributeValues: {
      ':metadata': { S: 'METADATA' },
      ':prefix': { S: 'PACKAGE#' },
    },
  };

  if (eventType) {
    params.FilterExpression += ' AND #eventType = :eventType';
    params.ExpressionAttributeNames['#eventType'] = 'eventType';
    params.ExpressionAttributeValues[':eventType'] = {
      S: normalizeString(eventType),
    };
  }

  const response = await dynamoClient.send(new ScanCommand(params));
  return (response.Items || []).map(mapPackageMetadata);
}

export async function getPackageById(packageId) {
  if (!packageId) throw new Error('Package ID is required');
  const items = await queryPackageItems(packageId);
  return assemblePackage(items);
}

export async function updatePackage(packageId, updateData, images = null) {
  if (!packageId) throw new Error('Package ID is required');

  const existing = await getPackageById(packageId);
  if (!existing) throw new Error('Package not found');

  const eventType =
    updateData.eventType !== undefined
      ? normalizeString(updateData.eventType)
      : existing.eventType;

  if (updateData.eventType !== undefined && !VALID_EVENT_TYPES.includes(eventType)) {
    throw new Error(`eventType must be one of: ${VALID_EVENT_TYPES.join(', ')}`);
  }

  const updated = {
    id: packageId,
    eventType,
    packageName:
      updateData.packageName !== undefined
        ? normalizeString(updateData.packageName) || existing.packageName
        : existing.packageName,
    description:
      updateData.description !== undefined
        ? normalizeString(updateData.description)
        : existing.description,
    images: images !== null ? images : existing.images,
    createdAt: existing.createdAt,
    updatedAt: nowPH(),
  };

  await dynamoClient.send(
    new PutItemCommand({
      TableName: DYNAMO_TABLE,
      Item: buildPackageMetadataItem(updated),
    })
  );

  return mapPackageMetadata(buildPackageMetadataItem(updated));
}

export async function deletePackage(packageId) {
  if (!packageId) throw new Error('Package ID is required');

  const items = await queryPackageItems(packageId);
  if (!items.find((item) => item.SK?.S === 'METADATA')) {
    throw new Error('Package not found');
  }

  await Promise.all(
    items.map((item) =>
      dynamoClient.send(
        new DeleteItemCommand({
          TableName: DYNAMO_TABLE,
          Key: { PK: item.PK, SK: item.SK },
        })
      )
    )
  );
}

// ---- Pax CRUD ----

export async function addPackagePax(packageId, paxData) {
  if (!packageId) throw new Error('Package ID is required');

  const existing = await getPackageById(packageId);
  if (!existing) throw new Error('Package not found');

  if (paxData.pax === undefined || paxData.pax === null)
    throw new Error('pax is required');
  if (paxData.paxPrice === undefined || paxData.paxPrice === null)
    throw new Error('paxPrice is required');

  const id = randomUUID();
  const item = buildPackagePaxItem(packageId, {
    ...paxData,
    id,
    createdAt: nowPH(),
    updatedAt: nowPH(),
  });

  await dynamoClient.send(
    new PutItemCommand({
      TableName: DYNAMO_TABLE,
      Item: item,
      ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
    })
  );

  return mapPackagePax(item);
}

export async function updatePackagePax(packageId, paxId, paxData) {
  if (!packageId) throw new Error('Package ID is required');
  if (!paxId) throw new Error('Pax ID is required');

  const response = await dynamoClient.send(
    new GetItemCommand({
      TableName: DYNAMO_TABLE,
      Key: {
        PK: { S: `PACKAGE#${normalizeString(packageId)}` },
        SK: { S: `PAX#${normalizeString(paxId)}` },
      },
    })
  );

  if (!response.Item) throw new Error('Pax not found');

  const existing = mapPackagePax(response.Item);
  const updated = {
    id: paxId,
    pax: paxData.pax !== undefined ? paxData.pax : existing.pax,
    paxPrice: paxData.paxPrice !== undefined ? paxData.paxPrice : existing.paxPrice,
    note: paxData.note !== undefined ? paxData.note : existing.note,
    createdAt: existing.createdAt,
    updatedAt: nowPH(),
  };

  const item = buildPackagePaxItem(packageId, updated);
  await dynamoClient.send(new PutItemCommand({ TableName: DYNAMO_TABLE, Item: item }));

  return mapPackagePax(item);
}

export async function deletePackagePax(packageId, paxId) {
  if (!packageId) throw new Error('Package ID is required');
  if (!paxId) throw new Error('Pax ID is required');

  const response = await dynamoClient.send(
    new GetItemCommand({
      TableName: DYNAMO_TABLE,
      Key: {
        PK: { S: `PACKAGE#${normalizeString(packageId)}` },
        SK: { S: `PAX#${normalizeString(paxId)}` },
      },
    })
  );

  if (!response.Item) throw new Error('Pax not found');

  await dynamoClient.send(
    new DeleteItemCommand({
      TableName: DYNAMO_TABLE,
      Key: {
        PK: { S: `PACKAGE#${normalizeString(packageId)}` },
        SK: { S: `PAX#${normalizeString(paxId)}` },
      },
    })
  );
}

// ---- Inclusions CRUD ----

export async function addPackageInclusion(packageId, inclusionData) {
  if (!packageId) throw new Error('Package ID is required');

  const existing = await getPackageById(packageId);
  if (!existing) throw new Error('Package not found');

  const inclusionType = normalizeString(inclusionData.inclusionType);
  const inclusion = normalizeString(inclusionData.inclusion);

  if (!inclusionType) throw new Error('inclusionType is required');
  if (!inclusion) throw new Error('inclusion is required');
  if (!VALID_INCLUSION_TYPES.includes(inclusionType)) {
    throw new Error(
      `inclusionType must be one of: ${VALID_INCLUSION_TYPES.join(', ')}`
    );
  }

  const id = randomUUID();
  const item = buildPackageInclusionItem(packageId, {
    ...inclusionData,
    id,
    createdAt: nowPH(),
    updatedAt: nowPH(),
  });

  await dynamoClient.send(
    new PutItemCommand({
      TableName: DYNAMO_TABLE,
      Item: item,
      ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
    })
  );

  return mapPackageInclusion(item);
}

export async function updatePackageInclusion(packageId, inclusionId, inclusionData) {
  if (!packageId) throw new Error('Package ID is required');
  if (!inclusionId) throw new Error('Inclusion ID is required');

  const response = await dynamoClient.send(
    new GetItemCommand({
      TableName: DYNAMO_TABLE,
      Key: {
        PK: { S: `PACKAGE#${normalizeString(packageId)}` },
        SK: { S: `INCLUSION#${normalizeString(inclusionId)}` },
      },
    })
  );

  if (!response.Item) throw new Error('Inclusion not found');

  const existing = mapPackageInclusion(response.Item);

  const inclusionType =
    inclusionData.inclusionType !== undefined
      ? normalizeString(inclusionData.inclusionType)
      : existing.inclusionType;

  if (
    inclusionData.inclusionType !== undefined &&
    !VALID_INCLUSION_TYPES.includes(inclusionType)
  ) {
    throw new Error(
      `inclusionType must be one of: ${VALID_INCLUSION_TYPES.join(', ')}`
    );
  }

  const updated = {
    id: inclusionId,
    inclusionType,
    inclusion:
      inclusionData.inclusion !== undefined
        ? normalizeString(inclusionData.inclusion)
        : existing.inclusion,
    createdAt: existing.createdAt,
    updatedAt: nowPH(),
  };

  const item = buildPackageInclusionItem(packageId, updated);
  await dynamoClient.send(new PutItemCommand({ TableName: DYNAMO_TABLE, Item: item }));

  return mapPackageInclusion(item);
}

export async function deletePackageInclusion(packageId, inclusionId) {
  if (!packageId) throw new Error('Package ID is required');
  if (!inclusionId) throw new Error('Inclusion ID is required');

  const response = await dynamoClient.send(
    new GetItemCommand({
      TableName: DYNAMO_TABLE,
      Key: {
        PK: { S: `PACKAGE#${normalizeString(packageId)}` },
        SK: { S: `INCLUSION#${normalizeString(inclusionId)}` },
      },
    })
  );

  if (!response.Item) throw new Error('Inclusion not found');

  await dynamoClient.send(
    new DeleteItemCommand({
      TableName: DYNAMO_TABLE,
      Key: {
        PK: { S: `PACKAGE#${normalizeString(packageId)}` },
        SK: { S: `INCLUSION#${normalizeString(inclusionId)}` },
      },
    })
  );
}
