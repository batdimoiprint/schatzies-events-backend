export default function errorHandler(err, req, res, next) {
  const status = err.status || (err.isJoi ? 400 : 500);
  const message = err.message || 'Internal server error';

  console.error('Error handler:', {
    method: req.method,
    url: req.originalUrl,
    status,
    message,
    stack: err.stack,
  });

  return res.status(status).json({ error: message });
}
