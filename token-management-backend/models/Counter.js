const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  counterNumber: {
    type: Number,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['idle', 'busy', 'offline'],
    default: 'idle'
  },
  currentToken: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Token',
    default: null
  },
  lastActivityAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Counter', counterSchema);