// src/utils/errors.js
export class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(message, 404, 'ERR_NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Datos inválidos') {
    super(message, 400, 'ERR_VALIDATION');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflicto en los datos') {
    super(message, 409, 'ERR_CONFLICT');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado') {
    super(message, 401, 'ERR_UNAUTHORIZED');
  }
}
