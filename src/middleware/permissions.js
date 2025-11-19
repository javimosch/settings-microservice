const logger = require('../utils/logger');

const requireAdmin = (req, res, next) => {
  if (req.session && req.session.role === 'admin') {
    return next();
  }
  
  if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  return res.redirect('/dashboard');
};

const requireOrgAccess = (req, res, next) => {
  const { orgId } = req.params;
  const userPermissions = req.session.permissions;
  
  if (!userPermissions) {
    return res.status(403).json({ error: 'No permissions found' });
  }
  
  if (userPermissions.organizations === 'all') {
    return next();
  }
  
  if (userPermissions.organizationIds && userPermissions.organizationIds.includes(orgId)) {
    return next();
  }
  
  return res.status(403).json({ error: 'Access denied to this organization' });
};

const requireFeature = (feature, action = 'read') => {
  return (req, res, next) => {
    const userPermissions = req.session.permissions;
    
    if (!userPermissions) {
      return res.status(403).json({ error: 'No permissions found' });
    }
    
    if (!userPermissions.features[feature]) {
      return res.status(403).json({ error: `Feature ${feature} not available` });
    }
    
    if (!userPermissions.features[feature][action]) {
      return res.status(403).json({ error: `${action} access denied for ${feature}` });
    }
    
    return next();
  };
};

const requireClientAccess = (req, res, next) => {
  const { clientId } = req.params;
  const constraints = req.session.permissions?.resourceConstraints;
  
  if (!constraints) {
    return res.status(403).json({ error: 'No permissions found' });
  }
  
  if (!constraints.clientIds || constraints.clientIds.length === 0) {
    return next();
  }
  
  if (constraints.clientIds.includes(clientId)) {
    return next();
  }
  
  return res.status(403).json({ error: 'Access denied to this client' });
};

const requireUserAccess = (req, res, next) => {
  const { userId } = req.params;
  const constraints = req.session.permissions?.resourceConstraints;
  
  if (!constraints) {
    return res.status(403).json({ error: 'No permissions found' });
  }
  
  if ((!constraints.userIds || constraints.userIds.length === 0) &&
      (!constraints.userIdPatterns || constraints.userIdPatterns.length === 0)) {
    return next();
  }
  
  if (constraints.userIds && constraints.userIds.includes(userId)) {
    return next();
  }
  
  if (constraints.userIdPatterns && constraints.userIdPatterns.length > 0) {
    for (const patternRule of constraints.userIdPatterns) {
      let matches = false;
      
      switch (patternRule.matchType) {
        case 'exact':
          matches = userId === patternRule.pattern;
          break;
        case 'prefix':
          matches = userId.startsWith(patternRule.pattern);
          break;
        case 'suffix':
          matches = userId.endsWith(patternRule.pattern);
          break;
        case 'contains':
          matches = userId.includes(patternRule.pattern);
          break;
        case 'regex':
          matches = new RegExp(patternRule.pattern).test(userId);
          break;
      }
      
      if (matches) {
        return next();
      }
    }
  }
  
  return res.status(403).json({ error: 'Access denied to this user' });
};

module.exports = {
  requireAdmin,
  requireOrgAccess,
  requireFeature,
  requireClientAccess,
  requireUserAccess
};
