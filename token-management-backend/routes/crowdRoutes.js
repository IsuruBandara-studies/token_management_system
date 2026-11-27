const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const { getState, reset } = require('../services/crowdCounter');

router.get('/', (req, res) => res.json(getState()));          // public — display needs it

router.post('/reset', requireAuth, (req, res) => {             // staff only — zero the counters
  reset();
  res.json(getState());
});

module.exports = router;
