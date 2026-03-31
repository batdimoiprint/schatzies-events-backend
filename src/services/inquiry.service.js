import { randomUUID } from 'crypto';

const inquiries = [];

const weddingPackages = ["Bloom", "Fascinating", "Windy", "De Luxe", "Grandezza"];
const debutPackages = ["Charming", "Irresistible", "Elegancia", "Flawless", "Grandiosa"];

export async function createInquiry(inquiryData) {
  if (!inquiryData || typeof inquiryData !== 'object') {
    throw new Error('Invalid inquiry data');
  }

  const {
    firstName,
    middleName,
    lastName,
    date,
    eventType,
    eventPackage,
    eventPax,
    message,
  } = inquiryData;

  if (!firstName || !lastName || !date || !eventType || !eventPackage || !eventPax) {
    throw new Error('Missing required fields');
  }

  if (eventType === "Wedding" && !weddingPackages.includes(eventPackage)) {
    throw new Error('Invalid Wedding package');
  }
  if (eventType === "Debut" && !debutPackages.includes(eventPackage)) {
    throw new Error('Invalid Debut package');
  }

  const validPax = eventPackage === "Bloom" ? [50, 100, 150, 200] : [100, 150, 200];
  if (!validPax.includes(eventPax)) {
    throw new Error(`Invalid number of pax for ${eventPackage}`);
  }

  const newInquiry = {
    id: randomUUID(),
    firstName,
    middleName: middleName || "",
    lastName,
    date,
    eventType,
    eventPackage,
    eventPax,
    message: message || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  inquiries.push(newInquiry);
  return newInquiry;
}

export async function getInquiries() {
  return [...inquiries];
}

export async function getInquiryById(inquiryId) {
  if (!inquiryId) throw new Error('Inquiry ID is required');
  return inquiries.find((inq) => inq.id === inquiryId) || null;
}

export async function updateInquiry(inquiryId, updateData) {
  if (!inquiryId) throw new Error('Inquiry ID is required');

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

  const index = inquiries.findIndex((inq) => inq.id === inquiryId);
  if (index === -1) throw new Error('Inquiry not found');

  const [deleted] = inquiries.splice(index, 1);
  return deleted;
}