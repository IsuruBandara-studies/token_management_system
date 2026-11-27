const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const {
  createToken,
  getQueue,
  callNext,
  completeToken,
  markNoShow
} = require('../controllers/tokenController');

router.post('/', createToken);       // public — customers create their own tokens
router.get('/queue', getQueue);      // public — queue display needs this
router.post('/call-next', requireAuth, callNext);       // staff only
router.post('/complete', requireAuth, completeToken);    // staff only
router.post('/no-show', requireAuth, markNoShow);        // staff only

module.exports = router;