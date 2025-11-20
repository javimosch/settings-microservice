const express = require('express');
const router = express.Router();
const { sessionAuth, requireAdmin } = require('../middleware/auth');
const { requireFeature } = require('../middleware/permissions');
const orgController = require('../controllers/organizationController');
const settingsController = require('../controllers/settingsController');
const dynamicAuthController = require('../controllers/dynamicAuthController');
const auditController = require('../controllers/auditController');

router.use(sessionAuth);

router.get('/organizations', requireFeature('organizations', 'read'), orgController.listOrganizations);
router.post('/organizations', requireFeature('organizations', 'write'), orgController.createOrganization);
router.put('/organizations/:id', requireFeature('organizations', 'write'), orgController.updateOrganization);
router.delete('/organizations/:id', requireFeature('organizations', 'write'), orgController.deleteOrganization);

router.get('/global-settings', requireFeature('globalSettings', 'read'), settingsController.listGlobalSettings);
router.post('/global-settings', requireFeature('globalSettings', 'write'), settingsController.createGlobalSetting);
router.put('/global-settings/:id', requireFeature('globalSettings', 'write'), settingsController.updateGlobalSetting);
router.delete('/global-settings/:id', requireFeature('globalSettings', 'write'), settingsController.deleteGlobalSetting);

router.get('/client-settings', requireFeature('clientSettings', 'read'), settingsController.listClientSettings);
router.post('/client-settings', requireFeature('clientSettings', 'write'), settingsController.createClientSetting);
router.put('/client-settings/:id', requireFeature('clientSettings', 'write'), settingsController.updateClientSetting);
router.delete('/client-settings/:id', requireFeature('clientSettings', 'write'), settingsController.deleteClientSetting);

router.get('/user-settings', requireFeature('userSettings', 'read'), settingsController.listUserSettings);
router.post('/user-settings', requireFeature('userSettings', 'write'), settingsController.createUserSetting);
router.put('/user-settings/:id', requireFeature('userSettings', 'write'), settingsController.updateUserSetting);
router.delete('/user-settings/:id', requireFeature('userSettings', 'write'), settingsController.deleteUserSetting);

router.get('/dynamic-settings', requireFeature('dynamicSettings', 'read'), settingsController.listDynamicSettings);
router.post('/dynamic-settings', requireFeature('dynamicSettings', 'write'), settingsController.createDynamicSetting);
router.put('/dynamic-settings/:id', requireFeature('dynamicSettings', 'write'), settingsController.updateDynamicSetting);
router.delete('/dynamic-settings/:id', requireFeature('dynamicSettings', 'write'), settingsController.deleteDynamicSetting);

router.get('/dynamicauth', requireFeature('dynamicAuth', 'read'), dynamicAuthController.listDynamicAuth);
router.post('/dynamicauth', requireFeature('dynamicAuth', 'write'), dynamicAuthController.createDynamicAuth);
router.put('/dynamicauth/:id', requireFeature('dynamicAuth', 'write'), dynamicAuthController.updateDynamicAuth);
router.delete('/dynamicauth/:id', requireFeature('dynamicAuth', 'write'), dynamicAuthController.deleteDynamicAuth);
router.post('/dynamicauth/:id/try', requireFeature('dynamicAuth', 'read'), dynamicAuthController.tryDynamicAuth);
router.post('/dynamicauth/:id/invalidate-cache', requireFeature('dynamicAuth', 'write'), dynamicAuthController.invalidateCache);

router.get('/audit', requireAdmin, auditController.listAuditEvents);

module.exports = router;
