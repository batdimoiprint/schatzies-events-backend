import {
  authenticateUser,
  signAuthToken,
} from '../services/auth.service.js';

const AUTH_COOKIE_NAME = 'auth_token';
const AUTH_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
    path: '/',
  });
}

function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
  });
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
    console.log('Generated access_token:', token);
    setAuthCookie(res, token);

    return res.json({
      message: 'Login successful',
    });
  } catch {
    return res.status(500).json({ error: 'Unable to login' });
  }
}

export function logout(_req, res) {
  clearAuthCookie(res);
  return res.status(204).send();
}
