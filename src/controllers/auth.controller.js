import {
  authenticateUser,
  createPasswordResetChallenge,
  resetPasswordWithToken,
  signAuthToken,
  verifyPasswordResetCode,
} from '../services/auth.service.js';
import { sendPasswordResetCodeEmail } from '../services/mailer.service.js';

const AUTH_COOKIE_NAME = 'auth_token';
const AUTH_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const isProduction = process.env.NODE_ENV === 'production';

const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure:
    process.env.COOKIE_SECURE === 'true'
      ? true
      : process.env.COOKIE_SECURE === 'false'
        ? false
        : isProduction,
  sameSite: process.env.COOKIE_SAMESITE || (isProduction ? 'none' : 'lax'),
  path: '/',
};

function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  });
}

function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS);
}

export function currentUser(req, res) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return res.json({ user: req.user });
}

export async function login(req, res) {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signAuthToken(user);
    setAuthCookie(res, token);

    return res.json({
      message: 'Login successful',
      token,
      user,
    });
  } catch {
    return res.status(500).json({ error: 'Unable to login' });
  }
}

export async function requestPasswordReset(req, res) {
  try {
    const { email } = req.body ?? {};

    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    const challenge = await createPasswordResetChallenge(email);
    if (!challenge) {
      return res
        .status(404)
        .json({ error: 'No account found for that email address' });
    }

    const delivery = await sendPasswordResetCodeEmail(
      challenge.user,
      challenge.code
    );

    return res.json({
      message: 'If the email exists, a verification code has been sent.',
      ...(delivery.skipped && process.env.NODE_ENV !== 'production'
        ? { verificationCode: challenge.code }
        : {}),
    });
  } catch {
    return res
      .status(500)
      .json({ error: 'Unable to send password reset code' });
  }
}

export async function verifyPasswordReset(req, res) {
  try {
    const { email, code } = req.body ?? {};

    if (!email || !code) {
      return res.status(400).json({ error: 'email and code are required' });
    }

    const result = await verifyPasswordResetCode(email, code);
    if (!result) {
      return res
        .status(400)
        .json({ error: 'Invalid or expired verification code' });
    }

    return res.json({
      message: 'Verification code accepted',
      resetToken: result.resetToken,
      user: result.user,
    });
  } catch {
    return res
      .status(500)
      .json({ error: 'Unable to verify password reset code' });
  }
}

export async function resetPassword(req, res) {
  try {
    const { resetToken, password } = req.body ?? {};

    if (!resetToken || !password) {
      return res
        .status(400)
        .json({ error: 'resetToken and password are required' });
    }

    const updatedUser = await resetPasswordWithToken(resetToken, password);
    if (!updatedUser) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    return res.json({
      message: 'Password updated successfully',
      user: updatedUser,
    });
  } catch {
    return res.status(500).json({ error: 'Unable to reset password' });
  }
}

export function logout(_req, res) {
  clearAuthCookie(res);
  return res.status(204).send();
}
