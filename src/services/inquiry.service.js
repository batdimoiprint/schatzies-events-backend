import { randomUUID } from 'crypto';
import dynamoClient, { DYNAMO_TABLE } from '../configs/dynamo.js';
import {
  PutItemCommand,
  ScanCommand,
  GetItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { createCalendarEntry } from './calendar.service.js';
import { sendMeetingInviteEmail } from './mailer.service.js';

const USE_DYNAMO = process.env.USE_DYNAMO !== 'false'; // Default true (hardcoded); set to 'false' in .env to disable

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

function mapToFrontend(u) {
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
    status: u.status || 'Pending Review',
    communications: u.communications || [],
    meetingDetails: u.meetingDetails || null,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  };
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
    status: 'Pending Review',
    communications: [],
    meetingDetails: null,
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
    status: newInquiry.status,
    communications: newInquiry.communications,
    meetingDetails: newInquiry.meetingDetails,
    created_at: newInquiry.createdAt,
    updated_at: newInquiry.updatedAt,
  };

  if (USE_DYNAMO) {
    if (!TABLE) throw new Error('Inquiry table not configured (AWS_INQUIRY_TABLE or AWS_DYNAMO_TABLE env required)');
    await dynamoClient.send(new PutItemCommand({ TableName: TABLE, Item: marshall(item, { removeUndefinedValues: true }) }));
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
    return items.map((it) => mapToFrontend(unmarshall(it)));
  }

  return [...inquiries];
}

export async function getInquiryById(inquiryId) {
  if (!inquiryId) throw new Error('Inquiry ID is required');
  if (USE_DYNAMO) {
    if (!TABLE) throw new Error('Inquiry table not configured');
    const resp = await dynamoClient.send(new GetItemCommand({ TableName: TABLE, Key: marshall({ inquiry_id: inquiryId }) }));
    const it = resp.Item;
    if (!it) return null;
    return mapToFrontend(unmarshall(it));
  }

  return inquiries.find((inq) => inq.id === inquiryId) || null;
}

export async function updateInquiry(inquiryId, updateData) {
  if (!inquiryId) throw new Error('Inquiry ID is required');
  if (!updateData || typeof updateData !== 'object') throw new Error('Invalid update data');
  const allowed = ['firstName','middleName','lastName','date','eventType','eventPackage','eventPax','message','email','contactNumber','status','communications','meetingDetails'];

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
      ExpressionAttributeValues[valPlaceholder] = updateData[k];
      ExpressionAttributeNames[namePlaceholder] = k;
      idx += 1;
    });
    parts.push('#updated_at = :u');
    ExpressionAttributeValues[':u'] = new Date().toISOString();
    ExpressionAttributeNames['#updated_at'] = 'updated_at';

    const UpdateExpression = 'SET ' + parts.join(', ');

    await dynamoClient.send(new UpdateItemCommand({
      TableName: TABLE,
      Key: marshall({ inquiry_id: inquiryId }),
      UpdateExpression,
      ExpressionAttributeNames: ExpressionAttributeNames,
      ExpressionAttributeValues: marshall(ExpressionAttributeValues, { removeUndefinedValues: true }),
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
    const resp = await dynamoClient.send(new DeleteItemCommand({ TableName: TABLE, Key: marshall({ inquiry_id: inquiryId }), ReturnValues: 'ALL_OLD' }));
    const old = resp.Attributes;
    if (!old) throw new Error('Inquiry not found');
    const u = unmarshall(old);
    return { id: u.inquiry_id, ...u };
  }

  const index = inquiries.findIndex((inq) => inq.id === inquiryId);
  if (index === -1) throw new Error('Inquiry not found');
  const [deleted] = inquiries.splice(index, 1);
  return deleted;
}

export async function updateInquiryStatus(inquiryId, status) {
  return updateInquiry(inquiryId, { status });
}

export async function addCommunication(inquiryId, communication) {
  const inquiry = await getInquiryById(inquiryId);
  if (!inquiry) throw new Error('Inquiry not found');
  
  const communications = inquiry.communications || [];
  communications.push({
    ...communication,
    timestamp: new Date().toISOString()
  });

  return updateInquiry(inquiryId, { communications });
}

export async function scheduleMeeting(inquiryId, meetingDetails) {
  const inquiry = await getInquiryById(inquiryId);
  if (!inquiry) throw new Error('Inquiry not found');

  const { date, time, location, organizerId } = meetingDetails;

  const meetingObj = {
    date,
    time,
    location,
    organizerId,
    timestamp: new Date().toISOString()
  };

  // Update DB
  await updateInquiry(inquiryId, {
    status: 'Meeting Scheduled',
    meetingDetails: meetingObj,
  });

  // Provision on Calendar
  try {
     await createCalendarEntry(organizerId, {
       title: `Meeting for Inquiry: ${inquiry.firstName} ${inquiry.lastName}`,
       description: `Meeting at ${location} regarding ${inquiry.eventType}. Time: ${time}`,
       date: date,
       type: 'Meeting'
     });
  } catch(e) {
     console.error('Error creating calendar entry for meeting:', e.message);
  }

  // Auto-send email to guest
  try {
     await sendMeetingInviteEmail(inquiry, meetingObj);
  } catch(e) {
     console.error('Error dispatching meeting invite email:', e.message);
  }

  return getInquiryById(inquiryId);
}
