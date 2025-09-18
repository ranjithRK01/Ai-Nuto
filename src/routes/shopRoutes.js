const express = require('express');
const router = express.Router();
const { shopRegister , shopList} = require('../controllers/shopController');

router.post('/resgister', shopRegister);
router.get('/shop-list', shopList);

module.exports = router;
