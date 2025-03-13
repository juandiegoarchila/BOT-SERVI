// src/index.js
import app from './app.js';
import logger from './utils/logger.js';
import envConfig from './config/env-config.js';

const PORT = envConfig.port;

app
  .listen({ port: PORT, host: '0.0.0.0' })
  .then(() => logger.info(`Server running on http://localhost:${PORT}`))
  .catch((err) => {
    logger.error('Error starting server:', err);
    process.exit(1);
  });
