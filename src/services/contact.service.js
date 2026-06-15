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

// ---- Mappers ----

function mapContactMetadata(item) {
  if (!item) return null;
  return {
    id: item.PK?.S?.replace('CONTACT#', '') || '',
    name: item.name?.S || '',
    description: item.description?.S || '',
    createdAt: item.created_at?.S || '',
    updatedAt: item.updated_at?.S || '',
  };
}

function mapAddress(item) {
  if (!item) return null;
  return {
    id: item.SK?.S?.replace('ADDRESS#', '') || '',
    contactId: item.PK?.S?.replace('CONTACT#', '') || '',
    label: item.label?.S || '',
    street: item.street?.S || '',
    barangay: item.barangay?.S || '',
    city: item.city?.S || '',
    province: item.province?.S || '',
    country: item.country?.S || '',
    zipCode: item.zipCode?.S || '',
    createdAt: item.created_at?.S || '',
    updatedAt: item.updated_at?.S || '',
  };
}

function mapPhone(item) {
  if (!item) return null;
  return {
    id: item.SK?.S?.replace('PHONE#', '') || '',
    contactId: item.PK?.S?.replace('CONTACT#', '') || '',
    label: item.label?.S || '',
    number: item.number?.S || '',
    type: item.type?.S || '',
    createdAt: item.created_at?.S || '',
    updatedAt: item.updated_at?.S || '',
  };
}

function mapLink(item) {
  if (!item) return null;
  return {
    id: item.SK?.S?.replace('LINK#', '') || '',
    contactId: item.PK?.S?.replace('CONTACT#', '') || '',
    label: item.label?.S || '',
    url: item.url?.S || '',
    platform: item.platform?.S || '',
    createdAt: item.created_at?.S || '',
    updatedAt: item.updated_at?.S || '',
  };
}

function mapEmail(item) {
  if (!item) return null;
  return {
    id: item.SK?.S?.replace('EMAIL#', '') || '',
    contactId: item.PK?.S?.replace('CONTACT#', '') || '',
    label: item.label?.S || '',
    email: item.email?.S || '',
    createdAt: item.created_at?.S || '',
    updatedAt: item.updated_at?.S || '',
  };
}

// ---- Builders ----

function buildContactMetadataItem(data) {
  const item = {
    PK: { S: `CONTACT#${normalizeString(data.id)}` },
    SK: { S: 'METADATA' },
    name: { S: normalizeString(data.name) },
    created_at: { S: data.createdAt || nowPH() },
    updated_at: { S: data.updatedAt || nowPH() },
  };
  const description = normalizeString(data.description);
  if (description) item.description = { S: description };
  return item;
}

function buildAddressItem(contactId, data) {
  const item = {
    PK: { S: `CONTACT#${normalizeString(contactId)}` },
    SK: { S: `ADDRESS#${normalizeString(data.id)}` },
    label: { S: normalizeString(data.label) },
    created_at: { S: data.createdAt || nowPH() },
    updated_at: { S: data.updatedAt || nowPH() },
  };
  const street = normalizeString(data.street);
  if (street) item.street = { S: street };
  const barangay = normalizeString(data.barangay);
  if (barangay) item.barangay = { S: barangay };
  const city = normalizeString(data.city);
  if (city) item.city = { S: city };
  const province = normalizeString(data.province);
  if (province) item.province = { S: province };
  const country = normalizeString(data.country);
  if (country) item.country = { S: country };
  const zipCode = normalizeString(data.zipCode);
  if (zipCode) item.zipCode = { S: zipCode };
  return item;
}

function buildPhoneItem(contactId, data) {
  const item = {
    PK: { S: `CONTACT#${normalizeString(contactId)}` },
    SK: { S: `PHONE#${normalizeString(data.id)}` },
    label: { S: normalizeString(data.label) },
    number: { S: normalizeString(data.number) },
    created_at: { S: data.createdAt || nowPH() },
    updated_at: { S: data.updatedAt || nowPH() },
  };
  const type = normalizeString(data.type);
  if (type) item.type = { S: type };
  return item;
}

function buildLinkItem(contactId, data) {
  const item = {
    PK: { S: `CONTACT#${normalizeString(contactId)}` },
    SK: { S: `LINK#${normalizeString(data.id)}` },
    label: { S: normalizeString(data.label) },
    url: { S: normalizeString(data.url) },
    created_at: { S: data.createdAt || nowPH() },
    updated_at: { S: data.updatedAt || nowPH() },
  };
  const platform = normalizeString(data.platform);
  if (platform) item.platform = { S: platform };
  return item;
}

