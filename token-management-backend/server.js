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

const PORT = process.env.PORT || 5000;

const { startCrowdSensor } = require('./services/crowdSensor');
const { startCounterWatcher } = require('./services/counterWatcher');

startCrowdSensor();
startCounterWatcher();

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});