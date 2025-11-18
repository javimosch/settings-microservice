const axios = require('axios');
const { VM } = require('vm2');
const Mustache = require('mustache');
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
      axios: axios
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

    const cacheKey = `auth:${orgId}:${authName}:${req.headers.authorization || 'none'}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      req.authResult = cached;
      req.permissions = cached.permissions || {};
      return next();
    }

    const authConfig = await DynamicAuth.findOne({
      organizationId: orgId,
      name: authName,
      enabled: true
    });

    if (!authConfig) {
      return res.status(401).json({ error: 'Auth configuration not found' });
    }

    let result;
    if (authConfig.type === 'http') {
      result = await executeHttpAuth(authConfig, req);
    } else if (authConfig.type === 'js') {
      result = await executeJsAuth(authConfig, req);
    }

    if (!result || !result.ok) {
      return res.status(401).json({ error: 'Authentication failed', details: result?.error });
    }

    const ttl = (result.ttl || authConfig.cacheTTLSeconds) * 1000;
    cache.set(cacheKey, result, { ttl });

    req.authResult = result;
    req.permissions = result.permissions || {};
    req.organizationId = orgId;

    next();
  } catch (error) {
    logger.error('Dynamic auth error:', error);
    return res.status(500).json({ error: 'Authentication error', message: error.message });
  }
};

module.exports = { dynamicAuthMiddleware };
