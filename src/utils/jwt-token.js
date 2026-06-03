const jwt = require('jsonwebtoken');
const config = require('../config/Development');
const AppError = require('./app-error');

const signAccessToken = (payload) =>
  jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  });

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError(
        'Session expired, please login again',
        401,
        'TOKEN_EXPIRED'
      );
    }
    throw new AppError('Invalid or missing token', 401, 'INVALID_TOKEN');
  }
};

const buildTokenPayload = (account) => ({
  sub: account.id,
  username: account.username,
  email: account.email,
  role: account.role,
  device_id: account.device_id || null,
});

module.exports = {
  signAccessToken,
  verifyAccessToken,
  buildTokenPayload,
};
