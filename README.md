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

## License

MIT
