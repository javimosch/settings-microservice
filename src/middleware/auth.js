const logger = require('../utils/logger');

const basicAuth = (req, res, next) => {
  // Support Authorization header and common proxy alternatives
  let authHeader = req.headers.authorization || 
                   req.headers['x-authorization'] || 
                   req.headers['proxy-authorization'];

  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Settings Microservice"');
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Case-insensitive Basic check
  const isBasic = authHeader.toLowerCase().startsWith('basic ');
  if (!isBasic) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Settings Microservice"');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const base64Credentials = authHeader.slice(6); // Skip 'Basic '
  let credentials;
  try {
    credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  } catch (e) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Settings Microservice"');
    return res.status(401).json({ error: 'Invalid credentials format' });
  }

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
