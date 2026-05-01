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

function wrapEmailHtml({ preheader = '', title, bodyHtml }) {
  const safePre = escapeHtml(preheader);
  const safeTitle = escapeHtml(title);
  return (
    `<!DOCTYPE html>` +
    `<html lang="en">` +
    `<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${safeTitle}</title></head>` +
    `<body style="margin:0;padding:0;background-color:#f5f0ff;">` +
    `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${safePre}</div>` +
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#faf7ff;">` +
    `<tr><td align="center" style="padding:24px 16px;">` +
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e9d5ff;box-shadow:0 4px 24px rgba(168,85,247,0.12);">` +
    `<tr>` +
    `<td style="background:linear-gradient(135deg,#ec4899 0%,#a855f7 100%);padding:28px 24px;text-align:center;">` +
    `<div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;letter-spacing:0.02em;">${safeTitle}</div>` +
    `</td></tr>` +
    `<tr>` +
    `<td style="padding:28px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.6;color:#1e1b2e;">` +
    `${bodyHtml}` +
    `</td></tr>` +
    `<tr>` +
    `<td style="padding:16px 24px 24px;border-top:1px solid #f3e8ff;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;color:#7c6f9c;">` +
    `<div style="margin-bottom:8px;">` +
    `<a href="https://schatziesevents.com" style="color:#a855f7;text-decoration:none;font-weight:600;font-size:14px;">Visit Our Website</a>` +
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
    `Best regards,\nSchatzies Events PH`;
  const bodyHtml =
    `<p style="margin:0 0 16px;">Hello ${escapeHtml(fullName)},</p>` +
    `<p style="margin:0 0 16px;">We received your inquiry. Here are the details we have on file:</p>` +
    `<ul style="margin:0 0 16px;padding-left:20px;color:#1e1b2e;">` +
    `<li style="margin-bottom:8px;"><strong style="color:#7c3aed;">Inquiry ID:</strong> ${escapeHtml(inquiryId)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Name:</strong> ${escapeHtml(fullName)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Email:</strong> ${escapeHtml(inquiry.email)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Event Type:</strong> ${escapeHtml(eventType)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Date:</strong> ${escapeHtml(inquiryDate)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Created At:</strong> ${escapeHtml(createdAt)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Event Pax:</strong> ${escapeHtml(eventPax)}</li>` +
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

  const subject = `Your event inquiry status has been updated`;
  const text =
    `Hello ${fullName},\n\n` +
    `Your event inquiry status has been updated.\n\n` +
    `Inquiry ID: ${inquiryId}\n` +
    `Event Type: ${eventType}\n` +
    `Current Status: ${status}\n\n` +
    `Best regards,\nSchatzies Events PH`;
  const bodyHtml =
    `<p style="margin:0 0 16px;">Hello ${escapeHtml(fullName)},</p>` +
    `<p style="margin:0 0 16px;">Your event inquiry status has been updated.</p>` +
    `<ul style="margin:0 0 16px;padding-left:20px;color:#1e1b2e;">` +
    `<li style="margin-bottom:8px;"><strong style="color:#7c3aed;">Inquiry ID:</strong> ${escapeHtml(inquiryId)}</li>` +
    `<li style="margin-bottom:8px;"><strong>Event Type:</strong> ${escapeHtml(eventType)}</li>` +
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
    return { skipped: true, reason: 'SMTP config missing', link: null, inquiryId: null };
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
  const safeDate = date ?? 'TBD';
  const safeTime = time ?? 'TBD';
  const safeLocation = location ?? 'TBD';

  const subject = `Meeting Scheduled for your ${safeEventType} Inquiry with Schatzies Events`;
  const text =
    `Hello ${fullName},\n\n` +
    `We have successfully reviewed your inquiry for a ${safeEventType}!\n\n` +
    `We would like to invite you to a meeting to discuss your upcoming event in detail.\n\n` +
    `Inquiry ID: ${inquiryId}\n\n` +
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
    `<p style="margin:0 0 12px;"><strong style="color:#7c3aed;">Inquiry ID:</strong> ${escapeHtml(inquiryId)}</p>` +
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
    return { skipped: true, reason: 'No email provided', link: null, inquiryId: null };
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
    return { skipped: true, reason: 'SMTP config missing', link: null, inquiryId: null };
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
    return { skipped: true, reason: 'No email provided', link: null, userId: user.user_id };
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
    `<p style="margin:0;font-size:14px;color:#92400e;"><strong style="color:#b45309;">⚠️ Security Notice:</strong> For your security, we strongly recommend that you change your password after your first login.</p>` +
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
    return { skipped: true, reason: 'SMTP config missing', link: null, userId: user.user_id };
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
    return { skipped: true, reason: 'No email provided', link: loginLink || null };
  }

  if (!plainPassword) {
    console.warn(
      `No plain password provided for user ${user.user_id || 'unknown'}, skipping credentials email.`
    );
    return { skipped: true, reason: 'No password provided', link: loginLink || null };
  }

  const fullName =
    [user.firstName, user.middleName, user.lastName]
      .filter(Boolean)
      .join(' ') || 'Customer';
  const username = user.email;
  const resolvedLoginLink = loginLink || process.env.FRONTEND_URL || 'http://localhost:3000/login';
  const subject = 'Your Schatzies Events account credentials';
  const text =
    `Hello ${fullName},\n\n` +
    `Your account has been created successfully.\n\n` +
    `Username: ${username}\n` +
    `Password: ${plainPassword}\n` +
    `Login Link: ${resolvedLoginLink}\n\n` +
    `For your security, please log in and change your password as soon as possible.\n\n` +
    `Best regards,\nSchatzies Events`;
  const html =
    `<p>Hello ${escapeHtml(fullName)},</p>` +
    `<p>Your account has been created successfully.</p>` +
    `<p><strong>Username:</strong> ${escapeHtml(username)}<br />` +
    `<strong>Password:</strong> ${escapeHtml(plainPassword)}<br />` +
    `<strong>Login Link:</strong> <a href="${escapeHtml(resolvedLoginLink)}">${escapeHtml(resolvedLoginLink)}</a></p>` +
    `<p>For your security, please log in and change your password as soon as possible.</p>` +
    `<p>Best regards,<br /><strong>Schatzies Events</strong></p>`;

  const transporter = buildMailTransporter();
  if (!transporter) {
    console.warn(
      'SMTP configuration is missing. Account credentials email will not be sent.',
      {
        to: user.email,
        subject,
      }
    );
    return { skipped: true, reason: 'SMTP config missing', link: resolvedLoginLink };
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
