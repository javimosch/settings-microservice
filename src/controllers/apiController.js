const GlobalSetting = require('../models/GlobalSetting');
const ClientSetting = require('../models/ClientSetting');
const UserSetting = require('../models/UserSetting');
const DynamicSetting = require('../models/DynamicSetting');
const logger = require('../utils/logger');

exports.getSetting = async (req, res) => {
  try {
    const { settingKey } = req.params;
    const { clientId, userId } = req.query;
    const organizationId = req.organizationId;
    const { checkFilteredAccess } = require('../utils/permissionFilters');

    logger.info('getSetting called', { settingKey, clientId, userId, organizationId: organizationId.toString() });

    if (userId) {
      const userSetting = await UserSetting.findOne({ organizationId, userId, settingKey });
      if (userSetting) {
        if (checkFilteredAccess(userSetting, req.permissions, 'userSettings', 'read')) {
          return res.json({ source: 'user', value: userSetting.settingValue, setting: userSetting });
        }
      }
    }

    if (clientId) {
      const clientSetting = await ClientSetting.findOne({ organizationId, clientId, settingKey });
      if (clientSetting) {
        return res.json({ source: 'client', value: clientSetting.settingValue, setting: clientSetting });
      }
    }

    const globalSetting = await GlobalSetting.findOne({ organizationId, settingKey });
    logger.info('Global setting query result', { found: !!globalSetting, organizationId: organizationId.toString(), settingKey });
    if (globalSetting) {
      if (checkFilteredAccess(globalSetting, req.permissions, 'globalSettings', 'read')) {
        return res.json({ source: 'global', value: globalSetting.settingValue, setting: globalSetting });
      }
    }

    res.status(404).json({ error: 'Setting not found' });
  } catch (error) {
    logger.error('Error getting setting:', error);
    res.status(500).json({ error: 'Failed to get setting' });
  }
};

exports.createOrUpdateGlobalSetting = async (req, res) => {
  try {
    const { settingKey, settingValue, description } = req.body;
    const organizationId = req.organizationId;

    if (!req.permissions?.globalSettings?.write) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const existing = await GlobalSetting.findOne({ organizationId, settingKey });
    
    if (existing) {
      existing.settingValue = settingValue;
      if (description) existing.description = description;
      existing.updatedBy = req.authResult?.subject?.id;
      existing.updatedAt = Date.now();
      await existing.save();
      return res.json(existing);
    }

    const setting = new GlobalSetting({
      organizationId,
      settingKey,
      settingValue,
      description,
      createdBy: req.authResult?.subject?.id
    });
    await setting.save();
    res.status(201).json(setting);
  } catch (error) {
    logger.error('Error creating/updating global setting:', error);
    res.status(500).json({ error: 'Failed to create/update setting' });
  }
};

exports.getClientSetting = async (req, res) => {
  try {
    const { clientId, settingKey } = req.params;
    const organizationId = req.organizationId;

    const setting = await ClientSetting.findOne({ organizationId, clientId, settingKey });
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ value: setting.settingValue, setting });
  } catch (error) {
    logger.error('Error getting client setting:', error);
    res.status(500).json({ error: 'Failed to get setting' });
  }
};

exports.getClientSettingByKey = async (req, res) => {
  try {
    const { settingKey } = req.params;
    const { clientId } = req.query;
    const organizationId = req.organizationId;

    if (!clientId) {
      return res.status(400).json({ error: 'clientId query parameter is required' });
    }

    const setting = await ClientSetting.findOne({ organizationId, clientId, settingKey });
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ value: setting.settingValue, setting });
  } catch (error) {
    logger.error('Error getting client setting by key:', error);
    res.status(500).json({ error: 'Failed to get setting' });
  }
};

