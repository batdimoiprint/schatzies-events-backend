import crypto from 'crypto';
import { nowPH } from '../utils/timezone.js';
import nodemailer from 'nodemailer';
import { sendSmtpMail, sendInquiryCreatedEmail } from './mailer.service.js';
import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
import dynamoClient, { DYNAMO_TABLE } from '../configs/dynamo.js';
import { getInquiriesByEmail, createInquiry } from './inquiry.service.js';

const MAX_INQUIRIES_PER_EMAIL = 3;

// ─── Configuration ───────────────────────────────────────────────────────────

const VERIFICATION_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
/**
 * Get the frontend URL from environment variables, defaulting to localhost for development.
 */
function getFrontendUrl() {
  if (process.env.NODE_ENV === 'production' && process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.split(',')[0].trim();
  }
  return 'http://localhost:5173';
}

// ─── Gmail Account Pool ─────────────────────────────────────────────────────
//
// Supports multiple Gmail accounts for higher throughput.
//
// Priority:
//   1. GMAIL_ACCOUNTS env var (JSON array):
//      [{"user":"a@gmail.com","pass":"app_pw_1"},{"user":"b@gmail.com","pass":"app_pw_2"}]
//   2. Single GMAIL_USER / GMAIL_PASS (legacy fallback)
//

function parseGmailAccounts() {
  const accounts = [];

  // 1. Check for GMAIL_ACCOUNTS JSON array
  const accountsJson = process.env.GMAIL_ACCOUNTS;
  if (accountsJson && accountsJson.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(accountsJson);
      const valid = parsed.filter((a) => a.user && a.pass);
      accounts.push(...valid);
    } catch (err) {
      console.warn('Failed to parse GMAIL_ACCOUNTS JSON:', err.message);
    }
  }

  // 2. Check for dynamic GMAIL_USER_x and GMAIL_PASS_x
  // Allows unlimited accounts defined in .env like GMAIL_USER_1, GMAIL_PASS_1
  for (const key in process.env) {
    if (key.startsWith('GMAIL_USER_') && key !== 'GMAIL_USER') {
      const suffix = key.replace('GMAIL_USER_', '');
      const user = process.env[key];
      const pass = process.env[`GMAIL_PASS_${suffix}`];

      if (user && pass) {
        accounts.push({ user, pass });
      }
    }
  }

  // 3. Fallback to single account GMAIL_USER / GMAIL_PASS
  if (accounts.length === 0) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_PASS;
    if (user && pass) {
      accounts.push({ user, pass });
    }
  }

  // Remove duplicates
  const uniqueAccounts = [];
  const seenUsers = new Set();
  for (const acc of accounts) {
    if (!seenUsers.has(acc.user)) {
      seenUsers.add(acc.user);
      uniqueAccounts.push(acc);
    }
  }

  return uniqueAccounts;
}

const gmailAccounts = parseGmailAccounts();
let roundRobinIndex = 0;

/**
 * Get the next Gmail account in the pool (round-robin).
 */
function getNextGmailAccount() {
  if (gmailAccounts.length === 0) return null;
  const account = gmailAccounts[roundRobinIndex % gmailAccounts.length];
  roundRobinIndex = (roundRobinIndex + 1) % gmailAccounts.length;
  return account;
}

/**
 * Build a Nodemailer transporter for a specific Gmail account.
 */
function buildGmailTransporter(account) {
  if (!account) return null;

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: account.user,
      pass: account.pass,
    },
  });
}

/**
 * Send an email using the Gmail pool with round-robin + failover.
 * Tries each account once before giving up.
 */
