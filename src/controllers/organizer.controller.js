import {
  createOrganizer as createOrganizerService,
  getOrganizers as getOrganizersService,
  getOrganizerById as getOrganizerByIdService,
  getHeadOrganizerByEventId as getHeadOrganizerByEventIdService,
  updateOrganizer as updateOrganizerService,
  deleteOrganizer as deleteOrganizerService,
} from '../services/organizer.service.js';
import {
  getEventById,
  updateEvent as updateEventService,
  assignWorkerOrganizer as assignWorkerOrganizerService,
  unassignWorkerOrganizer as unassignWorkerOrganizerService,
} from '../services/event.service.js';
import { sendWorkerRsvpEmail } from '../services/mailer.service.js';

export async function createOrganizer(req, res) {
  try {
    const organizerPayload = req.body ?? {};
    const created = await createOrganizerService(organizerPayload);
    return res
      .status(201)
      .json({ message: 'Organizer created successfully', organizer: created });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to create organizer';
    return res.status(400).json({ error: message });
  }
}

export async function getOrganizers(req, res) {
  try {
    const organizers = await getOrganizersService();
    return res.status(200).json({ organizers });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to fetch organizers';
    return res.status(500).json({ error: message });
  }
}

export async function getOrganizerById(req, res) {
  try {
    const { id } = req.params;
    const organizer = await getOrganizerByIdService(id);
    if (!organizer) {
      return res.status(404).json({ error: 'Organizer not found' });
    }
    return res.status(200).json({ organizer });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to fetch organizer';
    return res.status(500).json({ error: message });
  }
}

export async function updateOrganizer(req, res) {
  try {
    const { id } = req.params;
    const updatePayload = req.body ?? {};
    const updatedOrganizer = await updateOrganizerService(id, updatePayload);
    return res.status(200).json({
      message: 'Organizer updated successfully',
      organizer: updatedOrganizer,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Organizer not found') {
      return res.status(404).json({ error: error.message });
    }
    const message =
      error instanceof Error ? error.message : 'Unable to update organizer';
    return res.status(400).json({ error: message });
  }
}

export async function deleteOrganizer(req, res) {
  try {
    const { id } = req.params;
    await deleteOrganizerService(id);
    return res.status(200).json({ message: 'Organizer deleted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Organizer not found') {
      return res.status(404).json({ error: error.message });
    }
    const message =
      error instanceof Error ? error.message : 'Unable to delete organizer';
    return res.status(500).json({ error: message });
  }
}

export async function getHeadOrganizerByEvent(req, res) {
  try {
    const { eventId } = req.params;
    const organizer = await getHeadOrganizerByEventIdService(eventId);

    if (!organizer) {
      return res
        .status(404)
        .json({ error: 'No head organizer assigned to this event' });
    }

    return res.status(200).json({ organizer });
  } catch (error) {
    if (error instanceof Error && error.message === 'Event not found') {
      return res.status(404).json({ error: error.message });
    }

    const message =
      error instanceof Error ? error.message : 'Unable to fetch head organizer';
    return res.status(500).json({ error: message });
  }
}

export async function assignHeadOrganizer(req, res) {
  try {
    const { id: organizerId, eventId } = req.params;

    const event = await getEventById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const organizer = await getOrganizerByIdService(organizerId);
    if (!organizer) {
      return res.status(404).json({ error: 'Organizer not found' });
    }

    const updatedEvent = await updateEventService(eventId, {
      headOrganizerId: organizerId,
    });
    return res.status(200).json({
      message: 'Head organizer assigned to event',
      event: updatedEvent,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to assign head organizer';
    return res.status(400).json({ error: message });
  }
}

export async function assignWorkerOrganizer(req, res) {
  try {
    const { id: organizerId, eventId } = req.params;

    const event = await getEventById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (!event.headOrganizerId) {
      return res.status(400).json({
        error: 'Head organizer must be assigned before adding workers',
      });
    }

    const organizer = await getOrganizerByIdService(organizerId);
    if (!organizer) {
      return res.status(404).json({ error: 'Organizer not found' });
    }

    const updatedEvent = await assignWorkerOrganizerService(
      eventId,
      organizerId
    );
    const mailResult = await sendWorkerRsvpEmail(organizer, updatedEvent);

    if (mailResult.skipped) {
      return res.status(200).json({
        message:
          'Worker assigned to event, but RSVP email was not sent because SMTP is not configured',
        event: updatedEvent,
        rsvpLink: mailResult.link,
      });
    }

    return res.status(200).json({
      message: 'Worker assigned to event and RSVP email sent',
      event: updatedEvent,
      rsvpLink: mailResult.link,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to assign worker organizer';
    return res.status(400).json({ error: message });
  }
}

export async function unassignHeadOrganizer(req, res) {
  try {
    const { id: organizerId, eventId } = req.params;

    const event = await getEventById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.headOrganizerId !== organizerId) {
      return res.status(400).json({
        error: 'This organizer is not the head organizer for this event',
      });
    }

    const updatedEvent = await updateEventService(eventId, {
      headOrganizerId: null,
    });
    return res.status(200).json({
      message: 'Head organizer unassigned from event',
      event: updatedEvent,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to unassign head organizer';
    return res.status(400).json({ error: message });
  }
}

export async function unassignWorkerOrganizer(req, res) {
  try {
    const { id: organizerId, eventId } = req.params;

    const event = await getEventById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const organizer = await getOrganizerByIdService(organizerId);
    if (!organizer) {
      return res.status(404).json({ error: 'Organizer not found' });
    }

    const updatedEvent = await unassignWorkerOrganizerService(
      eventId,
      organizerId
    );
    return res
      .status(200)
      .json({ message: 'Worker unassigned from event', event: updatedEvent });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to unassign worker organizer';
    return res.status(400).json({ error: message });
  }
}
