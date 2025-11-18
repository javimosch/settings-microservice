const express = require('express');
const router = express.Router();
const { sessionAuth } = require('../middleware/auth');
const orgController = require('../controllers/organizationController');
const settingsController = require('../controllers/settingsController');
const dynamicAuthController = require('../controllers/dynamicAuthController');

router.use(sessionAuth);

router.get('/organizations', orgController.listOrganizations);
router.post('/organizations', orgController.createOrganization);
router.put('/organizations/:id', orgController.updateOrganization);
router.delete('/organizations/:id', orgController.deleteOrganization);

router.get('/global-settings', settingsController.listGlobalSettings);
router.post('/global-settings', settingsController.createGlobalSetting);
router.put('/global-settings/:id', settingsController.updateGlobalSetting);
router.delete('/global-settings/:id', settingsController.deleteGlobalSetting);

router.get('/client-settings', settingsController.listClientSettings);
router.post('/client-settings', settingsController.createClientSetting);
router.put('/client-settings/:id', settingsController.updateClientSetting);
router.delete('/client-settings/:id', settingsController.deleteClientSetting);

router.get('/user-settings', settingsController.listUserSettings);
router.post('/user-settings', settingsController.createUserSetting);
router.put('/user-settings/:id', settingsController.updateUserSetting);
router.delete('/user-settings/:id', settingsController.deleteUserSetting);

router.get('/dynamic-settings', settingsController.listDynamicSettings);
router.post('/dynamic-settings', settingsController.createDynamicSetting);
router.put('/dynamic-settings/:id', settingsController.updateDynamicSetting);
router.delete('/dynamic-settings/:id', settingsController.deleteDynamicSetting);

router.get('/dynamicauth', dynamicAuthController.listDynamicAuth);
router.post('/dynamicauth', dynamicAuthController.createDynamicAuth);
router.put('/dynamicauth/:id', dynamicAuthController.updateDynamicAuth);
router.delete('/dynamicauth/:id', dynamicAuthController.deleteDynamicAuth);
router.post('/dynamicauth/:id/try', dynamicAuthController.tryDynamicAuth);
router.post('/dynamicauth/:id/invalidate-cache', dynamicAuthController.invalidateCache);

module.exports = router;
