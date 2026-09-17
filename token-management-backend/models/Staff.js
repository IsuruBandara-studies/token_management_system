const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  name: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('Staff', staffSchema);