const ProSubscription = require('../models/pricing/proSubscription.model');
const VipSubscription = require('../models/pricing/vipSubscription.model');
/**
 * Get pro subscription pricing configuration from database
 * @returns {Promise<Object>} Pro subscription pricing config
 */
const getProPricingConfig = async () => {
  try {
    const subscriptions = await ProSubscription.find({ isActive: true }).sort({ months: 1 });
    
    const config = {};
    subscriptions.forEach(sub => {
      config[sub.months] = sub.price;
    });
    
    return config;
  } catch (error) {
    console.error('Error fetching pro pricing config:', error);
    // Fallback to static config if database fails
    return {
      1: 1000,
      2: 1800,
      3: 2500,
    };
  }
};

/**
 * Get VIP subscription pricing configuration from database
 * @returns {Promise<Object>} VIP subscription pricing config
 */
const getVipPricingConfig = async () => {
  try {
    const subscriptions = await VipSubscription.find({ isActive: true }).sort({ vipLevel: 1, days: 1 });
    
    const config = {};
    subscriptions.forEach(sub => {
      if (!config[sub.vipLevel]) {
        config[sub.vipLevel] = {};
      }
      config[sub.vipLevel][sub.days] = sub.price;
    });
    
    return config;
  } catch (error) {
    console.error('Error fetching VIP pricing config:', error);
    // Fallback to static config if database fails
    return {
      1: {
        7: 150,
        15: 250,
        30: 400,
      },
      2: {
        7: 350,
        15: 600,
        30: 1000,
      },
      3: {
        7: 500,
        15: 900,
        30: 1500,
      },
      4: {
        7: 700,
        15: 1200,
        30: 2000,
      },
      5: {
        7: 1000,
        15: 1800,
        30: 2500,
      },
      6: {
        7: 1500,
        15: 2500,
        30: 4000,
      },
      7: {
        7: 2000,
        15: 3500,
        30: 5000,
      },
    };
  }
};

/**
 * Get available VIP levels from database
 * @returns {Promise<Array>} Array of VIP levels
 */
const getVipLevels = async () => {
  try {
    const levels = await VipSubscription.distinct('vipLevel', { isActive: true });
    return levels.sort((a, b) => a - b);
  } catch (error) {
    console.error('Error fetching VIP levels:', error);
    // Fallback to static levels if database fails
    return [1, 2, 3, 4, 5, 6, 7];
  }
};

/**
 * Get pricing configuration for both pro and VIP subscriptions
 * @returns {Promise<Object>} Complete pricing configuration
 */
const getPricingConfig = async () => {
  const [pricingConfig, vipPricingConfig, vipLevels] = await Promise.all([
    getProPricingConfig(),
    getVipPricingConfig(),
    getVipLevels(),
  ]);

  return {
    pricingConfig,
    vipPricingConfig,
    vipLevels,
  };
};

/**
 * Initialize default pricing data if not exists
 * @returns {Promise<void>}
 */
const initializeDefaultPricing = async () => {
  try {
    // Initialize Pro subscriptions
    const proCount = await ProSubscription.countDocuments();
    if (proCount === 0) {
      const defaultProPlans = [
        { months: 1, price: 1000, description: '1 Month Pro Subscription' },
        { months: 2, price: 1800, description: '2 Months Pro Subscription' },
        { months: 3, price: 2500, description: '3 Months Pro Subscription' },
      ];
      
      await ProSubscription.insertMany(defaultProPlans);
      console.log('Default pro subscription plans created');
    }

    // Initialize VIP subscriptions
    const vipCount = await VipSubscription.countDocuments();
    if (vipCount === 0) {
      const defaultVipPlans = [];
      
      // VIP Level configurations
      const vipConfigs = {
        1: { 7: 150, 15: 250, 30: 400 },
        2: { 7: 350, 15: 600, 30: 1000 },
        3: { 7: 500, 15: 900, 30: 1500 },
        4: { 7: 700, 15: 1200, 30: 2000 },
        5: { 7: 1000, 15: 1800, 30: 2500 },
        6: { 7: 1500, 15: 2500, 30: 4000 },
        7: { 7: 2000, 15: 3500, 30: 5000 },
      };

      for (const [vipLevel, durations] of Object.entries(vipConfigs)) {
        for (const [days, price] of Object.entries(durations)) {
          defaultVipPlans.push({
            vipLevel: parseInt(vipLevel),
            days: parseInt(days),
            price,
            description: `VIP Level ${vipLevel} - ${days} Days`,
          });
        }
      }
      
      await VipSubscription.insertMany(defaultVipPlans);
      console.log('Default VIP subscription plans created');
    }
  } catch (error) {
    console.error('Error initializing default pricing:', error);
  }
};

module.exports = {
  getProPricingConfig,
  getVipPricingConfig,
  getVipLevels,
  getPricingConfig,
  initializeDefaultPricing,
};
