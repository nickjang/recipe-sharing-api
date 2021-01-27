const express = require('express');
const path = require('path');
const { requireAuth } = require('../middleware/jwt-auth');
const UsersService = require('./users-service');
const AuthService = require('../auth/auth-service');
const xss = require('xss');
const logger = require('../logger');

const usersRouter = express.Router();
const jsonBodyParser = express.json();

usersRouter
  .get('/:user_id', async (req, res, next) => {
    const user_id = req.params.user_id;
    if (user_id == null) {
      return res.status(400).json({
        error: 'Missing \'user_id\' in request body'
      });
    }

    try {
      const full_name = await UsersService.getUserFullName(
        req.app.get('db'),
        user_id
      );

      if (!full_name) {
        return res.status(400).json({
          error: 'Could not find user with that id'
        });
      }

      return res.json({ full_name: xss(full_name) });
    } catch (error) { next(error); }
  });
usersRouter
  .post('/', jsonBodyParser, async (req, res, next) => {
    const { password, email, full_name, nickname } = req.body;

    for (const field of ['full_name', 'email', 'password'])
      if (!req.body[field])
        return res.status(400).json({
          error: `Missing '${field}' in request body`
        });

    const passwordError = UsersService.validatePassword(password);

    if (passwordError)
      return res.status(400).json({ error: passwordError });

    try {
      const hasUser = await UsersService.hasUserWithEmail(
        req.app.get('db'),
        email
      );
      if (hasUser)
        return res.status(400).json({ error: 'Email already taken' });

      const hashedPassword = await UsersService.hashPassword(password);

      const newUser = {
        email,
        password: hashedPassword,
        full_name,
        nickname,
        date_created: 'now()',
      };

      const user = await UsersService.insertUser(
        req.app.get('db'),
        newUser
      );

      return res
        .status(201)
        .location(path.posix.join(req.originalUrl, `/${user.id}`))
        .json(UsersService.serializeUser(user));
    } catch (error) { next(error); }
  })

usersRouter
  .route('/')
  .all(requireAuth)
  .patch(jsonBodyParser, async (req, res, next) => {
    if (req.user.id === 1) {
      logger.error('Cannot update demo account');
      return res.status(401).json({
        error: 'Cannot update demo account'
      });
    }

    const { password, email } = req.body;
    let updates = { date_modified: 'now()' };

    if (!password && !email)
      return res.status(400).json({
        error: 'Missing \'email\' or \'password\' in request body'
      });

    if (email) {
      const hasUserWithEmail = await UsersService.hasUserWithEmail(
        req.app.get('db'),
        email
      );

      if (hasUserWithEmail)
        return res.status(400).json({ error: 'Email already taken' });
      else
        updates['email'] = email;
    }

    try {
      if (password) {
        const passwordError = UsersService.validatePassword(password);

        if (passwordError)
          return res.status(400).json({ error: passwordError });

        const hashedPassword = await UsersService.hashPassword(password);
        updates['password'] = hashedPassword;
      }

      const user = await UsersService.updateUser(
        req.app.get('db'),
        req.user.id,
        updates
      );
      const sub = user.email;
      const payload = { user_id: user.id };
      res
        .location(path.posix.join(req.originalUrl, `/${user.id}`))
        .json({
          user: UsersService.serializeUser(user),
          authToken: AuthService.createJwt(sub, payload)
        });
    } catch (error) { next(error); }
  })
  .delete(async (req, res, next) => {
    if (req.user.id === 1) {
      logger.error('Cannot delete demo account');
      return res.status(401).json({
        error: 'Cannot delete demo account'
      });
    }

    try {
      await UsersService.deleteUser(
        req.app.get('db'),
        req.user.id
      );
      return res
        .status(204)
        .send();
    } catch (error) { next(error); }
  });

module.exports = usersRouter;
