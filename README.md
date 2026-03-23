# Schatzies Serverless Backend

A serverless Express.js API running on AWS Lambda with DynamoDB integration.

## Prerequisites

- Node.js 24.x or higher
- npm or pnpm
- GitHub repository for CI/CD deployment

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

3. Create `.env` file from `.env.example`
```bash
cp .env.example .env
```

4. Update `.env` with your AWS credentials and configuration

### API Documentation

Swagger documentation is available at:
- Local: `http://localhost:3000/api-docs`

OpenAPI source of truth:
- Swagger JSDoc comments in route files under `src/routes/`

Documentation rule for all new routes:
- Every time a new route is created, you must add or update its `@swagger` JSDoc block in the route file.
- Start each route file with complete Swagger route docs for all handlers in that file.
- Each route entry must include: summary, request body (if needed), response status codes, and response schema.
- Pull requests are not complete until route behavior and Swagger documentation are both updated.

Current documented routes include:
- `/api/auth/register`
- `/api/auth/login`
- `/api/auth/validate-token`
- `/api/auth/refresh-token`
- `/api/auth/logout`

## License

MIT
