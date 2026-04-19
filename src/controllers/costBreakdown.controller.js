import {
  createCostBreakdown as createCostBreakdownService,
  getCostBreakdown as getCostBreakdownService,
  updateCostBreakdown as updateCostBreakdownService,
  exportCostBreakdown as exportCostBreakdownService,
} from '../services/costBreakdown.service.js';

function parseNumberField(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${fieldName} is required`);
  }

  const numberValue = typeof value === 'string' ? Number(value.trim()) : Number(value);
  if (Number.isNaN(numberValue)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  return numberValue;
}

export async function createCostBreakdown(req, res) {
  try {
    const eventId = req.params.eventId;
    if (!eventId || !String(eventId).trim()) {
      return res.status(400).json({ error: 'Event ID is required' });
    }

    const payload = {
      packagePricePerPax: parseNumberField(req.body?.packagePricePerPax, 'packagePricePerPax'),
      eventPax: parseNumberField(req.body?.eventPax, 'eventPax'),
      manpowerCost: parseNumberField(req.body?.manpowerCost, 'manpowerCost'),
      additionalCharges: parseNumberField(req.body?.additionalCharges, 'additionalCharges'),
    };

    const breakdown = await createCostBreakdownService(eventId, payload);
    return res.status(201).json({ costBreakdown: breakdown });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create cost breakdown';
    const status = error instanceof Error && (error.status === 404 || error.status === 400) ? error.status : 500;
    return res.status(status).json({ error: message });
  }
}

export async function getCostBreakdown(req, res) {
  try {
    const eventId = req.params.eventId;
    if (!eventId || !String(eventId).trim()) {
      return res.status(400).json({ error: 'Event ID is required' });
    }

    const breakdown = await getCostBreakdownService(eventId);
    if (!breakdown) {
      return res.status(404).json({ error: 'Cost breakdown not found' });
    }

    return res.status(200).json({ costBreakdown: breakdown });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch cost breakdown';
    return res.status(500).json({ error: message });
  }
}

export async function updateCostBreakdown(req, res) {
  try {
    const eventId = req.params.eventId;
    if (!eventId || !String(eventId).trim()) {
      return res.status(400).json({ error: 'Event ID is required' });
    }

    const payload = {
      packagePricePerPax: parseNumberField(req.body?.packagePricePerPax, 'packagePricePerPax'),
      eventPax: parseNumberField(req.body?.eventPax, 'eventPax'),
      manpowerCost: parseNumberField(req.body?.manpowerCost, 'manpowerCost'),
      additionalCharges: parseNumberField(req.body?.additionalCharges, 'additionalCharges'),
    };

    const breakdown = await updateCostBreakdownService(eventId, payload);
    return res.status(200).json({ costBreakdown: breakdown });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update cost breakdown';
    const status = error instanceof Error && (error.status === 404 || error.status === 400) ? error.status : 500;
    return res.status(status).json({ error: message });
  }
}

export async function exportCostBreakdown(req, res) {
  try {
    const eventId = req.params.eventId;
    if (!eventId || !String(eventId).trim()) {
      return res.status(400).json({ error: 'Event ID is required' });
    }

    const exportData = await exportCostBreakdownService(eventId);
    if (!exportData) {
      return res.status(404).json({ error: 'Cost breakdown not found' });
    }

    return res.status(200).json({ export: exportData });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to export cost breakdown';
    return res.status(500).json({ error: message });
  }
}
