import { randomUUID } from 'crypto';
import { getEventById } from './event.service.js';

const attendees = [];

export async function createAttendee(attendeeData) {
  if (!attendeeData || typeof attendeeData !== 'object') {
    throw new Error('Invalid attendee data');
  }

  const { name, email, eventId } = attendeeData;

  if (!name || !email || !eventId) {
    throw new Error('name, email and eventId are required');
  }

  const event = await getEventById(eventId);
  if (!event) {
    throw new Error('Associated event not found');
  }

  const newAttendee = {
    id: randomUUID(),
    name,
    email,
    eventId,
    qrCode: randomUUID(),
    status: 'registered',
    checkinTime: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  attendees.push(newAttendee);
  return newAttendee;
}

export async function getAttendees(eventId) {
  if (eventId) {
    return attendees.filter((attendee) => attendee.eventId === eventId);
  }

  return [...attendees];
}

export async function getAttendeeById(attendeeId) {
  if (!attendeeId) {
    throw new Error('Attendee ID is required');
  }

  return attendees.find((attendee) => attendee.id === attendeeId) || null;
}

export async function updateAttendee(attendeeId, updateData) {
  if (!attendeeId) {
    throw new Error('Attendee ID is required');
  }

  const index = attendees.findIndex((attendee) => attendee.id === attendeeId);
  if (index === -1) {
    throw new Error('Attendee not found');
  }

  if (!updateData || typeof updateData !== 'object') {
    throw new Error('Invalid update data');
  }

  const existingAttendee = attendees[index];
  const { name, email, eventId, status, checkinTime } = updateData;

  if (eventId !== undefined && eventId !== existingAttendee.eventId) {
    const event = await getEventById(eventId);
    if (!event) {
      throw new Error('Associated event not found');
    }
  }

  const updatedAttendee = {
    ...existingAttendee,
    name: name !== undefined ? name : existingAttendee.name,
    email: email !== undefined ? email : existingAttendee.email,
    eventId: eventId !== undefined ? eventId : existingAttendee.eventId,
    status: status !== undefined ? status : existingAttendee.status,
    checkinTime:
      checkinTime !== undefined ? checkinTime : existingAttendee.checkinTime,
    updatedAt: new Date().toISOString(),
  };

  attendees[index] = updatedAttendee;
  return updatedAttendee;
}

export async function deleteAttendee(attendeeId) {
  if (!attendeeId) {
    throw new Error('Attendee ID is required');
  }

  const index = attendees.findIndex((attendee) => attendee.id === attendeeId);
  if (index === -1) {
    throw new Error('Attendee not found');
  }

  const [deletedAttendee] = attendees.splice(index, 1);
  return deletedAttendee;
}

export async function checkInAttendee(attendeeId) {
  if (!attendeeId) {
    throw new Error('Attendee ID is required');
  }

  const index = attendees.findIndex((attendee) => attendee.id === attendeeId);
  if (index === -1) {
    throw new Error('Attendee not found');
  }

  const attendee = attendees[index];
  const checkedInAttendee = {
    ...attendee,
    status: 'checked_in',
    checkinTime: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  attendees[index] = checkedInAttendee;
  return checkedInAttendee;
}

export async function checkInAttendeeByQr(eventId, qrCode) {
  if (!eventId) {
    throw new Error('Event ID is required for QR code check-in');
  }
  if (!qrCode) {
    throw new Error('QR code is required for check-in');
  }

  const attendeeIndex = attendees.findIndex(
    (attendee) => attendee.qrCode === qrCode
  );
  if (attendeeIndex === -1) {
    throw new Error('Invalid QR code');
  }

  const attendee = attendees[attendeeIndex];
  if (attendee.eventId !== eventId) {
    throw new Error('QR code does not belong to this event');
  }

  const checkedInAttendee = {
    ...attendee,
    status: 'checked_in',
    checkinTime: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  attendees[attendeeIndex] = checkedInAttendee;
  return checkedInAttendee;
}

export async function getAttendeesByEventId(eventId) {
  if (!eventId) {
    throw new Error('Event ID is required');
  }

  return attendees.filter((attendee) => attendee.eventId === eventId);
}
