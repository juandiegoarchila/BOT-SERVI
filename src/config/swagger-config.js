//src/config/swagger-config.js
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

const swaggerConfig = {
  openapi: {
    info: {
      title: 'SERVI API',
      version: '1.0.0',
      description: 'API RESTful escalable para gestión de recursos',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  ui: {
    routePrefix: '/api-docs',
    uiConfig: { docExpansion: 'list', deepLinking: false },
    staticCSP: true,
  },
};

export default function registerSwagger(app) {
  app.register(fastifySwagger, swaggerConfig);
  app.register(fastifySwaggerUi, swaggerConfig.ui);
}
