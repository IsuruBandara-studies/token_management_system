const express = require('express');
const router = express.Router();
const { findOrCreateCustomer, getCustomers } = require('../controllers/customerController');

router.post('/', findOrCreateCustomer);
router.get('/', getCustomers);

module.exports = router;