const Token = require('../models/Token');
const Customer = require('../models/Customer');
const Service = require('../models/Service');
const Counter = require('../models/Counter');
const { calculatePriority } = require('../services/priorityService');
const { client, TOPICS } = require('../config/mqtt');
const { onTopic } = require('../config/mqtt');

onTopic(TOPICS.CROWD_LEVEL, (payload) => {
  currentCrowdLevel = payload.level;
  console.log(`[Token Controller] Crowd level updated to ${payload.level}`);
});

// Keep track of the latest crowd level in memory (published by the crowd sensor)
let currentCrowdLevel = 'LOW';
function setCrowdLevel(level) {
  currentCrowdLevel = level;
}

// --- Create a new token (customer joins the queue) ---
exports.createToken = async (req, res) => {
  try {
    const { phoneNumber, name, serviceId } = req.body;

    // Find or create the customer
    let customer = await Customer.findOne({ phoneNumber });
    if (!customer) {
      customer = await Customer.create({ phoneNumber, name });
    }

    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ error: 'Service not found' });

    // Generate the next token number (simple incrementing count for today)
    const tokenCount = await Token.countDocuments();
    const tokenNumber = tokenCount + 1;

    const token = await Token.create({
      tokenNumber,
      customer: customer._id,
      service: service._id
    });

    const populatedToken = await Token.findById(token._id)
      .populate('customer')
      .populate('service');

    // Publish MQTT event
    client.publish(TOPICS.TOKEN_NEW, JSON.stringify({
      tokenId: populatedToken._id,
      tokenNumber: populatedToken.tokenNumber,
      customer: populatedToken.customer.name,
      service: populatedToken.service.name
    }));

    res.status(201).json(populatedToken);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// --- Get the live queue: waiting (sorted by priority) + called (with assigned counter) ---
exports.getQueue = async (req, res) => {
  try {
    const tokens = await Token.find({ status: { $in: ['waiting', 'called'] } })
      .populate('customer')
      .populate('service')
      .populate('counter');

    const waiting = tokens.filter((t) => t.status === 'waiting');
    const called = tokens.filter((t) => t.status === 'called');

    const scoredWaiting = waiting.map((token) => ({
      ...token.toObject(),
      priorityScore: calculatePriority(token, currentCrowdLevel)
    }));
    scoredWaiting.sort((a, b) => b.priorityScore - a.priorityScore);

    const calledSorted = called
      .map((token) => token.toObject())
      .sort((a, b) => new Date(a.calledAt) - new Date(b.calledAt));

    // Called tokens shown first (customer needs to go to their counter NOW),
    // then waiting tokens in priority order
    const queue = [...calledSorted, ...scoredWaiting];

    res.json({ crowdLevel: currentCrowdLevel, queue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- Call the next customer to a specific counter ---
exports.callNext = async (req, res) => {
  try {
    const { counterId } = req.body;

    const counter = await Counter.findById(counterId);
    if (!counter) return res.status(404).json({ error: 'Counter not found' });

    const waitingTokens = await Token.find({ status: 'waiting' })
      .populate('customer')
      .populate('service');

    if (waitingTokens.length === 0) {
      return res.status(200).json({ message: 'Queue is empty' });
    }

    // Recompute priority and pick the highest
    const scored = waitingTokens.map((token) => ({
      token,
      priorityScore: calculatePriority(token, currentCrowdLevel)
    }));
    scored.sort((a, b) => b.priorityScore - a.priorityScore);

    const next = scored[0].token;

    next.status = 'called';
    next.calledAt = new Date();
    next.priorityScore = scored[0].priorityScore;
    next.counter = counter._id;
    await next.save();

    counter.status = 'busy';
    counter.currentToken = next._id;
    counter.lastActivityAt = new Date();
    await counter.save();

    client.publish(TOPICS.TOKEN_CALL, JSON.stringify({
      tokenId: next._id,
      tokenNumber: next.tokenNumber,
      customer: next.customer.name,
      counter: counter.counterNumber
    }));

    res.json(next);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// --- Mark a token's service as complete ---
exports.completeToken = async (req, res) => {
  try {
    const { tokenId } = req.body;

    const token = await Token.findById(tokenId);
    if (!token) return res.status(404).json({ error: 'Token not found' });

    token.status = 'completed';
    token.completedAt = new Date();
    await token.save();

    if (token.counter) {
      const counter = await Counter.findById(token.counter);
      if (counter) {
        counter.status = 'idle';
        counter.currentToken = null;
        counter.lastActivityAt = new Date();
        await counter.save();
      }
    }

    // Bump customer's visit count
    await Customer.findByIdAndUpdate(token.customer, { $inc: { visitCount: 1 } });

    client.publish(TOPICS.TOKEN_COMPLETE, JSON.stringify({
      tokenId: token._id,
      tokenNumber: token.tokenNumber
    }));

    res.json(token);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.setCrowdLevel = setCrowdLevel;
exports.getCrowdLevel = () => currentCrowdLevel;