exports.getUserSetting = async (req, res) => {
  try {
    const { userId, settingKey } = req.params;
    const organizationId = req.organizationId;
    const { checkFilteredAccess } = require('../utils/permissionFilters');

    const setting = await UserSetting.findOne({ organizationId, userId, settingKey });
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    if (!checkFilteredAccess(setting, req.permissions, 'userSettings', 'read')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    res.json({ value: setting.settingValue, setting });
  } catch (error) {
    logger.error('Error getting user setting:', error);
    res.status(500).json({ error: 'Failed to get setting' });
  }
};

exports.getUserSettingByKey = async (req, res) => {
  try {
    const { settingKey } = req.params;
    const { userId } = req.query;
    const organizationId = req.organizationId;
    const { checkFilteredAccess } = require('../utils/permissionFilters');

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    const setting = await UserSetting.findOne({ organizationId, userId, settingKey });
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    if (!checkFilteredAccess(setting, req.permissions, 'userSettings', 'read')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    res.json({ value: setting.settingValue, setting });
  } catch (error) {
    logger.error('Error getting user setting by key:', error);
    res.status(500).json({ error: 'Failed to get setting' });
  }
};

exports.getDynamicSetting = async (req, res) => {
  try {
    const { uniqueId, settingKey } = req.params;
    const organizationId = req.organizationId;

    const setting = await DynamicSetting.findOne({ organizationId, uniqueId, settingKey });
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ value: setting.settingValue, setting });
  } catch (error) {
    logger.error('Error getting dynamic setting:', error);
    res.status(500).json({ error: 'Failed to get setting' });
  }
};

exports.getDynamicSettingByKey = async (req, res) => {
  try {
    const { settingKey } = req.params;
    const { uniqueId } = req.query;
    const organizationId = req.organizationId;

    if (!uniqueId) {
      return res.status(400).json({ error: 'uniqueId query parameter is required' });
    }

    const setting = await DynamicSetting.findOne({ organizationId, uniqueId, settingKey });
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ value: setting.settingValue, setting });
  } catch (error) {
    logger.error('Error getting dynamic setting by key:', error);
    res.status(500).json({ error: 'Failed to get setting' });
  }
};

// LIST operations
exports.listGlobalSettings = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const settings = await GlobalSetting.find({ organizationId }).sort({ createdAt: -1 });
    res.json(settings);
  } catch (error) {
    logger.error('Error listing global settings:', error);
    res.status(500).json({ error: 'Failed to list settings' });
  }
};

exports.listClientSettings = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { clientId } = req.query;
    const query = { organizationId };
    if (clientId) query.clientId = clientId;
    
    const settings = await ClientSetting.find(query).sort({ createdAt: -1 });
    res.json(settings);
  } catch (error) {
    logger.error('Error listing client settings:', error);
    res.status(500).json({ error: 'Failed to list settings' });
  }
};

exports.listUserSettings = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { userId } = req.query;
    const { applyDynamicPermissionFilter } = require('../utils/permissionFilters');
    
    const query = { organizationId };
    if (userId) query.userId = userId;
    
    const filteredQuery = applyDynamicPermissionFilter(query, req.permissions, 'userSettings', 'read');
    
    if (filteredQuery === null) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const settings = await UserSetting.find(filteredQuery).sort({ createdAt: -1 });
    res.json(settings);
  } catch (error) {
    logger.error('Error listing user settings:', error);
    res.status(500).json({ error: 'Failed to list settings' });
  }
};

exports.listDynamicSettings = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { uniqueId } = req.query;
    const query = { organizationId };
    if (uniqueId) query.uniqueId = uniqueId;
    
    const settings = await DynamicSetting.find(query).sort({ createdAt: -1 });
    res.json(settings);
  } catch (error) {
    logger.error('Error listing dynamic settings:', error);
    res.status(500).json({ error: 'Failed to list settings' });
  }
};

// GET by ID operations
exports.getGlobalSettingById = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;
    
    const setting = await GlobalSetting.findOne({ _id: id, organizationId });
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    res.json(setting);
  } catch (error) {
    logger.error('Error getting global setting:', error);
    res.status(500).json({ error: 'Failed to get setting' });
  }
};

exports.getClientSettingById = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;
    
    const setting = await ClientSetting.findOne({ _id: id, organizationId });
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    res.json(setting);
  } catch (error) {
    logger.error('Error getting client setting:', error);
    res.status(500).json({ error: 'Failed to get setting' });
  }
};

