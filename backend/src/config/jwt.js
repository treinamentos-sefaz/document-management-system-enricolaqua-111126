const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_ISSUER = 'dms';

if (!JWT_SECRET || Buffer.byteLength(JWT_SECRET) < 32) {
  throw new Error('JWT_SECRET deve conter pelo menos 32 bytes.');
}

function createAccessToken(user) {
  return jwt.sign(
    { username: user.username },
    JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: '1h',
      issuer: TOKEN_ISSUER,
      subject: user.id
    }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET, {
    algorithms: ['HS256'],
    issuer: TOKEN_ISSUER
  });
}

module.exports = {
  createAccessToken,
  verifyAccessToken
};