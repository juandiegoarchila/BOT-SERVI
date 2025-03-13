// src/tests/user-controller.test.js
import { expect } from 'chai';
import request from 'supertest';
import app from '../app.js';
import { logTitle, logSuccess, logError } from './utils/test-utils.js';
import { cleanupTestData, generateTestReport } from './helpers/test-helpers.js';

const DEFAULT_TIMEOUT = 10000;

describe('User Controller', function () {
  this.timeout(DEFAULT_TIMEOUT);
  let server;
  let agent;
  let testUserIds = [];
  let startTime;
  let testResults = [];
  let validToken;

  before(async () => {
    process.env.NODE_ENV = 'test';
    server = await app.listen({ port: 0 });
    startTime = Date.now();
    logTitle('🎯 INICIANDO PRUEBAS DE USER CONTROLLER');
    agent = request.agent(server);
    validToken = app.jwt.sign({ user: 'test' });
    await cleanupTestData();
    const user = {
      name: 'John Doe',
      email: `john-${Date.now()}@example.com`,
      testUser: true,
    };
    const res = await agent.post('/api/users').send(user);
    testUserIds.push(res.body.data.id);
  });

  after(async () => {
    await cleanupTestData();
    await app.close();
    delete process.env.NODE_ENV;
    generateTestReport(testResults, startTime);
  });

  const runTest = async (description, testFunction) => {
    logTitle(`📌 ${description}`);
    const start = Date.now();
    try {
      await testFunction();
      const time = Date.now() - start;
      testResults.push({ description, status: '✅', time });
      logSuccess(description, time);
    } catch (error) {
      const time = Date.now() - start;
      testResults.push({ description, status: '❌', time });
      logError(description, error);
      throw error;
    }
  };

  const testCases = [
    {
      description: '[POST] /api/users - Crear usuario con datos inválidos',
      testFunction: async () => {
        const newUser = { name: 'John Doe' };
        const res = await agent.post('/api/users').send(newUser);
        expect(res.status).to.equal(400);
        expect(res.body.message).to.equal(
          "body must have required property 'email'"
        );
      },
    },
    {
      description: '[POST] /api/users - Crear usuario con email inválido',
      testFunction: async () => {
        const newUser = { name: 'John Doe', email: 'invalid-email' };
        const res = await agent.post('/api/users').send(newUser);
        expect(res.status).to.equal(400);
        expect(res.body.message).to.equal(
          'body/email must match format "email"'
        );
      },
    },
    {
      description: '[GET] /api/users?limit=10&cursor= - Prueba de paginación',
      testFunction: async () => {
        const res = await agent
          .get('/api/users?limit=10')
          .set('Authorization', `Bearer ${validToken}`);
        expect(res.status).to.equal(200);
        expect(res.body.success).to.be.true;
        expect(res.body.data).to.be.an('array').that.has.lengthOf.at.most(10);
      },
    },
    {
      description: '[POST] /api/users - Crear un nuevo usuario',
      testFunction: async () => {
        const newUser = {
          name: 'John Doe',
          email: `john-new-${Date.now()}@example.com`,
          testUser: true,
        };
        const res = await agent.post('/api/users').send(newUser);
        expect(res.status).to.equal(201);
        expect(res.body.success).to.be.true;
        expect(res.body.data).to.have.property('id');
        testUserIds.push(res.body.data.id);
      },
    },
    {
      description:
        '[PUT] /api/users/:id - Actualizar usuario con datos inválidos',
      testFunction: async () => {
        const updatedUser = { name: '', email: 'valid@example.com' };
        const res = await agent
          .put(`/api/users/${testUserIds[0]}`)
          .send(updatedUser);
        expect(res.status).to.equal(400);
        expect(res.body.message).to.equal(
          'body/name must NOT have fewer than 1 characters'
        );
      },
    },
    {
      description: '[PUT] /api/users/:id - Actualizar un usuario',
      testFunction: async () => {
        const updatedUser = {
          name: 'John Updated',
          email: `john-updated-${Date.now()}@example.com`,
        };
        const res = await agent
          .put(`/api/users/${testUserIds[0]}`)
          .send(updatedUser);
        expect(res.status).to.equal(200);
        expect(res.body.success).to.be.true;
        expect(res.body.message).to.equal('Usuario actualizado con éxito');
      },
    },
    {
      description: '[DELETE] /api/users/:id - Eliminar un usuario existente',
      testFunction: async () => {
        const res = await agent.delete(`/api/users/${testUserIds[1]}`);
        expect(res.status).to.equal(200);
        expect(res.body.success).to.be.true;
        expect(res.body.message).to.equal('Usuario eliminado con éxito');
        testUserIds.splice(1, 1);
      },
    },
    {
      description: '[PUT] /api/users/:id - Actualizar usuario con body vacío',
      testFunction: async () => {
        const res = await agent.put(`/api/users/${testUserIds[0]}`).send({});
        expect(res.status).to.equal(400);
        expect(res.body.success).to.be.false;
        expect(res.body.message).to.equal('Nada que actualizar');
      },
    },
    {
      description: '[POST] /api/users - Crear usuario con email duplicado',
      testFunction: async () => {
        const duplicateUser = {
          name: 'John Doe',
          email: `john-dup-${Date.now()}@example.com`,
          testUser: true,
        };
        const res1 = await agent.post('/api/users').send(duplicateUser);
        expect(res1.status).to.equal(201);
        testUserIds.push(res1.body.data.id);
        const res2 = await agent.post('/api/users').send(duplicateUser);
        expect(res2.status).to.equal(409);
        expect(res2.body.message).to.equal('El email ya está registrado');
      },
    },
    {
      description:
        '[POST] /api/users - No debe permitir emails duplicados en concurrencia',
      testFunction: async () => {
        const email = `test-concurrent-${Date.now()}@example.com`;
        const requests = [
          agent
            .post('/api/users')
            .send({ name: 'Test User', email, testUser: true }),
          agent
            .post('/api/users')
            .send({ name: 'Test User', email, testUser: true }),
        ];
        const responses = await Promise.all(requests);
        const statusCodes = responses.map((res) => res.status);
        expect(statusCodes).to.have.members([201, 409]);
      },
    },
    {
      description: '[GET] /api/users?page=1&limit=10 - Prueba de paginación',
      testFunction: async () => {
        const res = await agent
          .get('/api/users?page=1&limit=10')
          .set('Authorization', `Bearer ${validToken}`);
        expect(res.status).to.equal(200);
        expect(res.body.success).to.be.true;
        expect(res.body.data).to.be.an('array').that.has.lengthOf.at.most(10);
      },
    },
    {
      description:
        '[Integration] Authenticate - Recuperar usuarios con token válido',
      testFunction: async () => {
        const token = app.jwt.sign({ user: 'test' });
        const res = await agent
          .get('/api/users?limit=5')
          .set('Authorization', `Bearer ${token}`);
        expect(res.status).to.equal(200);
        expect(res.body.success).to.be.true;
        expect(res.body.data).to.be.an('array');
      },
    },
  ];

  testCases.forEach(({ description, testFunction }) => {
    it(description, async function () {
      await runTest(description, testFunction);
    });
  });
});
