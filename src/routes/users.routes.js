// src/routes/users.routes.js
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/user.controller.js';
import { userBodySchema, updateUserSchema } from './schemas/user-schemas.js';

export default async function userRoutes(fastify) {
  fastify.get('/users', { preHandler: [fastify.authenticate] }, getUsers);
  fastify.post('/users', { schema: { body: userBodySchema } }, createUser);
  fastify.put('/users/:id', { schema: { body: updateUserSchema } }, updateUser);
  fastify.delete('/users/:id', deleteUser);
}
