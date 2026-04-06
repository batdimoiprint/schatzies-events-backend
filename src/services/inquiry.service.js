import { randomUUID } from 'crypto';
import dynamoClient, { DYNAMO_TABLE } from '../configs/dynamo.js';
import {
  PutItemCommand,
  ScanCommand,
  GetItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
} from '@aws-sdk/client-dynamodb';

const USE_DYNAMO = process.env.USE_DYNAMO === 'true';

const inquiries = [];

const TABLE = process.env.AWS_INQUIRY_TABLE || DYNAMO_TABLE;

const weddingPackages = ["Bloom", "Fascinating", "Windy", "De Luxe", "Grandezza"];
const debutPackages = ["Charming", "Irresistible", "Elegancia", "Flawless", "Grandiosa"];


function validateRequired(inquiryData) {
  const { firstName, lastName, date, eventType, eventPackage, eventPax } = inquiryData;
  if (!firstName || !lastName || !date || !eventType || !eventPackage || !eventPax) {
    throw new Error('Missing required fields');
  }
  if (eventType === 'Wedding' && !weddingPackages.includes(eventPackage)) {
    throw new Error('Invalid Wedding package');
  }
  if (eventType === 'Debut' && !debutPackages.includes(eventPackage)) {
    throw new Error('Invalid Debut package');
  }
  const validPax = eventPackage === 'Bloom' ? [50, 100, 150, 200] : [100, 150, 200];
  if (!validPax.includes(eventPax)) {
    throw new Error(`Invalid number of pax for ${eventPackage}`);
  }
}

export async function createInquiry(inquiryData) {
  if (!inquiryData || typeof inquiryData !== 'object') {
    throw new Error('Invalid inquiry data');
  }

  validateRequired(inquiryData);

  const id = randomUUID();
  const now = new Date().toISOString();

  const newInquiry = {
    id,
    firstName: inquiryData.firstName,
    middleName: inquiryData.middleName || '',
    lastName: inquiryData.lastName,
    date: inquiryData.date,
    eventType: inquiryData.eventType,
    eventPackage: inquiryData.eventPackage,
    eventPax: inquiryData.eventPax,
    message: inquiryData.message || '',
    email: inquiryData.email || null,
    contactNumber: inquiryData.contactNumber || null,
    createdAt: now,
    updatedAt: now,
  };

  const item = {
    inquiry_id: newInquiry.id,
    firstName: newInquiry.firstName,
    middleName: newInquiry.middleName,
    lastName: newInquiry.lastName,
    date: newInquiry.date,
    eventType: newInquiry.eventType,
    eventPackage: newInquiry.eventPackage,
    eventPax: newInquiry.eventPax,
    message: newInquiry.message,
    email: newInquiry.email,
    contactNumber: newInquiry.contactNumber,
    created_at: newInquiry.createdAt,
    updated_at: newInquiry.updatedAt,
  };

    if (USE_DYNAMO) {
      if (!TABLE) throw new Error('Inquiry table not configured');
      await dynamoClient.send(new PutItemCommand({ TableName: TABLE, Item: marshallItem(item) }));
    return newInquiry;
  }

  inquiries.push(newInquiry);
  return newInquiry;
}

export async function getInquiries() {
  if (USE_DYNAMO) {
    if (!TABLE) throw new Error('Inquiry table not configured');
    const resp = await dynamoClient.send(new ScanCommand({ TableName: TABLE }));
    const items = resp.Items || [];
    return items.map((it) => {
      const u = unmarshallItem(it);
      return {
        id: u.inquiry_id,
        firstName: u.firstName,
        middleName: u.middleName,
        lastName: u.lastName,
        date: u.date,
        eventType: u.eventType,
        eventPackage: u.eventPackage,
        eventPax: u.eventPax,
        message: u.message,
        email: u.email,
        contactNumber: u.contactNumber,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      };
    });
  }

  return [...inquiries];
}