exports.getUserSettingById = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;
    const { checkFilteredAccess } = require('../utils/permissionFilters');
    
    const setting = await UserSetting.findOne({ _id: id, organizationId });
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    if (!checkFilteredAccess(setting, req.permissions, 'userSettings', 'read')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    res.json(setting);
  } catch (error) {
    logger.error('Error getting user setting:', error);
    res.status(500).json({ error: 'Failed to get setting' });
  }
};

exports.getDynamicSettingById = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;
    
    const setting = await DynamicSetting.findOne({ _id: id, organizationId });
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    res.json(setting);
  } catch (error) {
    logger.error('Error getting dynamic setting:', error);
    res.status(500).json({ error: 'Failed to get setting' });
  }
};

// CREATE operations
exports.createClientSetting = async (req, res) => {
  try {
    const { clientId, settingKey, settingValue, description } = req.body;
    const organizationId = req.organizationId;

    if (!req.permissions?.clientSettings?.write) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const setting = new ClientSetting({
      organizationId,
      clientId,
      settingKey,
      settingValue,
      description,
      createdBy: req.authResult?.subject?.id
    });
    await setting.save();
    res.status(201).json(setting);
  } catch (error) {
    logger.error('Error creating client setting:', error);
    res.status(500).json({ error: 'Failed to create setting' });
  }
};

exports.createUserSetting = async (req, res) => {
  try {
    const { userId, settingKey, settingValue, description } = req.body;
    const organizationId = req.organizationId;
    const { hasPermission, checkFilteredAccess } = require('../utils/permissionFilters');

    if (!hasPermission(req.permissions, 'userSettings', 'write')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const mockSetting = { organizationId, userId, settingKey, settingValue, description };
    if (!checkFilteredAccess(mockSetting, req.permissions, 'userSettings', 'write')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const setting = new UserSetting({
      organizationId,
      userId,
      settingKey,
      settingValue,
      description,
      createdBy: req.authResult?.subject?.id
    });
    await setting.save();
    res.status(201).json(setting);
  } catch (error) {
    logger.error('Error creating user setting:', error);
    res.status(500).json({ error: 'Failed to create setting' });
  }
};

exports.createDynamicSetting = async (req, res) => {
  try {
    const { uniqueId, settingKey, settingValue, description } = req.body;
    const organizationId = req.organizationId;

    if (!req.permissions?.dynamicSettings?.write) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const setting = new DynamicSetting({
      organizationId,
      uniqueId,
      settingKey,
      settingValue,
      description,
      createdBy: req.authResult?.subject?.id
    });
    await setting.save();
    res.status(201).json(setting);
  } catch (error) {
    logger.error('Error creating dynamic setting:', error);
    res.status(500).json({ error: 'Failed to create setting' });
  }
};

// UPDATE operations
exports.updateGlobalSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const { settingValue, description } = req.body;
    const organizationId = req.organizationId;

    if (!req.permissions?.globalSettings?.write) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const setting = await GlobalSetting.findOne({ _id: id, organizationId });
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    if (settingValue !== undefined) setting.settingValue = settingValue;
    if (description !== undefined) setting.description = description;
    setting.updatedBy = req.authResult?.subject?.id;
    setting.updatedAt = Date.now();
    
    await setting.save();
    res.json(setting);
  } catch (error) {
    logger.error('Error updating global setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
};

exports.updateClientSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const { settingValue, description } = req.body;
    const organizationId = req.organizationId;

    if (!req.permissions?.clientSettings?.write) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const setting = await ClientSetting.findOne({ _id: id, organizationId });
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    if (settingValue !== undefined) setting.settingValue = settingValue;
    if (description !== undefined) setting.description = description;
    setting.updatedBy = req.authResult?.subject?.id;
    setting.updatedAt = Date.now();
    
    await setting.save();
    res.json(setting);
  } catch (error) {
    logger.error('Error updating client setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
};

exports.updateUserSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const { settingValue, description } = req.body;
    const organizationId = req.organizationId;
    const { hasPermission, checkFilteredAccess } = require('../utils/permissionFilters');

    if (!hasPermission(req.permissions, 'userSettings', 'write')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const setting = await UserSetting.findOne({ _id: id, organizationId });
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    if (!checkFilteredAccess(setting, req.permissions, 'userSettings', 'write')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    if (settingValue !== undefined) setting.settingValue = settingValue;
    if (description !== undefined) setting.description = description;
    setting.updatedBy = req.authResult?.subject?.id;
    setting.updatedAt = Date.now();
    
    await setting.save();
    res.json(setting);
  } catch (error) {
    logger.error('Error updating user setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
};

exports.updateDynamicSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const { settingValue, description } = req.body;
    const organizationId = req.organizationId;

    if (!req.permissions?.dynamicSettings?.write) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const setting = await DynamicSetting.findOne({ _id: id, organizationId });
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    if (settingValue !== undefined) setting.settingValue = settingValue;
    if (description !== undefined) setting.description = description;
    setting.updatedBy = req.authResult?.subject?.id;
    setting.updatedAt = Date.now();
    
    await setting.save();
    res.json(setting);
  } catch (error) {
    logger.error('Error updating dynamic setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
};

// DELETE operations
exports.deleteGlobalSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;

    if (!req.permissions?.globalSettings?.write) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const setting = await GlobalSetting.findOneAndDelete({ _id: id, organizationId });
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    logger.error('Error deleting global setting:', error);
    res.status(500).json({ error: 'Failed to delete setting' });
  }
};

exports.deleteClientSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;

    if (!req.permissions?.clientSettings?.write) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const setting = await ClientSetting.findOneAndDelete({ _id: id, organizationId });
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    logger.error('Error deleting client setting:', error);
    res.status(500).json({ error: 'Failed to delete setting' });
  }
};

