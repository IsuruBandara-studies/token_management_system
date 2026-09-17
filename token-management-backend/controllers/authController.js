const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Staff = require('../models/Staff');

// Register a new staff account
exports.registerStaff = async (req, res) => {
  try {
    const { username, password, name } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const existing = await Staff.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: 'Username already taken.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const staff = await Staff.create({ username, passwordHash, name });

    res.status(201).json({ id: staff._id, username: staff.username, name: staff.name });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Login
exports.loginStaff = async (req, res) => {
  try {
    const { username, password } = req.body;

    const staff = await Staff.findOne({ username });
    if (!staff) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const isMatch = await bcrypt.compare(password, staff.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      { id: staff._id, username: staff.username },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, staff: { id: staff._id, username: staff.username, name: staff.name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};