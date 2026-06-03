const config = require('../config/Development');

const getAccessTokenCookieOptions = () => ({
  httpOnly: true,
  secure: config.cookie.secure,
  sameSite: config.cookie.sameSite,
  maxAge: config.cookie.maxAgeMs,
  path: config.cookie.path,
  ...(config.cookie.domain ? { domain: config.cookie.domain } : {}),
});

const getClearCookieOptions = () => ({
  httpOnly: true,
  secure: config.cookie.secure,
  sameSite: config.cookie.sameSite,
  path: config.cookie.path,
  ...(config.cookie.domain ? { domain: config.cookie.domain } : {}),
});

module.exports = {
  getAccessTokenCookieOptions,
  getClearCookieOptions,
};
