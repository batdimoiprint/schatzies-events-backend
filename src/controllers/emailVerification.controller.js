import {
  checkOrSendVerification,
  verifyEmailToken,
  isEmailVerified,
} from '../services/emailVerification.service.js';

/**
 * Get the frontend URL from environment variables, defaulting to localhost for development.
 */
function getFrontendUrl() {
  return process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : 'http://localhost:5173';
}

/**
 * POST /api/auth/check-or-send-verification
 *
 * Body: { email: string }
 *
 * Requirements:
 * If email is already verified: Return { verified: true }
 * If NOT verified:
 *   Generate secure verification token
 *   Store token with expiration (15–30 minutes)
 *   Send email via Gmail
 *   Return { verified: false, emailSent: true }
 */
export async function checkOrSendVerificationController(req, res) {
  try {
    const { email, pendingInquiry } = req.body ?? {};

    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const result = await checkOrSendVerification(email, pendingInquiry);

    return res.json(result);
  } catch (error) {
    console.error('check-or-send-verification error:', error);
    return res
      .status(500)
      .json({ error: 'Unable to process verification request' });
  }
}

/**
 * GET /api/auth/verify-email?token=XYZ
 *
 * Requirements:
 * Input: token
 * Validate: Token exists, Not expired, Not already used
 * Mark email as verified
 * Invalidate token
 * Redirect to frontend (e.g., /verify-success -> mapped to FRONTEND_URL/verify?verified=true)
 */
export async function verifyEmailController(req, res) {
  try {
    const { token } = req.query;

    if (!token) {
      return res.redirect(
        `${getFrontendUrl()}/verify?verified=false&reason=missing_token`
      );
    }

    const result = await verifyEmailToken(token);

    if (result.success) {
      // Redirect to frontend success page
      // Note: frontend page is VerifyEmailPage.tsx which handles ?verified=true
      return res.redirect(
        `${getFrontendUrl()}/verify?verified=true&email=${encodeURIComponent(result.email)}`
      );
    }

    // Map reason to a URL-safe slug
    const reasonSlug = result.reason
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

    return res.redirect(
      `${getFrontendUrl()}/verify?verified=false&reason=${reasonSlug}`
    );
  } catch (error) {
    console.error('verify-email error:', error);
    return res.redirect(
      `${getFrontendUrl()}/verify?verified=false&reason=server_error`
    );
  }
}

/**
 * POST /api/auth/verify-email
 *
 * Body: { token: string }
 * JSON API version used by frontend VerifyEmailPage.tsx
 */
export async function verifyEmailApiController(req, res) {
  try {
    const { token } = req.body ?? {};

    if (!token) {
      return res
        .status(400)
        .json({ success: false, reason: 'Token is required' });
    }

    const result = await verifyEmailToken(token);

    if (result.success) {
      return res.json({ success: true, email: result.email });
    }

    return res.status(400).json({ success: false, reason: result.reason });
  } catch (error) {
    console.error('verify-email-api error:', error);
    return res
      .status(500)
      .json({ success: false, reason: 'Server error during verification' });
  }
}

/**
 * GET /api/auth/check-email-verified?email=user@example.com
 *
 * Utility endpoint to check whether a given email is verified.
 */
export async function checkEmailVerifiedController(req, res) {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'email query param is required' });
    }

    const verified = await isEmailVerified(email);
    return res.json({ email, verified });
  } catch (error) {
    console.error('check-email-verified error:', error);
    return res
      .status(500)
      .json({ error: 'Unable to check email verification status' });
  }
}
