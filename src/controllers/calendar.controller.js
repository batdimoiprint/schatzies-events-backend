import {
  createCalendarEntry as createCalendarEntryService,
  getCalendarEntries as getCalendarEntriesService,
  updateCalendarEntry as updateCalendarEntryService,
  deleteCalendarEntry as deleteCalendarEntryService,
  markCalendarDate as markCalendarDateService,
} from '../services/calendar.service.js';

function createError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function validateCalendarType(type) {
  const value = String(type || '').trim().toUpperCase();
  if (!['REMINDER', 'MEETING', 'TASK'].includes(value)) {
    throw createError('Invalid calendar entry type. Use REMINDER, MEETING, or TASK.', 400);
  }
  return value;
}

function validateDateString(value) {
  if (!value || typeof value !== 'string') {
    throw createError('Calendar date is required and must be an ISO string.', 400);
  }
  const normalized = value.trim();
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(normalized) && isNaN(Date.parse(normalized))) {
    throw createError('Date must be an ISO date string like 2026-01-03.', 400);
  }
  return normalized;
}

function validateDateTimeString(value) {
  if (!value || typeof value !== 'string') {
    throw createError('Date-time is required and must be a valid ISO string.', 400);
  }
  const normalized = value.trim();
  if (isNaN(Date.parse(normalized))) {
    throw createError('Date-time must be a valid ISO string.', 400);
  }
  return normalized;
}

function validateTimeString(value) {
  if (!value || typeof value !== 'string') {
    throw createError('Time is required and must be a valid string like 14:30.', 400);
  }
  const normalized = value.trim();
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(normalized)) {
    throw createError('Time must be in HH:mm format.', 400);
  }
  return normalized;
}

function getUserId(req) {
  return String(req.user?.user_id || req.user?.id || '');
}

export async function createCalendarEntry(req, res, next) {
  try {
    const userId = getUserId(req);
    const {
      title,
      description,
      date,
      type,
      eventId,
      startDateKey,
      startTime,
      endDateKey,
      endDate,
      location,
      eventType,
      label,
    } = req.body;
    if (!title) {
      throw createError('Title is required', 400);
    }
    const calendarType = validateCalendarType(type);
    const calendarDate = validateDateString(date);

    let meetingFields = {};
    if (calendarType === 'MEETING') {
      meetingFields = {
        startDateKey: validateDateString(startDateKey),
        startTime: validateTimeString(startTime),
        endDateKey: validateDateString(endDateKey),
        endDate: validateDateTimeString(endDate),
        location: location || undefined,
        eventType: eventType || undefined,
        label: label || undefined,
      };
    }

    const entry = await createCalendarEntryService(userId, {
      title,
      description,
      date: calendarDate,
      type: calendarType,
      eventId,
      location,
      eventType,
      label,
      ...meetingFields,
    });

    return res.status(201).json({ entry });
  } catch (error) {
    return next(error);
  }
}

export async function getCalendarEntries(req, res, next) {
  try {
    const userId = getUserId(req);
    const view = String(req.query.view || '').trim().toLowerCase();
    const type = req.query.type ? validateCalendarType(req.query.type) : undefined;

    const filters = {};

    if (type) {
      filters.type = type;
    }

    if (view === 'monthly') {
      const month = String(req.query.month || '').padStart(2, '0');
      const year = String(req.query.year || '').trim();
      if (!/^[0-9]{4}$/.test(year) || !/^(0[1-9]|1[0-2])$/.test(month)) {
        throw createError('Monthly view requires valid month and year parameters.', 400);
      }
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(Date.UTC(Number(year), Number(month), 0)).toISOString().slice(0, 10);
      filters.startDate = startDate;
      filters.endDate = endDate;
    } else if (view === 'weekly') {
      const startDate = validateDateString(req.query.startDate);
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      filters.startDate = start.toISOString().slice(0, 10);
      filters.endDate = end.toISOString().slice(0, 10);
    } else if (req.query.startDate) {
      const startDate = validateDateString(req.query.startDate);
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      filters.startDate = start.toISOString().slice(0, 10);
      filters.endDate = end.toISOString().slice(0, 10);
    }

    const entries = await getCalendarEntriesService(userId, filters);
    return res.status(200).json({ entries });
  } catch (error) {
    return next(error);
  }
}

export async function updateCalendarEntry(req, res, next) {
  try {
    const userId = getUserId(req);
    const { entryId } = req.params;
    const {
      title,
      description,
      date,
      type,
      eventId,
      startDateKey,
      startTime,
      endDateKey,
      endDate,
      location,
      eventType,
      label,
    } = req.body;
    if (!entryId) {
      throw createError('Calendar entry ID is required', 400);
    }

    const payload = {};
    if (title !== undefined) payload.title = title;
    if (description !== undefined) payload.description = description;
    if (date !== undefined) payload.date = validateDateString(date);
    if (type !== undefined) payload.type = validateCalendarType(type);
    if (eventId !== undefined) payload.eventId = eventId;
    if (startDateKey !== undefined) payload.startDateKey = validateDateString(startDateKey);
    if (startTime !== undefined) payload.startTime = validateTimeString(startTime);
    if (endDateKey !== undefined) payload.endDateKey = validateDateString(endDateKey);
    if (endDate !== undefined) payload.endDate = validateDateTimeString(endDate);
    if (location !== undefined) payload.location = location;
    if (eventType !== undefined) payload.eventType = eventType;
    if (label !== undefined) payload.label = label;

    if (!Object.keys(payload).length) {
      throw createError('At least one field must be provided to update', 400);
    }

    const entry = await updateCalendarEntryService(userId, entryId, payload);
    return res.status(200).json({ entry });
  } catch (error) {
    return next(error);
  }
}

export async function deleteCalendarEntry(req, res, next) {
  try {
    const userId = getUserId(req);
    const { entryId } = req.params;
    if (!entryId) {
      throw createError('Calendar entry ID is required', 400);
    }

    await deleteCalendarEntryService(userId, entryId);
    return res.status(200).json({ message: 'Calendar entry deleted' });
  } catch (error) {
    return next(error);
  }
}

export async function markCalendarDate(req, res, next) {
  try {
    const userId = getUserId(req);
    const { date, type, title, description, eventId } = req.body;
    const calendarType = validateCalendarType(type);
    const calendarDate = validateDateString(date);

    const entry = await markCalendarDateService(userId, {
      title: title || `Marked ${calendarType}`,
      description,
      date: calendarDate,
      type: calendarType,
      eventId,
    });

    return res.status(201).json({ entry });
  } catch (error) {
    return next(error);
  }
}
