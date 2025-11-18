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

    let settingValue = null;

    if (userId) {
      const userSetting = await UserSetting.findOne({ organizationId, userId, settingKey });
      if (userSetting) {
        return res.json({ source: 'user', value: userSetting.settingValue, setting: userSetting });
      }
    }

    if (clientId) {
      const clientSetting = await ClientSetting.findOne({ organizationId, clientId, settingKey });
      if (clientSetting) {
        return res.json({ source: 'client', value: clientSetting.settingValue, setting: clientSetting });
      }
    }

    const globalSetting = await GlobalSetting.findOne({ organizationId, settingKey });
    if (globalSetting) {
      return res.json({ source: 'global', value: globalSetting.settingValue, setting: globalSetting });
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

exports.getUserSetting = async (req, res) => {
  try {
    const { userId, settingKey } = req.params;
    const organizationId = req.organizationId;

    const setting = await UserSetting.findOne({ organizationId, userId, settingKey });
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ value: setting.settingValue, setting });
  } catch (error) {
    logger.error('Error getting user setting:', error);
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
