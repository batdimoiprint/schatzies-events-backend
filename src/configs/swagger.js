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
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Invalid credentials' },
          },
        },
        User: {
          type: 'object',
          properties: {
            client_id: { type: 'string', example: 'USER#001' },
            c_fname: { type: 'string', example: 'Juan' },
            c_mname: { type: 'string', example: 'Santos' },
            c_lname: { type: 'string', example: 'dela Cruz' },
            c_suffix: { type: 'string', example: '' },
            birthdate: { type: 'string', example: '1995-06-15' },
            house_no: { type: 'string', example: '12' },
            street_name: { type: 'string', example: 'Mabini St' },
            barangay: { type: 'string', example: 'Bagong Silang' },
            city: { type: 'string', example: 'Quezon City' },
            country: { type: 'string', example: 'Philippines' },
            gender: { type: 'string', example: 'Male' },
            contact_number: { type: 'string', example: '9171234567' },
            c_email: {
              type: 'string',
              format: 'email',
              example: 'juan@email.com',
            },
            role: { type: 'string', example: 'CLIENT' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['c_email', 'password', 'c_fname', 'c_lname'],
          properties: {
            client_id: { type: 'string', example: 'USER#001' },
            c_fname: { type: 'string', example: 'Juan' },
            c_mname: { type: 'string', example: 'Santos' },
            c_lname: { type: 'string', example: 'dela Cruz' },
            c_suffix: { type: 'string', example: '' },
            password: {
              type: 'string',
              format: 'password',
              example: 'admin123',
            },
            birthdate: { type: 'string', example: '1995-06-15' },
            house_no: { type: 'string', example: '12' },
            street_name: { type: 'string', example: 'Mabini St' },
            barangay: { type: 'string', example: 'Bagong Silang' },
            city: { type: 'string', example: 'Quezon City' },
            country: { type: 'string', example: 'Philippines' },
            gender: { type: 'string', example: 'Male' },
            contact_number: { type: 'string', example: '9171234567' },
            c_email: {
              type: 'string',
              format: 'email',
              example: 'juan@email.com',
            },
            role: { type: 'string', example: 'CLIENT' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        RegisterResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'User registered successfully',
            },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'juan@email.com',
            },
            password: {
              type: 'string',
              format: 'password',
              example: 'admin123',
            },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Login successful' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        ValidateTokenSuccess: {
          type: 'object',
          properties: {
            valid: { type: 'boolean', example: true },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        ValidateTokenFailure: {
          type: 'object',
          properties: {
            valid: { type: 'boolean', example: false },
          },
        },
        RefreshTokenResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Token refreshed' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
});

export default swaggerSpec;
