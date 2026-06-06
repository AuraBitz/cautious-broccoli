const { verifyAccessToken } = require('../utils/jwt-token');
const { AppError } = require('../utils');
const config = require('../config/Development');

const LOGIN_PATHS = ['/client-login/login', '/employee-login/login'];

const extractToken = (req) => {
  const cookieToken = req.cookies?.[config.cookie.name];
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  return null;
};

const isLoginRequest = (req) =>
  req.method === 'POST' &&
  LOGIN_PATHS.some(
    (path) => req.path === path || req.path.endsWith(path)
  );

const hasLoginCredentials = (req) => {
  const { username, email, password } = req.body || {};
  return Boolean(password && (username || email));
};

const attachUser = (req, decoded) => {
  req.user = {
    id: decoded.sub,
    username: decoded.username,
    email: decoded.email,
    role: decoded.role,
    device_id: decoded.device_id,
    accountType: decoded.accountType ?? 'client',
  };
};

const authMiddleware = (req, res, next) => {
  try {
    const token = extractToken(req);

    if (token) {
      const decoded = verifyAccessToken(token);
      attachUser(req, decoded);
      return next();
    }

    if (isLoginRequest(req) && hasLoginCredentials(req)) {
      return next();
    }

    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  } catch (error) {
    next(error);
  }
};

module.exports = authMiddleware;