export async function getInquiryById(inquiryId) {
  if (!inquiryId) throw new Error('Inquiry ID is required');
  if (USE_DYNAMO) {
    if (!TABLE) throw new Error('Inquiry table not configured');
    const resp = await dynamoClient.send(new GetItemCommand({ TableName: TABLE, Key: marshallItem({ inquiry_id: inquiryId }) }));
    const it = resp.Item;
    if (!it) return null;
    const u = unmarshallItem(it);
    return {
      id: u.inquiry_id,
      firstName: u.firstName,
      middleName: u.middleName,
      lastName: u.lastName,
      date: u.date,
      eventType: u.eventType,
      eventPackage: u.eventPackage,
      eventPax: u.eventPax,
      message: u.message,
      email: u.email,
      contactNumber: u.contactNumber,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    };
  }

  return inquiries.find((inq) => inq.id === inquiryId) || null;
}

export async function updateInquiry(inquiryId, updateData) {
  if (!inquiryId) throw new Error('Inquiry ID is required');
  if (!updateData || typeof updateData !== 'object') throw new Error('Invalid update data');
  const allowed = ['firstName','middleName','lastName','date','eventType','eventPackage','eventPax','message','email','contactNumber'];

  if (USE_DYNAMO) {
    if (!TABLE) throw new Error('Inquiry table not configured');
    const parts = [];
    const ExpressionAttributeValues = {};
    const ExpressionAttributeNames = {};
    let idx = 0;
    Object.keys(updateData).forEach((k) => {
      if (!allowed.includes(k)) return;
      const valPlaceholder = `:v${idx}`;
      const namePlaceholder = `#n${idx}`;
      parts.push(`${namePlaceholder} = ${valPlaceholder}`);
      ExpressionAttributeValues[valPlaceholder] = toAttributeValue(updateData[k]);
      ExpressionAttributeNames[namePlaceholder] = k;
      idx += 1;
    });
    parts.push('#updated_at = :u');
    ExpressionAttributeValues[':u'] = toAttributeValue(new Date().toISOString());
    ExpressionAttributeNames['#updated_at'] = 'updated_at';

    const UpdateExpression = 'SET ' + parts.join(', ');

    await dynamoClient.send(new UpdateItemCommand({
      TableName: TABLE,
      Key: marshallItem({ inquiry_id: inquiryId }),
      UpdateExpression,
      ExpressionAttributeNames: ExpressionAttributeNames,
      ExpressionAttributeValues: ExpressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    return getInquiryById(inquiryId);
  }

  const index = inquiries.findIndex((inq) => inq.id === inquiryId);
  if (index === -1) throw new Error('Inquiry not found');

  const existing = inquiries[index];
  const updated = {
    ...existing,
    ...updateData,
    updatedAt: new Date().toISOString(),
  };

  inquiries[index] = updated;
  return updated;
}

export async function deleteInquiry(inquiryId) {
  if (!inquiryId) throw new Error('Inquiry ID is required');
  if (USE_DYNAMO) {
    if (!TABLE) throw new Error('Inquiry table not configured');
    const resp = await dynamoClient.send(new DeleteItemCommand({ TableName: TABLE, Key: marshallItem({ inquiry_id: inquiryId }), ReturnValues: 'ALL_OLD' }));
    const old = resp.Attributes;
    if (!old) throw new Error('Inquiry not found');
    const u = unmarshallItem(old);
    return { id: u.inquiry_id, ...u };
  }

  const index = inquiries.findIndex((inq) => inq.id === inquiryId);
  if (index === -1) throw new Error('Inquiry not found');
  const [deleted] = inquiries.splice(index, 1);
  return deleted;
}

function toAttributeValue(value) {
  if (value === null || value === undefined) return { NULL: true };
  if (typeof value === 'string') return { S: value };
  if (typeof value === 'number') return { N: String(value) };
  if (typeof value === 'boolean') return { BOOL: value };
  return { S: String(value) };
}

function marshallItem(obj) {
  const item = {};
  for (const k in obj) {
    const v = obj[k];
    if (v === undefined) continue;
    item[k] = toAttributeValue(v);
  }
  return item;
}

function unmarshallItem(item) {
  const out = {};
  for (const k in item) {
    const v = item[k];
    if (v.S !== undefined) out[k] = v.S;
    else if (v.N !== undefined) out[k] = Number(v.N);
    else if (v.BOOL !== undefined) out[k] = v.BOOL;
    else if (v.NULL) out[k] = null;
    else out[k] = v;
  }
  return out;
}