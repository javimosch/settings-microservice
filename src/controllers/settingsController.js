const GlobalSetting = require('../models/GlobalSetting');
const ClientSetting = require('../models/ClientSetting');
const UserSetting = require('../models/UserSetting');
const DynamicSetting = require('../models/DynamicSetting');
const logger = require('../utils/logger');
const { logEvent } = require('../utils/auditLogger');
const { 
  isOrgAllowed, 
  isClientAllowed, 
  isUserIdAllowed,
  buildOrgFilter,
  buildClientFilter,
  buildUserIdFilter
} = require('../utils/permissionFilters');

exports.listGlobalSettings = async (req, res) => {
  try {
    const { organizationId } = req.query;
    const userPermissions = req.session.permissions;
    
    let filter = buildOrgFilter(userPermissions);
    if (organizationId) {
      // Check if user has access to this org
      if (!isOrgAllowed(userPermissions, organizationId)) {
        return res.status(403).json({ error: 'Access denied to this organization' });
      }
      filter.organizationId = organizationId;
    }
    
    const settings = await GlobalSetting.find(filter).sort({ settingKey: 1 });
    res.json(settings);
  } catch (error) {
    logger.error('Error listing global settings:', error);
    res.status(500).json({ error: 'Failed to list global settings' });
  }
};

exports.createGlobalSetting = async (req, res) => {
  try {
    const { organizationId, settingKey, settingValue, description } = req.body;
    const userPermissions = req.session.permissions;
    
    // Check if user has access to this organization
    if (!isOrgAllowed(userPermissions, organizationId)) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }
    
    const setting = new GlobalSetting({
      organizationId,
      settingKey,
      settingValue,
      description,
      createdBy: req.session.username || req.user?.username
    });
    await setting.save();
    await logEvent({
      req,
      organizationId: setting.organizationId,
      entityType: 'globalSetting',
      entityId: setting._id.toString(),
      action: 'create',
      before: null,
      after: setting.toObject(),
      meta: { settingKey }
    });
    res.status(201).json(setting);
  } catch (error) {
    logger.error('Error creating global setting:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Setting key already exists for this organization' });
    }
    res.status(500).json({ error: 'Failed to create global setting' });
  }
};

exports.updateGlobalSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const { settingValue, description } = req.body;
    const userPermissions = req.session.permissions;
    
    // Get the setting first to check organization access
    const existingSetting = await GlobalSetting.findById(id);
    if (!existingSetting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    if (!isOrgAllowed(userPermissions, existingSetting.organizationId)) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }
    
    const setting = await GlobalSetting.findByIdAndUpdate(
      id,
      { settingValue, description, updatedBy: req.session.username || req.user?.username, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    await logEvent({
      req,
      organizationId: setting.organizationId,
      entityType: 'globalSetting',
      entityId: setting._id.toString(),
      action: 'update',
      before: existingSetting.toObject(),
      after: setting.toObject(),
      meta: { settingKey: setting.settingKey }
    });
    res.json(setting);
  } catch (error) {
    logger.error('Error updating global setting:', error);
    res.status(500).json({ error: 'Failed to update global setting' });
  }
};

exports.deleteGlobalSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const userPermissions = req.session.permissions;
    
    // Get the setting first to check organization access
    const setting = await GlobalSetting.findById(id);
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    if (!isOrgAllowed(userPermissions, setting.organizationId)) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }
    
    await GlobalSetting.findByIdAndDelete(id);
    await logEvent({
      req,
      organizationId: setting.organizationId,
      entityType: 'globalSetting',
      entityId: setting._id.toString(),
      action: 'delete',
      before: setting.toObject(),
      after: null,
      meta: { settingKey: setting.settingKey }
    });
    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    logger.error('Error deleting global setting:', error);
    res.status(500).json({ error: 'Failed to delete global setting' });
  }
};

exports.listClientSettings = async (req, res) => {
  try {
    const { organizationId, clientId } = req.query;
    const userPermissions = req.session.permissions;
    
    let filter = { ...buildOrgFilter(userPermissions), ...buildClientFilter(userPermissions) };
    
    if (organizationId) {
      if (!isOrgAllowed(userPermissions, organizationId)) {
        return res.status(403).json({ error: 'Access denied to this organization' });
      }
      filter.organizationId = organizationId;
    }
    
    if (clientId) {
      if (!isClientAllowed(userPermissions, clientId)) {
        return res.status(403).json({ error: 'Access denied to this client' });
      }
      filter.clientId = clientId;
    }
    
    const settings = await ClientSetting.find(filter).sort({ clientId: 1, settingKey: 1 });
    res.json(settings);
  } catch (error) {
    logger.error('Error listing client settings:', error);
    res.status(500).json({ error: 'Failed to list client settings' });
  }
};