function buildEmailItem(contactId, data) {
  return {
    PK: { S: `CONTACT#${normalizeString(contactId)}` },
    SK: { S: `EMAIL#${normalizeString(data.id)}` },
    label: { S: normalizeString(data.label) },
    email: { S: normalizeString(data.email) },
    created_at: { S: data.createdAt || nowPH() },
    updated_at: { S: data.updatedAt || nowPH() },
  };
}

// ---- Internal helpers ----

async function queryContactItems(contactId) {
  const response = await dynamoClient.send(
    new QueryCommand({
      TableName: DYNAMO_TABLE,
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: { '#pk': 'PK' },
      ExpressionAttributeValues: {
        ':pk': { S: `CONTACT#${normalizeString(contactId)}` },
      },
    })
  );
  return response.Items || [];
}

function assembleContact(items) {
  const metadata = items.find((i) => i.SK?.S === 'METADATA');
  if (!metadata) return null;
  return {
    ...mapContactMetadata(metadata),
    addresses: items
      .filter((i) => i.SK?.S?.startsWith('ADDRESS#'))
      .map(mapAddress),
    phones: items.filter((i) => i.SK?.S?.startsWith('PHONE#')).map(mapPhone),
    links: items.filter((i) => i.SK?.S?.startsWith('LINK#')).map(mapLink),
    emails: items.filter((i) => i.SK?.S?.startsWith('EMAIL#')).map(mapEmail),
  };
}

async function getSubItem(contactId, sk) {
  const response = await dynamoClient.send(
    new GetItemCommand({
      TableName: DYNAMO_TABLE,
      Key: {
        PK: { S: `CONTACT#${normalizeString(contactId)}` },
        SK: { S: sk },
      },
    })
  );
  return response.Item || null;
}

// ---- Contact CRUD ----

export async function createContact(data) {
  if (!normalizeString(data.name)) throw new Error('name is required');

  const id = normalizeString(data.id) || randomUUID();
  const now = nowPH();
  const item = buildContactMetadataItem({
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  });

  await dynamoClient.send(
    new PutItemCommand({
      TableName: DYNAMO_TABLE,
      Item: item,
      ConditionExpression:
        'attribute_not_exists(PK) AND attribute_not_exists(SK)',
    })
  );
  return mapContactMetadata(item);
}

export async function getContacts() {
  const response = await dynamoClient.send(
    new ScanCommand({
      TableName: DYNAMO_TABLE,
      FilterExpression: 'begins_with(#pk, :prefix)',
      ExpressionAttributeNames: { '#pk': 'PK' },
      ExpressionAttributeValues: {
        ':prefix': { S: 'CONTACT#' },
      },
    })
  );

  const items = response.Items || [];
  const groups = new Map();
  for (const item of items) {
    const pk = item.PK?.S;
    if (!pk) continue;
    if (!groups.has(pk)) groups.set(pk, []);
    groups.get(pk).push(item);
  }

  const contacts = [];
  for (const groupItems of groups.values()) {
    const contact = assembleContact(groupItems);
    if (contact) contacts.push(contact);
  }
  return contacts;
}

export async function getContactById(contactId) {
  if (!contactId) throw new Error('Contact ID is required');
  const items = await queryContactItems(contactId);
  return assembleContact(items);
}

export async function updateContact(contactId, data) {
  if (!contactId) throw new Error('Contact ID is required');

  const existing = await getContactById(contactId);
  if (!existing) throw new Error('Contact not found');

  const updated = buildContactMetadataItem({
    id: contactId,
    name:
      data.name !== undefined
        ? normalizeString(data.name) || existing.name
        : existing.name,
    description:
      data.description !== undefined
        ? normalizeString(data.description)
        : existing.description,
    createdAt: existing.createdAt,
    updatedAt: nowPH(),
  });

  await dynamoClient.send(
    new PutItemCommand({ TableName: DYNAMO_TABLE, Item: updated })
  );
  return mapContactMetadata(updated);
}

