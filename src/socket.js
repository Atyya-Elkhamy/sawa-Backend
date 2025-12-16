/* eslint-disable global-require */
// config/socket.js
let pubClient;
let io;

const initializeSocket = (server) => {
  const { Server } = require('socket.io');
  const { createAdapter } = require('@socket.io/redis-adapter');
  const { redisClient } = require('./config/redis');
  const config = require('./config/config');
  const logger = require('./config/logger');
  const User = require('./models/user.model');
  // const chatHandler = require('./socketHandlers/chatHandler');
  const jwt = require('jsonwebtoken');
  const micService = require('./services/room/room.mics.service');

  io = new Server(server, {
    path: '/socket.io',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Create Redis clients for the adapter
  pubClient = redisClient;
  const subClient = pubClient.duplicate();

  // Set up Redis adapter for Socket.IO
  io.adapter(createAdapter(pubClient, subClient));

  // Middleware to authenticate Socket.IO connections
  io.use(async (socket, next) => {
    try {
      // get all the headers
      console.log('Socket auth:', socket.handshake.auth);
      console.log('Socket query:', socket.handshake.query);
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      console.log('Socket token:', token);
      if (!token) {
        return next(new Error('Authentication error: Token is missing'));
      }

      const payload = jwt.verify(token, config.jwt.secret);
      const user = await User.findById(payload.sub);
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      logger.error(`Socket.IO authentication error: ${error.message}`);
      next(new Error('Authentication error'));
    }
  });

  // Socket.IO connection handler
  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    logger.info(`User connected: ${userId}`);

    const user = await User.findByIdAndUpdate(userId, { isOnline: true }).select('vip name avatar');

    // Store connected user in Redis
    logger.info(`Storing connected user: ${userId}`);
    logger.info(`Socket ID: ${socket.id}`);
    // check if the user first time connected
    const isFirstTimeConnected = await pubClient.hGet('connectedUsers', userId);
    if (!isFirstTimeConnected) {
      pubClient.hSet('connectedUsers', userId, socket.id);

      // Check VIP status and announcement cooldown
      if (user && user.vip.level >= 7 && user.vip.expirationDate > new Date()) {
        // Check if announcement cooldown exists
        const lastAnnouncement = await pubClient.get(`vip:announcement:${userId}`);

        if (!lastAnnouncement) {
          // Emit the VIP connection event
          io.emit('vipUserConnected', {
            id: userId,
            vip: user.vip.level,
            name: user.name,
            avatar: user.avatar,
          });
          // Set cooldown for half 30 minutes
          await pubClient.set(`vip:announcement:${userId}`, Date.now(), {
            EX: 1800, // Expires in 30 minutes
          });

          logger.info(`VIP user announcement sent for ${userId}`);
        } else {
          logger.info(`VIP announcement cooldown active for ${userId}`);
        }
      }
    }

    socket.on('disconnect', async () => {
      try {
        // Remove user from Redis
        logger.info(`User disconnected: ${userId}`);
        await pubClient.hDel(`userConversations:${userId}`, 'currentConversation');
        // delete all connected users for testing
        // await pubClient.del('connectedUsers');

        // Update user status
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date(),
        });

        // Remove from connected users
        pubClient.hDel('connectedUsers', userId);
      } catch (error) {
        logger.error(`Error handling disconnect: ${error.message}`, { error });
      }
    });

    socket.on('error', (error) => {
      logger.error(`Socket.IO error: ${error.message}`);
    });

    // Conversation join event
    socket.on('joinConversation', async (data) => {
      try {
        const { conversationId } = data;

        logger.info(`User ${userId} joining conversation ${conversationId}`);

        // store in redis
        await pubClient.hSet(`userConversations:${userId}`, 'currentConversation', conversationId);

        // Confirm join to the user
        socket.emit('joinedConversation', { success: true, conversationId });
      } catch (error) {
        logger.error(`Error in joinConversation: ${error.message}`, { error });
        socket.emit('joinedConversation', { success: false, error: error.message });
      }
    });

    // Conversation leave event
    socket.on('leaveConversation', async (data) => {
      try {
        const { conversationId } = data;

        logger.info(`User ${userId} leaving conversation ${conversationId}`);

        // redis remove
        await pubClient.hDel(`userConversations:${userId}`, 'currentConversation');
        // Confirm leave to the user
        socket.emit('leftConversation', { success: true, conversationId });
      } catch (error) {
        logger.error(`Error in leaveConversation: ${error.message}`, { error });
        socket.emit('leftConversation', { success: false, error: error.message });
      }
    });

    // ===== Join Room Event =====
    socket.on('userJoinRoom', async ({ roomId }) => {
      try {
        if (!roomId) {
          return socket.emit('roomJoinError', { error: 'Room ID is required' });
        }
        socket.join(roomId);
        logger.info(` User ${userId} joined room ${roomId}`);
        // Optional: store user’s current room in Redis
        await pubClient.hSet(`user:${userId}`, 'currentRoom', roomId);
        // Get mic data for that room (if any)
        const mics = await micService.getRoomMics(roomId);
        // Notify everyone in the room
        io.to(roomId).emit('updateMics', { roomId, mics });
        // Confirm join for the current user
        socket.emit('roomJoined', { success: true, roomId });
      } catch (error) {
        logger.error(` Error in userJoinRoom: ${error.message}`);
        socket.emit('roomJoinError', { error: error.message });
      }
    });

    // =====  Leave Room Event =====
    socket.on('userLeaveRoom', async ({ roomId }) => {
      try {
        socket.leave(roomId);
        logger.info(` User ${userId} left room ${roomId}`);

        // Remove from Redis
        await pubClient.hDel(`user:${userId}`, 'currentRoom');

        socket.emit('roomLeft', { success: true, roomId });
      } catch (error) {
        logger.error(`Error in userLeaveRoom: ${error.message}`);
        socket.emit('roomLeft', { success: false, error: error.message });
      }
    });

    // Add your other socket event handlers here
  });

  return io;
};

const getIo = () => {
  if (!io) {
    return null;
  }
  return io;
};

module.exports = {
  initializeSocket,
  getIo,
  pubClient,
};
