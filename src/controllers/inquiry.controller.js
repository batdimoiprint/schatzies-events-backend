import * as inquiryService from '../services/inquiry.service.js';
import { isEmailVerified } from '../services/emailVerification.service.js';
import {
  sendInquiryCreatedEmail,
  sendInquiryStatusUpdatedEmail,
} from '../services/mailer.service.js';

// POST /api/inquiries
export async function createInquiryController(req, res) {
  try {
    const { email } = req.body ?? {};

    if (!email) {
      return res.status(400).json({ error: 'Email is required to submit an inquiry' });
    }

    // Requirement: Check if email is verified
    const verified = await isEmailVerified(email);
    if (!verified) {
      return res.status(403).json({ 
        error: 'Email not verified',
        message: 'Please verify your email address before submitting the inquiry form.'
      });
    }

    const newInquiry = await inquiryService.createInquiry(req.body);

    try {
      await sendInquiryCreatedEmail(newInquiry);
    } catch (mailError) {
      console.error('Failed to send inquiry created email:', mailError);
    }

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
    const existingInquiry = await inquiryService.getInquiryById(req.params.id);
    const updated = await inquiryService.updateInquiry(req.params.id, req.body);

    const didStatusChange =
      typeof req.body?.status === 'string' &&
      req.body.status &&
      req.body.status !== existingInquiry?.status;

    if (didStatusChange) {
      try {
        const mailResult = await sendInquiryStatusUpdatedEmail({
          ...updated,
          email: existingInquiry.email,
        });
        console.log('sendInquiryStatusUpdatedEmail result:', mailResult);
      } catch (mailError) {
        console.error(
          'Failed to send inquiry status updated email:',
          mailError
        );
      }
    }

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
    const existingInquiry = await inquiryService.getInquiryById(req.params.id);
    const updated = await inquiryService.updateInquiryStatus(
      req.params.id,
      status
    );

    if (status !== existingInquiry?.status) {
      try {
        const mailResult = await sendInquiryStatusUpdatedEmail({
          ...updated,
          email: updated.email || existingInquiry?.email || null,
        });
        console.log('sendInquiryStatusUpdatedEmail result:', mailResult);
      } catch (mailError) {
        console.error(
          'Failed to send inquiry status updated email:',
          mailError
        );
      }
    }

    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// POST /api/inquiries/:id/communications
export async function addInquiryCommunicationController(req, res) {
  try {
    const communication = req.body;
    const updated = await inquiryService.addCommunication(
      req.params.id,
      communication
    );
    res.status(201).json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// POST /api/inquiries/:id/meeting
export async function scheduleMeetingController(req, res) {
  try {
    const {
      title,
      startDateKey,
      startTime,
      endDateKey,
      endTime,
      label,
      organizerId,
      location,
      description,
      eventType,
      inquiryUserId,
    } = req.body;
    if (
      !title ||
      !startDateKey ||
      !startTime ||
      !endDateKey ||
      !endTime ||
      !organizerId
    ) {
      return res.status(400).json({
        error:
          'title, startDateKey, startTime, endDateKey, endTime, and organizerId are required',
      });
    }
    const updated = await inquiryService.scheduleMeeting(req.params.id, {
      title,
      startDateKey,
      startTime,
      endDateKey,
      endTime,
      label,
      organizerId,
      location,
      description,
      eventType,
      inquiryUserId,
    });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// GET /api/inquiries/:id/isUserRegistered
export async function checkUserRegisteredController(req, res) {
  try {
    const inquiry = await inquiryService.getInquiryById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({ error: 'Inquiry not found' });
    }
    res.json({ isUserRegistered: inquiry.is_Account_Created === true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
