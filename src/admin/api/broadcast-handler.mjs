// admin/api/broadcast-handler.mjs
import { getIo } from '../../socket/index.mjs';
import logger from '../../config/logger.js';

export const broadcastHandler = async (request, response, context) => {
  try {
    const { event, data } = request.payload;

    // Validate input
    if (!event) {
      return {
        notice: {
          message: 'Event name is required',
          type: 'error',
        },
      };
    }

    // Get Socket.IO instance
    const io = getIo();
    if (!io) {
      return {
        notice: {
          message: 'Socket.IO server not initialized',
          type: 'error',
        },
      };
    }

    // Send data to all connected clients
    logger.info(`Admin broadcast: Sending event ${event} to all users ${JSON.stringify(data)}`);
    io.emit(event, data);

    // Get count of connected clients (if available)
    const connectedClients = io.sockets?.sockets ? Object.keys(io.sockets.sockets).length : 'all';

    return {
      notice: {
        message: `Broadcast sent successfully to ${connectedClients} connected clients`,
        type: 'success',
      },
    };
  } catch (error) {
    logger.error(`Error in broadcast handler: ${error.message}`);
    return {
      notice: {
        message: `Error: ${error.message}`,
        type: 'error',
      },
    };
  }
};

export default broadcastHandler;
