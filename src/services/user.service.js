// src/services/user.service.js
import { db as dbPromise } from '../config/db-config.js';
import logger from '../utils/logger.js';
import envConfig from '../config/env-config.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 60 }); // Cache por 60 segundos
let db;

(async () => {
  try {
    db = await dbPromise;
  } catch (error) {
    logger.error(
      'Error al inicializar la base de datos en el servicio:',
      error
    );
    throw error;
  }
})();

/**
 * Retrieves a list of users with cursor-based pagination.
 * @param {number} [limit=10] - Maximum number of users to return.
 * @param {string} [cursor] - The last createdAt timestamp for pagination.
 * @returns {Promise<Array>} List of user objects.
 */
export async function getUsersService(limit = 10, cursor) {
  const cacheKey = `users_${limit}_${cursor || 'start'}`;
  const cachedResult = cache.get(cacheKey);
  if (cachedResult) {
    logger.info('Serving users from cache', { cacheKey });
    return cachedResult;
  }

  try {
    if (envConfig.database.type === 'firestore') {
      let query = db
        .collection('users')
        .orderBy('createdAt')
        .limit(Number(limit));
      if (cursor) query = query.startAfter(new Date(cursor));
      const snapshot = await query.get();
      const result = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      cache.set(cacheKey, result);
      return result;
    } else if (envConfig.database.type === 'mongodb') {
      const query = cursor ? { createdAt: { $gt: new Date(cursor) } } : {};
      const result = await db
        .collection('users')
        .find(query)
        .sort({ createdAt: 1 })
        .limit(Number(limit))
        .toArray();
      cache.set(cacheKey, result);
      return result;
    } else if (envConfig.database.type === 'postgresql') {
      const query = cursor
        ? 'SELECT * FROM users WHERE created_at > $1 ORDER BY created_at LIMIT $2'
        : 'SELECT * FROM users ORDER BY created_at LIMIT $1';
      const values = cursor ? [new Date(cursor), limit] : [limit];
      const result = await db.query(query, values);
      cache.set(cacheKey, result.rows);
      return result.rows;
    }
  } catch (error) {
    logger.error('Error al obtener usuarios:', error);
    throw error;
  }
}

/**
 * Creates a new user in the selected database.
 * @param {Object} data - User data including name, email, and testUser flag.
 * @returns {Promise<string>} The ID of the created user.
 * @throws {ConflictError} If the email is already registered.
 */
export async function createUserService(data) {
  const { email } = data;
  const userId = email.toLowerCase();
  try {
    if (envConfig.database.type === 'firestore') {
      const userRef = db.collection('users').doc(userId);
      // Usamos create para fallar si ya existe, más rápido que una transacción
      await userRef.create(data);
      logger.info(`Usuario creado: ${userId}`);
      cache.flushAll(); // Invalidación simple de todo el caché
      return userId;
    } else if (envConfig.database.type === 'mongodb') {
      const existing = await db.collection('users').findOne({ email });
      if (existing) throw new ConflictError('El email ya está registrado');
      await db.collection('users').insertOne({ _id: userId, ...data });
      cache.flushAll();
      return userId;
    } else if (envConfig.database.type === 'postgresql') {
      const existing = await db.query('SELECT 1 FROM users WHERE email = $1', [
        email,
      ]);
      if (existing.rowCount > 0)
        throw new ConflictError('El email ya está registrado');
      const result = await db.query(
        'INSERT INTO users (id, name, email, test_user, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [userId, data.name, email, data.testUser, data.createdAt]
      );
      cache.flushAll();
      return result.rows[0].id;
    }
  } catch (error) {
    if (
      envConfig.database.type === 'firestore' &&
      (error.code === 6 || error.message.includes('already exists'))
    ) {
      throw new ConflictError('El email ya está registrado');
    }
    logger.error('Error al crear usuario:', error);
    throw error;
  }
}

/**
 * Updates an existing user in the selected database.
 * @param {string} id - The ID of the user to update.
 * @param {Object} updateData - The data to update.
 * @returns {Promise<void>}
 * @throws {NotFoundError} If the user is not found.
 */
export async function updateUserService(id, updateData) {
  try {
    if (envConfig.database.type === 'firestore') {
      const userRef = db.collection('users').doc(id);
      const snap = await userRef.get();
      if (!snap.exists) throw new NotFoundError('Usuario no encontrado');
      await userRef.update(updateData);
    } else if (envConfig.database.type === 'mongodb') {
      const result = await db
        .collection('users')
        .updateOne({ _id: id }, { $set: updateData }, { upsert: false });
      if (result.matchedCount === 0)
        throw new NotFoundError('Usuario no encontrado');
    } else if (envConfig.database.type === 'postgresql') {
      const result = await db.query(
        'UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email) WHERE id = $3 RETURNING id',
        [updateData.name, updateData.email, id]
      );
      if (result.rowCount === 0)
        throw new NotFoundError('Usuario no encontrado');
    }
    cache.flushAll(); // Invalidamos todo el caché
  } catch (error) {
    logger.error('Error al actualizar usuario:', error);
    throw error;
  }
}

/**
 * Deletes a user from the selected database.
 * @param {string} id - The ID of the user to delete.
 * @returns {Promise<void>}
 * @throws {NotFoundError} If the user is not found.
 */
export async function deleteUserService(id) {
  try {
    if (envConfig.database.type === 'firestore') {
      const userRef = db.collection('users').doc(id);
      const snap = await userRef.get();
      if (!snap.exists) throw new NotFoundError('Usuario no encontrado');
      await userRef.delete();
    } else if (envConfig.database.type === 'mongodb') {
      const result = await db.collection('users').deleteOne({ _id: id });
      if (result.deletedCount === 0)
        throw new NotFoundError('Usuario no encontrado');
    } else if (envConfig.database.type === 'postgresql') {
      const result = await db.query(
        'DELETE FROM users WHERE id = $1 RETURNING id',
        [id]
      );
      if (result.rowCount === 0)
        throw new NotFoundError('Usuario no encontrado');
    }
    cache.flushAll(); // Invalidamos todo el caché
  } catch (error) {
    logger.error('Error al eliminar usuario:', error);
    throw error;
  }
}
