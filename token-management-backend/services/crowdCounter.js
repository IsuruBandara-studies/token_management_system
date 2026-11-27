const { client, TOPICS, onTopic } = require('../config/mqtt');

// Occupancy thresholds: 0-3 LOW, 4-6 MEDIUM, 7+ HIGH
const MEDIUM_FROM = 4;
const HIGH_FROM = 7;

let totalIn = 0;
let totalOut = 0;

function getOccupancy() {
  return Math.max(0, totalIn - totalOut);
}

function levelFor(occupancy) {
  if (occupancy >= HIGH_FROM) return 'HIGH';
  if (occupancy >= MEDIUM_FROM) return 'MEDIUM';
  return 'LOW';
}

function getState() {
  const occupancy = getOccupancy();
  return {
    level: levelFor(occupancy),
    occupancy,
    totalIn,
    totalOut,
    timestamp: new Date()
  };
}

function publishLevel() {
  const state = getState();
  client.publish(TOPICS.CROWD_LEVEL, JSON.stringify(state));
  console.log(`[Crowd Counter] in=${state.totalIn} out=${state.totalOut} occupancy=${state.occupancy} level=${state.level}`);
}

// Publish a raw IN/OUT event onto the MQTT bus (sensor bridge and token flow use this)
function publishEvent(type, source) {
  client.publish(TOPICS.CROWD_EVENT, JSON.stringify({ type, source, timestamp: new Date() }));
}

// Zero the counters (e.g. start of day, or to correct sensor drift)
function reset() {
  totalIn = 0;
  totalOut = 0;
  publishLevel();
}

function startCrowdCounter() {
  onTopic(TOPICS.CROWD_EVENT, (payload) => {
    if (!payload) return;
    if (payload.type === 'IN') {
      totalIn += 1;
    } else if (payload.type === 'OUT') {
      // A customer can't leave if nobody is inside (guards against drift)
      if (getOccupancy() === 0) return;
      totalOut += 1;
    } else {
      return;
    }
    publishLevel();
  });
}

module.exports = {
  startCrowdCounter,
  publishEvent,
  getState,
  reset,
  levelFor
};
