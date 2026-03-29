import { randomUUID } from 'crypto';

const events = [];

export async function createEvent(eventData) {
  if (!eventData || typeof eventData !== 'object') {
    throw new Error('Invalid event data');
  }

  const { title, description, startDate, endDate, location } = eventData;

  if (!title || !startDate) {
    throw new Error('title and startDate are required');
  }

  const newEvent = {
    id: randomUUID(),
    title,
    description: description || '',
    startDate,
    endDate: endDate || null,
    location: location || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  events.push(newEvent);
  return newEvent;
}

export async function getEvents() {
  return [...events];
}

export async function getEventById(eventId) {
  if (!eventId) {
    throw new Error('Event ID is required');
  }

  return events.find((event) => event.id === eventId) || null;
}

export async function updateEvent(eventId, updateData) {
  if (!eventId) {
    throw new Error('Event ID is required');
  }

  const eventIndex = events.findIndex((event) => event.id === eventId);
  if (eventIndex === -1) {
    throw new Error('Event not found');
  }

  if (!updateData || typeof updateData !== 'object') {
    throw new Error('Invalid update data');
  }

  const existingEvent = events[eventIndex];
  const { title, description, startDate, endDate, location } = updateData;

  if (title !== undefined && !title) {
    throw new Error('title cannot be empty');
  }

  if (startDate !== undefined && !startDate) {
    throw new Error('startDate cannot be empty');
  }

  const updatedEvent = {
    ...existingEvent,
    title: title ?? existingEvent.title,
    description:
      description !== undefined ? description : existingEvent.description,
    startDate: startDate ?? existingEvent.startDate,
    endDate: endDate !== undefined ? endDate : existingEvent.endDate,
    location: location !== undefined ? location : existingEvent.location,
    updatedAt: new Date().toISOString(),
  };

  events[eventIndex] = updatedEvent;
  return updatedEvent;
}

export async function deleteEvent(eventId) {
  if (!eventId) {
    throw new Error('Event ID is required');
  }

  const eventIndex = events.findIndex((event) => event.id === eventId);
  if (eventIndex === -1) {
    throw new Error('Event not found');
  }

  const [deletedEvent] = events.splice(eventIndex, 1);
  return deletedEvent;
}
