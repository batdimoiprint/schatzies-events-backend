# Schatzies Serverless Backend

A serverless Express.js API running on AWS Lambda with DynamoDB integration.

## Prerequisites

- Node.js 24.x or higher
- npm or pnpm



## Installation

1. Clone the repository
```bash
cd schatzies-backend
```

2. Install dependencies
```bash
pnpm install
# or
npm install
```

## Security & Middleware

- **Helmet**: Sets secure HTTP headers. Configured in `src/configs/helmet.js` and applied globally in `server.js`.
- **CORS**: Configured in `src/configs/cors.js` to allow requests from your frontend (uses `process.env.FRONTEND_URL` in production, `localhost:5173` in development).
- **Rate Limiting**: Configured in `src/configs/rate-limit.js`.
	- `apiLimiter` is applied globally in `server.js`.
	- `authLimiter` is applied only to `/auth` routes in `src/routes/index.js`.
- **Authentication Middleware**: All protected routes (events, vendors, attendees) use `validateTokenMiddleware` in `src/routes/index.js`.

**Best Practice:**
- Do not add any routes directly in `server.js`. Only use `app.use('/api', routes)` in `server.js`.
- Attach all route handlers and middleware (including authentication and rate limiting) in `src/routes/index.js`.

## API Documentation

Swagger documentation is available at:
- Local: `http://localhost:3000/api-docs`


OpenAPI source of truth:
- Swagger JSDoc comments in route files under `src/routes/`

Documentation rule for all new routes:
- Every time a new route is created, you must add or update its `@swagger` JSDoc block in the route file.
- Start each route file with complete Swagger route docs for all handlers in that file.
- Each route entry must include: summary, request body (if needed), response status codes, and response schema.
- Pull requests are not complete until route behavior and Swagger documentation are both updated.


## License

MIT
