import nodemailer from 'nodemailer';
import { nowPH } from '../utils/timezone.js';

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

function formatDate(dateInput) {
  if (!dateInput) return 'TBD';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const month = months[d.getMonth()];
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${month} ${dd}, ${yyyy}`;
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

function wrapEmailHtml({ preheader = '', title, bodyHtml }) {
  const safePre = escapeHtml(preheader);
  const safeTitle = escapeHtml(title);
  const logoBase64 = "data:image/png;base64,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";
  return (
    `<!DOCTYPE html>` +
    `<html lang="en">` +
    `<head>` +
    `<meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1.0">` +
    `<title>${safeTitle}</title>` +
    `<style>` +
    `  @media screen and (max-width: 600px) {` +
    `    .email-container { width: 100% !important; border-radius: 0 !important; }` +
    `    .content-padding { padding: 20px !important; }` +
    `  }` +
    `</style>` +
    `</head>` +
    `<body style="margin:0;padding:0;background-color:#f8f9fa;">` +
    `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${safePre}</div>` +
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8f9fa;padding:40px 10px;">` +
    `<tr><td align="center">` +
    `<table class="email-container" role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0;box-shadow:0 2px 10px rgba(0,0,0,0.05);margin:0 auto;max-width:600px;">` +
    `<tr>` +
    `<td class="content-padding" style="background-color:#1c1c1c;padding:30px;text-align:center;">` +
    `<img src="${logoBase64}" alt="Schatzies Events" style="height:60px;width:auto;display:block;margin:0 auto 15px;" />` +
    `<div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#ffffff;line-height:1.3;letter-spacing:0.5px;">${safeTitle}</div>` +
    `</td></tr>` +
    `<tr>` +
    `<td class="content-padding" style="padding:40px 30px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:16px;line-height:1.6;color:#333333;">` +
    `${bodyHtml}` +
    `</td></tr>` +
    `<tr>` +
    `<td class="content-padding" style="padding:24px 30px;background-color:#f1f1f1;border-top:1px solid #e0e0e0;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:13px;color:#666666;">` +
    `<div style="margin-bottom:12px;">` +
    `<a href="https://www.schatziesevents.com" style="color:#d53f8c;text-decoration:none;font-weight:600;font-size:14px;">Visit Our Website</a>` +
    `</div>` +
    `<div>Schatzies Events PH</div>` +
    `</td></tr>` +
    `</table></td></tr></table></body></html>`
  );
}

