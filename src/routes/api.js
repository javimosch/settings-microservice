const express = require('express');
const router = express.Router();
const { dynamicAuthMiddleware } = require('../middleware/dynamicAuth');
const apiController = require('../controllers/apiController');

router.use(dynamicAuthMiddleware);

// Global Settings - Cascade resolution
router.get('/global-settings/:settingKey', apiController.getSetting);
router.post('/global-settings', apiController.createOrUpdateGlobalSetting);

// Client Settings
router.get('/client-settings/:clientId/:settingKey', apiController.getClientSetting);

// User Settings
router.get('/user-settings/:userId/:settingKey', apiController.getUserSetting);

// Dynamic Settings
router.get('/dynamic-settings/:uniqueId/:settingKey', apiController.getDynamicSetting);

// ========== FULL CRUD OPERATIONS ==========

// Global Settings CRUD
router.get('/settings/global', apiController.listGlobalSettings);
router.get('/settings/global/:id', apiController.getGlobalSettingById);
router.post('/settings/global', apiController.createOrUpdateGlobalSetting);
router.put('/settings/global/:id', apiController.updateGlobalSetting);
router.delete('/settings/global/:id', apiController.deleteGlobalSetting);

// Client Settings CRUD
router.get('/settings/client', apiController.listClientSettings);
router.get('/settings/client/:id', apiController.getClientSettingById);
router.post('/settings/client', apiController.createClientSetting);
router.put('/settings/client/:id', apiController.updateClientSetting);
router.delete('/settings/client/:id', apiController.deleteClientSetting);

// User Settings CRUD
router.get('/settings/user', apiController.listUserSettings);
router.get('/settings/user/:id', apiController.getUserSettingById);
router.post('/settings/user', apiController.createUserSetting);
router.put('/settings/user/:id', apiController.updateUserSetting);
router.delete('/settings/user/:id', apiController.deleteUserSetting);

// Dynamic Settings CRUD
router.get('/settings/dynamic', apiController.listDynamicSettings);
router.get('/settings/dynamic/:id', apiController.getDynamicSettingById);
router.post('/settings/dynamic', apiController.createDynamicSetting);
router.put('/settings/dynamic/:id', apiController.updateDynamicSetting);
router.delete('/settings/dynamic/:id', apiController.deleteDynamicSetting);

module.exports = router;
