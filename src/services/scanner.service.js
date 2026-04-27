import { findRsvpByQrCode, checkInRsvpGuest } from './rsvp.service.js';

export async function scanQrCode(eventId, qrCode) {
  const rsvp = await findRsvpByQrCode(eventId, qrCode);
  if (!rsvp) {
    throw new Error('Invalid QR');
  }

  if (rsvp.status.toUpperCase() !== 'ATTENDING') {
    throw new Error('Guest is not attending');
  }

  if (rsvp.isScanned) {
    throw new Error('Already checked in');
  }

  return checkInRsvpGuest(eventId, rsvp.guestId);
}
