const mqtt = require('mqtt');

const client = mqtt.connect(process.env.MQTT_BROKER_URL);

const TOPICS = {
  TOKEN_NEW: 'token/new',
  TOKEN_CALL: 'token/call',
  TOKEN_COMPLETE: 'token/complete',
  CROWD_EVENT: 'crowd/event',   // { type: 'IN' | 'OUT', source }  — raw IN/OUT events
  CROWD_LEVEL: 'crowd/level',   // { level, occupancy, totalIn, totalOut, timestamp } — derived state
  COUNTER_STATUS: 'counter/status'
};

// Several handlers can listen to the same topic (registered from different files)
const messageHandlers = {};

function onTopic(topic, handler) {
  if (!messageHandlers[topic]) messageHandlers[topic] = [];
  messageHandlers[topic].push(handler);
}

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  Object.values(TOPICS).forEach((topic) => {
    client.subscribe(topic, (err) => {
      if (err) console.error(`Failed to subscribe to ${topic}:`, err.message);
    });
  });
});

client.on('message', (topic, message) => {
  const handlers = messageHandlers[topic];
  if (!handlers || handlers.length === 0) return;

  let payload;
  try {
    payload = JSON.parse(message.toString());
  } catch (err) {
    console.error(`Invalid JSON on ${topic}:`, err.message);
    return;
  }

  handlers.forEach((handler) => {
    try {
      handler(payload);
    } catch (err) {
      console.error(`Error handling message on ${topic}:`, err.message);
    }
  });
});

client.on('error', (err) => {
  console.error('MQTT connection error:', err.message);
});

module.exports = { client, TOPICS, onTopic };
