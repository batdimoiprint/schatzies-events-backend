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
      { name: 'Calendar', description: 'Calendar and scheduling endpoints' },
      { name: 'Dashboard', description: 'Dashboard analytics endpoints' },
      { name: 'Organizers', description: 'Organizer management endpoints' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'auth_token',
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
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
            event_id: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            eventId: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            client_id: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            organizer_id: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
            eventType: {
              type: 'string',
              example: 'Wedding',
            },
            eventPackageKey: {
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
            eventTime: {
              type: 'string',
              example: '18:00',
            },
            eventLocation: {
              type: 'string',
              example: 'Manila Hotel',
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
          required: ['eventType', 'eventDate'],
          properties: {
            client_id: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            organizer_id: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
            eventType: {
              type: 'string',
              example: 'Wedding',
            },
            title: {
              type: 'string',
              example: 'Annual Company Party',
            },
            eventPackageKey: {
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
            eventTime: {
              type: 'string',
              example: '18:00',
            },
            eventLocation: {
              type: 'string',
              example: 'Manila Hotel',
            },
            status: {
              type: 'string',
              example: 'Planning',
            },
          },
        },
        UpdateEventRequest: {
          type: 'object',
          properties: {
            client_id: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            organizer_id: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
            eventType: {
              type: 'string',
              example: 'Wedding',
            },
            title: {
              type: 'string',
              example: 'Annual Company Party',
            },
            eventPackageKey: {
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
            eventTime: {
              type: 'string',
              example: '18:00',
            },
            eventLocation: {
              type: 'string',
              example: 'Manila Hotel',
            },
            status: {
              type: 'string',
              example: 'Planning',
            },
          },
        },
        CostBreakdownRequest: {
          type: 'object',
          required: ['packagePricePerPax', 'eventPax', 'manpowerCost', 'additionalCharges'],
          properties: {
            packagePricePerPax: {
              type: 'number',
              example: 850,
            },
            eventPax: {
              type: 'number',
              example: 120,
            },
            manpowerCost: {
              type: 'number',
              example: 25000,
            },
            additionalCharges: {
              type: 'number',
              example: 15000,
            },
          },
        },
        CostBreakdown: {
          type: 'object',
          properties: {
            costBreakdown_id: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            event_id: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            packagePricePerPax: {
              type: 'number',
              example: 850,
            },
            eventPax: {
              type: 'number',
              example: 120,
            },
            totalPackageCost: {
              type: 'number',
              example: 102000,
            },
            totalVendorCost: {
              type: 'number',
              example: 60000,
            },
            manpowerCost: {
              type: 'number',
              example: 25000,
            },
            additionalCharges: {
              type: 'number',
              example: 15000,
            },
            revenue: {
              type: 'number',
              example: 117000,
            },
            profit: {
              type: 'number',
              example: 32000,
            },
          },
        },
        CostBreakdownExport: {
          type: 'object',
          properties: {
            costBreakdown_id: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            event_id: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            packagePricePerPax: {
              type: 'number',
              example: 850,
            },
            eventPax: {
              type: 'number',
              example: 120,
            },
            totalPackageCost: {
              type: 'number',
              example: 102000,
            },
            totalVendorCost: {
              type: 'number',
              example: 60000,
            },
            manpowerCost: {
              type: 'number',
              example: 25000,
            },
            additionalCharges: {
              type: 'number',
              example: 15000,
            },
            revenue: {
              type: 'number',
              example: 117000,
            },
            profit: {
              type: 'number',
              example: 32000,
            },
            generatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-20T12:00:00.000Z',
            },
          },
        },
        Task: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '2f1a7cde-8c84-4d4f-b2a3-019fb3c8b824',
            },
            event_id: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            title: {
              type: 'string',
              example: 'Confirm venue layout',
            },
            description: {
              type: 'string',
              example: 'Review and confirm the seating layout with the venue coordinator.',
            },
            status: {
              type: 'string',
              example: 'TODO',
            },
            order: {
              type: 'integer',
              example: 1,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-05-01T10:00:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-05-01T10:00:00.000Z',
            },
          },
        },
        TaskRequest: {
          type: 'object',
          required: ['title'],
          properties: {
            title: {
              type: 'string',
              example: 'Confirm venue layout',
            },
            description: {
              type: 'string',
              example: 'Review and confirm the seating layout with the venue coordinator.',
            },
          },
        },
        TaskUpdateRequest: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              example: 'Confirm venue layout',
            },
            description: {
              type: 'string',
              example: 'Review and confirm the seating layout with the venue coordinator.',
            },
          },
        },
        MoveTaskRequest: {
          type: 'object',
          required: ['newStatus', 'newOrder'],
          properties: {
            newStatus: {
              type: 'string',
              enum: ['TODO', 'IN_PROGRESS', 'COMPLETED'],
              example: 'IN_PROGRESS',
            },
            newOrder: {
              type: 'integer',
              example: 1,
            },
          },
        },
        EventStatusRequest: {
          type: 'object',
          required: ['status'],
          properties: {
            status: {
              type: 'string',
              enum: ['PLANNING', 'EXECUTION', 'COMPLETED'],
              example: 'EXECUTION',
            },
          },
        },
        ConfirmEventRequest: {
          type: 'object',
          required: ['event_date', 'venue'],
          properties: {
            event_date: {
              type: 'string',
              format: 'date-time',
              example: '2026-05-01T09:00:00.000Z',
            },
            venue: {
              type: 'string',
              example: 'Grand Ballroom',
            },
            notes: {
              type: 'string',
              example: 'Client requested a pink flower arrangement.',
            },
          },
        },
        CalendarCreateRequest: {
          type: 'object',
          required: ['title', 'date', 'type'],
          properties: {
            title: {
              type: 'string',
              example: 'Client Meeting',
            },
            description: {
              type: 'string',
              example: 'Discuss event flow',
            },
            date: {
              type: 'string',
              example: '2026-01-03',
            },
            type: {
              type: 'string',
              enum: ['REMINDER', 'MEETING', 'TASK'],
              example: 'MEETING',
            },
            eventId: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
          },
        },
        CalendarUpdateRequest: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              example: 'Client Meeting',
            },
            description: {
              type: 'string',
              example: 'Discuss event flow',
            },
            date: {
              type: 'string',
              example: '2026-01-03',
            },
            type: {
              type: 'string',
              enum: ['REMINDER', 'MEETING', 'TASK'],
              example: 'MEETING',
            },
            eventId: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
          },
        },
        CalendarMarkDateRequest: {
          type: 'object',
          required: ['date', 'type'],
          properties: {
            date: {
              type: 'string',
              example: '2026-01-10',
            },
            type: {
              type: 'string',
              enum: ['REMINDER', 'MEETING', 'TASK'],
              example: 'REMINDER',
            },
            title: {
              type: 'string',
              example: 'Reminder for venue deposit',
            },
            description: {
              type: 'string',
              example: 'Pay venue deposit before the due date',
            },
          },
        },
        CalendarEntry: {
          type: 'object',
          properties: {
            entryId: {
              type: 'string',
              example: '2f1a7cde-8c84-4d4f-b2a3-019fb3c8b824',
            },
            title: {
              type: 'string',
              example: 'Client Meeting',
            },
            description: {
              type: 'string',
              example: 'Discuss event flow',
            },
            date: {
              type: 'string',
              example: '2026-01-03',
            },
            type: {
              type: 'string',
              enum: ['REMINDER', 'MEETING', 'TASK'],
              example: 'MEETING',
            },
            eventId: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-01T12:00:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-01T12:00:00.000Z',
            },
          },
        },
        DashboardSummary: {
          type: 'object',
          properties: {
            kpi: {
              type: 'object',
              properties: {
                month: {
                  type: 'object',
                  properties: {
                    totalEvents: { type: 'integer', example: 42 },
                    planning: { type: 'integer', example: 12 },
                    execution: { type: 'integer', example: 18 },
                    completed: { type: 'integer', example: 12 },
                    completedRevenue: { type: 'number', example: 120000 },
                    completedProfit: { type: 'number', example: 45000 },
                  },
                },
                year: {
                  type: 'object',
                  properties: {
                    totalEvents: { type: 'integer', example: 152 },
                    planning: { type: 'integer', example: 42 },
                    execution: { type: 'integer', example: 58 },
                    completed: { type: 'integer', example: 52 },
                    completedRevenue: { type: 'number', example: 420000 },
                    completedProfit: { type: 'number', example: 155000 },
                  },
                },
              },
            },
            status: {
              type: 'object',
              properties: {
                month: {
                  type: 'object',
                  properties: {
                    planning: { type: 'integer', example: 12 },
                    execution: { type: 'integer', example: 18 },
                    completed: { type: 'integer', example: 12 },
                    completedRevenue: { type: 'number', example: 120000 },
                    completedProfit: { type: 'number', example: 45000 },
                  },
                },
                year: {
                  type: 'object',
                  properties: {
                    planning: { type: 'integer', example: 42 },
                    execution: { type: 'integer', example: 58 },
                    completed: { type: 'integer', example: 52 },
                    completedRevenue: { type: 'number', example: 420000 },
                    completedProfit: { type: 'number', example: 155000 },
                  },
                },
              },
            },
            semiAnnual: {
              type: 'object',
              properties: {
                year: { type: 'string', example: '2026' },
                monthlyGraph: {
                  type: 'object',
                  additionalProperties: {
                    type: 'number',
                  },
                  example: {
                    '01': 12,
                    '02': 14,
                    '03': 16,
                  },
                },
              },
            },
            upcomingEvents: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
                  title: { type: 'string', example: 'Annual Company Party' },
                  date: { type: 'string', example: '2026-05-01' },
                  status: { type: 'string', example: 'PLANNING' },
                  eventId: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
                },
              },
            },
            activeVendors: {
              type: 'integer',
              example: 28,
            },
          },
        },
        AllocationRequest: {
          type: 'object',
          properties: {
            vendors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'vendor-123' },
                  name: { type: 'string', example: 'Floral Design Co.' },
                },
              },
            },
            manpower: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'staff-123' },
                  role: { type: 'string', example: 'usher' },
                },
              },
            },
            supplies: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'supply-123' },
                  item: { type: 'string', example: 'Decorative lights' },
                  quantity: { type: 'integer', example: 10 },
                },
              },
            },
            theme: {
              type: 'string',
              example: 'Modern Minimalist',
            },
            flow_type: {
              type: 'string',
              example: 'Cocktail Reception',
            },
            food_package: {
              type: 'string',
              example: 'Buffet Deluxe',
            },
          },
        },
        Allocation: {
          type: 'object',
          properties: {
            event_id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
            vendors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'vendor-123' },
                  name: { type: 'string', example: 'Floral Design Co.' },
                },
              },
            },
            manpower: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'staff-123' },
                  role: { type: 'string', example: 'usher' },
                },
              },
            },
            supplies: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'supply-123' },
                  item: { type: 'string', example: 'Decorative lights' },
                  quantity: { type: 'integer', example: 10 },
                },
              },
            },
            theme: { type: 'string', example: 'Modern Minimalist' },
            flow_type: { type: 'string', example: 'Cocktail Reception' },
            food_package: { type: 'string', example: 'Buffet Deluxe' },
            created_at: { type: 'string', format: 'date-time', example: '2026-04-01T12:00:00.000Z' },
            updated_at: { type: 'string', format: 'date-time', example: '2026-04-01T12:00:00.000Z' },
          },
        },
        PrecheckRequest: {
          type: 'object',
          required: ['venue_secured', 'vendors_ready', 'manpower_ready', 'supplies_ready'],
          properties: {
            venue_secured: { type: 'boolean', example: true },
            vendors_ready: { type: 'boolean', example: true },
            manpower_ready: { type: 'boolean', example: true },
            supplies_ready: { type: 'boolean', example: true },
            remarks: { type: 'string', example: 'All pre-event items are ready.' },
          },
        },
        Precheck: {
          type: 'object',
          properties: {
            event_id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
            venue_secured: { type: 'boolean', example: true },
            vendors_ready: { type: 'boolean', example: true },
            manpower_ready: { type: 'boolean', example: true },
            supplies_ready: { type: 'boolean', example: true },
            remarks: { type: 'string', example: 'All pre-event items are ready.' },
            created_at: { type: 'string', format: 'date-time', example: '2026-04-01T12:00:00.000Z' },
            updated_at: { type: 'string', format: 'date-time', example: '2026-04-01T12:00:00.000Z' },
          },
        },
        ProgramFlowRequest: {
          type: 'object',
          required: ['title', 'start_time', 'end_time'],
          properties: {
            title: { type: 'string', example: 'Opening Ceremony' },
            description: { type: 'string', example: 'Live band performance and welcome remarks.' },
            start_time: { type: 'string', format: 'date-time', example: '2026-05-01T09:00:00.000Z' },
            end_time: { type: 'string', format: 'date-time', example: '2026-05-01T10:00:00.000Z' },
          },
        },
        UpdateProgramFlowRequest: {
          type: 'object',
          properties: {
            title: { type: 'string', example: 'Opening Ceremony' },
            description: { type: 'string', example: 'Live band performance and welcome remarks.' },
            start_time: { type: 'string', format: 'date-time', example: '2026-05-01T09:00:00.000Z' },
            end_time: { type: 'string', format: 'date-time', example: '2026-05-01T10:00:00.000Z' },
          },
        },
        ProgramFlow: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '2f1a7cde-8c84-4d4f-b2a3-019fb3c8b824' },
            event_id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
            title: { type: 'string', example: 'Opening Ceremony' },
            description: { type: 'string', example: 'Live band performance and welcome remarks.' },
            start_time: { type: 'string', format: 'date-time', example: '2026-05-01T09:00:00.000Z' },
            end_time: { type: 'string', format: 'date-time', example: '2026-05-01T10:00:00.000Z' },
            created_at: { type: 'string', format: 'date-time', example: '2026-04-01T12:00:00.000Z' },
            updated_at: { type: 'string', format: 'date-time', example: '2026-04-01T12:00:00.000Z' },
          },
        },
        TimelineTaskRequest: {
          type: 'object',
          required: ['task_name', 'scheduled_time'],
          properties: {
            task_name: { type: 'string', example: 'Set up stage lighting' },
            scheduled_time: { type: 'string', format: 'date-time', example: '2026-05-01T08:00:00.000Z' },
            is_completed: { type: 'boolean', example: false },
          },
        },
        UpdateTimelineTaskRequest: {
          type: 'object',
          properties: {
            task_name: { type: 'string', example: 'Set up stage lighting' },
            scheduled_time: { type: 'string', format: 'date-time', example: '2026-05-01T08:00:00.000Z' },
            is_completed: { type: 'boolean', example: true },
          },
        },
        TimelineTask: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '2f1a7cde-8c84-4d4f-b2a3-019fb3c8b824' },
            event_id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
            task_name: { type: 'string', example: 'Set up stage lighting' },
            scheduled_time: { type: 'string', format: 'date-time', example: '2026-05-01T08:00:00.000Z' },
            is_completed: { type: 'boolean', example: false },
            created_at: { type: 'string', format: 'date-time', example: '2026-04-01T12:00:00.000Z' },
            updated_at: { type: 'string', format: 'date-time', example: '2026-04-01T12:00:00.000Z' },
          },
        },
        ResourceStatusRequest: {
          type: 'object',
          required: ['assignee_type', 'assignee_id', 'assignee_name', 'status'],
          properties: {
            assignee_type: { type: 'string', enum: ['vendor', 'manpower'], example: 'vendor' },
            assignee_id: { type: 'string', example: 'vendor-123' },
            assignee_name: { type: 'string', example: 'Floral Design Co.' },
            status: { type: 'string', enum: ['pending', 'onsite', 'late'], example: 'pending' },
          },
        },
        UpdateResourceStatusRequest: {
          type: 'object',
          properties: {
            assignee_type: { type: 'string', enum: ['vendor', 'manpower'], example: 'vendor' },
            assignee_id: { type: 'string', example: 'vendor-123' },
            assignee_name: { type: 'string', example: 'Floral Design Co.' },
            status: { type: 'string', enum: ['pending', 'onsite', 'late'], example: 'onsite' },
          },
        },
        ResourceStatus: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '2f1a7cde-8c84-4d4f-b2a3-019fb3c8b824' },
            event_id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
            assignee_type: { type: 'string', example: 'vendor' },
            assignee_id: { type: 'string', example: 'vendor-123' },
            assignee_name: { type: 'string', example: 'Floral Design Co.' },
            status: { type: 'string', example: 'pending' },
            created_at: { type: 'string', format: 'date-time', example: '2026-04-01T12:00:00.000Z' },
            updated_at: { type: 'string', format: 'date-time', example: '2026-04-01T12:00:00.000Z' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
});

export default swaggerSpec;
