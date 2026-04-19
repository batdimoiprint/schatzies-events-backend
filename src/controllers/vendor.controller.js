import {
  createVendor as createVendorService,
  getVendors as getVendorsService,
  getVendorById as getVendorByIdService,
  updateVendor as updateVendorService,
  deleteVendor as deleteVendorService,
  getVendorsByEventId as getVendorsByEventIdService,
  assignVendorToEvent as assignVendorToEventService,
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
