const DynamicAuth = require('../models/DynamicAuth');
const logger = require('../utils/logger');
const cache = require('../utils/cache');

exports.listDynamicAuth = async (req, res) => {
  try {
    const { organizationId } = req.query;
    const filter = organizationId ? { organizationId } : {};
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
    const auth = await DynamicAuth.findByIdAndUpdate(
      id,
      { 
        name, type, http, jsCode, cacheTTLSeconds, enabled, description,
        updatedBy: req.session.username || req.user?.username, 
        updatedAt: Date.now() 
      },
      { new: true, runValidators: true }
    );
    if (!auth) {
      return res.status(404).json({ error: 'Dynamic auth not found' });
    }
    res.json(auth);
  } catch (error) {
    logger.error('Error updating dynamic auth:', error);
    res.status(500).json({ error: 'Failed to update dynamic auth' });
  }
};

exports.deleteDynamicAuth = async (req, res) => {
  try {
    const { id } = req.params;
    const auth = await DynamicAuth.findByIdAndDelete(id);
    if (!auth) {
      return res.status(404).json({ error: 'Dynamic auth not found' });
    }
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

    const mockRes = {
      status: (code) => ({
        json: (data) => res.status(code).json({ success: false, result: data })
      }),
      json: (data) => res.json({ success: false, result: data })
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
    res.status(500).json({ error: 'Failed to test dynamic auth', message: error.message });
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