async function sendMailWithPool(mailOptionsWithoutFrom) {
  if (gmailAccounts.length === 0) {
    return { skipped: true, reason: 'No Gmail accounts configured' };
  }

  for (let attempt = 0; attempt < gmailAccounts.length; attempt++) {
    const account = getNextGmailAccount();
    const transporter = buildGmailTransporter(account);
    if (!transporter) continue;

    const mailOptions = {
      ...mailOptionsWithoutFrom,
      from: `"Schatzies Events" <${account.user}>`,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Verification email sent:', {
        via: account.user,
        to: mailOptions.to,
        messageId: info.messageId,
      });
      return { skipped: false, info, account: account.user };
    } catch (err) {
      console.warn(`Gmail account ${account.user} failed:`, {
        code: err.code,
        message: err.message,
        responseCode: err.responseCode,
        command: err.command,
      });
    }
  }

  // All accounts failed
  return {
    skipped: true,
    reason: 'All Gmail accounts failed – see server logs',
  };
}

// ─── Token helpers ───────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure, URL-safe verification token (64 hex chars).
 */
function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ─── DynamoDB helpers (tokens stored in main table) ─────────────────────────

/**
 * Store a verification token in DynamoDB.
 *
 * Key schema:
 *   PK = VERIFY_TOKEN#<token>
 *   SK = TOKEN
 *
 * Attributes: email, expiresAt (ISO), ttl (epoch seconds for DynamoDB TTL).
 */
async function storeVerificationToken(token, email, pendingInquiry = null) {
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
  const ttlEpoch = Math.floor(expiresAt.getTime() / 1000);

  const item = {
    PK: { S: `VERIFY_TOKEN#${token}` },
    SK: { S: 'TOKEN' },
    email: { S: email.toLowerCase().trim() },
    expiresAt: { S: expiresAt.toISOString() },
    ttl: { N: String(ttlEpoch) },
    used: { S: 'false' },
    createdAt: { S: nowPH() },
  };

  if (pendingInquiry) {
    item.pendingInquiry = { S: JSON.stringify(pendingInquiry) };
  }

  const command = new PutItemCommand({
    TableName: DYNAMO_TABLE,
    Item: item,
    // Prevent overwriting an existing token (extremely unlikely collision)
    ConditionExpression:
      'attribute_not_exists(PK) AND attribute_not_exists(SK)',
  });

  await dynamoClient.send(command);
  return { token, email, expiresAt: expiresAt.toISOString() };
}

/**
 * Retrieve a verification token record from DynamoDB.
 */
async function getVerificationToken(token) {
  const command = new GetItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `VERIFY_TOKEN#${token}` },
      SK: { S: 'TOKEN' },
    },
  });

  const response = await dynamoClient.send(command);
  if (!response.Item) {
    return null;
  }

  return {
    token,
    email: response.Item.email?.S || '',
    expiresAt: response.Item.expiresAt?.S || '',
    used: response.Item.used?.S === 'true',
    pendingInquiry: response.Item.pendingInquiry?.S
      ? JSON.parse(response.Item.pendingInquiry.S)
      : null,
  };
}

/**
 * Delete a token after successful verification (single-use).
 */
async function deleteVerificationToken(token) {
  const command = new DeleteItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `VERIFY_TOKEN#${token}` },
      SK: { S: 'TOKEN' },
    },
  });

  await dynamoClient.send(command);
}

// ─── Verified-email helpers ─────────────────────────────────────────────────

/**
 * Mark an email as verified in DynamoDB.
 *
 * Key schema:
 *   PK = VERIFIED_EMAIL#<email>
 *   SK = STATUS
 */
async function markEmailVerified(email) {
  const normalizedEmail = email.toLowerCase().trim();
  const now = nowPH();

  const command = new PutItemCommand({
    TableName: DYNAMO_TABLE,
    Item: {
      PK: { S: `VERIFIED_EMAIL#${normalizedEmail}` },
      SK: { S: 'STATUS' },
      email: { S: normalizedEmail },
      verified: { S: 'true' },
      verifiedAt: { S: now },
    },
  });

  await dynamoClient.send(command);
  return { email: normalizedEmail, verified: true, verifiedAt: now };
}

