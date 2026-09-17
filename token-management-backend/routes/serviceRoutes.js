const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const {
  createService,
  getServices,
  updateService,
  deleteService
} = require('../controllers/serviceController');

router.get('/', getServices);              // public — customer portal needs the list
router.post('/', requireAuth, createService);
router.put('/:id', requireAuth, updateService);
router.delete('/:id', requireAuth, deleteService);

module.exports = router;