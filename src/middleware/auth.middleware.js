import {
  findUserByClientId,
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

function setAuthCookie(res, token) {
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearAuthCookie(res) {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
  });
}

export async function validateTokenMiddleware(req, res) {
  try {
    const token = extractAuthToken(req);
    if (!token) {
      return res.status(401).json({ valid: false });
    }

    const payload = verifyAuthToken(token);
    if (!payload || typeof payload !== 'object' || !('sub' in payload)) {
      clearAuthCookie(res);
      return res.status(401).json({ valid: false });
    }

    const user = await findUserByClientId(String(payload.sub));
    if (!user) {
      clearAuthCookie(res);
      return res.status(401).json({ valid: false });
    }

    const { password, ...safeUser } = user;

    return res.json({
      valid: true,
      user: safeUser,
    });
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
    if (!payload || typeof payload !== 'object' || !('sub' in payload)) {
      clearAuthCookie(res);
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await findUserByClientId(String(payload.sub));
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