exports.createClientSetting = async (req, res) => {
  try {
    const { organizationId, clientId, settingKey, settingValue, description } = req.body;
    const userPermissions = req.session.permissions;
    
    // Check organization access
    if (!isOrgAllowed(userPermissions, organizationId)) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }
    
    // Check client access
    if (!isClientAllowed(userPermissions, clientId)) {
      return res.status(403).json({ error: 'Access denied to this client' });
    }
    
    const setting = new ClientSetting({
      organizationId,
      clientId,
      settingKey,
      settingValue,
      description,
      createdBy: req.session.username || req.user?.username
    });
    await setting.save();
    await logEvent({
      req,
      organizationId: setting.organizationId,
      entityType: 'clientSetting',
      entityId: setting._id.toString(),
      action: 'create',
      before: null,
      after: setting.toObject(),
      meta: { clientId, settingKey }
    });
    res.status(201).json(setting);
  } catch (error) {
    logger.error('Error creating client setting:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Setting key already exists for this client' });
    }
    res.status(500).json({ error: 'Failed to create client setting' });
  }
};

exports.updateClientSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const { settingValue, description } = req.body;
    const userPermissions = req.session.permissions;
    
    // Get the setting first to check access
    const existingSetting = await ClientSetting.findById(id);
    if (!existingSetting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    if (!isOrgAllowed(userPermissions, existingSetting.organizationId)) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }
    
    if (!isClientAllowed(userPermissions, existingSetting.clientId)) {
      return res.status(403).json({ error: 'Access denied to this client' });
    }
    
    const setting = await ClientSetting.findByIdAndUpdate(
      id,
      { settingValue, description, updatedBy: req.session.username || req.user?.username, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    await logEvent({
      req,
      organizationId: setting.organizationId,
      entityType: 'clientSetting',
      entityId: setting._id.toString(),
      action: 'update',
      before: existingSetting.toObject(),
      after: setting.toObject(),
      meta: { clientId: setting.clientId, settingKey: setting.settingKey }
    });
    res.json(setting);
  } catch (error) {
    logger.error('Error updating client setting:', error);
    res.status(500).json({ error: 'Failed to update client setting' });
  }
};

exports.deleteClientSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const userPermissions = req.session.permissions;
    
    const setting = await ClientSetting.findById(id);
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    if (!isOrgAllowed(userPermissions, setting.organizationId)) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }
    
    if (!isClientAllowed(userPermissions, setting.clientId)) {
      return res.status(403).json({ error: 'Access denied to this client' });
    }
    
    await ClientSetting.findByIdAndDelete(id);
    await logEvent({
      req,
      organizationId: setting.organizationId,
      entityType: 'clientSetting',
      entityId: setting._id.toString(),
      action: 'delete',
      before: setting.toObject(),
      after: null,
      meta: { clientId: setting.clientId, settingKey: setting.settingKey }
    });
    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    logger.error('Error deleting client setting:', error);
    res.status(500).json({ error: 'Failed to delete client setting' });
  }
};

exports.listUserSettings = async (req, res) => {
  try {
    const { organizationId, userId } = req.query;
    const userPermissions = req.session.permissions;
    
    let filter = { ...buildOrgFilter(userPermissions), ...buildUserIdFilter(userPermissions) };
    
    if (organizationId) {
      if (!isOrgAllowed(userPermissions, organizationId)) {
        return res.status(403).json({ error: 'Access denied to this organization' });
      }
      filter.organizationId = organizationId;
    }
    
    if (userId) {
      if (!isUserIdAllowed(userPermissions, userId)) {
        return res.status(403).json({ error: 'Access denied to this user' });
      }
      filter.userId = userId;
    }
    
    const settings = await UserSetting.find(filter).sort({ userId: 1, settingKey: 1 });
    res.json(settings);
  } catch (error) {
    logger.error('Error listing user settings:', error);
    res.status(500).json({ error: 'Failed to list user settings' });
  }
};

exports.createUserSetting = async (req, res) => {
  try {
    const { organizationId, userId, settingKey, settingValue, description } = req.body;
    const userPermissions = req.session.permissions;
    
    if (!isOrgAllowed(userPermissions, organizationId)) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }
    
    if (!isUserIdAllowed(userPermissions, userId)) {
      return res.status(403).json({ error: 'Access denied to this user' });
    }
    
    const setting = new UserSetting({
      organizationId,
      userId,
      settingKey,
      settingValue,
      description,
      createdBy: req.session.username || req.user?.username
    });
    await setting.save();
    await logEvent({
      req,
      organizationId: setting.organizationId,
      entityType: 'userSetting',
      entityId: setting._id.toString(),
      action: 'create',
      before: null,
      after: setting.toObject(),
      meta: { userId, settingKey }
    });
    res.status(201).json(setting);
  } catch (error) {
    logger.error('Error creating user setting:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Setting key already exists for this user' });
    }
    res.status(500).json({ error: 'Failed to create user setting' });
  }
};

