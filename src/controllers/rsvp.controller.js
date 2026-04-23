import QRCode from 'qrcode';
import {
  getAttendingGuests,
  getAllRsvps,
  getHeadcount,
  checkInRsvpGuest,
  createRsvpGuest as createRsvpGuestService,
} from '../services/rsvp.service.js';

function buildGuestName(guest) {
  return [guest.guestfirstName, guest.guestmiddleName, guest.guestlastName]
    .filter(Boolean)
    .join(' ')
    .trim();
}

export async function getRsvpList(req, res) {
  try {
    const { eventId } = req.params;
    const guests = await getAttendingGuests(eventId);
    return res.status(200).json({ guests });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch RSVP guests';
    return res.status(400).json({ message });
  }
}

export async function getEventHeadcount(req, res) {
  try {
    const { eventId } = req.params;
    const headcount = await getHeadcount(eventId);
    return res.status(200).json(headcount);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch headcount';
    return res.status(400).json({ message });
  }
}

export async function createRsvpGuest(req, res) {
  try {
    const { eventId } = req.params;
    if (!eventId || !String(eventId).trim()) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    const payload = req.body ?? {};
    const guest = await createRsvpGuestService(eventId, payload);
    return res.status(201).json({ guest });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create RSVP guest';
    return res.status(400).json({ message });
  }
}

export async function manualCheckIn(req, res) {
  try {
    const { eventId, guestId } = req.params;
    const guest = await checkInRsvpGuest(eventId, guestId);
    return res.status(200).json({
      message: 'Guest checked in',
      guestName: buildGuestName(guest),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to check in guest';
    return res.status(400).json({ message });
  }
}

export async function createRsvp(req, res) {
  try {
    const { event_id, first_name, last_name, contact_number, status, message } = req.body;
    if (!event_id) {
      return res.status(400).json({ message: 'event_id is required' });
    }

    const payload = {
      firstName: first_name,
      lastName: last_name,
      contactNumber: contact_number,
      status,
      message,
    };

    const guest = await createRsvpGuestService(event_id, payload);
    return res.status(201).json({ guest });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unable to submit RSVP form';
    return res.status(400).json({ message: errorMessage });
  }
}

export async function generateRsvpQr(req, res) {
  try {
    const { eventId } = req.params;
    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    const { getEventById, updateEvent } = await import('../services/event.service.js');
    const event = await getEventById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Reference your pseudo code: IF event already has QR, return it.
    if (event.rsvpQrCode) {
      return res.status(200).json({
        qrCode: event.rsvpQrCode,
        message: 'Returned existing QR code',
      });
    }

    // Assuming FRONTEND_URL is set in environment vars
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const rsvpUrl = `${baseUrl}/rsvp?eventId=${eventId}`;

    const qrCodeImage = await QRCode.toDataURL(rsvpUrl);
    
    // Save to EVENT item
    await updateEvent(eventId, { rsvpQrCode: qrCodeImage });

    return res.status(200).json({
      qrCode: qrCodeImage,
      url: rsvpUrl,
      message: 'Generated and saved new QR code',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate QR code';
    return res.status(500).json({ message });
  }
}

export async function getEventRsvps(req, res) {
  try {
    const { eventId } = req.params;
    const guests = await getAllRsvps(eventId);
    return res.status(200).json({ guests });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch event RSVPs';
    return res.status(400).json({ message });
  }
}
