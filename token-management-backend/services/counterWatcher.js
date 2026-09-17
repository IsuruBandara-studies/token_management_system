const Counter = require('../models/Counter');
const Token = require('../models/Token');
const { client, TOPICS } = require('../config/mqtt');

const IDLE_THRESHOLD_MS = 30000; // 30 seconds, per your proposal
const CHECK_INTERVAL_MS = 10000; // check every 10 seconds

const alreadyNotified = new Set(); // counterIds we've already recommended for

function startCounterWatcher() {
  setInterval(async () => {
    try {
      const counters = await Counter.find();
      const now = Date.now();

      for (const counter of counters) {
        const id = counter._id.toString();

        if (counter.status !== 'idle') {
          alreadyNotified.delete(id); // reset once it's busy again
          continue;
        }

        const idleFor = now - new Date(counter.lastActivityAt).getTime();

        if (idleFor >= IDLE_THRESHOLD_MS && !alreadyNotified.has(id)) {
          const waitingCount = await Token.countDocuments({ status: 'waiting' });

          if (waitingCount > 0) {
            client.publish(TOPICS.COUNTER_STATUS, JSON.stringify({
              counterId: counter._id,
              counterNumber: counter.counterNumber,
              message: 'Counter idle with customers waiting — recommend calling next',
              idleForSeconds: Math.round(idleFor / 1000)
            }));
            console.log(`[Counter Watcher] Counter ${counter.counterNumber} idle ${Math.round(idleFor/1000)}s — recommending next customer`);
            alreadyNotified.add(id);
          }
        }
      }
    } catch (err) {
      console.error('[Counter Watcher] Error:', err.message);
    }
  }, CHECK_INTERVAL_MS);
}

module.exports = { startCounterWatcher };