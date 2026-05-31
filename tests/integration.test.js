const request = require('supertest');
const { createTestApp } = require('./test-setup');
const mongoose = require('mongoose');

let app;

beforeAll(async () => {
  process.env.SECRET = process.env.SECRET || 'testsecret';
  app = await createTestApp();
});

afterAll(async () => {
  if (app && app._mongod) await app._mongod.stop();
  await mongoose.disconnect();
});

test('full user flow: register -> login -> create round -> post contagem -> verify', async () => {
  const email = `test_${Date.now()}@example.com`;
  const password = 'P@ssw0rd1';

  // Register
  const regRes = await request(app)
    .post('/auth/register')
    .send({ tipo: 'Aluno', name: 'jest_user', email, password, confirmPassword: password, turma: 'A1' })
    .expect(201);

  expect(regRes.body).toHaveProperty('token');
  const userId = regRes.body.user._id || regRes.body.user.id;

  // Login
  const loginRes = await request(app)
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  expect(loginRes.body).toHaveProperty('token');
  const token = loginRes.body.token;

  // Create round
  const roundPayload = { acerto: 3, errou: 1, jogou: 4, userId, totalJogos: 4, totalAcertos: 3, totalErros: 1 };
  const roundRes = await request(app)
    .post('/round')
    .set('Authorization', `Bearer ${token}`)
    .send(roundPayload)
    .expect(201);

  expect(roundRes.body).toHaveProperty('round');
  const roundId = roundRes.body.round._id;

  // Post contagemOperacoes
  const contagemRes = await request(app)
    .post('/round/resultado-operacoes')
    .set('Authorization', `Bearer ${token}`)
    .send({ roundId, userId, contagemOperacoes: { faPlus: 2, faMinus: 1, faTimes: 0, faDivide: 0 } })
    .expect(200);

  expect(contagemRes.body).toHaveProperty('contagemOperacoes');

  // Verify user totals updated
  const userRes = await request(app)
    .get(`/auth/login/${userId}`)
    .expect(200);

  expect(userRes.body.user).toHaveProperty('totalJogos');
  expect(userRes.body.user.totalJogos).toBeGreaterThanOrEqual(4);
});
