const logger = require('../utils/logger');

const basicAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Settings Microservice"');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');

  if (username === process.env.BASIC_AUTH_USER && password === process.env.BASIC_AUTH_PASS) {
    req.user = { username };
    return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Settings Microservice"');
  return res.status(401).json({ error: 'Invalid credentials' });
};

const sessionAuth = (req, res, next) => {
  if (req.session && req.session.authenticated) {
    return next();
  }
  
  if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
    return res.status(401).json({ error: 'Session required' });
  }
  
  return res.redirect('/login');
};

const requireAdmin = (req, res, next) => {
  if (req.session && req.session.role === 'admin') {
    return next();
  }
  
  if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  return res.redirect('/dashboard');
};

module.exports = { basicAuth, sessionAuth, requireAdmin };
