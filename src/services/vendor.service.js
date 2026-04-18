import { randomUUID } from 'crypto';
import { getEventById } from './event.service.js';
import { updateVendorSnapshot } from './dashboardAnalytics.service.js';

const vendors = [];

export async function createVendor(vendorData) {
  if (!vendorData || typeof vendorData !== 'object') {
    throw new Error('Invalid vendor data');
  }

  const { name, serviceType, eventId, contactEmail, contactPhone, status } = vendorData;

  if (!name || !serviceType || !eventId) {
    throw new Error('name, serviceType and eventId are required');
  }

  const event = await getEventById(eventId);
  if (!event) {
    throw new Error('Associated event not found');
  }

  const normalizedStatus = status ? String(status).trim().toLowerCase() : 'inactive';
  const newVendor = {
    id: randomUUID(),
    name,
    serviceType,
    eventId,
    contactEmail: contactEmail || '',
    contactPhone: contactPhone || '',
    status: normalizedStatus,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  vendors.push(newVendor);

  if (normalizedStatus === 'active') {
    await updateVendorSnapshot(newVendor.id, true);
  }

  return newVendor;
}

export async function getVendors(eventId) {
  if (eventId) {
    return vendors.filter((vendor) => vendor.eventId === eventId);
  }

  return [...vendors];
}

export async function getVendorById(vendorId) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }

  return vendors.find((vendor) => vendor.id === vendorId) || null;
}

export async function updateVendor(vendorId, updateData) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }

  const index = vendors.findIndex((vendor) => vendor.id === vendorId);
  if (index === -1) {
    throw new Error('Vendor not found');
  }

  if (!updateData || typeof updateData !== 'object') {
    throw new Error('Invalid update data');
  }

  const existingVendor = vendors[index];
  const { name, serviceType, eventId, contactEmail, contactPhone, status } = updateData;

  if (eventId !== undefined && eventId !== existingVendor.eventId) {
    const event = await getEventById(eventId);
    if (!event) {
      throw new Error('Associated event not found');
    }
  }

  const normalizedStatus =
    status !== undefined ? String(status).trim().toLowerCase() : existingVendor.status;

  const updatedVendor = {
    ...existingVendor,
    name: name !== undefined ? name : existingVendor.name,
    serviceType:
      serviceType !== undefined ? serviceType : existingVendor.serviceType,
    eventId: eventId !== undefined ? eventId : existingVendor.eventId,
    contactEmail:
      contactEmail !== undefined ? contactEmail : existingVendor.contactEmail,
    contactPhone:
      contactPhone !== undefined ? contactPhone : existingVendor.contactPhone,
    status: normalizedStatus,
    updatedAt: new Date().toISOString(),
  };

  vendors[index] = updatedVendor;

  if (existingVendor.status !== normalizedStatus) {
    const wasActive = existingVendor.status === 'active';
    const nowActive = normalizedStatus === 'active';

    if (wasActive !== nowActive) {
      await updateVendorSnapshot(updatedVendor.id, nowActive);
    }
  }

  return updatedVendor;
}

export async function deleteVendor(vendorId) {
  if (!vendorId) {
    throw new Error('Vendor ID is required');
  }

  const index = vendors.findIndex((vendor) => vendor.id === vendorId);
  if (index === -1) {
    throw new Error('Vendor not found');
  }

  const [deletedVendor] = vendors.splice(index, 1);
  return deletedVendor;
}

export async function getVendorsByEventId(eventId) {
  if (!eventId) {
    throw new Error('Event ID is required');
  }

  return vendors.filter((vendor) => vendor.eventId === eventId);
}
