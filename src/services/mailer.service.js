import nodemailer from 'nodemailer';

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const fromAddress = process.env.SMTP_USER;

function buildMailTransporter() {
  if (!smtpHost || !smtpPort) {
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: Number(smtpPort),
    secure: Number(smtpPort) === 465,
    auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export async function sendSmtpMail({ to, subject, text, html, from }) {
  const transporter = buildMailTransporter();
  if (!transporter) {
    console.warn('SMTP configuration is missing. Email will not be sent.', {
      to,
      subject,
    });
    return { skipped: true, reason: 'SMTP config missing', info: null };
  }

  const mailOptions = {
    from: from ?? fromAddress,
    to,
    subject,
    text,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  return { skipped: false, info };
}

export async function sendInquiryCreatedEmail(inquiry) {
  if (!inquiry) {
    throw new Error('Inquiry is required to send inquiry created email');
  }

  if (!inquiry.email) {
    console.warn(
      `No email provided for inquiry ${inquiry.id}, skipping inquiry created email.`
    );
    return { skipped: true, reason: 'No email provided', link: null };
  }

  const inquiryId = inquiry.id || 'N/A';
  const fullName =
    [inquiry.firstName, inquiry.middleName, inquiry.lastName]
      .filter(Boolean)
      .join(' ') || 'Client';
  const inquiryDate = inquiry.date || 'TBD';
  const createdAt =
    inquiry.createdAt || inquiry.created_at || new Date().toISOString();
  const eventType = inquiry.eventType || 'N/A';
  const eventPax = inquiry.eventPax ?? 'N/A';

  const subject = `We received your inquiry at Schatzies Events`;
  const text =
    `Hello ${fullName},\n\n` +
    `We received your inquiry. Here are the details we have on file:\n\n` +
    `Inquiry ID: ${inquiryId}\n` +
    `Name: ${fullName}\n` +
    `Email: ${inquiry.email}\n` +
    `Event Type: ${eventType}\n` +
    `Date: ${inquiryDate}\n` +
    `Created At: ${createdAt}\n` +
    `Event Pax: ${eventPax}\n\n` +
    `Our team will review your inquiry and contact you if we need anything else.\n\n` +
    `Best regards,\nSchatzies Events`;
  const html =
    `<p>Hello ${escapeHtml(fullName)},</p>` +
    `<p>We received your inquiry. Here are the details we have on file:</p>` +
    `<ul>` +
    `<li><strong>Inquiry ID:</strong> ${escapeHtml(inquiryId)}</li>` +
    `<li><strong>Name:</strong> ${escapeHtml(fullName)}</li>` +
    `<li><strong>Email:</strong> ${escapeHtml(inquiry.email)}</li>` +
    `<li><strong>Event Type:</strong> ${escapeHtml(eventType)}</li>` +
    `<li><strong>Date:</strong> ${escapeHtml(inquiryDate)}</li>` +
    `<li><strong>Created At:</strong> ${escapeHtml(createdAt)}</li>` +
    `<li><strong>Event Pax:</strong> ${escapeHtml(eventPax)}</li>` +
    `</ul>` +
    `<p>Our team will review your inquiry and contact you if we need anything else.</p>` +
    `<p>Best regards,<br /><strong>Schatzies Events</strong></p>`;

  const transporter = buildMailTransporter();
  if (!transporter) {
    console.warn(
      'SMTP configuration is missing. Inquiry created email will not be sent.',
      {
        to: inquiry.email,
        subject,
      }
    );
    return { skipped: true, reason: 'SMTP config missing', link: null };
  }

  const mailOptions = {
    from: fromAddress,
    to: inquiry.email,
    subject,
    text,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  return { skipped: false, info, link: null };
}

export async function sendInquiryStatusUpdatedEmail(inquiry) {
  if (!inquiry) {
    throw new Error('Inquiry is required to send status updated email');
  }

  if (!inquiry.email) {
    console.warn(
      `No email provided for inquiry ${inquiry.id}, skipping status updated email.`
    );
    return { skipped: true, reason: 'No email provided', link: null };
  }

  const inquiryId = inquiry.id || 'N/A';
  const fullName =
    [inquiry.firstName, inquiry.middleName, inquiry.lastName]
      .filter(Boolean)
      .join(' ') || 'Client';
  const status = inquiry.status || 'Updated';
  const eventType = inquiry.eventType || 'N/A';

  const subject = `Your event inquiry status has been updated`;
  const text =
    `Hello ${fullName},\n\n` +
    `Your event inquiry status has been updated.\n\n` +
    `Inquiry ID: ${inquiryId}\n` +
    `Event Type: ${eventType}\n` +
    `Current Status: ${status}\n\n` +
    `Best regards,\nSchatzies Events`;
  const html =
    `<p>Hello ${escapeHtml(fullName)},</p>` +
    `<p>Your event inquiry status has been updated.</p>` +
    `<ul>` +
    `<li><strong>Inquiry ID:</strong> ${escapeHtml(inquiryId)}</li>` +
    `<li><strong>Event Type:</strong> ${escapeHtml(eventType)}</li>` +
    `<li><strong>Current Status:</strong> ${escapeHtml(status)}</li>` +
    `</ul>` +
    `<p>Best regards,<br /><strong>Schatzies Events</strong></p>`;

  const transporter = buildMailTransporter();
  if (!transporter) {
    console.warn(
      'SMTP configuration is missing. Inquiry status updated email will not be sent.',
      {
        to: inquiry.email,
        subject,
      }
    );
    return { skipped: true, reason: 'SMTP config missing', link: null };
  }

  const mailOptions = {
    from: fromAddress,
    to: inquiry.email,
    subject,
    text,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  return { skipped: false, info, link: null };
}

export async function sendWorkerRsvpEmail(organizer, event) {
  if (!organizer || !event) {
    throw new Error('Organizer and event are required to send RSVP email');
  }

  const organizerName =
    organizer.name ||
    [organizer.firstName, organizer.middleName, organizer.lastName]
      .filter(Boolean)
      .join(' ') ||
    'Organizer';
  const eventDate = event.eventDate || event.startDate || 'TBD';
  const eventTitle = event.title || event.eventType || 'the event';

  const subject = `You have been assigned as a worker for ${eventTitle}`;
  const text =
    `Hello ${organizerName},\n\n` +
    `You have been added as a worker for the event "${eventTitle}".\n` +
    `Please review the event details below and confirm with the organizer if needed.\n\n` +
    `Event date: ${eventDate}\n` +
    `Location: ${event.location || 'TBD'}\n\n` +
    `Thank you.\n`;
  const html =
    `<p>Hello ${organizerName},</p>` +
    `<p>You have been added as a worker for the event <strong>${eventTitle}</strong>.</p>` +
    `<p>Please review the event details and confirm with the organizer if needed.</p>` +
    `<p><strong>Event date:</strong> ${eventDate}<br />` +
    `<strong>Location:</strong> ${event.location || 'TBD'}</p>` +
    `<p>Thank you.</p>`;

  const transporter = buildMailTransporter();
  if (!transporter) {
    console.warn(
      'SMTP configuration is missing. worker assignment email will not be sent.',
      {
        to: organizer.email,
        subject,
      }
    );
    return { skipped: true, reason: 'SMTP config missing', link: null };
  }

  const mailOptions = {
    from: fromAddress,
    to: organizer.email,
    subject,
    text,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  return { skipped: false, info, link: null };
}

export async function sendMeetingInviteEmail(inquiry, meetingDetails) {
  if (!inquiry || !meetingDetails) {
    throw new Error(
      'Inquiry and meeting details are required to send meeting invite'
    );
  }

  if (!inquiry.email) {
    console.warn(
      `No email provided for inquiry ${inquiry.id}, skipping meeting invite.`
    );
    return { skipped: true, reason: 'No email provided', link: null };
  }

  const { firstName, lastName, eventType } = inquiry;
  const { date, time, location } = meetingDetails;

  const subject = `Meeting Scheduled for your ${eventType} Inquiry with Schatzies Events`;
  const text =
    `Hello ${firstName} ${lastName},\n\n` +
    `We have successfully reviewed your inquiry for a ${eventType}!\n\n` +
    `We would like to invite you to a meeting to discuss your upcoming event in detail.\n\n` +
    `Meeting Details:\n` +
    `Date: ${date}\n` +
    `Time: ${time}\n` +
    `Location: ${location}\n\n` +
    `We look forward to meeting with you.\n\n` +
    `Best regards,\nSchatzies Events`;

  const html =
    `<p>Hello ${firstName} ${lastName},</p>` +
    `<p>We have successfully reviewed your inquiry for a ${eventType}!</p>` +
    `<p>We would like to invite you to a meeting to discuss your upcoming event in detail.</p>` +
    `<h3>Meeting Details:</h3>` +
    `<ul>` +
    `<li><strong>Date:</strong> ${date}</li>` +
    `<li><strong>Time:</strong> ${time}</li>` +
    `<li><strong>Location:</strong> ${location}</li>` +
    `</ul>` +
    `<p>We look forward to meeting with you.</p>` +
    `<p>Best regards,<br/><strong>Schatzies Events</strong></p>`;

  const transporter = buildMailTransporter();
  if (!transporter) {
    console.warn(
      'SMTP configuration is missing. Meeting invite email will not be sent.',
      {
        to: inquiry.email,
        subject,
      }
    );
    return { skipped: true, reason: 'SMTP config missing', link: null };
  }

  const mailOptions = {
    from: fromAddress,
    to: inquiry.email,
    subject,
    text,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  return { skipped: false, info, link: null };
}

export async function sendPasswordResetCodeEmail(user, code) {
  if (!user || !code) {
    throw new Error(
      'User and reset code are required to send password reset email'
    );
  }

  if (!user.email) {
    console.warn(
      `No email provided for user ${user.user_id}, skipping password reset email.`
    );
    return { skipped: true, reason: 'No email provided', link: null };
  }

  const fullName =
    [user.firstName, user.middleName, user.lastName]
      .filter(Boolean)
      .join(' ') || 'Customer';
  const subject = 'Your Schatzies Events password reset code';
  const text =
    `Hello ${fullName},\n\n` +
    `Use this verification code to continue resetting your password: ${code}\n\n` +
    `This code expires in 15 minutes. If you did not request a password reset, you can ignore this email.\n\n` +
    `Best regards,\nSchatzies Events`;
  const html =
    `<p>Hello ${escapeHtml(fullName)},</p>` +
    `<p>Use this verification code to continue resetting your password:</p>` +
    `<div style="font-size: 28px; font-weight: 700; letter-spacing: 0.35em; padding: 16px 20px; border-radius: 16px; background: #fff0f5; display: inline-block;">${escapeHtml(code)}</div>` +
    `<p>This code expires in 15 minutes. If you did not request a password reset, you can ignore this email.</p>` +
    `<p>Best regards,<br /><strong>Schatzies Events</strong></p>`;

  const transporter = buildMailTransporter();
  if (!transporter) {
    console.warn(
      'SMTP configuration is missing. Password reset email will not be sent.',
      {
        to: user.email,
        subject,
      }
    );
    return { skipped: true, reason: 'SMTP config missing', link: null };
  }

  const mailOptions = {
    from: fromAddress,
    to: user.email,
    subject,
    text,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  return { skipped: false, info, link: null };
}
