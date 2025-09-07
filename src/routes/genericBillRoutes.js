const express = require('express');
const router = express.Router();
const { generateGenericBill } = require('../controllers/genericBillController');

// Generic billing routes
router.post('/generate-bill', generateGenericBill);

module.exports = router;
