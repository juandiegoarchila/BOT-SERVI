// src/tests/utils/test-utils.js
import chalk from 'chalk';
import logger from '../../utils/logger.js';

export function logTitle(title, emoji = '📌') {
  logger.info(
    `\n${chalk.bold.blue(
      `═══════════════════════════════════════`
    )}\n${chalk.bold.cyanBright(`${emoji} ${title}`)}\n${chalk.bold.blue(
      `═══════════════════════════════════════`
    )}`
  );
}

export function logSuccess(message, time) {
  logger.info(`${message} (${time}ms)`);
  logger.debug(chalk.green(`✅ ${message} (${time}ms)`)); // Usamos logger.debug para mensajes de consola
}

export function logError(message, error) {
  logger.error(`${message}: ${error.message}`);
  logger.debug(chalk.red(`❌ ${message}`)); // Usamos logger.debug para mensajes de consola
  logger.debug(chalk.redBright(error)); // Usamos logger.debug para stack traces
}
