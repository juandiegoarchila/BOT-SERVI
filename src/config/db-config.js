//src/config/db-config.js
import {
  initializeApp,
  cert,
  applicationDefault,
  getApps,
} from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import mongoose from 'mongoose';
import pg from 'pg';
import fs from 'node:fs/promises';
import logger from '../utils/logger.js';
import envConfig from './env-config.js';

const { Pool } = pg;
let dbInstance;

/**
 * Initializes the database based on the configured type.
 * @returns {Promise<Object>} The database instance.
 * @throws {Error} If initialization fails.
 */
async function initializeDatabase() {
  switch (envConfig.database.type) {
    case 'firestore': {
      const credentialsPath = envConfig.database.googleCredentials;
      let firebaseConfig = { credential: applicationDefault() };
      try {
        const credentialsRaw = await fs.readFile(credentialsPath, 'utf8');
        const serviceAccount = JSON.parse(credentialsRaw);
        firebaseConfig = { credential: cert(serviceAccount) };
      } catch (error) {
        logger.error(`Failed to load Firebase credentials: ${error.message}`);
        throw new Error(
          `Failed to load Firebase credentials: ${error.message}`
        );
      }
      if (!getApps().length) {
        initializeApp(firebaseConfig);
        logger.info('Firebase initialized successfully');
      }
      dbInstance = getFirestore();
      break;
    }
    case 'mongodb': {
      try {
        await mongoose.connect(envConfig.database.mongoUri, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        dbInstance = mongoose.connection;
        logger.info('MongoDB connected successfully');
      } catch (error) {
        logger.error(`Failed to connect to MongoDB: ${error.message}`);
        throw error;
      }
      break;
    }
    case 'postgresql': {
      try {
        dbInstance = new Pool({
          connectionString: envConfig.database.pgConnection,
        });
        await dbInstance.connect();
        logger.info('PostgreSQL connected successfully');
      } catch (error) {
        logger.error(`Failed to connect to PostgreSQL: ${error.message}`);
        throw error;
      }
      break;
    }
    default:
      throw new Error(`Unsupported database type: ${envConfig.database.type}`);
  }
  return dbInstance;
}

/**
 * Closes the database connection gracefully.
 */
async function closeDatabase() {
  try {
    if (
      envConfig.database.type === 'mongodb' &&
      mongoose.connection.readyState
    ) {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
    } else if (envConfig.database.type === 'postgresql' && dbInstance) {
      await dbInstance.end();
      logger.info('PostgreSQL connection closed');
    }
    // Firestore no requiere cierre explícito ya que es manejado por Firebase Admin
  } catch (error) {
    logger.error(`Error closing database: ${error.message}`);
  }
}

const dbPromise = initializeDatabase().catch((error) => {
  logger.error('Database initialization failed:', error.message);
  process.exit(1);
});

// Manejo de cierre en señales de terminación
process.on('SIGTERM', async () => {
  await closeDatabase();
  process.exit(0);
});
process.on('SIGINT', async () => {
  await closeDatabase();
  process.exit(0);
});

export { dbPromise as db, closeDatabase };
