const express = require('express');
const router = express.Router();
const {
  generateBillFromVoice,
  getAllBills,
  getBillById,
  getAllMenuItems,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
} = require('../controllers/billController');

// Bill generation routes
router.post('/generate-bill', generateBillFromVoice);
router.get('/bills', getAllBills);
router.get('/bills/:id', getBillById);

// Menu management routes
router.get('/menu', getAllMenuItems);
router.post('/menu', addMenuItem);
router.put('/menu/:id', updateMenuItem);
router.delete('/menu/:id', deleteMenuItem);

module.exports = router;
