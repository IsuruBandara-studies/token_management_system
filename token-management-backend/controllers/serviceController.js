const Service = require('../models/Service');

// Create a new service type (e.g. "Bill Payment", 3 min)
exports.createService = async (req, res) => {
  try {
    const { name, estimatedDuration, description } = req.body;
    const service = await Service.create({ name, estimatedDuration, description });
    res.status(201).json(service);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all services
exports.getServices = async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a service
exports.updateService = async (req, res) => {
  try {
    const { name, estimatedDuration, description } = req.body;
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { name, estimatedDuration, description },
      { new: true, runValidators: true }
    );
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json(service);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete a service
exports.deleteService = async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json({ message: 'Service deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};