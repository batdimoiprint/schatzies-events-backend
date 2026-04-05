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
      schemas: {
        Organizer: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            name: {
              type: 'string',
              example: 'Juan dela Cruz',
            },
            firstName: {
              type: 'string',
              example: 'Juan',
            },
            middleName: {
              type: 'string',
              example: 'Santos',
            },
            lastName: {
              type: 'string',
              example: 'dela Cruz',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'sammujumuad@email.com',
            },
            password: {
              type: 'string',
              format: 'password',
              writeOnly: true,
              example: 'admin123',
            },
            phone: {
              type: 'string',
              example: '09171234567',
            },
            contactNumber: {
              type: 'string',
              example: '09171234567',
            },
            role: {
              type: 'string',
              example: 'ORGANIZER',
            },
            birthDate: {
              type: 'string',
              example: '1995-06-15',
            },
            houseNumber: {
              type: 'string',
              example: '12',
            },
            street: {
              type: 'string',
              example: 'Mabini St',
            },
            barangay: {
              type: 'string',
              example: 'Bagong Silang',
            },
            city: {
              type: 'string',
              example: 'Quezon City',
            },
            country: {
              type: 'string',
              example: 'Philippines',
            },
            gender: {
              type: 'string',
              example: 'Male',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
            },
          },
        },
        Event: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            clientId: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            eventType: {
              type: 'string',
              example: 'Wedding',
            },
            eventPackage: {
              type: 'string',
              example: 'Gold',
            },
            eventPax: {
              type: 'integer',
              example: 150,
            },
            eventDate: {
              type: 'string',
              format: 'date-time',
              example: '2025-12-31T18:00:00.000Z',
            },
            status: {
              type: 'string',
              example: 'Planning',
            },
            title: {
              type: 'string',
              example: 'Annual Company Party',
            },
            description: {
              type: 'string',
              example: 'A year-end celebration for employees and their families.',
            },
            location: {
              type: 'string',
              example: 'Manila Hotel',
            },
            startDate: {
              type: 'string',
              format: 'date-time',
              example: '2025-12-31T18:00:00.000Z',
            },
            endDate: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-01T01:00:00.000Z',
            },
            headOrganizerId: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            workerOrganizerIds: {
              type: 'array',
              items: {
                type: 'string',
                example: '550e8400-e29b-41d4-a716-446655440001',
              },
            },
            workerOrganizerAssignments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  organizerId: {
                    type: 'string',
                    example: '550e8400-e29b-41d4-a716-446655440001',
                  },
                  status: {
                    type: 'string',
                    example: 'pending',
                  },
                  updatedAt: {
                    type: 'string',
                    format: 'date-time',
                    example: '2025-01-01T00:00:00.000Z',
                  },
                },
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
            },
          },
        },
        CreateEventRequest: {
          type: 'object',
          required: ['title', 'startDate'],
          properties: {
            eventType: {
              type: 'string',
              example: 'Wedding',
            },
            eventPackage: {
              type: 'string',
              example: 'Gold',
            },
            eventPax: {
              type: 'integer',
              example: 150,
            },
            eventDate: {
              type: 'string',
              format: 'date-time',
              example: '2025-12-31T18:00:00.000Z',
            },
            title: {
              type: 'string',
              example: 'Annual Company Party',
            },
            description: {
              type: 'string',
              example: 'A year-end celebration for employees and their families.',
            },
            location: {
              type: 'string',
              example: 'Manila Hotel',
            },
            startDate: {
              type: 'string',
              format: 'date-time',
              example: '2025-12-31T18:00:00.000Z',
            },
            endDate: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-01T01:00:00.000Z',
            },
            headOrganizerId: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
          },
        },
        UpdateEventRequest: {
          type: 'object',
          properties: {
            eventType: {
              type: 'string',
              example: 'Wedding',
            },
            eventPackage: {
              type: 'string',
              example: 'Gold',
            },
            eventPax: {
              type: 'integer',
              example: 150,
            },
            eventDate: {
              type: 'string',
              format: 'date-time',
              example: '2025-12-31T18:00:00.000Z',
            },
            title: {
              type: 'string',
              example: 'Annual Company Party',
            },
            description: {
              type: 'string',
              example: 'A year-end celebration for employees and their families.',
            },
            location: {
              type: 'string',
              example: 'Manila Hotel',
            },
            startDate: {
              type: 'string',
              format: 'date-time',
              example: '2025-12-31T18:00:00.000Z',
            },
            endDate: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-01T01:00:00.000Z',
            },
            headOrganizerId: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
});

export default swaggerSpec;
