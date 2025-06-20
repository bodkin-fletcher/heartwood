/**
 * OpenAPI/Swagger documentation configuration
 */

export const swaggerOptions = {
  openapi: {
    info: {
      title: 'Heartwood API Documentation',
      description: 'API documentation for Heartwood backend service',
      version: '0.1.0'
    },
    externalDocs: {
      url: 'https://github.com/YOUR-USERNAME/heartwood',
      description: 'Find more info here'
    },
    servers: [
      {
        url: 'http://localhost:3640',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        apiKey: {
          type: 'apiKey',
          name: 'x-api-key',
          in: 'header'
        }
      }
    },
    tags: [
      { name: 'core', description: 'Core API endpoints' },
      { name: 'scripts', description: 'Script execution and management endpoints' }
    ]
  }
};

export const swaggerUiOptions = {
  routePrefix: '/documentation',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true
  },
  staticCSP: true,
  transformStaticCSP: (header) => header
};
