import QRCode from 'qrcode';
import { randomUUID } from 'crypto';
import { uploadFile, getPresignedUrl } from '../services/s3.service.js';
import {
  getAttendingGuests,
  getAllRsvps,
  getHeadcount,
  checkInRsvpGuest,
  checkEmailExists,
  verifyRsvpEmail,
  createRsvpGuest as createRsvpGuestService,
  deleteRsvpGuest,
} from '../services/rsvp.service.js';
import { sendRsvpVerificationEmail } from '../services/mailer.service.js';

function buildGuestName(guest) {
  return [guest.guestfirstName, guest.guestmiddleName, guest.guestlastName]
    .filter(Boolean)
    .join(' ')
    .trim();
}

export async function getRsvpList(req, res) {
  try {
    const { eventId } = req.params;
    
    // Verify ownership: only event owner, assigned organizers, or admins can fetch attending guest list
    const { getEventById } = await import('../services/event.service.js');
    const event = await getEventById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const isOwner = event.clientId === req.user?.user_id;
    const isHeadOrganizer = event.headOrganizerId === req.user?.user_id;
    const isAssignedOrganizer = Array.isArray(event.workerOrganizerIds) && 
      event.workerOrganizerIds.includes(req.user?.user_id);
    const isAdmin = req.user?.role === 'ADMIN';
    const isOrganizer = req.user?.role === 'ORGANIZER';

    if (!isOwner && !isHeadOrganizer && !isAssignedOrganizer && !isAdmin && !isOrganizer) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this event\'s guest list' });
    }

    const guests = await getAttendingGuests(eventId);
    return res.status(200).json({ guests });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch RSVP guests';
    return res.status(400).json({ message });
  }
}

export async function getEventHeadcount(req, res) {
  try {
    const { eventId } = req.params;
    
    // Verify ownership: only event owner, assigned organizers, or admins can fetch headcount
    const { getEventById } = await import('../services/event.service.js');
    const event = await getEventById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const isOwner = event.clientId === req.user?.user_id;
    const isHeadOrganizer = event.headOrganizerId === req.user?.user_id;
    const isAssignedOrganizer = Array.isArray(event.workerOrganizerIds) && 
      event.workerOrganizerIds.includes(req.user?.user_id);
    const isAdmin = req.user?.role === 'ADMIN';
    const isOrganizer = req.user?.role === 'ORGANIZER';

    if (!isOwner && !isHeadOrganizer && !isAssignedOrganizer && !isAdmin && !isOrganizer) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this event\'s headcount' });
    }

    const headcount = await getHeadcount(eventId);
    return res.status(200).json(headcount);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch headcount';
    return res.status(400).json({ message });
  }
}

export async function createRsvpGuest(req, res) {
  try {
    const { eventId } = req.params;
    if (!eventId || !String(eventId).trim()) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    const payload = req.body ?? {};
    const guest = await createRsvpGuestService(eventId, payload);
    return res.status(201).json({ guest });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create RSVP guest';
    return res.status(400).json({ message });
  }
}

