import nodemailer from 'nodemailer';

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const fromAddress = process.env.EMAIL_FROM || 'no-reply@schatzies.com';

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
  const text = `Hello ${organizerName},\n\n` +
    `You have been added as a worker for the event "${eventTitle}".\n` +
    `Please review the event details below and confirm with the organizer if needed.\n\n` +
    `Event date: ${eventDate}\n` +
    `Location: ${event.location || 'TBD'}\n\n` +
    `Thank you.\n`;
  const html = `<p>Hello ${organizerName},</p>` +
    `<p>You have been added as a worker for the event <strong>${eventTitle}</strong>.</p>` +
    `<p>Please review the event details and confirm with the organizer if needed.</p>` +
    `<p><strong>Event date:</strong> ${eventDate}<br />` +
    `<strong>Location:</strong> ${event.location || 'TBD'}</p>` +
    `<p>Thank you.</p>`;

  const transporter = buildMailTransporter();
  if (!transporter) {
    console.warn('SMTP configuration is missing. worker assignment email will not be sent.', {
      to: organizer.email,
      subject,
    });
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
