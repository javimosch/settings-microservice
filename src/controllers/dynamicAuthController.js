const DynamicAuth = require('../models/DynamicAuth');
const logger = require('../utils/logger');
const cache = require('../utils/cache');
const { logEvent } = require('../utils/auditLogger');
const { isOrgAllowed, buildOrgFilter } = require('../utils/permissionFilters');

exports.listDynamicAuth = async (req, res) => {
  try {
    const { organizationId } = req.query;
    const userPermissions = req.session.permissions;
    
    let filter = buildOrgFilter(userPermissions);
    
    if (organizationId) {
      if (!isOrgAllowed(userPermissions, organizationId)) {
        return res.status(403).json({ error: 'Access denied to this organization' });
      }
      filter.organizationId = organizationId;
    }
    
    const auths = await DynamicAuth.find(filter).sort({ name: 1 });
    res.json(auths);
  } catch (error) {
    logger.error('Error listing dynamic auth:', error);
    res.status(500).json({ error: 'Failed to list dynamic auth' });
  }
};

exports.createDynamicAuth = async (req, res) => {
  try {
    const { organizationId, name, type, http, jsCode, cacheTTLSeconds, enabled, description } = req.body;
    const userPermissions = req.session.permissions;
    
    if (!isOrgAllowed(userPermissions, organizationId)) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }
    
    const auth = new DynamicAuth({
      organizationId,
      name,
      type,
      http,
      jsCode,
      cacheTTLSeconds,
      enabled,
      description,
      createdBy: req.session.username || req.user?.username
    });
    await auth.save();
    await logEvent({
      req,
      organizationId: auth.organizationId,
      entityType: 'dynamicAuth',
      entityId: auth._id.toString(),
      action: 'create',
      before: null,
      after: auth.toObject(),
      meta: { name }
    });
    res.status(201).json(auth);
  } catch (error) {
    logger.error('Error creating dynamic auth:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Auth name already exists for this organization' });
    }
    res.status(500).json({ error: 'Failed to create dynamic auth' });
  }
};

exports.updateDynamicAuth = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, http, jsCode, cacheTTLSeconds, enabled, description } = req.body;
    const userPermissions = req.session.permissions;
    
    const existing = await DynamicAuth.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Dynamic auth not found' });
    }
    
    if (!isOrgAllowed(userPermissions, existing.organizationId)) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }
    
    const auth = await DynamicAuth.findByIdAndUpdate(
      id,
      { 
        name, type, http, jsCode, cacheTTLSeconds, enabled, description,
        updatedBy: req.session.username || req.user?.username, 
        updatedAt: Date.now() 
      },
      { new: true, runValidators: true }
    );
    await logEvent({
      req,
      organizationId: auth.organizationId,
      entityType: 'dynamicAuth',
      entityId: auth._id.toString(),
      action: 'update',
      before: existing.toObject(),
      after: auth.toObject(),
      meta: { name: auth.name }
    });
    res.json(auth);
  } catch (error) {
    logger.error('Error updating dynamic auth:', error);
    res.status(500).json({ error: 'Failed to update dynamic auth' });
  }
};

exports.deleteDynamicAuth = async (req, res) => {
  try {
    const { id } = req.params;
    const userPermissions = req.session.permissions;
    
    const auth = await DynamicAuth.findById(id);
    if (!auth) {
      return res.status(404).json({ error: 'Dynamic auth not found' });
    }
    
    if (!isOrgAllowed(userPermissions, auth.organizationId)) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }
    
    await DynamicAuth.findByIdAndDelete(id);
    await logEvent({
      req,
      organizationId: auth.organizationId,
      entityType: 'dynamicAuth',
      entityId: auth._id.toString(),
      action: 'delete',
      before: auth.toObject(),
      after: null,
      meta: { name: auth.name }
    });
    res.json({ message: 'Dynamic auth deleted successfully' });
  } catch (error) {
    logger.error('Error deleting dynamic auth:', error);
    res.status(500).json({ error: 'Failed to delete dynamic auth' });
  }
};

exports.tryDynamicAuth = async (req, res) => {
  try {
    const { id } = req.params;
    const auth = await DynamicAuth.findById(id);
    
    if (!auth) {
      return res.status(404).json({ error: 'Dynamic auth not found' });
    }

    const { dynamicAuthMiddleware } = require('../middleware/dynamicAuth');
    const mockReq = {
      headers: req.body.headers || {},
      query: req.body.query || {},
      body: req.body.body || {},
      ip: req.ip,
      path: '/test'
    };

    mockReq.headers['x-organization-id'] = auth.organizationId;
    mockReq.headers['x-auth-name'] = auth.name;

    let captured = null;
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          captured = { code, data };
          res.status(code).json({ success: false, result: data });
        }
      }),
      json: (data) => {
        captured = { code: 200, data };
        res.json({ success: true, result: data, permissions: mockReq.permissions });
      }
    };

    const mockNext = () => {
      res.json({ 
        success: true, 
        result: mockReq.authResult,
        permissions: mockReq.permissions 
      });
    };

    await dynamicAuthMiddleware(mockReq, mockRes, mockNext);
  } catch (error) {
    logger.error('Error trying dynamic auth:', error);
    res.status(500).json({ error: 'Failed to test dynamic auth', message: error.message, stack: error.stack });
  }
};

exports.invalidateCache = async (req, res) => {
  try {
    const { id } = req.params;
    const auth = await DynamicAuth.findById(id);
    
    if (!auth) {
      return res.status(404).json({ error: 'Dynamic auth not found' });
    }

    cache.clear();
    res.json({ message: 'Cache invalidated successfully' });
  } catch (error) {
    logger.error('Error invalidating cache:', error);
    res.status(500).json({ error: 'Failed to invalidate cache' });
  }
};
