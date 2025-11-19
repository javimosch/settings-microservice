const express = require('express');
const router = express.Router();
const { sessionAuth, requireAdmin } = require('../middleware/auth');
const userController = require('../controllers/userController');

router.use(sessionAuth);
router.use(requireAdmin);

router.get('/', userController.renderUserManagement);

router.get('/api', userController.listUsers);
router.post('/api', userController.createUser);
router.get('/api/:id', userController.getUser);
router.put('/api/:id', userController.updateUser);
router.delete('/api/:id', userController.deleteUser);

module.exports = router;
