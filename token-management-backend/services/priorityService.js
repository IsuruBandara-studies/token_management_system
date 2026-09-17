const LOYALTY_WEIGHTS = {
  Gold: 15,
  Silver: 8,
  Regular: 0
};

const MAX_DURATION_ASSUMPTION = 30; // minutes, used to invert duration scoring

/**
 * Calculates a priority score for a token.
 * @param {Object} token - must have populated `customer` and `service`
 * @param {String} crowdLevel - 'LOW' | 'MEDIUM' | 'HIGH'
 */
function calculatePriority(token, crowdLevel = 'LOW') {
  const now = Date.now();
  const arrivalTime = new Date(token.arrivalTime).getTime();
  const waitMinutes = (now - arrivalTime) / 60000;

  const loyaltyScore = LOYALTY_WEIGHTS[token.customer.loyaltyLevel] || 0;

  const durationScore = Math.max(
    0,
    MAX_DURATION_ASSUMPTION - token.service.estimatedDuration
  );

  // When crowd is HIGH, favor quick jobs more strongly to clear the backlog
  const crowdMultiplier = crowdLevel === 'HIGH' ? 1.8 : 1;

  const score =
    waitMinutes * 1.0 +          // fairness: grows every minute
    loyaltyScore +                // loyalty head start
    durationScore * crowdMultiplier; // efficiency, boosted under crowd pressure

  return Math.round(score * 100) / 100; // round to 2 decimals
}

module.exports = { calculatePriority, LOYALTY_WEIGHTS, MAX_DURATION_ASSUMPTION };