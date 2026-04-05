import { getEventById } from '../services/event.service.js';
import { getOrganizerById as getOrganizerByIdService } from '../services/organizer.service.js';
import { respondWorkerRsvp as respondWorkerRsvpService } from '../services/event.service.js';

function parseRsvpRequest(req) {
  const eventId = req.query.eventId || req.body.eventId;
  const organizerId = req.query.organizerId || req.body.organizerId;
  const status = req.body.status || req.query.status;
  return { eventId, organizerId, status };
}

export async function getRsvpStatus(req, res) {
  try {
    const { eventId, organizerId } = parseRsvpRequest(req);
    if (!eventId || !organizerId) {
      return res.status(400).json({ error: 'eventId and organizerId are required' });
    }

    const event = await getEventById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const organizer = await getOrganizerByIdService(organizerId);
    if (!organizer) {
      return res.status(404).json({ error: 'Organizer not found' });
    }

    const assignment = Array.isArray(event.workerOrganizerAssignments)
      ? event.workerOrganizerAssignments.find((item) => item.organizerId === organizerId)
      : null;

    if (!assignment) {
      return res.status(404).json({ error: 'Worker assignment not found for this organizer' });
    }

    return res.status(200).json({
      event: {
        id: event.id,
        title: event.title,
        startDate: event.startDate,
        location: event.location,
      },
      organizer: {
        id: organizer.id,
        organizerFirstName: organizer.firstName,
        organizerMiddleName: organizer.middleName,
        organizerLastName: organizer.lastName,
        organizerName: organizer.name,
        organizerEmail: organizer.email,
      },
      rsvp: {
        status: assignment.status,
        timestamp: assignment.updatedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to get RSVP status';
    return res.status(500).json({ error: message });
  }
}

export async function respondRsvp(req, res) {
  try {
    const { eventId, organizerId, status } = parseRsvpRequest(req);
    if (!eventId || !organizerId || !status) {
      return res.status(400).json({ error: 'eventId, organizerId, and status are required' });
    }

    const event = await getEventById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const organizer = await getOrganizerByIdService(organizerId);
    if (!organizer) {
      return res.status(404).json({ error: 'Organizer not found' });
    }

    const updatedEvent = await respondWorkerRsvpService(eventId, organizerId, status);
    const assignment = updatedEvent.workerOrganizerAssignments.find((item) => item.organizerId === organizerId);

    return res.status(200).json({
      message: `RSVP ${assignment.status} successfully`,
      organizer: {
        id: organizer.id,
        organizerFirstName: organizer.firstName,
        organizerMiddleName: organizer.middleName,
        organizerLastName: organizer.lastName,
        organizerName: organizer.name,
        organizerEmail: organizer.email,
      },
      rsvp: {
        organizerId,
        eventId,
        status: assignment.status,
        timestamp: assignment.updatedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to respond to RSVP';
    return res.status(400).json({ error: message });
  }
}
