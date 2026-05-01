import {
  createVendor as createVendorService,
  getVendors as getVendorsService,
  getVendorById as getVendorByIdService,
  updateVendor as updateVendorService,
  deleteVendor as deleteVendorService,
  getVendorsByEventId as getVendorsByEventIdService,
  assignVendorToEvent as assignVendorToEventService,
  unassignVendorFromEvent as unassignVendorFromEventService,
  createVendorWorker as createVendorWorkerService,
  getVendorWorkers as getVendorWorkersService,
  getAllVendorWorkers as getAllVendorWorkersService,
  getVendorWorkerById as getVendorWorkerByIdService,
  getVendorEvents as getVendorEventsService,
  getWorkerEventsByWorkerId as getWorkerEventsService,
  updateVendorWorker as updateVendorWorkerService,
  deleteVendorWorker as deleteVendorWorkerService,
  assignWorkerToEvent as assignWorkerToEventService,
  unassignWorkerFromEvent as unassignWorkerFromEventService,
} from '../services/vendor.service.js';

export async function createVendor(req, res) {
  try {
    const payload = req.body ?? {};
    const vendor = await createVendorService(payload);
    return res
      .status(201)
      .json({ message: 'Vendor created successfully', vendor });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to create vendor';
    return res.status(400).json({ error: message });
  }
}

export async function getVendors(req, res) {
  try {
    const { eventId } = req.query;
    const vendors = await getVendorsService(eventId);
    return res.status(200).json({ vendors });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to fetch vendors';
    return res.status(500).json({ error: message });
  }
}

export async function getVendorById(req, res) {
  try {
    const { id } = req.params;
    const vendor = await getVendorByIdService(id);

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    return res.status(200).json({ vendor });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to fetch vendor';
    return res.status(500).json({ error: message });
  }
}

export async function updateVendor(req, res) {
  try {
    const { id } = req.params;
    const payload = req.body ?? {};
    const vendor = await updateVendorService(id, payload);

    return res
      .status(200)
      .json({ message: 'Vendor updated successfully', vendor });
  } catch (error) {
    if (error instanceof Error && error.message === 'Vendor not found') {
      return res.status(404).json({ error: error.message });
    }

    const message =
      error instanceof Error ? error.message : 'Unable to update vendor';
    return res.status(400).json({ error: message });
  }
}

export async function deleteVendor(req, res) {
  try {
    const { id } = req.params;
    await deleteVendorService(id);
    return res.status(200).json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Vendor not found') {
      return res.status(404).json({ error: error.message });
    }

    const message =
      error instanceof Error ? error.message : 'Unable to delete vendor';
    return res.status(500).json({ error: message });
  }
}

export async function getVendorsByEventId(req, res) {
  try {
    const { eventId } = req.params;
    const vendors = await getVendorsByEventIdService(eventId);
    return res.status(200).json({ vendors });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to fetch vendors for event';
    return res.status(500).json({ error: message });
  }
}

export async function assignVendorToEvent(req, res) {
  try {
    const { id } = req.params;
    const { eventId } = req.body ?? {};

    if (!eventId || !String(eventId).trim()) {
      return res.status(400).json({ error: 'eventId is required' });
    }

    const vendor = await assignVendorToEventService(id, eventId);
    return res.status(200).json({ message: 'Vendor assigned to event successfully', vendor });
  } catch (error) {
    if (error instanceof Error && ['Vendor not found', 'Associated event not found'].includes(error.message)) {
      return res.status(404).json({ error: error.message });
    }

    const message =
      error instanceof Error ? error.message : 'Unable to assign vendor to event';
    return res.status(400).json({ error: message });
  }
}

export async function createVendorWorker(req, res) {
  try {
    const { id } = req.params;
    const payload = req.body ?? {};
    const worker = await createVendorWorkerService(id, payload);
    return res.status(201).json({ message: 'Worker created successfully', worker });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create worker';
    return res.status(400).json({ error: message });
  }
}

export async function getVendorWorkers(req, res) {
  try {
    const { id } = req.params;
    const { eventId } = req.query;
    const workers = await getVendorWorkersService(id, eventId);
    return res.status(200).json({ workers });
  } catch (error) {
    if (error instanceof Error && error.message === 'Vendor not found') {
      return res.status(404).json({ error: error.message });
    }

    const message = error instanceof Error ? error.message : 'Unable to fetch workers';
    return res.status(500).json({ error: message });
  }
}

