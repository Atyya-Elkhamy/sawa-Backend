const { createClient } = require('redis');
const { promisify } = require('util');
const config = require('./config');
const logger = require('./logger');

// Create a Redis client
const redisClient = createClient({
  password: config.redis.password,
  socket: {
    host: config.redis.host,
    port: config.redis.port,
  },
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error', err);
});

redisClient.on('connect', () => {
  logger.info('Redis client connected successfully');
});

redisClient.on('ready', () => {
  logger.info('Redis client is ready');
});

const hGetAsync = promisify(redisClient.hGet).bind(redisClient);
const hSetAsync = promisify(redisClient.hSet).bind(redisClient);
const hDelAsync = promisify(redisClient.hDel).bind(redisClient);
const setAsync = promisify(redisClient.set).bind(redisClient);
const getAsync = promisify(redisClient.get).bind(redisClient);
const delAsync = promisify(redisClient.del).bind(redisClient);
module.exports = {
  redisClient,
  hGetAsync,
  hSetAsync,
  hDelAsync,
  setAsync,
  getAsync,
  delAsync,
};