exports.updateUserSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const { settingValue, description } = req.body;
    const userPermissions = req.session.permissions;
    
    const existingSetting = await UserSetting.findById(id);
    if (!existingSetting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    if (!isOrgAllowed(userPermissions, existingSetting.organizationId)) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }
    
    if (!isUserIdAllowed(userPermissions, existingSetting.userId)) {
      return res.status(403).json({ error: 'Access denied to this user' });
    }
    
    const setting = await UserSetting.findByIdAndUpdate(
      id,
      { settingValue, description, updatedBy: req.session.username || req.user?.username, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    await logEvent({
      req,
      organizationId: setting.organizationId,
      entityType: 'userSetting',
      entityId: setting._id.toString(),
      action: 'update',
      before: existingSetting.toObject(),
      after: setting.toObject(),
      meta: { userId: setting.userId, settingKey: setting.settingKey }
    });
    res.json(setting);
  } catch (error) {
    logger.error('Error updating user setting:', error);
    res.status(500).json({ error: 'Failed to update user setting' });
  }
};

exports.deleteUserSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const userPermissions = req.session.permissions;
    
    const setting = await UserSetting.findById(id);
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    if (!isOrgAllowed(userPermissions, setting.organizationId)) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }
    
    if (!isUserIdAllowed(userPermissions, setting.userId)) {
      return res.status(403).json({ error: 'Access denied to this user' });
    }
    
    await UserSetting.findByIdAndDelete(id);
    await logEvent({
      req,
      organizationId: setting.organizationId,
      entityType: 'userSetting',
      entityId: setting._id.toString(),
      action: 'delete',
      before: setting.toObject(),
      after: null,
      meta: { userId: setting.userId, settingKey: setting.settingKey }
    });
    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    logger.error('Error deleting user setting:', error);
    res.status(500).json({ error: 'Failed to delete user setting' });
  }
};

exports.listDynamicSettings = async (req, res) => {
  try {
    const { organizationId, uniqueId } = req.query;
    const userPermissions = req.session.permissions;
    
    let filter = buildOrgFilter(userPermissions);
    
    if (organizationId) {
      if (!isOrgAllowed(userPermissions, organizationId)) {
        return res.status(403).json({ error: 'Access denied to this organization' });
      }
      filter.organizationId = organizationId;
    }
    if (uniqueId) filter.uniqueId = uniqueId;
    
    const settings = await DynamicSetting.find(filter).sort({ uniqueId: 1, settingKey: 1 });
    res.json(settings);
  } catch (error) {
    logger.error('Error listing dynamic settings:', error);
    res.status(500).json({ error: 'Failed to list dynamic settings' });
  }
};

exports.createDynamicSetting = async (req, res) => {
  try {
    const { organizationId, uniqueId, settingKey, settingValue, description } = req.body;
    const userPermissions = req.session.permissions;
    
    if (!isOrgAllowed(userPermissions, organizationId)) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }
    
    const setting = new DynamicSetting({
      organizationId,
      uniqueId,
      settingKey,
      settingValue,
      description,
      createdBy: req.session.username || req.user?.username
    });
    await setting.save();
    await logEvent({
      req,
      organizationId: setting.organizationId,
      entityType: 'dynamicSetting',
      entityId: setting._id.toString(),
      action: 'create',
      before: null,
      after: setting.toObject(),
      meta: { uniqueId, settingKey }
    });
    res.status(201).json(setting);
  } catch (error) {
    logger.error('Error creating dynamic setting:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Setting key already exists for this unique ID' });
    }
    res.status(500).json({ error: 'Failed to create dynamic setting' });
  }
};

exports.updateDynamicSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const { settingValue, description } = req.body;
    const userPermissions = req.session.permissions;
    
    const existingSetting = await DynamicSetting.findById(id);
    if (!existingSetting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    if (!isOrgAllowed(userPermissions, existingSetting.organizationId)) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }
    
    const setting = await DynamicSetting.findByIdAndUpdate(
      id,
      { settingValue, description, updatedBy: req.session.username || req.user?.username, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    await logEvent({
      req,
      organizationId: setting.organizationId,
      entityType: 'dynamicSetting',
      entityId: setting._id.toString(),
      action: 'update',
      before: existingSetting.toObject(),
      after: setting.toObject(),
      meta: { uniqueId: setting.uniqueId, settingKey: setting.settingKey }
    });
    res.json(setting);
  } catch (error) {
    logger.error('Error updating dynamic setting:', error);
    res.status(500).json({ error: 'Failed to update dynamic setting' });
  }
};

exports.deleteDynamicSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const userPermissions = req.session.permissions;
    
    const setting = await DynamicSetting.findById(id);
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    if (!isOrgAllowed(userPermissions, setting.organizationId)) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }
    
    await DynamicSetting.findByIdAndDelete(id);
    await logEvent({
      req,
      organizationId: setting.organizationId,
      entityType: 'dynamicSetting',
      entityId: setting._id.toString(),
      action: 'delete',
      before: setting.toObject(),
      after: null,
      meta: { uniqueId: setting.uniqueId, settingKey: setting.settingKey }
    });
    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    logger.error('Error deleting dynamic setting:', error);
    res.status(500).json({ error: 'Failed to delete dynamic setting' });
  }
};
