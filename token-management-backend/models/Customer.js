const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    default: ''
  },
  loyaltyLevel: {
    type: String,
    enum: ['Regular', 'Silver', 'Gold'],
    default: 'Regular'
  },
  visitCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);