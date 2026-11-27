const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { publishEvent } = require('./crowdCounter');

// --- Config (override via .env) ---
const SERIAL_PORT = process.env.SERIAL_PORT || 'COM3';   // Windows COM port the Uno enumerates as
const BAUD_RATE = Number(process.env.SERIAL_BAUD) || 9600; // must match Serial.begin() in the sketch
const RECONNECT_INTERVAL_MS = 5000; // retry opening the port if the Uno is unplugged / IDE holds it

// Line emitted by the Arduino sketch once per person detected at the entrance
const MSG_PERSON_IN = 'PERSON_IN';

let port = null;
let reconnectTimer = null;

function handleLine(rawLine) {
  const line = rawLine.trim();
  if (!line) return;

  if (line === MSG_PERSON_IN) {
    publishEvent('IN', 'sensor');
    console.log('[Serial Bridge] PERSON_IN -> published IN event to crowd/event');
  }
  // Any other output is ignored
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    openPort();
  }, RECONNECT_INTERVAL_MS);
}

function openPort() {
  port = new SerialPort({ path: SERIAL_PORT, baudRate: BAUD_RATE }, (err) => {
    if (err) {
      console.warn(`[Serial Bridge] Could not open ${SERIAL_PORT}: ${err.message}. Retrying in ${RECONNECT_INTERVAL_MS / 1000}s...`);
      scheduleReconnect();
    }
  });

  const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
  parser.on('data', handleLine);

  port.on('open', () => {
    console.log(`[Serial Bridge] Connected to Arduino on ${SERIAL_PORT} @ ${BAUD_RATE} baud`);
  });

  port.on('error', (err) => {
    console.warn(`[Serial Bridge] Serial error: ${err.message}`);
  });

  port.on('close', () => {
    console.warn(`[Serial Bridge] Port ${SERIAL_PORT} closed. Attempting to reconnect...`);
    scheduleReconnect();
  });
}

function startSerialBridge() {
  console.log(`[Serial Bridge] Starting. Expecting "${MSG_PERSON_IN}" on ${SERIAL_PORT}.`);
  openPort();
}

module.exports = { startSerialBridge };
