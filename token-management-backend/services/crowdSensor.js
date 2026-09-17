const { client, TOPICS } = require('../config/mqtt');

const LEVELS = ['LOW', 'MEDIUM', 'HIGH'];
const PUBLISH_INTERVAL_MS = 15000; // every 15 seconds, for demo purposes

function startCrowdSensor() {
  setInterval(() => {
    const level = LEVELS[Math.floor(Math.random() * LEVELS.length)];
    client.publish(TOPICS.CROWD_LEVEL, JSON.stringify({ level, timestamp: new Date() }));
    console.log(`[Crowd Sensor] Published level: ${level}`);
  }, PUBLISH_INTERVAL_MS);
}

module.exports = { startCrowdSensor };