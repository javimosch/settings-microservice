// Helper functions for permission filtering

function isOrgAllowed(userPermissions, organizationId) {
  if (userPermissions.organizations === 'all') {
    return true;
  }
  return userPermissions.organizationIds.some(orgId => orgId.toString() === organizationId.toString());
}

function isClientAllowed(userPermissions, clientId) {
  const constraints = userPermissions.resourceConstraints;
  
  // No constraints = all clients allowed
  if (!constraints.clientIds || constraints.clientIds.length === 0) {
    return true;
  }
  
  return constraints.clientIds.includes(clientId.toString());
}

function isUserIdAllowed(userPermissions, userId) {
  const constraints = userPermissions.resourceConstraints;
  
  // No constraints = all users allowed
  if ((!constraints.userIds || constraints.userIds.length === 0) &&
      (!constraints.userIdPatterns || constraints.userIdPatterns.length === 0)) {
    return true;
  }
  
  // Check exact userId matches
  if (constraints.userIds && constraints.userIds.includes(userId)) {
    return true;
  }
  
  // Check pattern matches
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
        return true;
      }
    }
  }
  
  return false;
}

function buildOrgFilter(userPermissions) {
  if (userPermissions.organizations === 'all') {
    return {};
  }
  return { organizationId: { $in: userPermissions.organizationIds } };
}

function buildClientFilter(userPermissions) {
  const constraints = userPermissions.resourceConstraints;
  
  if (!constraints.clientIds || constraints.clientIds.length === 0) {
    return {};
  }
  
  return { clientId: { $in: constraints.clientIds } };
}

function buildUserIdFilter(userPermissions) {
  const constraints = userPermissions.resourceConstraints;
  
  // No constraints = all users allowed
  if ((!constraints.userIds || constraints.userIds.length === 0) &&
      (!constraints.userIdPatterns || constraints.userIdPatterns.length === 0)) {
    return {};
  }
  
  const orConditions = [];
  
  // Add exact userId matches
  if (constraints.userIds && constraints.userIds.length > 0) {
    orConditions.push({ userId: { $in: constraints.userIds } });
  }
  
  // Add pattern matches
  if (constraints.userIdPatterns && constraints.userIdPatterns.length > 0) {
    const regexPatterns = constraints.userIdPatterns.map(p => {
      let pattern;
      switch (p.matchType) {
        case 'exact': pattern = `^${p.pattern}$`; break;
        case 'prefix': pattern = `^${p.pattern}`; break;
        case 'suffix': pattern = `${p.pattern}$`; break;
        case 'contains': pattern = p.pattern; break;
        case 'regex': pattern = p.pattern; break;
        default: pattern = `^${p.pattern}$`;
      }
      return pattern;
    });
    
    orConditions.push({ userId: { $regex: new RegExp(regexPatterns.join('|')) } });
  }
  
  if (orConditions.length === 0) {
    return {};
  }
  
  return orConditions.length === 1 ? orConditions[0] : { $or: orConditions };
}

function applyDynamicPermissionFilter(baseQuery, permissions, resourceType, action = 'read') {
  const resourcePermissions = permissions?.[resourceType];
  
  if (!resourcePermissions) {
    return baseQuery;
  }
  
  // Handle filter-based permissions (e.g., { read: { filter: { userId: 'pizzorno_alan' } } })
  const actionPermissions = resourcePermissions[action];
  
  if (actionPermissions && typeof actionPermissions === 'object' && actionPermissions.filter) {
    return { ...baseQuery, ...actionPermissions.filter };
  }
  
  // Handle boolean permissions (legacy format)
  if (typeof actionPermissions === 'boolean') {
    return actionPermissions ? baseQuery : null;
  }
  
  return baseQuery;
}

function hasPermission(permissions, resourceType, action = 'read') {
  const resourcePermissions = permissions?.[resourceType];
  
  if (!resourcePermissions) {
    return false;
  }
  
  const actionPermissions = resourcePermissions[action];
  
  if (typeof actionPermissions === 'boolean') {
    return actionPermissions;
  }
  
  // If it's an object with filter, permission is granted (filter will be applied separately)
  if (actionPermissions && typeof actionPermissions === 'object' && actionPermissions.filter) {
    return true;
  }
  
  return false;
}

function checkFilteredAccess(resource, permissions, resourceType, action = 'read') {
  const resourcePermissions = permissions?.[resourceType];
  
  if (!resourcePermissions) {
    return false;
  }
  
  const actionPermissions = resourcePermissions[action];
  
  // Handle boolean permissions
  if (typeof actionPermissions === 'boolean') {
    return actionPermissions;
  }
  
  // Handle filter-based permissions
  if (actionPermissions && typeof actionPermissions === 'object' && actionPermissions.filter) {
    // Check if all filter conditions match the resource
    const filter = actionPermissions.filter;
    for (const [key, value] of Object.entries(filter)) {
      if (resource[key] !== value) {
        return false;
      }
    }
    return true;
  }
  
  return false;
}

module.exports = {
  isOrgAllowed,
  isClientAllowed,
  isUserIdAllowed,
  buildOrgFilter,
  buildClientFilter,
  buildUserIdFilter,
  applyDynamicPermissionFilter,
  hasPermission,
  checkFilteredAccess
};
