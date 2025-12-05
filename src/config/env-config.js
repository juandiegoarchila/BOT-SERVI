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
  whatsapp: {
    provider: {
      doc: 'WhatsApp provider: web (whatsapp-web.js) or cloud (Meta Cloud API)',
      format: ['web', 'cloud'],
      default: 'web',
      env: 'WHATSAPP_PROVIDER',
    },
    cloud: {
      apiVersion: {
        doc: 'Facebook Graph API version',
        format: String,
        default: 'v20.0',
        env: 'WA_CLOUD_API_VERSION',
      },
      phoneId: {
        doc: 'WhatsApp Cloud Phone Number ID',
        format: String,
        default: '',
        env: 'WA_CLOUD_PHONE_ID',
      },
      accessToken: {
        doc: 'WhatsApp Cloud Access Token',
        format: String,
        default: '',
        env: 'WA_CLOUD_ACCESS_TOKEN',
        sensitive: true,
      },
      verifyToken: {
        doc: 'Webhook verify token for WhatsApp Cloud',
        format: String,
        default: '',
        env: 'WA_CLOUD_VERIFY_TOKEN',
      },
      businessId: {
        doc: 'Meta Business Account ID (optional)',
        format: String,
        default: '',
        env: 'WA_CLOUD_BUSINESS_ID',
      },
    },
  },
  media: {
    welcomeVideoPath: {
      doc: 'Ruta local del video de bienvenida para enviar al primer mensaje',
      format: String,
      default: '',
      env: 'WELCOME_VIDEO_PATH',
    },
    welcomeVideoUrl: {
      doc: 'URL del video de bienvenida (se recomienda para evitar problemas de ruta)',
      format: String,
      default: '',
      env: 'WELCOME_VIDEO_URL',
    },
    supportVideoPath: {
      doc: 'Ruta local del segundo video de apoyo (como pedir nuevamente)',
      format: String,
      default: 'Cocina Casera como pedir nuevamente.mp4',
      env: 'SUPPORT_VIDEO_PATH',
    },
    duplicateVideoPath: {
      doc: 'Ruta local del video tutorial de cómo duplicar pedidos',
      format: String,
      default: 'duplicar.mp4',
      env: 'DUPLICATE_VIDEO_PATH',
    },
    troubleshootVideoPath: {
      doc: 'Ruta local del video tutorial de problemas para enviar pedido',
      format: String,
      default: 'Nodejaenviar.mp4',
      env: 'TROUBLESHOOT_VIDEO_PATH',
    },
  },
  openai: {
    apiKey: {
      doc: 'OpenAI API key for AI responses',
      format: String,
      default: '',
      env: 'OPENAI_API_KEY',
      sensitive: true,
    },
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
// Silenciar aviso si no hay adminPhoneNumber (no crítico)
// if (!envConfig.adminPhoneNumber) {
//   logger.info('ADMIN_PHONE_NUMBER no está definido; notificaciones al administrador desactivadas.');
// }

// Validaciones condicionales para WhatsApp Cloud
if (envConfig.whatsapp.provider === 'cloud') {
  const missing = [];
  if (!envConfig.whatsapp.cloud.phoneId) missing.push('WA_CLOUD_PHONE_ID');
  if (!envConfig.whatsapp.cloud.accessToken) missing.push('WA_CLOUD_ACCESS_TOKEN');
  if (!envConfig.whatsapp.cloud.verifyToken) missing.push('WA_CLOUD_VERIFY_TOKEN');
  if (missing.length) {
    logger.error(`Missing WhatsApp Cloud variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// Aviso si falta la clave de OpenAI (opcional)
// Silenciar aviso de OpenAI cuando no se usa
// if (!envConfig.openai.apiKey) {
//   logger.info('OPENAI_API_KEY no está definido; funciones IA avanzadas desactivadas.');
// }

export default envConfig;