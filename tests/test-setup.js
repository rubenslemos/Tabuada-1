const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const MONGO_BINARY_VERSION = process.env.MONGO_BINARY_VERSION || '6.0.6';

async function createTestApp() {
  let mongod;
  const mongoUrl = process.env.MONGO_URL;

  if (mongoUrl) {
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }).catch(err => console.error('mongoose connect error', err));
  } else {
    // require mongodb-memory-server only when needed to avoid download issues on some Linux distros
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create({ binary: { version: MONGO_BINARY_VERSION } });
    const uri = mongod.getUri();
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }).catch(err => console.error('mongoose connect error', err));
  }

  // create express app and mount routes from the project
  const app = express();
  app.use(bodyParser.json());
  app.use(cookieParser());

  // Mount the route modules (they use mongoose models)
  const createUser = require('../routes/createUser');
  const login = require('../routes/login');
  const round = require('../routes/round');
  const acessos = require('../routes/permissoes');

  app.use('/auth/register', createUser);
  app.use('/auth/login', login);
  app.use('/round', round);
  app.use('/acessos', acessos);

  // expose mongod so tests can stop it (may be undefined when using external Mongo)
  app._mongod = mongod;
  return app;
}

module.exports = { createTestApp };