export async function sendInquiryCreatedEmail(inquiry) {
  if (!inquiry) {
    throw new Error('Inquiry is required to send inquiry created email');
  }

  const resolvedInquiryId = inquiry.id ?? null;

  if (!inquiry.email) {
    console.warn(
      `No email provided for inquiry ${inquiry.id}, skipping inquiry created email.`
    );
    return {
      skipped: true,
      reason: 'No email provided',
      link: null,
      inquiryId: resolvedInquiryId,
    };
  }

  const inquiryId = inquiry.id || 'N/A';
  const fullName =
    [inquiry.firstName, inquiry.middleName, inquiry.lastName]
      .filter(Boolean)
      .join(' ') || 'Client';
  const inquiryDate = formatDate(inquiry.date);
  const createdAt = formatDate(
    inquiry.createdAt || inquiry.created_at || nowPH()
  );
  const eventType = inquiry.eventType || 'N/A';
  const eventPax = inquiry.eventPax ?? inquiry.package?.pax ?? 'N/A';
  const eventPackage = inquiry.eventPackage || inquiry.package?.name || 'N/A';
  const clientMessage = inquiry.message || 'None provided';

  const subject = `We received your inquiry at Schatzies Events`;
  const text =
    `Hello ${fullName},\n\n` +
    `We received your inquiry. Here are the details we have on file:\n\n` +
    `Inquiry ID: ${inquiryId}\n` +
    `Name: ${fullName}\n` +
    `Email: ${inquiry.email}\n` +
    `Event Type: ${eventType}\n` +
    `Event Package: ${eventPackage}\n` +
    `Planned Date: ${inquiryDate}\n` +
    `Created At: ${createdAt}\n` +
    `Event Pax: ${eventPax}\n` +
    `Client Message: ${clientMessage}\n\n` +
    `Our team will review your inquiry and contact you if we need anything else.\n\n` +
    `Best regards,\nSchatzies Events PH`;
  const bodyHtml =
    `<p style="margin:0 0 16px;">Hello ${escapeHtml(fullName)},</p>` +
    `<p style="margin:0 0 16px;">We received your inquiry. Here are the details we have on file:</p>` +
    `<ul style="margin:0 0 16px;padding-left:20px;color:#1e1b2e;">` +
    `<li style="margin-bottom:8px;"><strong style="color:#7c3aed;">Inquiry ID:</strong> ${escapeHtml(inquiryId)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Name:</strong> ${escapeHtml(fullName)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Email:</strong> ${escapeHtml(inquiry.email)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Event Type:</strong> ${escapeHtml(eventType)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Event Package:</strong> ${escapeHtml(eventPackage)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Planned Date:</strong> ${escapeHtml(inquiryDate)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Created At:</strong> ${escapeHtml(createdAt)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Event Pax:</strong> ${escapeHtml(eventPax)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Client Message:</strong> ${escapeHtml(clientMessage)}</li>` +
    `</ul>` +
    `<p style="margin:0 0 16px;">Our team will review your inquiry and contact you if we need anything else.</p>` +
    `<p style="margin:0;">Best regards,<br /><strong style="color:#a855f7;">Schatzies Events PH</strong></p>`;
  const html = wrapEmailHtml({
    preheader: `We received your inquiry — reference ${inquiryId}.`,
    title: 'Your inquiry was received',
    bodyHtml,
  });

  const transporter = buildMailTransporter();
  if (!transporter) {
    console.warn(
      'SMTP configuration is missing. Inquiry created email will not be sent.',
      {
        to: inquiry.email,
        subject,
      }
    );
    return {
      skipped: true,
      reason: 'SMTP config missing',
      link: null,
      inquiryId: resolvedInquiryId,
    };
  }

  const mailOptions = {
    from: fromAddress,
    to: inquiry.email,
    subject,
    text,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  return { skipped: false, info, link: null, inquiryId: resolvedInquiryId };
}

export async function sendInquiryStatusUpdatedEmail(inquiry) {
  if (!inquiry) {
    throw new Error('Inquiry is required to send status updated email');
  }

  const resolvedInquiryId = inquiry.id ?? null;

  if (!inquiry.email) {
    console.warn(
      `No email provided for inquiry ${inquiry.id}, skipping status updated email.`
    );
    return {
      skipped: true,
      reason: 'No email provided',
      link: null,
      inquiryId: resolvedInquiryId,
    };
  }

  const inquiryId = inquiry.id || 'N/A';
  const fullName =
    [inquiry.firstName, inquiry.middleName, inquiry.lastName]
      .filter(Boolean)
      .join(' ') || 'Client';
  const status = inquiry.status || 'Updated';
  const eventType = inquiry.eventType || 'N/A';
  const inquiryDate = formatDate(inquiry.date);
  const createdAt = formatDate(inquiry.createdAt || inquiry.created_at);

  const subject = `Your event inquiry status has been updated`;
  const text =
    `Hello ${fullName},\n\n` +
    `Your event inquiry status has been updated.\n\n` +
    `Inquiry ID: ${inquiryId}\n` +
    `Event Type: ${eventType}\n` +
    `Date: ${inquiryDate}\n` +
    `Created At: ${createdAt}\n` +
    `Current Status: ${status}\n\n` +
    `Best regards,\nSchatzies Events PH`;
  const bodyHtml =
    `<p style="margin:0 0 16px;">Hello ${escapeHtml(fullName)},</p>` +
    `<p style="margin:0 0 16px;">Your event inquiry status has been updated.</p>` +
    `<ul style="margin:0 0 16px;padding-left:20px;color:#1e1b2e;">` +
    `<li style="margin-bottom:8px;"><strong style="color:#7c3aed;">Inquiry ID:</strong> ${escapeHtml(inquiryId)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Event Type:</strong> ${escapeHtml(eventType)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Date:</strong> ${escapeHtml(inquiryDate)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Created At:</strong> ${escapeHtml(createdAt)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Current Status:</strong> ${escapeHtml(status)}</li>` +
    `</ul>` +
    `<p style="margin:0;">Best regards,<br /><strong style="color:#a855f7;">Schatzies Events PH</strong></p>`;
  const html = wrapEmailHtml({
    preheader: `Status update for inquiry ${inquiryId}.`,
    title: 'Inquiry status updated',
    bodyHtml,
  });

  const transporter = buildMailTransporter();
  if (!transporter) {
    console.warn(
      'SMTP configuration is missing. Inquiry status updated email will not be sent.',
      {
        to: inquiry.email,
        subject,
      }
    );
    return {
      skipped: true,
      reason: 'SMTP config missing',
      link: null,
      inquiryId: resolvedInquiryId,
    };
  }

  const mailOptions = {
    from: fromAddress,
    to: inquiry.email,
    subject,
    text,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  return { skipped: false, info, link: null, inquiryId: resolvedInquiryId };
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
  const location = event.location || 'TBD';
  const text =
    `Hello ${organizerName},\n\n` +
    `You have been added as a worker for the event "${eventTitle}".\n` +
    `Please review the event details below and confirm with the organizer if needed.\n\n` +
    `Event date: ${eventDate}\n` +
    `Location: ${location}\n\n` +
    `Thank you.\n`;
  const bodyHtml =
    `<p style="margin:0 0 16px;">Hello ${escapeHtml(organizerName)},</p>` +
    `<p style="margin:0 0 16px;">You have been added as a worker for the event <strong style="color:#7c3aed;">${escapeHtml(eventTitle)}</strong>.</p>` +
    `<p style="margin:0 0 16px;">Please review the event details and confirm with the organizer if needed.</p>` +
    `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 16px;background-color:#faf5ff;border-radius:8px;border:1px solid #e9d5ff;">` +
    `<tr><td style="padding:16px 18px;">` +
    `<p style="margin:0 0 8px;"><strong>Event date:</strong> ${escapeHtml(String(eventDate))}</p>` +
    `<p style="margin:0;"><strong>Location:</strong> ${escapeHtml(String(location))}</p>` +
    `</td></tr></table>` +
    `<p style="margin:0;">Thank you.</p>`;
  const html = wrapEmailHtml({
    preheader: `You are assigned as a worker for ${eventTitle}.`,
    title: 'Worker assignment',
    bodyHtml,
  });

  const transporter = buildMailTransporter();
  if (!transporter) {
    console.warn(
      'SMTP configuration is missing. worker assignment email will not be sent.',
      {
        to: organizer.email,
        subject,
      }
    );
    return {
      skipped: true,
      reason: 'SMTP config missing',
      link: null,
      inquiryId: null,
    };
  }

  const mailOptions = {
    from: fromAddress,
    to: organizer.email,
    subject,
    text,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  return { skipped: false, info, link: null, inquiryId: null };
}

export async function sendMeetingInviteEmail(inquiry, meetingDetails) {
  if (!inquiry || !meetingDetails) {
    throw new Error(
      'Inquiry and meeting details are required to send meeting invite'
    );
  }

  const resolvedInquiryId = inquiry.id ?? null;

  if (!inquiry.email) {
    console.warn(
      `No email provided for inquiry ${inquiry.id}, skipping meeting invite.`
    );
    return {
      skipped: true,
      reason: 'No email provided',
      link: null,
      inquiryId: resolvedInquiryId,
    };
  }

  const { firstName, lastName, eventType } = inquiry;
  const { date, time, location } = meetingDetails;
  const inquiryId = inquiry.id || 'N/A';
  const guestName = [firstName, lastName].filter(Boolean).join(' ') || 'there';
  const safeEventType = eventType || 'N/A';
  const inquiryDate = formatDate(inquiry.date);
  const createdAt = formatDate(inquiry.createdAt || inquiry.created_at);
  const safeDate = formatDate(date);
  const safeTime = time ?? 'TBD';
  const safeLocation = location ?? 'TBD';

  const subject = `Meeting Scheduled for your ${safeEventType} Inquiry with Schatzies Events`;
  const text =
    `Hello ${guestName},\n\n` +
    `We have successfully reviewed your inquiry for a ${safeEventType}!\n\n` +
    `We would like to invite you to a meeting to discuss your upcoming event in detail.\n\n` +
    `Inquiry ID: ${inquiryId}\n` +
    `Event Date: ${inquiryDate}\n` +
    `Created At: ${createdAt}\n\n` +
    `Meeting Details:\n` +
    `Date: ${safeDate}\n` +
    `Time: ${safeTime}\n` +
    `Location: ${safeLocation}\n\n` +
    `We look forward to meeting with you.\n\n` +
    `Best regards,\nSchatzies Events PH`;

  const bodyHtml =
    `<p style="margin:0 0 16px;">Hello ${escapeHtml(guestName)},</p>` +
    `<p style="margin:0 0 16px;">We have successfully reviewed your inquiry for a ${escapeHtml(safeEventType)}!</p>` +
    `<p style="margin:0 0 16px;">We would like to invite you to a meeting to discuss your upcoming event in detail.</p>` +
    `<ul style="margin:0 0 16px;padding-left:20px;color:#1e1b2e;">` +
    `<li style="margin-bottom:8px;"><strong style="color:#7c3aed;">Inquiry ID:</strong> ${escapeHtml(inquiryId)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Event Date:</strong> ${escapeHtml(inquiryDate)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Created At:</strong> ${escapeHtml(createdAt)}</li>` +
    `</ul>` +
    `<p style="margin:0 0 10px;font-size:15px;font-weight:600;color:#6b21a8;">Meeting details</p>` +
    `<ul style="margin:0 0 16px;padding-left:20px;color:#1e1b2e;">` +
    `<li style="margin-bottom:8px;"><strong>Date:</strong> ${escapeHtml(String(safeDate))}</li>` +
    `<li style="margin-bottom:8px;"><strong>Time:</strong> ${escapeHtml(String(safeTime))}</li>` +
    `<li style="margin-bottom:8px;"><strong>Location:</strong> ${escapeHtml(String(safeLocation))}</li>` +
    `</ul>` +
    `<p style="margin:0 0 16px;">We look forward to meeting with you.</p>` +
    `<p style="margin:0;">Best regards,<br/><strong style="color:#a855f7;">Schatzies Events PH</strong></p>`;
  const html = wrapEmailHtml({
    preheader: `Meeting scheduled — inquiry ${inquiryId}.`,
    title: 'Your meeting is scheduled',
    bodyHtml,
  });

  const transporter = buildMailTransporter();
  if (!transporter) {
    console.warn(
      'SMTP configuration is missing. Meeting invite email will not be sent.',
      {
        to: inquiry.email,
        subject,
      }
    );
    return {
      skipped: true,
      reason: 'SMTP config missing',
      link: null,
      inquiryId: resolvedInquiryId,
    };
  }

  const mailOptions = {
    from: fromAddress,
    to: inquiry.email,
    subject,
    text,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  return { skipped: false, info, link: null, inquiryId: resolvedInquiryId };
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
    return {
      skipped: true,
      reason: 'No email provided',
      link: null,
      inquiryId: null,
    };
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
    `Best regards,\nSchatzies Events PH`;
  const bodyHtml =
    `<p style="margin:0 0 16px;">Hello ${escapeHtml(fullName)},</p>` +
    `<p style="margin:0 0 16px;">Use this verification code to continue resetting your password:</p>` +
    `<div style="font-size:28px;font-weight:700;letter-spacing:0.35em;padding:18px 22px;border-radius:14px;background-color:#faf5ff;border:2px solid #c4b5fd;color:#5b21b6;display:inline-block;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${escapeHtml(code)}</div>` +
    `<p style="margin:16px 0 16px;">This code expires in 15 minutes. If you did not request a password reset, you can ignore this email.</p>` +
    `<p style="margin:0;">Best regards,<br /><strong style="color:#a855f7;">Schatzies Events PH</strong></p>`;
  const html = wrapEmailHtml({
    preheader: 'Your password reset verification code.',
    title: 'Password reset',
    bodyHtml,
  });

  const transporter = buildMailTransporter();
  if (!transporter) {
    console.warn(
      'SMTP configuration is missing. Password reset email will not be sent.',
      {
        to: user.email,
        subject,
      }
    );
    return {
      skipped: true,
      reason: 'SMTP config missing',
      link: null,
      inquiryId: null,
    };
  }

  const mailOptions = {
    from: fromAddress,
    to: user.email,
    subject,
    text,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  return { skipped: false, info, link: null, inquiryId: null };
}

export async function sendAccountCreatedEmail(user, temporaryPassword) {
  if (!user || !temporaryPassword) {
    throw new Error(
      'User and temporary password are required to send account created email'
    );
  }

  if (!user.email) {
    console.warn(
      `No email provided for user ${user.user_id}, skipping account created email.`
    );
    return {
      skipped: true,
      reason: 'No email provided',
      link: null,
      userId: user.user_id,
    };
  }

  const fullName =
    [user.firstName, user.middleName, user.lastName]
      .filter(Boolean)
      .join(' ') || 'Customer';
  const subject = 'Welcome to Schatzies Events - Your Account is Ready!';
  const text =
    `Hello ${fullName},\n\n` +
    `Welcome to Schatzies Events! Your account has been successfully created.\n\n` +
    `Here are your login credentials:\n\n` +
    `Email: ${user.email}\n` +
    `Temporary Password: ${temporaryPassword}\n\n` +
    `For security reasons, we strongly recommend that you change your password after your first login.\n\n` +
    `You can now log in to your account and start planning your events with us.\n\n` +
    `If you have any questions or need assistance, please don't hesitate to contact us.\n\n` +
    `Best regards,\nSchatzies Events PH`;
  const bodyHtml =
    `<p style="margin:0 0 16px;">Hello ${escapeHtml(fullName)},</p>` +
    `<p style="margin:0 0 16px;">Welcome to <strong style="color:#a855f7;">Schatzies Events</strong>! Your account has been successfully created.</p>` +
    `<p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#6b21a8;">Your login credentials</p>` +
    `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 16px;background-color:#faf5ff;border-radius:8px;border:1px solid #e9d5ff;">` +
    `<tr><td style="padding:16px 18px;">` +
    `<p style="margin:0 0 12px;"><strong style="color:#7c3aed;">Email:</strong><br/><span style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:14px;color:#1e1b2e;">${escapeHtml(user.email)}</span></p>` +
    `<p style="margin:0;"><strong style="color:#7c3aed;">Temporary Password:</strong><br/><span style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:14px;color:#1e1b2e;background-color:#ffffff;padding:6px 10px;border-radius:4px;display:inline-block;margin-top:4px;border:1px solid #e9d5ff;">${escapeHtml(temporaryPassword)}</span></p>` +
    `</td></tr></table>` +
    `<div style="background-color:#fef3c7;border-left:4px solid #f59e0b;padding:14px 16px;margin:0 0 16px;border-radius:6px;">` +
    `<p style="margin:0;font-size:14px;color:#92400e;"><strong style="color:#b45309;">Security Notice:</strong> For your security, we strongly recommend that you change your password after your first login.</p>` +
    `</div>` +
    `<p style="margin:0 0 16px;">You can now log in to your account and start planning your events with us.</p>` +
    `<p style="margin:0 0 16px;">If you have any questions or need assistance, please don't hesitate to contact us.</p>` +
    `<p style="margin:0;">Best regards,<br /><strong style="color:#a855f7;">Schatzies Events PH</strong></p>`;
  const html = wrapEmailHtml({
    preheader: 'Your account has been created. Login credentials inside.',
    title: 'Welcome to Schatzies Events!',
    bodyHtml,
  });

  const transporter = buildMailTransporter();
  if (!transporter) {
    console.warn(
      'SMTP configuration is missing. Account created email will not be sent.',
      {
        to: user.email,
        subject,
      }
    );
    return {
      skipped: true,
      reason: 'SMTP config missing',
      link: null,
      userId: user.user_id,
    };
  }

  const mailOptions = {
    from: fromAddress,
    to: user.email,
    subject,
    text,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  return { skipped: false, info, link: null, userId: user.user_id };
}

export async function sendUserCredentialsEmail(user, plainPassword, loginLink) {
  if (!user) {
    throw new Error('User is required to send account credentials email');
  }

  if (!user.email) {
    console.warn(
      `No email provided for user ${user.user_id || 'unknown'}, skipping credentials email.`
    );
    return {
      skipped: true,
      reason: 'No email provided',
      link: loginLink || null,
    };
  }

  if (!plainPassword) {
    console.warn(
      `No plain password provided for user ${user.user_id || 'unknown'}, skipping credentials email.`
    );
    return {
      skipped: true,
      reason: 'No password provided',
      link: loginLink || null,
    };
  }

  const fullName =
    [user.firstName, user.middleName, user.lastName]
      .filter(Boolean)
      .join(' ') || 'Customer';
  const username = user.email;
  const primaryFrontendUrl = process.env.NODE_ENV === 'production' && process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',')[0].trim() 
    : 'http://localhost:5173';
  const resolvedLoginLink = loginLink || `${primaryFrontendUrl}/login`;
  const subject = 'Your Schatzies Events account credentials';
  const text =
    `Hello ${fullName},\n\n` +
    `Your account has been created successfully.\n\n` +
    `Username: ${username}\n` +
    `Password: ${plainPassword}\n` +
    `Login Link: ${resolvedLoginLink}\n\n` +
    `For your security, please log in and change your password as soon as possible.\n\n` +
    `Best regards,\nSchatzies Events`;
  const bodyHtml =
    `<h2 style="margin:0 0 16px;font-size:20px;color:#2d1a3d;">Your Account Credentials</h2>` +
    `<p style="margin:0 0 16px;">Hello ${escapeHtml(fullName)},</p>` +
    `<p style="margin:0 0 16px;">Your account has been created successfully. Here are your login credentials:</p>` +
    `<div style="background-color:#f5f0ff;padding:16px;border-radius:8px;margin-bottom:16px;">` +
    `<p style="margin:0 0 8px;"><strong>Username:</strong> ${escapeHtml(username)}</p>` +
    `<p style="margin:0;"><strong>Password:</strong> ${escapeHtml(plainPassword)}</p>` +
    `</div>` +
    `<p style="margin:0 0 24px;">For your security, please log in and change your password as soon as possible.</p>` +
    `<div style="text-align:center;margin-bottom:24px;">` +
    `<a href="${escapeHtml(resolvedLoginLink)}" style="display:inline-block;background-color:#e61f83;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:8px;">Log In Now</a>` +
    `</div>` +
    `<p style="margin:0;font-size:14px;color:#6b5d7d;">Best regards,<br /><strong>Schatzies Events Team</strong></p>`;

  const html = wrapEmailHtml({
    preheader: 'Your Schatzies Events account credentials have been created.',
    title: 'Account Credentials',
    bodyHtml,
  });

  const transporter = buildMailTransporter();
  if (!transporter) {
    console.warn(
      'SMTP configuration is missing. Account credentials email will not be sent.',
      {
        to: user.email,
        subject,
      }
    );
    return {
      skipped: true,
      reason: 'SMTP config missing',
      link: resolvedLoginLink,
    };
  }

  const mailOptions = {
    from: fromAddress,
    to: user.email,
    subject,
    text,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  return { skipped: false, info, link: resolvedLoginLink };
}

export async function sendRsvpVerificationEmail(guest, event, verificationUrl) {
  if (!guest || !event || !verificationUrl) {
    throw new Error(
      'Guest, event, and verification URL are required to send RSVP verification email'
    );
  }

  if (!guest.email) {
    console.warn(
      `No email provided for guest, skipping RSVP verification email.`
    );
    return {
      skipped: true,
      reason: 'No email provided',
      link: verificationUrl,
    };
  }

  const guestName =
    [guest.guestfirstName, guest.guestlastName].filter(Boolean).join(' ') ||
    'Guest';
  const eventTitle = event.title || event.eventType || 'the event';
  const isAttending = String(guest.status || '').toUpperCase() === 'ATTENDING';

  const subject = isAttending
    ? `Verify your RSVP for ${eventTitle}`
    : `Please verify your response for ${eventTitle}`;

  const introText = isAttending
    ? `Thank you for confirming your attendance at ${eventTitle}!`
    : `Thank you for letting us know that you won't be attending ${eventTitle}.`;

  const instructionText = isAttending
    ? `To complete your RSVP and receive your event QR code for check-in, please verify your email by clicking the link below:`
    : `To complete your response, please verify your email by clicking the link below:`;

  const text =
    `Hello ${guestName},\n\n` +
    `${introText}\n\n` +
    `${instructionText}\n\n` +
    `${verificationUrl}\n\n` +
    `This link expires in 24 hours. If you did not submit an RSVP, please ignore this email.\n\n` +
    `Best regards,\nSchatzies Events PH`;

  const buttonText = isAttending ? 'Verify Email & Get QR Code' : null;

  const bodyHtml =
    `<p style="margin:0 0 16px;">Hello ${escapeHtml(guestName)},</p>` +
    `<p style="margin:0 0 16px;">${escapeHtml(introText)}</p>` +
    (buttonText
      ? `<p style="margin:0 0 16px;">${escapeHtml(instructionText)}</p>` +
        `<div style="text-align:center;margin:24px 0;">` +
        `<a href="${escapeHtml(verificationUrl)}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#ec4899 0%,#a855f7 100%);color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">${escapeHtml(buttonText)}</a>` +
        `</div>` +
        `<p style="margin:0 0 16px;font-size:14px;color:#666;">Or copy and paste this link in your browser:<br/><span style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;word-break:break-all;color:#555;">${escapeHtml(verificationUrl)}</span></p>` +
        `<p style="margin:0 0 16px;font-size:13px;color:#999;">This link expires in 24 hours. If you did not submit an RSVP, please ignore this email.</p>`
      : `<p style="margin:0 0 16px;">Your response has been recorded. Thank you for letting us know!</p>`) +
    `<p style="margin:0;">Best regards,<br /><strong style="color:#a855f7;">Schatzies Events PH</strong></p>`;

  const emailTitle = isAttending ? 'Verify your RSVP' : 'Response Received';
  const html = wrapEmailHtml({
    preheader: isAttending
      ? `Verify your email to complete your RSVP for ${eventTitle}.`
      : `We've received your response for ${eventTitle}.`,
    title: emailTitle,
    bodyHtml,
  });

  const transporter = buildMailTransporter();
  if (!transporter) {
    console.warn(
      'SMTP configuration is missing. RSVP verification email will not be sent.',
      {
        to: guest.email,
        subject,
      }
    );
    return {
      skipped: true,
      reason: 'SMTP config missing',
      link: verificationUrl,
    };
  }

  const mailOptions = {
    from: fromAddress,
    to: guest.email,
    subject,
    text,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { skipped: false, info, link: verificationUrl };
  } catch (error) {
    console.error('Error sending RSVP verification email:', error);
    return {
      skipped: true,
      reason: 'Email send failed',
      link: verificationUrl,
      error: error.message,
    };
  }
}

export async function sendRsvpVerifiedQrEmail(guest, event) {
  if (!guest || !event) {
    throw new Error(
      'Guest and event are required to send RSVP verified QR email'
    );
  }

  if (!guest.email) {
    return { skipped: true, reason: 'No email provided' };
  }

  const isAttending = String(guest.status || '').toUpperCase() === 'ATTENDING';
  // Only send the QR code if they are actually attending
  if (!isAttending || !guest.qrCode) {
    return { skipped: true, reason: 'Not attending or no QR code generated' };
  }

  const guestName =
    [guest.guestfirstName, guest.guestlastName].filter(Boolean).join(' ') ||
    'Guest';
  const eventTitle = event.title || event.eventType || 'the event';

  const subject = `Your RSVP is Verified: Your Digital Pass for ${eventTitle}`;

  const text =
    `Hello ${guestName},\n\n` +
    `Your RSVP for ${eventTitle} has been successfully verified!\n\n` +
    `Your Digital Pass (QR Code) is ready. Please save the attached QR code image or have this email ready on your phone when you arrive at the venue for quick check-in.\n\n` +
    `We can't wait to see you there!\n\n` +
    `Best regards,\nSchatzies Events PH`;

  const bodyHtml =
    `<p style="margin:0 0 16px;">Hello ${escapeHtml(guestName)},</p>` +
    `<p style="margin:0 0 16px; font-weight: bold; color: #10b981;">Your RSVP has been successfully verified!</p>` +
    `<p style="margin:0 0 16px;">We're excited to have you join us for ${escapeHtml(eventTitle)}.</p>` +
    `<div style="text-align:center; margin: 24px 0; padding: 20px; background-color: #fcf8ff; border: 1px solid #f3e8ff; border-radius: 12px;">` +
    `<p style="margin:0 0 12px; font-weight: bold; color: #a855f7; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">Your Digital Pass</p>` +
    // Since the QR code is a URL (S3 Presigned URL), we can just embed it directly via img src
    `<img src="${escapeHtml(guest.qrCode)}" alt="Your Check-in QR Code" style="width: 200px; height: 200px; max-width: 100%; border: 1px solid #eee; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);" />` +
    `<p style="margin:12px 0 0; font-size: 13px; color: #666;">Please have this QR code ready on your phone when you arrive for a seamless check-in experience.</p>` +
    `</div>` +
    `<p style="margin:0 0 16px;">We can't wait to see you there!</p>` +
    `<p style="margin:0;">Best regards,<br /><strong style="color:#a855f7;">Schatzies Events PH</strong></p>`;

  const html = wrapEmailHtml({
    preheader: `Your digital pass (QR code) for ${eventTitle} is ready.`,
    title: 'Your RSVP is Verified',
    bodyHtml,
  });

  const transporter = buildMailTransporter();
  if (!transporter) {
    return { skipped: true, reason: 'SMTP config missing' };
  }

  const mailOptions = {
    from: fromAddress,
    to: guest.email,
    subject,
    text,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { skipped: false, info };
  } catch (error) {
    console.error('Error sending RSVP verified QR email:', error);
    return { skipped: true, reason: 'Email send failed', error: error.message };
  }
}

const ADMIN_EMAIL = 'schatzieseventsadmin@gmail.com';

/**
 * Send a notification email to the admin when a new inquiry is submitted.
 */
export async function sendInquiryAdminNotificationEmail(inquiry) {
  if (!inquiry) {
    throw new Error('Inquiry is required to send admin notification email');
  }

  const inquiryId = inquiry.id || 'N/A';
  const fullName =
    [inquiry.firstName, inquiry.middleName, inquiry.lastName]
      .filter(Boolean)
      .join(' ') || 'Unknown';
  const eventType = inquiry.eventType || 'N/A';
  const inquiryDate = formatDate(inquiry.date);
  const createdAt = formatDate(
    inquiry.createdAt || inquiry.created_at || nowPH()
  );
  const eventPax = inquiry.eventPax ?? inquiry.package?.pax ?? 'N/A';
  const eventPackage = inquiry.eventPackage || inquiry.package?.name || 'N/A';
  const clientEmail = inquiry.email || 'N/A';
  const contactNumber = inquiry.contactNumber || 'N/A';
  const clientMessage = inquiry.message || 'None provided';

  const subject = `New Inquiry from ${fullName} — ${eventType}`;
  const text =
    `New inquiry received on Schatzies Events.\n\n` +
    `Inquiry ID: ${inquiryId}\n` +
    `Name: ${fullName}\n` +
    `Email: ${clientEmail}\n` +
    `Contact: ${contactNumber}\n` +
    `Event Type: ${eventType}\n` +
    `Event Package: ${eventPackage}\n` +
    `Planned Date: ${inquiryDate}\n` +
    `Event Pax: ${eventPax}\n` +
    `Created At: ${createdAt}\n` +
    `Client Message: ${clientMessage}\n\n` +
    `Please review this inquiry in the admin dashboard.`;
  const bodyHtml =
    `<p style="margin:0 0 16px;">A new inquiry has been submitted on <strong style="color:#a855f7;">Schatzies Events</strong>.</p>` +
    `<ul style="margin:0 0 16px;padding-left:20px;color:#1e1b2e;">` +
    `<li style="margin-bottom:8px;"><strong style="color:#7c3aed;">Inquiry ID:</strong> ${escapeHtml(inquiryId)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Name:</strong> ${escapeHtml(fullName)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Email:</strong> ${escapeHtml(clientEmail)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Contact:</strong> ${escapeHtml(contactNumber)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Event Type:</strong> ${escapeHtml(eventType)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Event Package:</strong> ${escapeHtml(eventPackage)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Planned Date:</strong> ${escapeHtml(inquiryDate)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Event Pax:</strong> ${escapeHtml(eventPax)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Created At:</strong> ${escapeHtml(createdAt)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Client Message:</strong> ${escapeHtml(clientMessage)}</li>` +
    `</ul>` +
    `<p style="margin:0;">Please review this inquiry in the admin dashboard.</p>`;
  const html = wrapEmailHtml({
    preheader: `New inquiry from ${fullName} for ${eventType}.`,
    title: 'New Inquiry Received',
    bodyHtml,
  });

  return sendSmtpMail({
    to: ADMIN_EMAIL,
    subject,
    text,
    html,
  });
}
