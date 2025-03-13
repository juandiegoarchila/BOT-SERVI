// src/tests/helpers/test-helpers.js
import { db as dbPromise } from '../../config/db-config.js';
import Table from 'cli-table3';
import chalk from 'chalk';
import logger from '../../utils/logger.js';
import envConfig from '../../config/env-config.js';

let db; // Declaramos db fuera

// Inicializamos db de manera asíncrona al cargar el módulo
(async () => {
  try {
    db = await dbPromise;
  } catch (error) {
    logger.error('Error initializing database in test helpers:', error);
    throw error;
  }
})();

export async function cleanupTestData() {
  try {
    if (envConfig.database.type === 'firestore') {
      const usersSnapshot = await db
        .collection('users')
        .where('testUser', '==', true)
        .get();
      if (!usersSnapshot.empty) {
        const deletePromises = usersSnapshot.docs.map((doc) =>
          doc.ref.delete()
        );
        await Promise.all(deletePromises);
      }
    } else if (envConfig.database.type === 'mongodb') {
      await db.collection('users').deleteMany({ testUser: true });
    } else if (envConfig.database.type === 'postgresql') {
      await db.query('DELETE FROM users WHERE test_user = true');
    }
    logger.info('Test data cleaned up successfully');
  } catch (error) {
    logger.error('Error cleaning up test data:', error);
    throw error;
  }
}

export function generateTestReport(testResults, startTime) {
  const table = new Table({
    head: [
      chalk.bold('#'),
      chalk.bold('Prueba'),
      chalk.bold('Descripción'),
      chalk.bold('Estado'),
      chalk.bold('Tiempo'),
    ],
    colWidths: [5, 25, 40, 15, 15],
    style: { head: ['cyan'] },
  });

  testResults.forEach((test, index) => {
    const estado =
      test.status === '✅' ? chalk.green('✅ PASÓ') : chalk.red('❌ FALLÓ');
    const tiempo =
      test.time > 1000 ? chalk.yellow(`${test.time}ms ⚠️`) : `${test.time}ms`;
    table.push([
      index,
      test.description.split(' - ')[0],
      test.description.split(' - ')[1],
      estado,
      tiempo,
    ]);
  });

  const reportLines = [
    chalk.bold.magenta(`\n⏱️ Detalles de tiempo por prueba:`),
    table.toString(),
    chalk.bold.blue(`\n═══════════════════════════════════════`),
    chalk.bold.greenBright(
      `✅ PRUEBAS COMPLETADAS - ${
        testResults.filter((r) => r.status === '✅').length
      }/${testResults.length} EXITOSAS ✅`
    ),
    chalk.bold.blue(`═══════════════════════════════════════\n`),
    chalk.bold.yellowBright(`⏳ TIEMPO TOTAL: ${Date.now() - startTime}ms`),
    chalk.bold.yellowBright(
      `⏱️ TIEMPO PROMEDIO: ${(
        (Date.now() - startTime) /
        testResults.length
      ).toFixed(2)}ms`
    ),
    chalk.bold.blue(`═══════════════════════════════════════\n`),
  ];

  // Imprime el reporte usando process.stdout.write
  reportLines.forEach((line) => process.stdout.write(line + '\n'));
}
