const AuthService = require('../auth/auth-service');
const logger = require('../logger');

function requireAuth(req, res, next) {
  const authToken = req.get('Authorization') || '';

  let bearerToken;
  if (!authToken.toLowerCase().startsWith('bearer ')) {
    return res.status(401).json({ error: 'Missing bearer token' });
  } else {
    bearerToken = authToken.slice(7, authToken.length);
  }

  try {
    const payload = AuthService.verifyJwt(bearerToken);

    AuthService.getUserWithemail(
      req.app.get('db'),
      payload.sub
    )
      .then(user => {
        if (!user) {
          logger.error(`Unauthorized request to path: ${req.path}`);
          return res.status(401).json({ error: 'Unauthorized request' });
        }

        req.user = user;
        next();
      })
      .catch(err => {
        console.error(err);
        next(err);
      });
  } catch(error) {
    logger.error(`Unauthorized request to path: ${req.path}`);
    res.status(401).json({ error: 'Unauthorized request' });
  }
}

module.exports = {
  requireAuth,
};
