const { promisify } = require('node:util');
const { randomBytes, randomUUID, scrypt, timingSafeEqual } = require('node:crypto');
const userRepository = require('../repositories/userRepository');
const { createAccessToken } = require('../config/jwt');

const deriveKey = promisify(scrypt);
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;
const DUMMY_SALT = 'dms-login-timing-salt';

class AuthServiceError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = 'AuthServiceError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function validateCredentials(username, password) {
  if (
    typeof username !== 'string'
    || !USERNAME_PATTERN.test(username.trim())
    || typeof password !== 'string'
    || password.length < MIN_PASSWORD_LENGTH
    || password.length > MAX_PASSWORD_LENGTH
  ) {
    throw new AuthServiceError(400, 'INVALID_CREDENTIALS', 'Informe um usuário válido e uma senha entre 12 e 128 caracteres.');
  }
}

async function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const passwordHash = await deriveKey(password, salt, 64);
  return {
    salt,
    passwordHash: passwordHash.toString('hex')
  };
}

async function verifyPassword(password, salt, storedHash) {
  const candidateHash = await deriveKey(password, salt, 64);
  const expectedHash = Buffer.from(storedHash, 'hex');

  return expectedHash.length === candidateHash.length && timingSafeEqual(expectedHash, candidateHash);
}

function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username
  };
}

function createSession(user) {
  return {
    token: createAccessToken(user),
    user: toPublicUser(user)
  };
}

async function register(username, password) {
  validateCredentials(username, password);
  const normalizedUsername = username.trim().toLowerCase();

  try {
    const credentials = await hashPassword(password);
    const user = {
      id: randomUUID(),
      username: normalizedUsername,
      ...credentials,
      createdAt: new Date().toISOString()
    };

    if (!await userRepository.createUser(user)) {
      throw new AuthServiceError(409, 'USERNAME_TAKEN', 'Esse nome de usuário já está em uso.');
    }

    return createSession(user);
  } catch (error) {
    if (error instanceof AuthServiceError) {
      throw error;
    }

    throw new AuthServiceError(500, 'AUTH_STORAGE_ERROR', 'Não foi possível salvar a conta local.');
  }
}

async function login(username, password) {
  validateCredentials(username, password);

  try {
    const user = await userRepository.findByUsername(username.trim().toLowerCase());

    if (!user) {
      await deriveKey(password, DUMMY_SALT, 64);
      throw new AuthServiceError(401, 'INVALID_LOGIN', 'Usuário ou senha inválidos.');
    }

    if (!await verifyPassword(password, user.salt, user.passwordHash)) {
      throw new AuthServiceError(401, 'INVALID_LOGIN', 'Usuário ou senha inválidos.');
    }

    return createSession(user);
  } catch (error) {
    if (error instanceof AuthServiceError) {
      throw error;
    }

    throw new AuthServiceError(500, 'AUTH_STORAGE_ERROR', 'Não foi possível validar a conta local.');
  }
}

module.exports = {
  AuthServiceError,
  login,
  register
};