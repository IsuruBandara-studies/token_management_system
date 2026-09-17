const mqtt = require('mqtt');

const client = mqtt.connect(process.env.MQTT_BROKER_URL);

const TOPICS = {
  TOKEN_NEW: 'token/new',
  TOKEN_CALL: 'token/call',
  TOKEN_COMPLETE: 'token/complete',
  CROWD_LEVEL: 'crowd/level',
  COUNTER_STATUS: 'counter/status',
  SEAT_STATUS: 'seat/status'
};

// Handlers get registered from other files (avoids circular imports)
const messageHandlers = {};

function onTopic(topic, handler) {
  messageHandlers[topic] = handler;
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
  const handler = messageHandlers[topic];
  if (handler) {
    try {
      const payload = JSON.parse(message.toString());
      handler(payload);
    } catch (err) {
      console.error(`Error handling message on ${topic}:`, err.message);
    }
  }
});

client.on('error', (err) => {
  console.error('MQTT connection error:', err.message);
});

module.exports = { client, TOPICS, onTopic };