require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const { client: mqttClient } = require('./config/mqtt'); // initializes MQTT connection

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

app.use('/api/services', require('./routes/serviceRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/tokens', require('./routes/tokenRoutes'));
app.use('/api/counters', require('./routes/counterRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));

// Basic health check route
app.get('/', (req, res) => {
  res.json({ status: 'Token Management API running' });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Forward every MQTT event straight to all connected browser clients
const { onTopic, TOPICS } = require('./config/mqtt');

Object.entries(TOPICS).forEach(([key, topic]) => {
  onTopic(topic, (payload) => {
    io.emit(topic, payload); // broadcast to all connected frontend clients
  });
});

// --- IoT seat sensor: on seat empty, auto-complete current token + auto-call next (Option B) ---
const Counter = require('./models/Counter');
const {
  completeTokenById,
  callNextForCounter
} = require('./controllers/tokenController');

// Prevent overlapping handling if the sensor fires rapidly
let handlingSeatEvent = false;

onTopic(TOPICS.SEAT_STATUS, async (payload) => {
  // We only act when the seat becomes empty; 'occupied' is informational (UI only)
  if (!payload || payload.state !== 'empty') return;
  if (handlingSeatEvent) {
    console.log('[Seat Handler] Already handling a seat event, skipping duplicate.');
    return;
  }
  handlingSeatEvent = true;

  try {
    const counter = await Counter.findOne({ counterNumber: payload.counterNumber });
    if (!counter) {
      console.warn(`[Seat Handler] No counter found for counterNumber ${payload.counterNumber}. Ignoring.`);
      return;
    }

    // 1. Complete whoever was being served at this counter (if anyone)
    if (counter.currentToken) {
      const completed = await completeTokenById(counter.currentToken);
      if (completed.token) {
        console.log(`[Seat Handler] Auto-completed token #${completed.token.tokenNumber} at counter ${counter.counterNumber}`);
      }
    }

    // 2. Auto-call the next highest-priority customer to this now-free counter
    const fresh = await Counter.findById(counter._id); // reload: completeTokenById set it idle
    const result = await callNextForCounter(fresh);
    if (result.token) {
      console.log(`[Seat Handler] Auto-called token #${result.token.tokenNumber} to counter ${counter.counterNumber}`);
    } else {
      console.log(`[Seat Handler] Counter ${counter.counterNumber} free but queue is empty.`);
    }
  } catch (err) {
    console.error('[Seat Handler] Error:', err.message);
  } finally {
    handlingSeatEvent = false;
  }
});

const PORT = process.env.PORT || 5000;

const { startCrowdSensor } = require('./services/crowdSensor');
const { startCounterWatcher } = require('./services/counterWatcher');
const { startSerialBridge } = require('./services/serialBridge');

startCrowdSensor();
startCounterWatcher();
startSerialBridge();

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});