import { io } from 'socket.io-client';

// Single shared connection — every page imports this same instance
export const socket = io('http://localhost:5000');

// Topic names — must match backend config/mqtt.js exactly
export const TOPICS = {
  TOKEN_NEW: 'token/new',
  TOKEN_CALL: 'token/call',
  TOKEN_COMPLETE: 'token/complete',
  CROWD_EVENT: 'crowd/event',
  CROWD_LEVEL: 'crowd/level',
  COUNTER_STATUS: 'counter/status'
};
