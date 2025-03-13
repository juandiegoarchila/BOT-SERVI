// src/controllers/user.controller.js
import {
  getUsersService,
  createUserService,
  updateUserService,
  deleteUserService,
} from '../services/user.service.js';
import logger from '../utils/logger.js';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../utils/errors.js';

export const getUsers = async (request, reply) => {
  const { limit = 10, cursor } = request.query;
  const users = await getUsersService(limit, cursor);
  reply.send({ success: true, data: users });
};

export const createUser = async (request, reply) => {
  try {
    const { name, email, testUser } = request.body;

    // Validación manual para coincidir con las pruebas
    if (!email) {
      throw new ValidationError("body must have required property 'email'");
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ValidationError('body/email must match format "email"');
    }

    const newUser = {
      name,
      email,
      testUser: testUser ?? false,
      createdAt: new Date().toISOString(),
    };
    const userId = await createUserService(newUser);
    logger.info(`Usuario creado: ${userId}`);
    reply.status(201).send({
      success: true,
      data: { id: userId },
      message: 'Usuario creado con éxito',
    });
  } catch (error) {
    if (error instanceof ConflictError) {
      throw error;
    }
    throw error;
  }
};

export const updateUser = async (request, reply) => {
  try {
    const { id } = request.params;
    const { name, email } = request.body;

    // Validación manual para coincidir con las pruebas
    if (name !== undefined && name.length < 1) {
      throw new ValidationError(
        'body/name must NOT have fewer than 1 characters'
      );
    }
    if (!name && !email) {
      throw new ValidationError('Nada que actualizar');
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;

    await updateUserService(id, updateData);
    logger.info(`Usuario actualizado: ${id}`);
    reply.send({ success: true, message: 'Usuario actualizado con éxito' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw error;
  }
};

export const deleteUser = async (request, reply) => {
  try {
    const { id } = request.params;
    await deleteUserService(id);
    logger.info(`Usuario eliminado: ${id}`);
    reply.send({ success: true, message: 'Usuario eliminado con éxito' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw error;
  }
};
