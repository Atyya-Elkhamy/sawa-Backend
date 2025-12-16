// const { calculateMonthlyLeaderboard } = require('../../src/services/agencies/hostAgency.service');
const logger = require('../../src/config/logger');

try {
  logger.info('Starting daily leaderboard calculation...');
  // calculateMonthlyLeaderboard();
  logger.info('Daily leaderboard calculation completed.');
} catch (error) {
  logger.error('Error calculating daily leaderboard:', error);
}
