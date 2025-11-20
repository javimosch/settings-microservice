const axios = require('axios');
const { VM } = require('vm2');
const Mustache = require('mustache');
const mongoose = require('mongoose');
const DynamicAuth = require('../models/DynamicAuth');
const cache = require('../utils/cache');
const logger = require('../utils/logger');

const executeHttpAuth = async (authConfig, req) => {
  const context = {
    headers: req.headers,
    query: req.query,
    body: req.body,
    ip: req.ip,
    path: req.path,
    organizationId: authConfig.organizationId
  };

  const config = {
    method: authConfig.http.method || 'POST',
    url: Mustache.render(authConfig.http.url, context)
  };

  if (authConfig.http.headers) {
    config.headers = {};
    for (const [key, value] of Object.entries(authConfig.http.headers)) {
      config.headers[key] = Mustache.render(String(value), context);
    }
  }

  if (authConfig.http.queryParams) {
    config.params = {};
    for (const [key, value] of Object.entries(authConfig.http.queryParams)) {
      config.params[key] = Mustache.render(String(value), context);
    }
  }

  if (authConfig.http.bodyParams && ['POST', 'PUT'].includes(config.method)) {
    config.data = authConfig.http.bodyParams;
  }

  const response = await axios(config);
  return response.data;
};

const executeJsAuth = async (authConfig, req) => {
  // Pure base64 decoder that works in VM2
  const atob = (str) => {
    return Buffer.from(str, 'base64').toString('binary');
  };

  const decodeJWT = (jwt) => {
    if (!jwt) return null;
    try {
      const parts = jwt.split('.');
      if (parts.length !== 3) return null;
      const decoded = atob(parts[1]);
      return JSON.parse(decoded);
    } catch (e) {
      return null;
    }
  };

  const getClientUserIfValid = (token) => {
    const now = Math.floor(Date.now() / 1000);
    if (!token || typeof token.exp !== 'number' || now >= token.exp) {
      return null;
    }
    return `${token.client}_${token.user}`;
  };

  const makeJsLogger = (level) => {
    return (...args) => {
      let message = 'DynamicAuth JS';
      let meta = {};

      if (typeof args[0] === 'string') {
        message = `DynamicAuth JS: ${args[0]}`;
        if (args[1] && typeof args[1] === 'object') {
          meta = args[1];
        }
      } else if (args[0] && typeof args[0] === 'object') {
        meta = args[0];
      }

      logger[level]({
        message,
        ...meta
      });
    };
  };

  const jsLogger = {
    info: makeJsLogger('info'),
    warn: makeJsLogger('warn'),
    error: makeJsLogger('error'),
    debug: logger.debug ? makeJsLogger('debug') : makeJsLogger('info')
  };

  const vm = new VM({
    timeout: 5000,
    sandbox: {
      req: {
        headers: req.headers,
        query: req.query,
        body: req.body,
        ip: req.ip,
        path: req.path
      },
      axios: axios,
      atob,
      decodeJWT,
      getClientUserIfValid,
      logger: jsLogger
    }
  });

  const code = `
    (async function() {
      ${authConfig.jsCode}
    })();
  `;

  const result = await vm.run(code);
  return result;
};

const dynamicAuthMiddleware = async (req, res, next) => {
  try {
    const authName = req.headers['x-auth-name'] || 'default';
    const orgId = req.headers['x-organization-id'];

    if (!orgId) {
      return res.status(400).json({ error: 'X-Organization-Id header required' });
    }

    // Support Authorization header from various sources
    let authHeader = req.headers.authorization || 
                     req.headers['x-authorization'] || 
                     req.headers['proxy-authorization'];

    logger.info('DynamicAuth request', {
      authName,
      orgId,
      method: req.method,
      path: req.path,
      hasAuthHeader: !!authHeader,
      authHeaderPrefix: authHeader ? authHeader.split(' ')[0] : undefined,
      allAuthHeaders: {
        authorization: !!req.headers.authorization,
        'x-authorization': !!req.headers['x-authorization'],
        'proxy-authorization': !!req.headers['proxy-authorization']
      }
    });

    const cacheKey = `auth:${orgId}:${authName}:${authHeader || 'none'}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      logger.info('DynamicAuth cache hit', {
        authName,
        orgId,
        method: req.method,
        path: req.path
      });
      req.authResult = cached;
      req.permissions = cached.permissions || {};
      req.organizationId = new mongoose.Types.ObjectId(orgId);
      return next();
    }

    const authConfig = await DynamicAuth.findOne({
      organizationId: orgId,
      name: authName,
      enabled: true
    });

    if (!authConfig) {
      logger.warn('DynamicAuth config not found', { authName, orgId, method: req.method, path: req.path });
      return res.status(401).json({ error: 'Auth configuration not found' });
    }

    let result;
    if (authConfig.type === 'http') {
      result = await executeHttpAuth(authConfig, req);
    } else if (authConfig.type === 'js') {
      result = await executeJsAuth(authConfig, req);
    }

    if (!result || !result.ok) {
      logger.warn('DynamicAuth authentication failed', {
        authName,
        orgId,
        method: req.method,
        path: req.path,
        type: authConfig.type,
        resultOk: result && result.ok,
        resultError: result && result.error
      });
      return res.status(401).json({ error: 'Authentication failed', details: result?.error });
    }

    const ttl = (result.ttl || authConfig.cacheTTLSeconds) * 1000;
    cache.set(cacheKey, result, { ttl });

    req.authResult = result;
    req.permissions = result.permissions || {};
    req.organizationId = new mongoose.Types.ObjectId(orgId);

    logger.info('DynamicAuth authentication success', {
      authName,
      orgId,
      method: req.method,
      path: req.path,
      subject: result.subject,
      ttlMs: ttl,
      permissionsFeatures: Object.keys(result.permissions || {})
    });

    next();
  } catch (error) {
    logger.error('Dynamic auth error:', error);
    return res.status(500).json({ error: 'Authentication error', message: error.message });
  }
};

module.exports = { dynamicAuthMiddleware };
