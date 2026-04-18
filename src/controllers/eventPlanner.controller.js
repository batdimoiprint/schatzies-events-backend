import {
  confirmEvent as confirmEventService,
  getConfirmedEvents as getConfirmedEventsService,
  createOrUpdateAllocation as createOrUpdateAllocationService,
  getAllocation as getAllocationService,
  createPrecheck as createPrecheckService,
  updatePrecheck as updatePrecheckService,
  getPrecheck as getPrecheckService,
  createProgramFlow as createProgramFlowService,
  getProgramFlows as getProgramFlowsService,
  updateProgramFlow as updateProgramFlowService,
  deleteProgramFlow as deleteProgramFlowService,
  createTimelineTask as createTimelineTaskService,
  getTimelineTasks as getTimelineTasksService,
  updateTimelineTask as updateTimelineTaskService,
  createResourceStatus as createResourceStatusService,
  getResourceStatuses as getResourceStatusesService,
  updateResourceStatus as updateResourceStatusService,
  createTask as createTaskService,
  getTasksByEventId as getTasksByEventIdService,
  updateTask as updateTaskService,
  deleteTask as deleteTaskService,
  moveTask as moveTaskService,
  changeEventStatus as changeEventStatusService,
} from '../services/eventPlanner.service.js';
import {
  confirmEventSchema,
  allocationSchema,
  precheckSchema,
  programFlowSchema,
  updateProgramFlowSchema,
  timelineTaskSchema,
  updateTimelineTaskSchema,
  resourceStatusSchema,
  updateResourceStatusSchema,
  taskSchema,
  updateTaskSchema,
  moveTaskSchema,
  eventStatusSchema,
} from '../validators/eventPlanner.validator.js';

function validateSchema(schema, payload) {
  const { error, value } = schema.validate(payload, { abortEarly: false, stripUnknown: true });
  if (error) {
    const validationError = new Error(error.details.map((detail) => detail.message).join(', '));
    validationError.status = 400;
    throw validationError;
  }
  return value;
}

export async function confirmEvent(req, res, next) {
  try {
    const payload = validateSchema(confirmEventSchema, req.body);
    const eventId = req.params.eventId || req.params.id;
    const adminId = req.user?.user_id || req.user?.id;
    const event = await confirmEventService(eventId, payload, adminId);
    return res.status(200).json({ message: 'Event confirmed successfully', event });
  } catch (error) {
    return next(error);
  }
}

export async function getConfirmedEvents(req, res, next) {
  try {
    const events = await getConfirmedEventsService();
    return res.status(200).json({ events });
  } catch (error) {
    return next(error);
  }
}

export async function createEventAllocation(req, res, next) {
  try {
    const payload = validateSchema(allocationSchema, req.body);
    const eventId = req.params.eventId || req.params.id;
    const allocation = await createOrUpdateAllocationService(eventId, payload);
    return res.status(201).json({ message: 'Event allocation saved', allocation });
  } catch (error) {
    return next(error);
  }
}

export async function getEventAllocation(req, res, next) {
  try {
    const eventId = req.params.eventId || req.params.id;
    const allocation = await getAllocationService(eventId);
    return res.status(200).json({ allocation });
  } catch (error) {
    return next(error);
  }
}

export async function updateEventAllocation(req, res, next) {
  try {
    const payload = validateSchema(allocationSchema, req.body);
    const eventId = req.params.eventId || req.params.id;
    const allocation = await createOrUpdateAllocationService(eventId, payload);
    return res.status(200).json({ message: 'Event allocation updated', allocation });
  } catch (error) {
    return next(error);
  }
}

export async function createPrecheck(req, res, next) {
  try {
    const payload = validateSchema(precheckSchema, req.body);
    const eventId = req.params.eventId || req.params.id;
    const precheck = await createPrecheckService(eventId, payload);
    return res.status(201).json({ message: 'Pre-event verification created', precheck });
  } catch (error) {
    return next(error);
  }
}

export async function updatePrecheck(req, res, next) {
  try {
    const payload = validateSchema(precheckSchema, req.body);
    const eventId = req.params.eventId || req.params.id;
    const precheck = await updatePrecheckService(eventId, payload);
    return res.status(200).json({ message: 'Pre-event verification updated', precheck });
  } catch (error) {
    return next(error);
  }
}

export async function getPrecheck(req, res, next) {
  try {
    const eventId = req.params.eventId || req.params.id;
    const precheck = await getPrecheckService(eventId);
    return res.status(200).json({ precheck });
  } catch (error) {
    return next(error);
  }
}

export async function createProgramFlow(req, res, next) {
  try {
    const payload = validateSchema(programFlowSchema, req.body);
    const eventId = req.params.eventId || req.params.id;
    const flow = await createProgramFlowService(eventId, payload);
    return res.status(201).json({ message: 'Program flow entry created', flow });
  } catch (error) {
    return next(error);
  }
}

