import {
  findUserByUserId,
  signAuthToken,
  verifyAuthToken,
} from '../services/auth.service.js';

function parseCookies(cookieHeader = '') {
  return cookieHeader
    .split(';')
    .map((cookiePart) => cookiePart.trim())
    .filter(Boolean)
    .reduce((acc, current) => {
      const separatorIndex = current.indexOf('=');
      if (separatorIndex === -1) {
        return acc;
      }

      const key = current.slice(0, separatorIndex).trim();
      const value = current.slice(separatorIndex + 1).trim();
      if (!key) {
        return acc;
      }

      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
}

function extractAuthToken(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  if (cookies['auth_token']) {
    return cookies['auth_token'];
  }

  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  return '';
}

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
  res.cookie('auth_token', token, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(res) {
  res.clearCookie('auth_token', AUTH_COOKIE_OPTIONS);
}

export async function validateTokenMiddleware(req, res, next) {
  try {
    const token = extractAuthToken(req);
    if (!token) {
      return res.status(401).json({ valid: false });
    }

    const payload = verifyAuthToken(token);
    if (!payload || typeof payload !== 'object' || !('user_id' in payload)) {
      clearAuthCookie(res);
      return res.status(401).json({ valid: false });
    }

    const user = await findUserByUserId(String(payload.user_id));
    if (!user) {
      clearAuthCookie(res);
      return res.status(401).json({ valid: false });
    }

    const { password, ...safeUser } = user;
    req.user = safeUser;

    return next();
  } catch {
    clearAuthCookie(res);
    return res.status(401).json({ valid: false });
  }
}

export async function refreshTokenMiddleware(req, res) {
  try {
    const token = extractAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Missing token' });
    }

    const payload = verifyAuthToken(token);
    if (!payload || typeof payload !== 'object' || !('user_id' in payload)) {
      clearAuthCookie(res);
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await findUserByUserId(String(payload.user_id));
    if (!user) {
      clearAuthCookie(res);
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { password, ...safeUser } = user;
    const newToken = signAuthToken(safeUser);
    setAuthCookie(res, newToken);

    return res.json({
      message: 'Token refreshed',
      user: safeUser,
    });
  } catch {
    clearAuthCookie(res);
    return res.status(401).json({ error: 'Invalid token' });
  }
}