export async function getAllVendorWorkers(req, res) {
  try {
    const { vendorId, eventId } = req.query;
    const workers = await getAllVendorWorkersService({ vendorId, eventId });
    return res.status(200).json({ workers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch workers';
    return res.status(500).json({ error: message });
  }
}

export async function getVendorWorkerById(req, res) {
  try {
    const { id, workerId } = req.params;
    const worker = await getVendorWorkerByIdService(id, workerId);

    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    return res.status(200).json({ worker });
  } catch (error) {
    if (error instanceof Error && ['Vendor not found', 'Worker not found'].includes(error.message)) {
      return res.status(404).json({ error: error.message });
    }

    const message = error instanceof Error ? error.message : 'Unable to fetch worker';
    return res.status(500).json({ error: message });
  }
}

export async function getVendorEvents(req, res) {
  try {
    const { id } = req.params;
    const result = await getVendorEventsService(id);
    return res.status(200).json(result.events ?? []);
  } catch (error) {
    if (error instanceof Error && error.message === 'Vendor not found') {
      return res.status(404).json({ error: error.message });
    }

    const message = error instanceof Error ? error.message : 'Unable to fetch vendor events';
    return res.status(500).json({ error: message });
  }
}

export async function getWorkerEvents(req, res) {
  try {
    const { id } = req.params;
    const result = await getWorkerEventsService(id);
    return res.status(200).json(result.events ?? []);
  } catch (error) {
    if (error instanceof Error && ['Worker not found'].includes(error.message)) {
      return res.status(404).json({ error: error.message });
    }

    const message = error instanceof Error ? error.message : 'Unable to fetch worker events';
    return res.status(500).json({ error: message });
  }
}

export async function updateVendorWorker(req, res) {
  try {
    const { id, workerId } = req.params;
    const payload = req.body ?? {};
    const worker = await updateVendorWorkerService(id, workerId, payload);
    return res.status(200).json({ message: 'Worker updated successfully', worker });
  } catch (error) {
    if (error instanceof Error && ['Vendor not found', 'Worker not found', 'Associated event not found'].includes(error.message)) {
      return res.status(404).json({ error: error.message });
    }

    const message = error instanceof Error ? error.message : 'Unable to update worker';
    return res.status(400).json({ error: message });
  }
}

export async function deleteVendorWorker(req, res) {
  try {
    const { id, workerId } = req.params;
    await deleteVendorWorkerService(id, workerId);
    return res.status(200).json({ message: 'Worker deleted successfully' });
  } catch (error) {
    if (error instanceof Error && ['Vendor not found', 'Worker not found'].includes(error.message)) {
      return res.status(404).json({ error: error.message });
    }

    const message = error instanceof Error ? error.message : 'Unable to delete worker';
    return res.status(500).json({ error: message });
  }
}

export async function assignWorkerToEvent(req, res) {
  try {
    const { id, workerId } = req.params;
    const { eventId } = req.body ?? {};

    if (!eventId || !String(eventId).trim()) {
      return res.status(400).json({ error: 'eventId is required' });
    }

    const worker = await assignWorkerToEventService(id, workerId, eventId);
    return res.status(200).json({ message: 'Worker assigned to event successfully', worker });
  } catch (error) {
    if (error instanceof Error && ['Vendor not found', 'Worker not found', 'Associated event not found'].includes(error.message)) {
      return res.status(404).json({ error: error.message });
    }

    const message = error instanceof Error ? error.message : 'Unable to assign worker to event';
    return res.status(400).json({ error: message });
  }
}

export async function unassignWorkerFromEvent(req, res) {
  try {
    const { id, workerId } = req.params;
    const worker = await unassignWorkerFromEventService(id, workerId);
    return res.status(200).json({ message: 'Worker unassigned from event successfully', worker });
  } catch (error) {
    if (error instanceof Error && ['Vendor not found', 'Worker not found'].includes(error.message)) {
      return res.status(404).json({ error: error.message });
    }

    const message = error instanceof Error ? error.message : 'Unable to unassign worker from event';
    return res.status(400).json({ error: message });
  }
}

export async function unassignVendorFromEvent(req, res) {
  try {
    const { id } = req.params;
    const vendor = await unassignVendorFromEventService(id);
    return res.status(200).json({ message: 'Vendor unassigned from event successfully', vendor });
  } catch (error) {
    if (error instanceof Error && ['Vendor not found'].includes(error.message)) {
      return res.status(404).json({ error: error.message });
    }

    const message = error instanceof Error ? error.message : 'Unable to unassign vendor from event';
    return res.status(400).json({ error: message });
  }
}
