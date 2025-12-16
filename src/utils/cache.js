const { redisClient, getAsync, setAsync, delAsync } = require('../config/redis');

const Cache = {
  client: redisClient,
  get: async (key) => {
    try {
      const value = await getAsync(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error getting cache for key ${key}:`, error);
      return null;
    }
  },

  set: async (key, value, ttl = 300) => {
    try {
      await setAsync(key, JSON.stringify(value), {
        EX: ttl,
      });
    } catch (error) {
      console.error(`Error setting cache for key ${key}:`, error);
    }
  },

  del: async (key) => {
    try {
      await delAsync(key);
    } catch (error) {
      console.error(`Error deleting cache for key ${key}:`, error);
    }
  },
};

module.exports = Cache;
