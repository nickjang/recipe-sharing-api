const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const { NODE_ENV, CLIENT_ORIGIN } = require('./config');
const projectsRouter = require('./projects/projects-router');
const logsRouter = require('./logs/logs-router');
const authRouter = require('./auth/auth-router');
const usersRouter = require('./users/users-router');
const logger = require('./logger');
const app = express();

app.use(morgan((NODE_ENV === 'production') ? 'tiny' : 'common', {
  skip: () => NODE_ENV === 'test',
}));
app.use(helmet());
app.use(cors({ origin: CLIENT_ORIGIN }));

app.use('/api/projects', projectsRouter);
app.use('/api/logs', logsRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);

app.use(function errorHandler(error, req, res, next) {
  let response;
  if (NODE_ENV === 'production') {
    response = { error: { message: 'server error' } };
  } else {
    console.error(error);
    response = { message: error.message, error };
  }
  res.status(500).json(response);
});

module.exports = app;