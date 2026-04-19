import {
  createEvent as createEventService,
  getEvents as getEventsService,
  getEventById as getEventByIdService,
  updateEvent as updateEventService,
  deleteEvent as deleteEventService,
  addEventMessage as addEventMessageService,
} from '../services/event.service.js';
import { getVendorsByEventId as getVendorsByEventIdService } from '../services/vendor.service.js';
import { getAttendeesByEventId as getAttendeesByEventIdService } from '../services/attendee.service.js';
import {
  getOrganizerById as getOrganizerByIdService,
  getOrganizersByIds as getOrganizersByIdsService,
} from '../services/organizer.service.js';
import { findUserByUserId as getUserByUserIdService } from '../services/users.service.js';
import { getEventsByFilter as getEventsByFilterService, getTasksByEventId as getTasksByEventIdService } from '../services/eventPlanner.service.js';

export async function createEvent(req, res) {
  try {
    const eventPayload = req.body ?? {};
    const clientId = req.user?.user_id;
    const createdEvent = await createEventService(eventPayload, clientId);

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

export async function getEventMessages(req, res) {
  try {
    const eventId = req.params.eventId || req.params.id;
    const event = await getEventByIdService(eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const currentUserId = req.user?.user_id;
    if (![event.headOrganizerId, event.clientId].includes(currentUserId)) {
      return res.status(403).json({
        error: 'Not authorized to view messages for this event',
      });
    }

    return res.status(200).json({ messages: event.messages || [] });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to fetch event messages';
    return res.status(500).json({ error: message });
  }
}

export async function sendEventMessage(req, res) {
  try {
    const eventId = req.params.eventId || req.params.id;
    const { content } = req.body ?? {};
    const currentUserId = req.user?.user_id;

    if (!content || !String(content).trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const event = await getEventByIdService(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.headOrganizerId !== currentUserId) {
      return res.status(403).json({
        error: 'Only the head organizer can send messages to the assigned client',
      });
    }

    const message = await addEventMessageService(
      eventId,
      currentUserId,
      req.user.role || 'ORGANIZER',
      content,
      event.clientId
    );

    return res.status(201).json({
      message: 'Message sent successfully',
      chatMessage: message,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to send message';
    return res.status(500).json({ error: message });
  }
}

export async function getEvents(req, res) {
  try {
    const filter = req.query.filter;
    const events = filter
      ? await getEventsByFilterService(filter)
      : await getEventsService();
    return res.status(200).json({ events });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to fetch events';
    return res.status(500).json({ error: message });
  }
}

export async function getEventById(req, res) {
  try {
    const eventId = req.params.eventId || req.params.id;
    const event = await getEventByIdService(eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const client = event.clientId ? await getUserByUserIdService(event.clientId) : null;
    const tasks = await getTasksByEventIdService(eventId);
    const groupedTasks = { TODO: [], IN_PROGRESS: [], COMPLETED: [] };
    tasks.forEach((task) => {
      if (!groupedTasks[task.status]) {
        groupedTasks[task.status] = [];
      }
      groupedTasks[task.status].push(task);
    });
    const totalTasks = tasks.length;
    const completedTasks = groupedTasks.COMPLETED.length;
    const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    const vendors = await getVendorsByEventIdService(eventId);
    const attendees = await getAttendeesByEventIdService(eventId);

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

    const assignmentIds = Array.isArray(event.workerOrganizerAssignments)
      ? event.workerOrganizerAssignments.map((assignment) => assignment.organizerId)
      : Array.isArray(event.workerOrganizerIds)
      ? event.workerOrganizerIds
      : [];

    const workerOrganizersRaw = await getOrganizersByIdsService(assignmentIds);
    const workerOrganizers = (Array.isArray(event.workerOrganizerAssignments)
      ? event.workerOrganizerAssignments
      : assignmentIds.map((organizerId) => ({
          organizerId,
          status: 'pending',
          updatedAt: null,
        })))
      .map((assignment) => {
        const organizer = workerOrganizersRaw.find((org) => org.id === assignment.organizerId);
        return {
          ...assignment,
          organizer,
        };
      });

    const organizerName = headOrganizer
      ? `${headOrganizer.firstName || ''} ${headOrganizer.lastName || ''}`.trim()
      : '';
    const clientName = client
      ? `${client.firstName || ''} ${client.lastName || ''}`.trim()
      : '';

    return res.status(200).json({
      event: {
        ...event,
        eventTitle: event.title || '',
        dateStart: event.startDate || event.eventDate || '',
        dateEnd: event.endDate || '',
        organizerName,
        clientName,
        clientEmail: client?.email || '',
        eventType: event.eventType || '',
        package: {
          name: event.eventPackage || '',
          pax: event.eventPax || 0,
        },
        venue: event.venue || '',
        clientMessage: event.notes || '',
        assignedVendors: vendors,
        attendees,
        status: event.status || '',
        progress,
        tasks: groupedTasks,
        headOrganizer,
        workerOrganizers,
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
    const eventId = req.params.eventId || req.params.id;
    const updatePayload = req.body ?? {};
    const updatedEvent = await updateEventService(eventId, updatePayload);

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
    const eventId = req.params.eventId || req.params.id;
    await deleteEventService(eventId);

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