/**
 * Check whether an email has been verified.
 */
export async function isEmailVerified(email) {
  const normalizedEmail = email.toLowerCase().trim();

  const command = new GetItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `VERIFIED_EMAIL#${normalizedEmail}` },
      SK: { S: 'STATUS' },
    },
  });

  const response = await dynamoClient.send(command);
  return response.Item?.verified?.S === 'true';
}

/**
 * Get all verified emails from DynamoDB.
 * Scans for all items with PK starting with VERIFIED_EMAIL#.
 */
export async function getVerifiedEmails() {
  const items = [];
  let lastKey = undefined;

  do {
    const result = await dynamoClient.send(
      new ScanCommand({
        TableName: DYNAMO_TABLE,
        FilterExpression: 'begins_with(PK, :prefix)',
        ExpressionAttributeValues: {
          ':prefix': { S: 'VERIFIED_EMAIL#' },
        },
        ExclusiveStartKey: lastKey,
      })
    );

    for (const item of result.Items || []) {
      items.push({
        email: item.email?.S || item.PK?.S?.replace('VERIFIED_EMAIL#', '') || '',
        verified: item.verified?.S === 'true',
        verifiedAt: item.verifiedAt?.S || '',
      });
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  // Sort by verifiedAt descending (most recent first)
  items.sort((a, b) => (b.verifiedAt || '').localeCompare(a.verifiedAt || ''));

  return items;
}

/**
 * Delete a verified email record from DynamoDB.
 *
 * Key schema:
 *   PK = VERIFIED_EMAIL#<email>
 *   SK = STATUS
 */
export async function deleteVerifiedEmail(email) {
  const normalizedEmail = email.toLowerCase().trim();

  // Verify the record exists first
  const command = new GetItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `VERIFIED_EMAIL#${normalizedEmail}` },
      SK: { S: 'STATUS' },
    },
  });

  const response = await dynamoClient.send(command);
  if (!response.Item) {
    throw new Error(`Verified email not found: ${normalizedEmail}`);
  }

  // Delete the record
  const deleteCmd = new DeleteItemCommand({
    TableName: DYNAMO_TABLE,
    Key: {
      PK: { S: `VERIFIED_EMAIL#${normalizedEmail}` },
      SK: { S: 'STATUS' },
    },
  });

  await dynamoClient.send(deleteCmd);
  return { email: normalizedEmail, deleted: true };
}