export async function deleteContact(contactId) {
  if (!contactId) throw new Error('Contact ID is required');

  const items = await queryContactItems(contactId);
  if (!items.find((i) => i.SK?.S === 'METADATA'))
    throw new Error('Contact not found');

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

// ---- Address CRUD ----

export async function addAddress(contactId, data) {
  if (!contactId) throw new Error('Contact ID is required');

  const existing = await getContactById(contactId);
  if (!existing) throw new Error('Contact not found');

  if (!normalizeString(data.label)) throw new Error('label is required');

  const id = randomUUID();
  const item = buildAddressItem(contactId, {
    ...data,
    id,
    createdAt: nowPH(),
    updatedAt: nowPH(),
  });

  await dynamoClient.send(
    new PutItemCommand({
      TableName: DYNAMO_TABLE,
      Item: item,
      ConditionExpression:
        'attribute_not_exists(PK) AND attribute_not_exists(SK)',
    })
  );
  return mapAddress(item);
}

export async function updateAddress(contactId, addressId, data) {
  if (!contactId) throw new Error('Contact ID is required');
  if (!addressId) throw new Error('Address ID is required');

  const existing = await getSubItem(contactId, `ADDRESS#${addressId}`);
  if (!existing) throw new Error('Address not found');

  const current = mapAddress(existing);
  const updated = buildAddressItem(contactId, {
    id: addressId,
    label:
      data.label !== undefined
        ? normalizeString(data.label) || current.label
        : current.label,
    street: data.street !== undefined ? data.street : current.street,
    barangay: data.barangay !== undefined ? data.barangay : current.barangay,
    city: data.city !== undefined ? data.city : current.city,
    province: data.province !== undefined ? data.province : current.province,
    country: data.country !== undefined ? data.country : current.country,
    zipCode: data.zipCode !== undefined ? data.zipCode : current.zipCode,
    createdAt: current.createdAt,
    updatedAt: nowPH(),
  });

  await dynamoClient.send(
    new PutItemCommand({ TableName: DYNAMO_TABLE, Item: updated })
  );
  return mapAddress(updated);
}

export async function deleteAddress(contactId, addressId) {
  if (!contactId) throw new Error('Contact ID is required');
  if (!addressId) throw new Error('Address ID is required');

  const existing = await getSubItem(contactId, `ADDRESS#${addressId}`);
  if (!existing) throw new Error('Address not found');

  await dynamoClient.send(
    new DeleteItemCommand({
      TableName: DYNAMO_TABLE,
      Key: {
        PK: { S: `CONTACT#${normalizeString(contactId)}` },
        SK: { S: `ADDRESS#${normalizeString(addressId)}` },
      },
    })
  );
}

// ---- Phone CRUD ----

export async function addPhone(contactId, data) {
  if (!contactId) throw new Error('Contact ID is required');

  const existing = await getContactById(contactId);
  if (!existing) throw new Error('Contact not found');

  if (!normalizeString(data.label)) throw new Error('label is required');
  if (!normalizeString(data.number)) throw new Error('number is required');

  const id = randomUUID();
  const item = buildPhoneItem(contactId, {
    ...data,
    id,
    createdAt: nowPH(),
    updatedAt: nowPH(),
  });

  await dynamoClient.send(
    new PutItemCommand({
      TableName: DYNAMO_TABLE,
      Item: item,
      ConditionExpression:
        'attribute_not_exists(PK) AND attribute_not_exists(SK)',
    })
  );
  return mapPhone(item);
}

export async function updatePhone(contactId, phoneId, data) {
  if (!contactId) throw new Error('Contact ID is required');
  if (!phoneId) throw new Error('Phone ID is required');

  const existing = await getSubItem(contactId, `PHONE#${phoneId}`);
  if (!existing) throw new Error('Phone not found');

  const current = mapPhone(existing);
  const updated = buildPhoneItem(contactId, {
    id: phoneId,
    label:
      data.label !== undefined
        ? normalizeString(data.label) || current.label
        : current.label,
    number:
      data.number !== undefined
        ? normalizeString(data.number) || current.number
        : current.number,
    type: data.type !== undefined ? data.type : current.type,
    createdAt: current.createdAt,
    updatedAt: nowPH(),
  });

  await dynamoClient.send(
    new PutItemCommand({ TableName: DYNAMO_TABLE, Item: updated })
  );
  return mapPhone(updated);
}

export async function deletePhone(contactId, phoneId) {
  if (!contactId) throw new Error('Contact ID is required');
  if (!phoneId) throw new Error('Phone ID is required');

  const existing = await getSubItem(contactId, `PHONE#${phoneId}`);
  if (!existing) throw new Error('Phone not found');

  await dynamoClient.send(
    new DeleteItemCommand({
      TableName: DYNAMO_TABLE,
      Key: {
        PK: { S: `CONTACT#${normalizeString(contactId)}` },
        SK: { S: `PHONE#${normalizeString(phoneId)}` },
      },
    })
  );
}

// ---- Link CRUD ----

export async function addLink(contactId, data) {
  if (!contactId) throw new Error('Contact ID is required');

  const existing = await getContactById(contactId);
  if (!existing) throw new Error('Contact not found');

  if (!normalizeString(data.label)) throw new Error('label is required');
  if (!normalizeString(data.url)) throw new Error('url is required');

  const id = randomUUID();
  const item = buildLinkItem(contactId, {
    ...data,
    id,
    createdAt: nowPH(),
    updatedAt: nowPH(),
  });

  await dynamoClient.send(
    new PutItemCommand({
      TableName: DYNAMO_TABLE,
      Item: item,
      ConditionExpression:
        'attribute_not_exists(PK) AND attribute_not_exists(SK)',
    })
  );
  return mapLink(item);
}

export async function updateLink(contactId, linkId, data) {
  if (!contactId) throw new Error('Contact ID is required');
  if (!linkId) throw new Error('Link ID is required');

  const existing = await getSubItem(contactId, `LINK#${linkId}`);
  if (!existing) throw new Error('Link not found');

  const current = mapLink(existing);
  const updated = buildLinkItem(contactId, {
    id: linkId,
    label:
      data.label !== undefined
        ? normalizeString(data.label) || current.label
        : current.label,
    url:
      data.url !== undefined
        ? normalizeString(data.url) || current.url
        : current.url,
    platform: data.platform !== undefined ? data.platform : current.platform,
    createdAt: current.createdAt,
    updatedAt: nowPH(),
  });

  await dynamoClient.send(
    new PutItemCommand({ TableName: DYNAMO_TABLE, Item: updated })
  );
  return mapLink(updated);
}

export async function deleteLink(contactId, linkId) {
  if (!contactId) throw new Error('Contact ID is required');
  if (!linkId) throw new Error('Link ID is required');

  const existing = await getSubItem(contactId, `LINK#${linkId}`);
  if (!existing) throw new Error('Link not found');

  await dynamoClient.send(
    new DeleteItemCommand({
      TableName: DYNAMO_TABLE,
      Key: {
        PK: { S: `CONTACT#${normalizeString(contactId)}` },
        SK: { S: `LINK#${normalizeString(linkId)}` },
      },
    })
  );
}

// ---- Email CRUD ----

export async function addEmail(contactId, data) {
  if (!contactId) throw new Error('Contact ID is required');

  const existing = await getContactById(contactId);
  if (!existing) throw new Error('Contact not found');

  if (!normalizeString(data.label)) throw new Error('label is required');
  if (!normalizeString(data.email)) throw new Error('email is required');

  const id = randomUUID();
  const item = buildEmailItem(contactId, {
    ...data,
    id,
    createdAt: nowPH(),
    updatedAt: nowPH(),
  });

  await dynamoClient.send(
    new PutItemCommand({
      TableName: DYNAMO_TABLE,
      Item: item,
      ConditionExpression:
        'attribute_not_exists(PK) AND attribute_not_exists(SK)',
    })
  );
  return mapEmail(item);
}

export async function updateEmail(contactId, emailId, data) {
  if (!contactId) throw new Error('Contact ID is required');
  if (!emailId) throw new Error('Email ID is required');

  const existing = await getSubItem(contactId, `EMAIL#${emailId}`);
  if (!existing) throw new Error('Email not found');

  const current = mapEmail(existing);
  const updated = buildEmailItem(contactId, {
    id: emailId,
    label:
      data.label !== undefined
        ? normalizeString(data.label) || current.label
        : current.label,
    email:
      data.email !== undefined
        ? normalizeString(data.email) || current.email
        : current.email,
    createdAt: current.createdAt,
    updatedAt: nowPH(),
  });

  await dynamoClient.send(
    new PutItemCommand({ TableName: DYNAMO_TABLE, Item: updated })
  );
  return mapEmail(updated);
}

export async function deleteEmail(contactId, emailId) {
  if (!contactId) throw new Error('Contact ID is required');
  if (!emailId) throw new Error('Email ID is required');

  const existing = await getSubItem(contactId, `EMAIL#${emailId}`);
  if (!existing) throw new Error('Email not found');

  await dynamoClient.send(
    new DeleteItemCommand({
      TableName: DYNAMO_TABLE,
      Key: {
        PK: { S: `CONTACT#${normalizeString(contactId)}` },
        SK: { S: `EMAIL#${normalizeString(emailId)}` },
      },
    })
  );
}