exports.deleteUserSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;
    const { hasPermission, checkFilteredAccess } = require('../utils/permissionFilters');

    if (!hasPermission(req.permissions, 'userSettings', 'write')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const setting = await UserSetting.findOne({ _id: id, organizationId });
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    if (!checkFilteredAccess(setting, req.permissions, 'userSettings', 'write')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await UserSetting.findOneAndDelete({ _id: id, organizationId });
    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    logger.error('Error deleting user setting:', error);
    res.status(500).json({ error: 'Failed to delete setting' });
  }
};

exports.deleteDynamicSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;

    if (!req.permissions?.dynamicSettings?.write) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const setting = await DynamicSetting.findOneAndDelete({ _id: id, organizationId });
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    logger.error('Error deleting dynamic setting:', error);
    res.status(500).json({ error: 'Failed to delete setting' });
  }
};

// Get all settings for a specific clientId
exports.getAllClientSettings = async (req, res) => {
  try {
    const { clientId } = req.params;
    const organizationId = req.organizationId;

    const settings = await ClientSetting.find({ organizationId, clientId }).sort({ createdAt: -1 });
    res.json(settings);
  } catch (error) {
    logger.error('Error getting all client settings:', error);
    res.status(500).json({ error: 'Failed to get client settings' });
  }
};

// Get all settings for a specific userId
exports.getAllUserSettings = async (req, res) => {
  try {
    const { userId } = req.params;
    const organizationId = req.organizationId;
    const { checkFilteredAccess } = require('../utils/permissionFilters');

    const settings = await UserSetting.find({ organizationId, userId }).sort({ createdAt: -1 });
    
    const filtered = settings.filter(setting => 
      checkFilteredAccess(setting, req.permissions, 'userSettings', 'read')
    );
    
    res.json(filtered);
  } catch (error) {
    logger.error('Error getting all user settings:', error);
    res.status(500).json({ error: 'Failed to get user settings' });
  }
};

// Get all settings for a specific uniqueId
exports.getAllDynamicSettings = async (req, res) => {
  try {
    const { uniqueId } = req.params;
    const organizationId = req.organizationId;

    const settings = await DynamicSetting.find({ organizationId, uniqueId }).sort({ createdAt: -1 });
    res.json(settings);
  } catch (error) {
    logger.error('Error getting all dynamic settings:', error);
    res.status(500).json({ error: 'Failed to get dynamic settings' });
  }
};
