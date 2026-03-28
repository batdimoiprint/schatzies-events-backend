import {
  createAttendee as createAttendeeService,
  getAttendees as getAttendeesService,
  getAttendeeById as getAttendeeByIdService,
  updateAttendee as updateAttendeeService,
  deleteAttendee as deleteAttendeeService,
  checkInAttendee as checkInAttendeeService,
  checkInAttendeeByQr as checkInAttendeeByQrService,
  getAttendeesByEventId as getAttendeesByEventIdService,
} from '../services/attendee.service.js';

export async function createAttendee(req, res) {
  try {
    const payload = req.body ?? {};
    const attendee = await createAttendeeService(payload);
    return res.status(201).json({ message: 'Attendee created successfully', attendee });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create attendee';
    return res.status(400).json({ error: message });
  }
}

export async function getAttendees(req, res) {
  try {
    const { eventId } = req.query;
    const attendees = await getAttendeesService(eventId);
    return res.status(200).json({ attendees });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch attendees';
    return res.status(500).json({ error: message });
  }
}

export async function getAttendeeById(req, res) {
  try {
    const { id } = req.params;
    const attendee = await getAttendeeByIdService(id);

    if (!attendee) {
      return res.status(404).json({ error: 'Attendee not found' });
    }

    return res.status(200).json({ attendee });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch attendee';
    return res.status(500).json({ error: message });
  }
}

export async function updateAttendee(req, res) {
  try {
    const { id } = req.params;
    const payload = req.body ?? {};
    const attendee = await updateAttendeeService(id, payload);

    return res.status(200).json({ message: 'Attendee updated successfully', attendee });
  } catch (error) {
    if (error instanceof Error && error.message === 'Attendee not found') {
      return res.status(404).json({ error: error.message });
    }

    const message = error instanceof Error ? error.message : 'Unable to update attendee';
    return res.status(400).json({ error: message });
  }
}

export async function deleteAttendee(req, res) {
  try {
    const { id } = req.params;
    await deleteAttendeeService(id);
    return res.status(200).json({ message: 'Attendee deleted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Attendee not found') {
      return res.status(404).json({ error: error.message });
    }

    const message = error instanceof Error ? error.message : 'Unable to delete attendee';
    return res.status(500).json({ error: message });
  }
}

export async function checkInAttendee(req, res) {
  try {
    const { id } = req.params;
    const attendee = await checkInAttendeeService(id);
    return res.status(200).json({ message: 'Attendee checked in successfully', attendee });
  } catch (error) {
    if (error instanceof Error && error.message === 'Attendee not found') {
      return res.status(404).json({ error: error.message });
    }

    const message = error instanceof Error ? error.message : 'Unable to check in attendee';
    return res.status(400).json({ error: message });
  }
}

export async function checkInAttendeeByQr(req, res) {
  try {
    const { eventId, qrCode } = req.body ?? {};
    const attendee = await checkInAttendeeByQrService(eventId, qrCode);
    return res.status(200).json({ message: 'Attendee checked in via QR successfully', attendee });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to check in attendee via QR';
    return res.status(400).json({ error: message });
  }
}

export async function getAttendeesByEventId(req, res) {
  try {
    const { id } = req.params;
    const attendees = await getAttendeesByEventIdService(id);
    return res.status(200).json({ attendees });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch attendees for event';
    return res.status(500).json({ error: message });
  }
}