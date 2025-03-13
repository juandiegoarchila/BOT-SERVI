// src/middlewares/error-handler.js
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from '../utils/errors.js';
import logger from '../utils/logger.js';

export function errorHandler(error, request, reply) {
  if (error.validation) {
    // Error de validación de Fastify
    logger.warn(`Validation error: ${error.message}`);
    return reply.status(400).send({
      success: false,
      message: error.message, // Usamos el mensaje específico de Fastify
      code: 'ERR_VALIDATION',
    });
  }
  if (error instanceof ValidationError) {
    logger.warn(`Validation error: ${error.message}`);
    return reply.status(400).send({
      success: false,
      message: error.message,
      code: 'ERR_VALIDATION',
    });
  }
  if (error instanceof NotFoundError) {
    logger.warn(`Not found: ${error.message}`);
    return reply.status(404).send({
      success: false,
      message: error.message,
      code: 'ERR_NOT_FOUND',
    });
  }
  if (error instanceof ConflictError) {
    logger.warn(`Conflict: ${error.message}`);
    return reply.status(409).send({
      success: false,
      message: error.message,
      code: 'ERR_CONFLICT',
    });
  }
  logger.error('Internal server error:', error);
  reply.status(500).send({
    success: false,
    message: 'Error interno del servidor',
    code: 'ERR_INTERNAL',
  });
}
