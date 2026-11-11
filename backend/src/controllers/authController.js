const authService = require('../services/authService');

function validateBody(req, next) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    next(new authService.AuthServiceError(400, 'INVALID_BODY', 'Envie um objeto JSON válido.'));
    return false;
  }

  return true;
}

async function register(req, res, next) {
  if (!validateBody(req, next)) {
    return;
  }

  try {
    const session = await authService.register(req.body.username, req.body.password);
    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  if (!validateBody(req, next)) {
    return;
  }

  try {
    const session = await authService.login(req.body.username, req.body.password);
    res.json(session);
  } catch (error) {
    next(error);
  }
}

function me(req, res) {
  res.json({ user: req.user });
}

module.exports = {
  login,
  me,
  register
};