export async function manualCheckIn(req, res) {
  try {
    const { eventId, guestId } = req.params;
    const guest = await checkInRsvpGuest(eventId, guestId);
    return res.status(200).json({
      message: 'Guest checked in',
      guestName: buildGuestName(guest),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to check in guest';
    return res.status(400).json({ message });
  }
}

export async function createRsvp(req, res) {
  try {
    const { event_id, first_name, last_name, email, contact_number, status, message } = req.body;
    if (!event_id) {
      return res.status(400).json({ message: 'event_id is required' });
    }

    if (!email || !String(email).trim()) {
      return res.status(400).json({ message: 'email is required' });
    }

    // Generate verification token
    const verificationToken = randomUUID();

    const payload = {
      firstName: first_name,
      lastName: last_name,
      email,
      contactNumber: contact_number,
      status,
      message,
    };

    const guest = await createRsvpGuestService(event_id, payload, verificationToken);
    
    // Get event details for email
    const { getEventById } = await import('../services/event.service.js');
    const event = await getEventById(event_id);

    // Send verification email
    const origin = req.get('origin') || req.get('referer');
    let baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      baseUrl = new URL(origin).origin;
    }
    
    const verificationUrl = `${baseUrl}/rsvp/verify?eventId=${event_id}&guestId=${guest.guestId}&token=${verificationToken}`;
    
    try {
      const emailResult = await sendRsvpVerificationEmail(guest, event || {}, verificationUrl);
      console.log('RSVP verification email sent:', emailResult);
    } catch (emailError) {
      console.error('Error sending RSVP verification email:', emailError);
      // Don't fail the whole request if email fails, but log it
    }

    return res.status(201).json({ 
      guest,
      message: 'RSVP submitted successfully. Please check your email to verify and receive your QR code.'
    });
  } catch (error) {
    console.error('Error in createRsvp:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unable to submit RSVP form';
    return res.status(400).json({ message: errorMessage });
  }
}

export async function generateRsvpQr(req, res) {
  try {
    const { eventId } = req.params;
    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    const { getEventById, updateEvent } = await import('../services/event.service.js');
    const event = await getEventById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // If event already has a QR stored in S3, return a fresh presigned URL
    if (event.rsvpQrS3Key) {
      const qrCodeUrl = await getPresignedUrl(event.rsvpQrS3Key, 86400); // 24h expiry
      return res.status(200).json({
        qrCode: qrCodeUrl,
        s3Key: event.rsvpQrS3Key,
        message: 'Returned existing QR code',
      });
    }

    // Generate QR code pointing to the RSVP page
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const rsvpUrl = `${baseUrl}/rsvp?eventId=${eventId}`;

    const qrCodeBuffer = await QRCode.toBuffer(rsvpUrl, {
      errorCorrectionLevel: 'M',
      type: 'png',
      width: 400,
      margin: 4,
    });

    // Upload to S3
    const s3Key = `rsvp-qr/${eventId}/invitation-qr.png`;
    await uploadFile(qrCodeBuffer, s3Key, 'image/png');

    // Save S3 key to event record
    await updateEvent(eventId, { rsvpQrS3Key: s3Key });

    // Return presigned URL
    const qrCodeUrl = await getPresignedUrl(s3Key, 86400);

    return res.status(200).json({
      qrCode: qrCodeUrl,
      s3Key,
      url: rsvpUrl,
      message: 'Generated and saved new QR code',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate QR code';
    return res.status(500).json({ message });
  }
}

export async function getEventRsvps(req, res) {
  try {
    const { eventId } = req.params;
    
    // Verify ownership: only event owner, assigned organizers, or admins can fetch RSVPs
    const { getEventById } = await import('../services/event.service.js');
    const event = await getEventById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const isOwner = event.clientId === req.user?.user_id;
    const isHeadOrganizer = event.headOrganizerId === req.user?.user_id;
    const isAssignedOrganizer = Array.isArray(event.workerOrganizerIds) && 
      event.workerOrganizerIds.includes(req.user?.user_id);
    const isAdmin = req.user?.role === 'ADMIN';
    const isOrganizer = req.user?.role === 'ORGANIZER';

    if (!isOwner && !isHeadOrganizer && !isAssignedOrganizer && !isAdmin && !isOrganizer) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this event\'s RSVPs' });
    }

    const guests = await getAllRsvps(eventId);
    return res.status(200).json({ guests });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch event RSVPs';
    return res.status(400).json({ message });
  }
}

export async function checkEmailExistsInRsvp(req, res) {
  try {
    const { email } = req.params;
    const { eventId } = req.query;

    if (!email || !String(email).trim()) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const exists = await checkEmailExists(email, eventId || null);
    return res.status(200).json({ exists });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to check email';
    return res.status(400).json({ message });
  }
}

export async function verifyRsvpEmailController(req, res) {
  try {
    const { eventId, guestId, token } = req.query;

    if (!eventId || !String(eventId).trim()) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    if (!guestId || !String(guestId).trim()) {
      return res.status(400).json({ message: 'Guest ID is required' });
    }

    if (!token || !String(token).trim()) {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    const guest = await verifyRsvpEmail(eventId, guestId, token);
    
    // Send email with the generated QR code
    try {
      const { getEventById } = await import('../services/event.service.js');
      const event = await getEventById(eventId);
      if (event) {
        const { sendRsvpVerifiedQrEmail } = await import('../services/mailer.service.js');
        await sendRsvpVerifiedQrEmail(guest, event);
      }
    } catch (emailErr) {
      console.error('Error sending verified QR email:', emailErr);
      // Non-fatal error, continue to respond successfully
    }

    return res.status(200).json({ 
      message: 'Email verified successfully. Your QR code is ready!',
      guest,
      qrCode: guest.qrCode
    });
  } catch (error) {
    console.error('Error verifying RSVP email:', error);
    const message = error instanceof Error ? error.message : 'Unable to verify email';
    return res.status(400).json({ message });
  }
}

export async function deleteRsvpGuestController(req, res) {
  try {
    const { eventId, guestId } = req.params;

    if (!eventId || !String(eventId).trim()) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    if (!guestId || !String(guestId).trim()) {
      return res.status(400).json({ message: 'Guest ID is required' });
    }

    await deleteRsvpGuest(eventId, guestId);
    return res.status(200).json({ message: 'RSVP guest deleted successfully' });
  } catch (error) {
    console.error('Error deleting RSVP guest:', error);
    const message = error instanceof Error ? error.message : 'Unable to delete RSVP guest';
    return res.status(400).json({ message });
  }
}
