const Organization = require('../models/Organization');
const logger = require('../utils/logger');

exports.listOrganizations = async (req, res) => {
  try {
    const userPermissions = req.session.permissions;
    let query = {};
    
    // Filter by organization access
    if (userPermissions.organizations === 'specific') {
      query._id = { $in: userPermissions.organizationIds };
    }
    
    const organizations = await Organization.find(query).sort({ createdAt: -1 });
    res.json(organizations);
  } catch (error) {
    logger.error('Error listing organizations:', error);
    res.status(500).json({ error: 'Failed to list organizations' });
  }
};

exports.createOrganization = async (req, res) => {
  try {
    const { name } = req.body;
    const organization = new Organization({
      name,
      createdBy: req.session.username || req.user?.username
    });
    await organization.save();
    res.status(201).json(organization);
  } catch (error) {
    logger.error('Error creating organization:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Organization name already exists' });
    }
    res.status(500).json({ error: 'Failed to create organization' });
  }
};

exports.updateOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userPermissions = req.session.permissions;
    
    // Check if user has access to this organization
    if (userPermissions.organizations === 'specific') {
      const hasAccess = userPermissions.organizationIds.some(orgId => orgId.toString() === id);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this organization' });
      }
    }
    
    const organization = await Organization.findByIdAndUpdate(
      id,
      { name, updatedBy: req.session.username || req.user?.username, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json(organization);
  } catch (error) {
    logger.error('Error updating organization:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
};

exports.deleteOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const userPermissions = req.session.permissions;
    
    // Check if user has access to this organization
    if (userPermissions.organizations === 'specific') {
      const hasAccess = userPermissions.organizationIds.some(orgId => orgId.toString() === id);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this organization' });
      }
    }
    
    const organization = await Organization.findByIdAndDelete(id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    logger.error('Error deleting organization:', error);
    res.status(500).json({ error: 'Failed to delete organization' });
  }
};
