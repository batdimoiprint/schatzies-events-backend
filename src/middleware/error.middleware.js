export default function errorHandler(err, req, res, next) {
  const status = err.status || (err.isJoi ? 400 : 500);
  const message = err.message || 'Internal server error';

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  return res.status(status).json({ error: message });
}
