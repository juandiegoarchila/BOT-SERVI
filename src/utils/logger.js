// src/utils/logger.js
import winston from 'winston';
import chalk from 'chalk';

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, requestId }) => {
          return `${timestamp} ${level}${
            requestId ? ` [${requestId}]` : ''
          }: ${message}`;
        })
      ),
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

/**
 * Logs a request with contextual information.
 * @param {Object} req - The Fastify request object.
 */
export function logRequest(req) {
  logger.info('Request received', {
    requestId: req.id,
    method: req.method,
    url: req.url,
    body: req.body,
  });
}

/**
 * Logs an error with stack trace.
 * @param {string} message - The error message.
 * @param {Error} error - The error object.
 * @param {string} [requestId] - The request ID for context.
 */
export function logError(message, error, requestId) {
  logger.error(`${message}: ${error.message}`, {
    requestId,
    stack: error.stack,
  });
}

// Funciones existentes para pruebas
export function logTitle(title, emoji = '📌') {
  const message = `\n${chalk.bold.blue(
    '═══════════════════════════════════════'
  )}\n${chalk.bold.cyanBright(`${emoji} ${title}`)}\n${chalk.bold.blue(
    '═══════════════════════════════════════'
  )}`;
  logger.info(message);
}

export function logSuccess(message, time) {
  logger.info(chalk.green(`✅ ${message} (${time}ms)`));
}

export default logger;