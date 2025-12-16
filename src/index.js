const mongoose = require('mongoose');
const http = require('http');
const app = require('./app');
// initialize schedulers (cron jobs)
const config = require('./config/config');
const logger = require('./config/logger');
const { redisClient } = require('./config/redis');
const { initializeSocket } = require('./socket');
const { initializeDefaultPricing } = require('./services/pricing.service');

require('./scheduler');

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

// Express route to serve the Socket.IO client
app.get('/socket.io/socket.io.js', (req, res) => {
  res.sendFile(`${__dirname}/node_modules/socket.io/client-dist/socket.io.js`);
});

// Your other Express routes go here
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Start the server
const startServer = async () => {
  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    logger.info('Connected to MongoDB');

    await redisClient.connect();
    logger.info('Connected to Redis');

    // Initialize default pricing data
    await initializeDefaultPricing();
    logger.info('Pricing configuration initialized');

    // log that server starting on time :: with timezone setted on the env TZ
    const startTime = new Date();
    const timezone = process.env.TZ || 'UTC';
    const options = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    const timeString = startTime.toLocaleString('en-US', options);
    logger.info(`Server starting at ${timeString} (${timezone})`);

    server.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Socket.IO endpoint: http://localhost:${config.port}/socket.io`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
const shutdown = () => {
  server.close(() => {
    mongoose.connection.close();
    redisClient.quit();
    logger.info('Server shut down gracefully');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = { app, server };

