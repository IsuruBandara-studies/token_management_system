const Counter = require('../models/Counter');
const Token = require('../models/Token');
const { client, TOPICS } = require('../config/mqtt');
const { callNextForCounter } = require('../controllers/tokenController');

const IDLE_THRESHOLD_MS = 30000; // counter must be idle this long before we act
const CHECK_INTERVAL_MS = 10000; // check every 10 seconds

let running = false; // avoid overlapping runs

// For every counter idle >= 30s while customers are waiting:
//   1. publish a counter/status banner (staff see it on the dashboard)
//   2. automatically assign the highest-priority waiting customer to that counter
function startCounterWatcher() {
  setInterval(async () => {
    if (running) return;
    running = true;

    try {
      // Longest-idle counters first
      const counters = await Counter.find({ status: 'idle' }).sort({ lastActivityAt: 1 });
      const now = Date.now();

      for (const counter of counters) {
        const idleFor = now - new Date(counter.lastActivityAt).getTime();
        if (idleFor < IDLE_THRESHOLD_MS) continue;

        const waitingCount = await Token.countDocuments({ status: 'waiting' });
        if (waitingCount === 0) break; // nobody left to assign

        client.publish(TOPICS.COUNTER_STATUS, JSON.stringify({
          counterId: counter._id,
          counterNumber: counter.counterNumber,
          message: 'Counter idle with customers waiting — assigning next customer automatically',
          idleForSeconds: Math.round(idleFor / 1000)
        }));

        const result = await callNextForCounter(counter);
        if (result.token) {
          console.log(`[Counter Watcher] Counter ${counter.counterNumber} idle ${Math.round(idleFor / 1000)}s — auto-assigned token #${result.token.tokenNumber}`);
        }
      }
    } catch (err) {
      console.error('[Counter Watcher] Error:', err.message);
    } finally {
      running = false;
    }
  }, CHECK_INTERVAL_MS);
}

module.exports = { startCounterWatcher };
