
/**
 * LiveKit Service
 *
 * Handles interactions with LiveKit for room, participant, and token management.
 */

const { RoomServiceClient, AccessToken, WebhookReceiver, Room, IngressClient, IngressInput } = require('livekit-server-sdk');
const logger = require('../../config/logger');
const deleteUserMics = require('./room.mics.service').deleteUserMics;

// LiveKit credentials and endpoint
const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;
const livekitHost = process.env.LIVEKIT_WEBSOCKET_URL;

// Initialize RoomServiceClient
const roomService = new RoomServiceClient(livekitHost, apiKey, apiSecret);

// Initialize WebhookReceiver for validating incoming webhooks
const webhookReceiver = new WebhookReceiver(apiKey, apiSecret);

// ingress client
const ingressClient = new IngressClient(livekitHost, apiKey, apiSecret);
/**
 * Generate an access token for a participant to join a LiveKit room.
 * @param {string} roomId - The unique name/ID of the room.
 * @param {string} userId - The participant's identity.
 * @param {object} [permissions] - Optional permissions for the participant.
 * @param userData
 * @returns {Promise<string>} - A JWT token for the participant.
 */
const createAccessToken = async (roomId, userId, userData, permissions = {}) => {
  const at = new AccessToken(apiKey, apiSecret, {
    identity: userId,
    ttl: 400,
    metadata: JSON.stringify(userData),
  });
  // Add permissions to the token
  at.addGrant({
    roomJoin: true,
    room: roomId,
    ...permissions,
  });

  const token = at.toJwt();
  logger.info('[LiveKit] Created access token', { token, roomId, userId });
  return token;
};

/**
 * List all active rooms.
 * @returns {Promise<Room[]>} - An array of Room objects.
 */
const listRooms = async () => {
  const rooms = await roomService.listRooms();
  logger.info('[LiveKit] Listed rooms', { rooms });
  return rooms;
};

// get room
const getRoom = async (roomId) => {
  const room = await roomService.listRooms([roomId]);
  logger.info('[LiveKit] Fetched room', { room });
  return room;
};

/**
 * Create a room with specific options.
 * @param {string} roomName - The unique name of the room.
 * @param {object} options - Options for room creation.
 * @returns {Promise<Room>} - The created Room object.
 */

const createRoom = async (roomName, options = {}) => {
  const name = String(roomName);
  return roomService.createRoom({ name, ...options });
};


/**
 * Delete a specific room.
 * @param {string} roomName - The name of the room to delete.
 * @returns {Promise<void>}
 */
const deleteRoom = async (roomName) => {
  await roomService.deleteRoom(roomName);
  logger.info('[LiveKit] Deleted room', { roomName });
};

/**
 * Block a room and delete it from LiveKit.
 * @param {string} roomId - The MongoDB ID of the room to block.
 * @param {string} roomName - The name of the room in LiveKit.
 * @returns {Promise<void>}
 */
const blockRoom = async (roomId, roomName) => {
  try {
    // Import Room model to delete the room from database
    const RoomModel = require('../../models/room/room.model');
    // Update room status in database
    await RoomModel.findByIdAndUpdate(roomId, {
      isBlocked: true,
      status: 'inactive',
    });
    // Delete the room from LiveKit
    await deleteRoom(roomId);
    logger.info('[LiveKit] Blocked and deleted room', { roomId, roomName });
  } catch (error) {
    logger.error('[LiveKit] Error blocking room', { roomId, roomName, error: error.message });
    throw error;
  }
};

/**
 * List participants in a room.
 * @param {string} roomName - The name of the room.
 * @returns {Promise<ParticipantInfo[]>} - Array of participant information.
 */
const listParticipants = async (roomName) => {
  const participants = await roomService.listParticipants(roomName);
  logger.info('[LiveKit] Listed participants', { roomName, participants });
  return participants;
};

/**
 * Get details of a specific participant.
 * @param {string} roomName - The room name.
 * @param {string} participantIdentity - The participant's identity.
 * @returns {Promise<ParticipantInfo>} - The participant's information.
 */
const getParticipant = async (roomName, participantIdentity) => {
  try {
    const participant = await roomService.getParticipant(roomName, participantIdentity);
    logger.info('[LiveKit] Fetched participant', { roomName, participantIdentity, participant });
    return participant;
  } catch (e) {
    console.log('error', e);
    return null;
  }
};

/**
 * Update metadata for a room.
 * @param {string} roomName - The room name.
 * @param {string} metadata - Metadata to update.
 * @returns {Promise<Room>} - The updated Room object.
 */
const updateRoomMetadata = async (roomName, metadata) => {
  const updatedRoom = await roomService.updateRoomMetadata(roomName, metadata);
  logger.info('[LiveKit] Updated room metadata', { roomName, metadata });
  return updatedRoom;
};

/**
 * Remove a participant from a room.
 * @param {string} roomName - The room name.
 * @param {string} participantIdentity - The participant's identity.
 * @returns {Promise<void>}
 */
const removeParticipant = async (roomName, participantIdentity) => {
  try {
    await roomService.removeParticipant(roomName, participantIdentity);
    logger.info('[LiveKit] Removed participant', { roomName, participantIdentity });
  } catch (error) {
    logger.error('[LiveKit] Error removing participant', { roomName, participantIdentity, error: error.message });
    throw new Error(`Failed to remove participant: ${error.message}`);
  }
};

/**
 * Handle LiveKit webhook events.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const receiveWebhook = async (req, res, next) => {
  try {
    console.log('webhook body', req);
    const event = webhookReceiver.receive(req.body, req.get('Authorization'));
    logger.info('[LiveKit] Webhook received %o', { event });
    req.event = event;
    logger.info('webhook %o', req.body);
    console.log('webhook %o', req.body);
    res.status(200).send();
  } catch (error) {
    logger.error('[LiveKit] Webhook validation failed', { error: error.message });
    res.status(400).send('Invalid webhook');
  }
  next();
};


const createIngress = async (roomName, participantIdentity, participantName) => {
  const ingress = {
    name: `${roomName}-${participantIdentity}`,
    roomName: `${roomName}`,
    participantIdentity: `${roomName}-${participantIdentity}`,
    participantName,
    enableTranscoding: true,
    video: {
      disabled: true,
    },
    bypassTranscoding: false,
  };
  const ingressInfo = await ingressClient.createIngress(
    IngressInput.RTMP_INPUT,
    ingress
  );
  return ingressInfo;
};

const listIngresses = async () => {
  const ingresses = await ingressClient.listIngress();
  logger.info('[LiveKit] Listed ingresses', { ingresses });
  console.log('ingresses', ingresses);
  return ingresses;
};

module.exports = {
  createAccessToken,
  listRooms,
  createRoom,
  deleteRoom,
  listParticipants,
  getParticipant,
  updateRoomMetadata,
  removeParticipant,
  getRoom,
  receiveWebhook,
  webhookReceiver,
  createIngress,
  listIngresses,
  blockRoom,
};
