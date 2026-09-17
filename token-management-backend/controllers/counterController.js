const Counter = require('../models/Counter');

exports.createCounter = async (req, res) => {
  try {
    const { counterNumber } = req.body;
    const counter = await Counter.create({ counterNumber });
    res.status(201).json(counter);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getCounters = async (req, res) => {
  try {
    const counters = await Counter.find();
    res.json(counters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};