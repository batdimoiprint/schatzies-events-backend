export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const userRole = String(req.user?.role || '').toUpperCase();
    const normalizedRoles = allowedRoles.map((role) =>
      String(role).toUpperCase()
    );

    if (!userRole || !normalizedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    return next();
  };
}
