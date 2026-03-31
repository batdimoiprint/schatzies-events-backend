import swaggerJsdoc from 'swagger-jsdoc';

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Schatzies Events API',
      version: '1.0.0',
      description: 'Serverless Express API for Schatzies Events',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'API Server',
      },
    ],
    tags: [
      { name: 'Auth', description: 'Authentication and session endpoints' },
      { name: 'Events', description: 'Event management endpoints' },
      { name: 'Organizers', description: 'Organizer management endpoints' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'auth_token',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
});

export default swaggerSpec;
