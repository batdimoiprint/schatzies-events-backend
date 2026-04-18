import * as inquiryService from '../services/inquiry.service.js';

// POST /api/inquiries
export async function createInquiryController(req, res) {
  try {
    const newInquiry = await inquiryService.createInquiry(req.body);
    res.status(201).json(newInquiry);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// GET /api/inquiries
export async function getInquiriesController(req, res) {
  try {
    const inquiries = await inquiryService.getInquiries();
    res.json(inquiries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// GET /api/inquiries/:id
export async function getInquiryByIdController(req, res) {
  try {
    const inquiry = await inquiryService.getInquiryById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({ error: 'Inquiry not found' });
    }
    res.json(inquiry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/inquiries/:id
export async function updateInquiryController(req, res) {
  try {
    const updated = await inquiryService.updateInquiry(req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// DELETE /api/inquiries/:id
export async function deleteInquiryController(req, res) {
  try {
    const deleted = await inquiryService.deleteInquiry(req.params.id);
    res.json({ message: 'Inquiry deleted', deleted });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// PATCH /api/inquiries/:id/status
export async function updateInquiryStatusController(req, res) {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    const updated = await inquiryService.updateInquiryStatus(req.params.id, status);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// POST /api/inquiries/:id/communications
export async function addInquiryCommunicationController(req, res) {
  try {
    const communication = req.body;
    const updated = await inquiryService.addCommunication(req.params.id, communication);
    res.status(201).json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// POST /api/inquiries/:id/meeting
export async function scheduleMeetingController(req, res) {
  try {
    const { date, time, location, organizerId } = req.body;
    if (!date || !time || !location || !organizerId) {
      return res.status(400).json({ error: 'date, time, location, and organizerId are required' });
    }
    const updated = await inquiryService.scheduleMeeting(req.params.id, { date, time, location, organizerId });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}