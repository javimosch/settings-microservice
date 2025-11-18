const express = require('express');
const router = express.Router();
const { dynamicAuthMiddleware } = require('../middleware/dynamicAuth');
const apiController = require('../controllers/apiController');

router.use(dynamicAuthMiddleware);

router.get('/global-settings/:settingKey', apiController.getSetting);
router.post('/global-settings', apiController.createOrUpdateGlobalSetting);

router.get('/client-settings/:clientId/:settingKey', apiController.getClientSetting);

router.get('/user-settings/:userId/:settingKey', apiController.getUserSetting);

router.get('/dynamic-settings/:uniqueId/:settingKey', apiController.getDynamicSetting);

module.exports = router;
