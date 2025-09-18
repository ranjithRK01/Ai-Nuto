const express = require('express');
const router = express.Router();
const { userRegister } = require('../controllers/userController');
const { userList } = require('../controllers/userController');

router.post('/resgister', userRegister);
router.get('/user-list', userList);

module.exports = router;
