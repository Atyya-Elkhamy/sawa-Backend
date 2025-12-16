const pricingService = require('../services/pricing.service');

// Static fallback configurations (used when database is not available)
const fallbackPricingConfig = {
  1: 1000, // 1 month for 1000
  2: 1800, // 2 months for 1800
  3: 2500, // 3 months for 2500
};

const fallbackVipPricingConfig = {
  1: {
    7: 150, // 7 days for 150
    15: 250, // 15 days for 250
    30: 400, // 1 month for 400
  },
  2: {
    7: 350, // 7 days for 350
    15: 600, // 15 days for 600
    30: 1000, // 1 month for 1000
  },
  3: {
    7: 500, // 7 days for 500
    15: 900, // 15 days for 900
    30: 1500, // 1 month for 1500
  },
  4: {
    7: 700, // 7 days for 700
    15: 1200, // 15 days for 1200
    30: 2000, // 1 month for 2000
  },
  5: {
    7: 1000, // 7 days for 1000
    15: 1800, // 15 days for 1800
    30: 2500, // 1 month for 2500
  },
  6: {
    7: 1500, // 7 days for 1500
    15: 2500, // 15 days for 2500
    30: 4000, // 1 month for 4000
  },
  7: {
    7: 2000, // 7 days for 2000
    15: 3500, // 15 days for 3500
    30: 5000, // 1 month for 5000
  },
};

// fallback vip levels
const fallbackVipLevels = [1, 2, 3, 4, 5, 6, 7];

/**
 * Get dynamic pricing configuration from database
 * Falls back to static config if database is unavailable
 * @returns {Promise<Object>} Pricing configuration
 */
const getPricingConfig = async () => {
  try {
    return await pricingService.getPricingConfig();
  } catch (error) {
    console.warn('Using fallback pricing configuration:', error.message);
    return {
      pricingConfig: fallbackPricingConfig,
      vipPricingConfig: fallbackVipPricingConfig,
      vipLevels: fallbackVipLevels,
    };
  }
};

/**
 * Get pro subscription pricing
 * @returns {Promise<Object>} Pro pricing config
 */
const getProPricing = async () => {
  try {
    return await pricingService.getProPricingConfig();
  } catch (error) {
    console.warn('Using fallback pro pricing configuration:', error.message);
    return fallbackPricingConfig;
  }
};

/**
 * Get VIP subscription pricing
 * @returns {Promise<Object>} VIP pricing config
 */
const getVipPricing = async () => {
  try {
    return await pricingService.getVipPricingConfig();
  } catch (error) {
    console.warn('Using fallback VIP pricing configuration:', error.message);
    return fallbackVipPricingConfig;
  }
};

/**
 * Get available VIP levels
 * @returns {Promise<Array>} VIP levels array
 */
const getVipLevels = async () => {
  try {
    return await pricingService.getVipLevels();
  } catch (error) {
    console.warn('Using fallback VIP levels:', error.message);
    return fallbackVipLevels;
  }
};

// Legacy exports for backward compatibility (synchronous)
// These should be gradually replaced with async versions
const pricingConfig = fallbackPricingConfig;
const vipPricingConfig = fallbackVipPricingConfig;
const vipLevels = fallbackVipLevels;

module.exports = { 
  // Legacy synchronous exports (for backward compatibility)
  pricingConfig, 
  vipPricingConfig, 
  vipLevels,
  
  // New async exports (recommended)
  getPricingConfig,
  getProPricing,
  getVipPricing,
  getVipLevels,
  
  // Fallback configurations
  fallbackPricingConfig,
  fallbackVipPricingConfig,
  fallbackVipLevels,
};