export async function getProgramFlow(req, res, next) {
  try {
    const eventId = req.params.eventId || req.params.id;
    const flows = await getProgramFlowsService(eventId);
    return res.status(200).json({ flows });
  } catch (error) {
    return next(error);
  }
}

export async function updateProgramFlow(req, res, next) {
  try {
    const payload = validateSchema(updateProgramFlowSchema, req.body);
    const flow = await updateProgramFlowService(req.params.flow_id, payload);
    return res.status(200).json({ message: 'Program flow entry updated', flow });
  } catch (error) {
    return next(error);
  }
}

export async function deleteProgramFlow(req, res, next) {
  try {
    await deleteProgramFlowService(req.params.flow_id);
    return res.status(200).json({ message: 'Program flow entry deleted' });
  } catch (error) {
    return next(error);
  }
}

export async function createTimelineTask(req, res, next) {
  try {
    const payload = validateSchema(timelineTaskSchema, req.body);
    const eventId = req.params.eventId || req.params.id;
    const task = await createTimelineTaskService(eventId, payload);
    return res.status(201).json({ message: 'Timeline task created', task });
  } catch (error) {
    return next(error);
  }
}

export async function getTimelineTasks(req, res, next) {
  try {
    const eventId = req.params.eventId || req.params.id;
    const tasks = await getTimelineTasksService(eventId);
    return res.status(200).json({ tasks });
  } catch (error) {
    return next(error);
  }
}

export async function updateTimelineTask(req, res, next) {
  try {
    const payload = validateSchema(updateTimelineTaskSchema, req.body);
    const task = await updateTimelineTaskService(req.params.task_id, payload);
    return res.status(200).json({ message: 'Timeline task updated', task });
  } catch (error) {
    return next(error);
  }
}

export async function createTask(req, res, next) {
  try {
    const payload = validateSchema(taskSchema, req.body);
    const eventId = req.params.eventId || req.params.id;
    const task = await createTaskService(eventId, payload);
    return res.status(201).json({ message: 'Task created', task });
  } catch (error) {
    return next(error);
  }
}

export async function getTasks(req, res, next) {
  try {
    const eventId = req.params.eventId || req.params.id;
    const tasks = await getTasksByEventIdService(eventId);
    const grouped = { TODO: [], IN_PROGRESS: [], COMPLETED: [] };
    tasks.forEach((task) => {
      if (!grouped[task.status]) {
        grouped[task.status] = [];
      }
      grouped[task.status].push(task);
    });
    return res.status(200).json({ tasks: grouped });
  } catch (error) {
    return next(error);
  }
}

export async function updateTask(req, res, next) {
  try {
    const payload = validateSchema(updateTaskSchema, req.body);
    const eventId = req.params.eventId || req.params.id;
    const task = await updateTaskService(eventId, req.params.task_id, payload);
    return res.status(200).json({ message: 'Task updated', task });
  } catch (error) {
    return next(error);
  }
}

export async function deleteTask(req, res, next) {
  try {
    const eventId = req.params.eventId || req.params.id;
    await deleteTaskService(eventId, req.params.task_id);
    return res.status(200).json({ message: 'Task deleted' });
  } catch (error) {
    return next(error);
  }
}

export async function moveTask(req, res, next) {
  try {
    const payload = validateSchema(moveTaskSchema, req.body);
    const eventId = req.params.eventId || req.params.id;
    const task = await moveTaskService(eventId, req.params.task_id, payload);
    return res.status(200).json({ message: 'Task moved', task });
  } catch (error) {
    return next(error);
  }
}

export async function changeEventStatus(req, res, next) {
  try {
    const payload = validateSchema(eventStatusSchema, req.body);
    const eventId = req.params.eventId || req.params.id;
    const event = await changeEventStatusService(eventId, payload.status);
    return res.status(200).json({ message: 'Event status updated', event });
  } catch (error) {
    return next(error);
  }
}

export async function createResourceStatus(req, res, next) {
  try {
    const payload = validateSchema(resourceStatusSchema, req.body);
    const eventId = req.params.eventId || req.params.id;
    const status = await createResourceStatusService(eventId, payload);
    return res.status(201).json({ message: 'Resource status created', status });
  } catch (error) {
    return next(error);
  }
}

export async function getResourceStatuses(req, res, next) {
  try {
    const eventId = req.params.eventId || req.params.id;
    const statuses = await getResourceStatusesService(eventId);
    return res.status(200).json({ statuses });
  } catch (error) {
    return next(error);
  }
}

export async function updateResourceStatus(req, res, next) {
  try {
    const payload = validateSchema(updateResourceStatusSchema, req.body);
    const status = await updateResourceStatusService(req.params.id, payload);
    return res.status(200).json({ message: 'Resource status updated', status });
  } catch (error) {
    return next(error);
  }
}
