import { randomUUID } from 'crypto';
import { getEventById } from './event.service.js';

const organizers = [];

export async function createOrganizer(organizerData) {
  if (!organizerData || typeof organizerData !== 'object') {
    throw new Error('Invalid organizer data');
  }

  const { name, email, phone } = organizerData;
  if (!name || !email) {
    throw new Error('name and email are required');
  }

  const newOrganizer = {
    id: randomUUID(),
    name,
    email,
    phone: phone || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  organizers.push(newOrganizer);
  return newOrganizer;
}

export async function getOrganizers() {
  return [...organizers];
}

export async function getHeadOrganizerByEventId(eventId) {
  if (!eventId) {
    throw new Error('Event ID is required');
  }

  const event = await getEventById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  if (!event.headOrganizerId) {
    return null;
  }

  return organizers.find((org) => org.id === event.headOrganizerId) || null;
}

export async function getOrganizerById(organizerId) {
  if (!organizerId) {
    throw new Error('Organizer ID is required');
  }

  return organizers.find((org) => org.id === organizerId) || null;
}

export async function updateOrganizer(organizerId, updateData) {
  if (!organizerId) {
    throw new Error('Organizer ID is required');
  }

  const index = organizers.findIndex((org) => org.id === organizerId);
  if (index === -1) {
    throw new Error('Organizer not found');
  }

  if (!updateData || typeof updateData !== 'object') {
    throw new Error('Invalid update data');
  }

  const existing = organizers[index];
  const { name, email, phone } = updateData;

  if (name !== undefined && !name) {
    throw new Error('name cannot be empty');
  }

  if (email !== undefined && !email) {
    throw new Error('email cannot be empty');
  }

  const updatedOrganizer = {
    ...existing,
    name: name !== undefined ? name : existing.name,
    email: email !== undefined ? email : existing.email,
    phone: phone !== undefined ? phone : existing.phone,
    updatedAt: new Date().toISOString(),
  };

  organizers[index] = updatedOrganizer;
  return updatedOrganizer;
}

export async function deleteOrganizer(organizerId) {
  if (!organizerId) {
    throw new Error('Organizer ID is required');
  }

  const index = organizers.findIndex((org) => org.id === organizerId);
  if (index === -1) {
    throw new Error('Organizer not found');
  }

  const [deletedOrganizer] = organizers.splice(index, 1);
  return deletedOrganizer;
}
