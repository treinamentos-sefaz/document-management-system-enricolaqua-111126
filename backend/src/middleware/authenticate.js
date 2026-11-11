const { verifyAccessToken } = require('../config/jwt');

function authenticate(req, res, next) {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i);

  if (!match) {
    return res.status(401).json({
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Autentique-se para acessar este recurso.'
      }
    });
  }

  try {
    const payload = verifyAccessToken(match[1]);

    if (typeof payload.sub !== 'string' || typeof payload.username !== 'string') {
      throw new Error('Claims inválidos.');
    }

    req.user = {
      id: payload.sub,
      username: payload.username
    };
    return next();
  } catch {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'A sessão é inválida ou expirou.'
      }
    });
  }
}

module.exports = authenticate;