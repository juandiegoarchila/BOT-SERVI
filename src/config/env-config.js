// src/config/env-config.js
import convict from 'convict';
import logger from '../utils/logger.js';
import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar el archivo .env desde la raíz del proyecto
config({ path: path.resolve(__dirname, '../../.env') });

const convictConfig = convict({
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV',
  },
  port: {
    doc: 'The port to bind.',
    format: 'port',
    default: 5000,
    env: 'PORT',
  },
  jwtSecret: {
    doc: 'JWT secret key.',
    format: String,
    default: '',
    env: 'JWT_SECRET',
    sensitive: true,
  },
  database: {
    type: {
      doc: 'Database type (firestore, mongodb, postgresql).',
      format: String,
      default: 'firestore',
      env: 'DB_TYPE',
    },
    googleCredentials: {
      doc: 'Path to Google Firebase credentials (for Firestore).',
      format: String,
      default: '',
      env: 'GOOGLE_APPLICATION_CREDENTIALS',
      sensitive: true,
    },
    mongoUri: {
      doc: 'MongoDB connection URI.',
      format: String,
      default: '',
      env: 'MONGO_URI',
      sensitive: true,
    },
    pgConnection: {
      doc: 'PostgreSQL connection string.',
      format: String,
      default: '',
      env: 'PG_CONNECTION',
      sensitive: true,
    },
  },
  adminPhoneNumber: {
    doc: 'Phone number of the admin for WhatsApp bot notifications.',
    format: String,
    default: '', // Opcional, no forzamos su presencia
    env: 'ADMIN_PHONE_NUMBER',
  },
});

convictConfig.validate({ allowed: 'strict' });

const envConfig = convictConfig.getProperties();

// Validaciones críticas existentes
if (!envConfig.jwtSecret) {
  logger.error('Missing critical environment variable: JWT_SECRET is required');
  process.exit(1);
}

if (
  envConfig.database.type === 'firestore' &&
  !envConfig.database.googleCredentials
) {
  logger.error(
    'Missing critical environment variable: GOOGLE_APPLICATION_CREDENTIALS is required for Firestore'
  );
  process.exit(1);
} else if (
  envConfig.database.type === 'mongodb' &&
  !envConfig.database.mongoUri
) {
  logger.error(
    'Missing critical environment variable: MONGO_URI is required for MongoDB'
  );
  process.exit(1);
} else if (
  envConfig.database.type === 'postgresql' &&
  !envConfig.database.pgConnection
) {
  logger.error(
    'Missing critical environment variable: PG_CONNECTION is required for PostgreSQL'
  );
  process.exit(1);
}

// Nota: No validamos adminPhoneNumber como obligatorio para no afectar otros usos
if (!envConfig.adminPhoneNumber) {
  logger.warn('ADMIN_PHONE_NUMBER no está definido; las notificaciones del bot al administrador no funcionarán.');
}

export default envConfig;