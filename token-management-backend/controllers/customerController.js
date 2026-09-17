const Customer = require('../models/Customer');

// Find existing customer by phone, or create a new one
exports.findOrCreateCustomer = async (req, res) => {
  try {
    const { phoneNumber, name } = req.body;

    let customer = await Customer.findOne({ phoneNumber });

    if (!customer) {
      customer = await Customer.create({ phoneNumber, name });
    }

    res.status(200).json(customer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all customers
exports.getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};