import {
  createEvent as createEventService,
  getEvents as getEventsService,
  getEventById as getEventByIdService,
  updateEvent as updateEventService,
  deleteEvent as deleteEventService,
} from '../services/event.service.js';
import { getVendorsByEventId as getVendorsByEventIdService } from '../services/vendor.service.js';
import { getAttendeesByEventId as getAttendeesByEventIdService } from '../services/attendee.service.js';
import { getOrganizerById as getOrganizerByIdService } from '../services/organizer.service.js';

export async function createEvent(req, res) {
  try {
    const eventPayload = req.body ?? {};
    const createdEvent = await createEventService(eventPayload);

    return res.status(201).json({
      message: 'Event created successfully',
      event: createdEvent,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to create event';
    return res.status(400).json({ error: message });
  }
}

export async function getEvents(req, res) {
  try {
    const events = await getEventsService();
    return res.status(200).json({ events });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to fetch events';
    return res.status(500).json({ error: message });
  }
}

export async function getEventById(req, res) {
  try {
    const { id } = req.params;
    const event = await getEventByIdService(id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const vendors = await getVendorsByEventIdService(id);
    const attendees = await getAttendeesByEventIdService(id);

    const expectedAttendee = attendees.length;
    const arrivedAttendee = attendees.filter(
      (x) => x.status === 'checked_in'
    ).length;
    const percentArrived =
      expectedAttendee === 0
        ? 0
        : Number(((arrivedAttendee / expectedAttendee) * 100).toFixed(2));

    let headOrganizer = null;
    if (event.headOrganizerId) {
      headOrganizer = await getOrganizerByIdService(event.headOrganizerId);
    }

    return res.status(200).json({
      event: {
        ...event,
        headOrganizer,
        vendors,
        attendees,
        headcount: {
          expectedAttendee,
          arrivedAttendee,
          percentArrived,
        },
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to fetch event';
    return res.status(500).json({ error: message });
  }
}

export async function updateEvent(req, res) {
  try {
    const { id } = req.params;
    const updatePayload = req.body ?? {};
    const updatedEvent = await updateEventService(id, updatePayload);

    return res.status(200).json({
      message: 'Event updated successfully',
      event: updatedEvent,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Event not found') {
      return res.status(404).json({ error: error.message });
    }

    const message =
      error instanceof Error ? error.message : 'Unable to update event';
    return res.status(400).json({ error: message });
  }
}

export async function deleteEvent(req, res) {
  try {
    const { id } = req.params;
    await deleteEventService(id);

    return res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Event not found') {
      return res.status(404).json({ error: error.message });
    }

    const message =
      error instanceof Error ? error.message : 'Unable to delete event';
    return res.status(500).json({ error: message });
  }
}
