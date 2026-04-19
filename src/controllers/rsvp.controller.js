import {
  getAttendingGuests,
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
