const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { client, TOPICS } = require('../config/mqtt');

// --- Config (override via .env) ---
const SERIAL_PORT = process.env.SERIAL_PORT || 'COM3';   // Windows COM port the Uno enumerates as
const BAUD_RATE = Number(process.env.SERIAL_BAUD) || 9600; // must match Serial.begin() in the sketch
const SEAT_COUNTER_NUMBER = Number(process.env.SEAT_COUNTER_NUMBER) || 1; // which physical counter this seat is
const RECONNECT_INTERVAL_MS = 5000; // retry opening the port if the Uno is unplugged / IDE holds it

// Lines we expect from the Arduino sketch (edge-detected, one per state change)
const MSG_EMPTY = 'SEAT_EMPTY';
const MSG_OCCUPIED = 'SEAT_OCCUPIED';

let port = null;
let reconnectTimer = null;

function publishSeatStatus(state) {
  const payload = {
    counterNumber: SEAT_COUNTER_NUMBER,
    state, // 'empty' | 'occupied'
    timestamp: new Date()
  };
  client.publish(TOPICS.SEAT_STATUS, JSON.stringify(payload));
  console.log(`[Serial Bridge] Seat ${state.toUpperCase()} -> published to ${TOPICS.SEAT_STATUS} (counter ${SEAT_COUNTER_NUMBER})`);
}

function handleLine(rawLine) {
  const line = rawLine.trim();
  if (!line) return;

  if (line === MSG_EMPTY) {
    publishSeatStatus('empty');
  } else if (line === MSG_OCCUPIED) {
    publishSeatStatus('occupied');
  } else {
    // Any other output (e.g. debug distance prints) is ignored but logged at low volume
    // console.log(`[Serial Bridge] (ignored) ${line}`);
  }
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
    console.log(`[Serial Bridge] Connected to Arduino on ${SERIAL_PORT} @ ${BAUD_RATE} baud (seat -> counter ${SEAT_COUNTER_NUMBER})`);
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
  console.log(`[Serial Bridge] Starting. Expecting "${MSG_EMPTY}" / "${MSG_OCCUPIED}" on ${SERIAL_PORT}.`);
  openPort();
}

module.exports = { startSerialBridge, SEAT_COUNTER_NUMBER };
