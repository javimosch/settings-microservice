const GlobalSetting = require('../models/GlobalSetting');
const ClientSetting = require('../models/ClientSetting');
const UserSetting = require('../models/UserSetting');
const DynamicSetting = require('../models/DynamicSetting');
const logger = require('../utils/logger');

exports.listGlobalSettings = async (req, res) => {
  try {
    const { organizationId } = req.query;
    const filter = organizationId ? { organizationId } : {};
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
    const setting = new GlobalSetting({
      organizationId,
      settingKey,
      settingValue,
      description,
      createdBy: req.session.username || req.user?.username
    });
    await setting.save();
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
    const setting = await GlobalSetting.findByIdAndUpdate(
      id,
      { settingValue, description, updatedBy: req.session.username || req.user?.username, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    res.json(setting);
  } catch (error) {
    logger.error('Error updating global setting:', error);
    res.status(500).json({ error: 'Failed to update global setting' });
  }
};

exports.deleteGlobalSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const setting = await GlobalSetting.findByIdAndDelete(id);
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    logger.error('Error deleting global setting:', error);
    res.status(500).json({ error: 'Failed to delete global setting' });
  }
};

exports.listClientSettings = async (req, res) => {
  try {
    const { organizationId, clientId } = req.query;
    const filter = {};
    if (organizationId) filter.organizationId = organizationId;
    if (clientId) filter.clientId = clientId;
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
    const setting = new ClientSetting({
      organizationId,
      clientId,
      settingKey,
      settingValue,
      description,
      createdBy: req.session.username || req.user?.username
    });
    await setting.save();
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
    const setting = await ClientSetting.findByIdAndUpdate(
      id,
      { settingValue, description, updatedBy: req.session.username || req.user?.username, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    res.json(setting);
  } catch (error) {
    logger.error('Error updating client setting:', error);
    res.status(500).json({ error: 'Failed to update client setting' });
  }
};

exports.deleteClientSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const setting = await ClientSetting.findByIdAndDelete(id);
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    logger.error('Error deleting client setting:', error);
    res.status(500).json({ error: 'Failed to delete client setting' });
  }
};

exports.listUserSettings = async (req, res) => {
  try {
    const { organizationId, userId } = req.query;
    const filter = {};
    if (organizationId) filter.organizationId = organizationId;
    if (userId) filter.userId = userId;
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
    const setting = new UserSetting({
      organizationId,
      userId,
      settingKey,
      settingValue,
      description,
      createdBy: req.session.username || req.user?.username
    });
    await setting.save();
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
    const setting = await UserSetting.findByIdAndUpdate(
      id,
      { settingValue, description, updatedBy: req.session.username || req.user?.username, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    res.json(setting);
  } catch (error) {
    logger.error('Error updating user setting:', error);
    res.status(500).json({ error: 'Failed to update user setting' });
  }
};

exports.deleteUserSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const setting = await UserSetting.findByIdAndDelete(id);
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    logger.error('Error deleting user setting:', error);
    res.status(500).json({ error: 'Failed to delete user setting' });
  }
};

exports.listDynamicSettings = async (req, res) => {
  try {
    const { organizationId, uniqueId } = req.query;
    const filter = {};
    if (organizationId) filter.organizationId = organizationId;
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
    const setting = new DynamicSetting({
      organizationId,
      uniqueId,
      settingKey,
      settingValue,
      description,
      createdBy: req.session.username || req.user?.username
    });
    await setting.save();
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
    const setting = await DynamicSetting.findByIdAndUpdate(
      id,
      { settingValue, description, updatedBy: req.session.username || req.user?.username, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    res.json(setting);
  } catch (error) {
    logger.error('Error updating dynamic setting:', error);
    res.status(500).json({ error: 'Failed to update dynamic setting' });
  }
};

exports.deleteDynamicSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const setting = await DynamicSetting.findByIdAndDelete(id);
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    logger.error('Error deleting dynamic setting:', error);
    res.status(500).json({ error: 'Failed to delete dynamic setting' });
  }
};
