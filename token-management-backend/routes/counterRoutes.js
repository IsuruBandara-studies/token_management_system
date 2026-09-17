const express = require('express');
const router = express.Router();
const { createCounter, getCounters } = require('../controllers/counterController');

router.post('/', createCounter);
router.get('/', getCounters);

module.exports = router;    