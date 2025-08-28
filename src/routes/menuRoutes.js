const express = require('express');
const router = express.Router();

const {
  createMenuItem,
  bulkCreateMenuItems,
  listMenuItems,
  getMenuItem,
  updateMenuItem,
  patchMenuItem,
  deleteMenuItem,
  getCategories
} = require('../controllers/menuController');

// List and categories
router.get('/', listMenuItems);
router.get('/categories', getCategories);

// Create
router.post('/', createMenuItem);
router.post('/bulk', bulkCreateMenuItems);

// Item by id
router.get('/:id', getMenuItem);
router.put('/:id', updateMenuItem);
router.patch('/:id', patchMenuItem);
router.delete('/:id', deleteMenuItem);

module.exports = router;


