const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const Token = require('../models/Token');
const { getState, reset } = require('../services/crowdCounter');

// Sensor state plus how many of the people inside hold an active token.
// Active token = waiting or being served (called). It is an estimate: companions
// share one token, and customers who leave without service stay active until
// staff mark them no-show.
async function buildCrowdSummary() {
  const state = getState();
  const [waiting, called] = await Promise.all([
    Token.countDocuments({ status: 'waiting' }),
    Token.countDocuments({ status: 'called' })
  ]);

  const activeTokens = waiting + called;
  const withToken = Math.min(state.occupancy, activeTokens);

  return {
    ...state,
    waiting,
    called,
    activeTokens,
    withToken,
    withoutToken: state.occupancy - withToken,
    // active tokens beyond the people counted inside: sensor undercount or remote tokens
    unmatchedTokens: Math.max(0, activeTokens - state.occupancy)
  };
}

router.get('/', requireAuth, async (req, res) => {           // staff only
  try {
    res.json(await buildCrowdSummary());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reset', requireAuth, async (req, res) => {      // staff only — zero the counters
  try {
    reset();
    res.json(await buildCrowdSummary());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