// ─── HTML Email Template ────────────────────────────────────────────────────

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildVerificationEmailHtml(verifyUrl) {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f4f4f7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#e91e63,#ad1457);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:0.5px;">Schatzies Events</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="margin:0 0 12px;color:#1a1a2e;font-size:20px;font-weight:600;">Confirm Your Inquiry</h2>
              <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
                Thank you for your interest in Schatzies Events! Please click the button below to confirm your inquiry submission. This link will expire in <strong>15 minutes</strong>.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  <td style="border-radius:8px;background:#e91e63;">
                    <a href="${escapeHtml(verifyUrl)}" target="_blank" style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:8px;">
                      Confirm Inquiry
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#888;font-size:13px;">Or copy and paste this URL into your browser:</p>
              <p style="margin:0 0 24px;word-break:break-all;color:#e91e63;font-size:13px;">${escapeHtml(verifyUrl)}</p>
              <p style="margin:0;color:#999;font-size:13px;">If you did not request this, you can safely ignore this email.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;background:#fafafa;text-align:center;border-top:1px solid #eee;">
              <p style="margin:0;color:#aaa;font-size:12px;">&copy; ${new Date().getFullYear()} Schatzies Events. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/check-or-send-verification
 *
 * Combined endpoint: checks if email is already verified.
 * If yes  → returns { verified: true }
 * If no   → generates token, sends email, returns { verified: false, emailSent: true }
 */
export async function checkOrSendVerification(email, pendingInquiry = null) {
  if (!email) {
    throw new Error('email is required');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // 0. Check inquiry limit for this email
  const userInquiries = await getInquiriesByEmail(normalizedEmail);
  if (userInquiries.length >= MAX_INQUIRIES_PER_EMAIL) {
    return {
      alreadyUsed: true,
      reason: `You have reached the maximum limit of ${MAX_INQUIRIES_PER_EMAIL} inquiries for this email address.`,
    };
  }

  // 1. Already verified? Return immediately.
  const alreadyVerified = await isEmailVerified(normalizedEmail);
  if (alreadyVerified) {
    return { verified: true };
  }

  // 2. Generate and store token
  const token = generateVerificationToken();
  const record = await storeVerificationToken(
    token,
    normalizedEmail,
    pendingInquiry
  );

  // 3. Build verification URL
  const verifyUrl = `${getFrontendUrl()}/verify?token=${token}`;

  // 4. Send email via Gmail pool (round-robin with failover)
  const subject = 'Confirm your inquiry – Schatzies Events';
  const text =
    `Hello,\n\n` +
    `Please confirm your inquiry by clicking this link:\n${verifyUrl}\n\n` +
    `This link expires in 15 minutes.\n\n` +
    `If you did not request this, you can ignore this email.\n\n` +
    `Best regards,\nSchatzies Events`;

  const html = buildVerificationEmailHtml(verifyUrl);

  const gmailResult = await sendMailWithPool({
    to: normalizedEmail,
    subject,
    text,
    html,
  });

  if (!gmailResult.skipped) {
    return { verified: false, emailSent: true };
  }

  console.warn('Gmail verification email skipped, trying SMTP.', {
    to: normalizedEmail,
    reason: gmailResult.reason,
  });

  const smtpResult = await sendSmtpMail({
    to: normalizedEmail,
    subject,
    text,
    html,
  });

  if (!smtpResult.skipped) {
    return { verified: false, emailSent: true };
  }

  const combinedReason = [gmailResult.reason, smtpResult.reason]
    .filter(Boolean)
    .join('; ');

  // All accounts failed or none configured
  if (process.env.NODE_ENV !== 'production') {
    return {
      verified: false,
      emailSent: false,
      reason: combinedReason || 'Unable to send verification email',
      token,
      verifyUrl,
    };
  }

  throw new Error(combinedReason || 'Unable to send verification email');
}

/**
 * Validate a verification token and mark the email as verified.
 *
 * Returns:
 *   { success: true, email }          on success
 *   { success: false, reason: '...' } on failure
 */
export async function verifyEmailToken(token) {
  if (!token) {
    return { success: false, reason: 'Token is required' };
  }

  // 1. Look up the token
  const record = await getVerificationToken(token);
  if (!record) {
    return { success: false, reason: 'Invalid or expired token' };
  }

  // 2. Check if already used
  if (record.used) {
    return { success: false, reason: 'Token has already been used' };
  }

  // 3. Check expiration
  const expiresAt = new Date(record.expiresAt).getTime();
  if (Number.isNaN(expiresAt) || expiresAt < Date.now()) {
    // Clean up expired token
    await deleteVerificationToken(token);
    return { success: false, reason: 'Token has expired' };
  }

  // 4. Mark email as verified
  const verifiedRecord = await markEmailVerified(record.email);

  // 5. If there's a pending inquiry, create it now!
  let inquiryCreated = false;
  if (record.pendingInquiry) {
    try {
      const newInquiry = await createInquiry(record.pendingInquiry);
      inquiryCreated = true;

      // Notify admin/client
      await sendInquiryCreatedEmail(newInquiry);
    } catch (err) {
      console.error('Failed to auto-create inquiry after verification:', err);
      // We don't fail the verification itself, but we log the error
    }
  }

  // 6. Invalidate token (single-use)
  await deleteVerificationToken(token);

  return { success: true, email: verifiedRecord.email, inquiryCreated };
}
