const childProcess = require('child_process');
const {
  createAccessToken,
  listRooms,
  createRoom,
  deleteRoom,
  listParticipants,
  getParticipant,
  updateRoomMetadata,
  getRoom,
  removeParticipant,
  listIngresses,
} = require('../../../src/services/room/live-kit.service');

const runTests = async () => {
  try {
    console.log('ss');
    console.log('--- Testing LiveKit Service ---');

    const ffmpeg = childProcess.spawn(
      `ffmpeg`,
      [
        `-re`,
        `-ss`,
        `${toHHMMSS(req.body.seekSeconds)}`,
        `-stream_loop`,
        `-1`,
        `-i`,
        `${concat}`,
        `-c:v`,
        `libx264`,
        `-c:a`,
        `aac`,
        `-f`,
        `flv`,
        `${req.body.rtmpUrl}`,
      ],
      {
        cwd: `${process.cwd()}/songs`,
      }
    );

    // Test listIngresses
    const ingresses = await listIngresses();
    console.log(`[listIngresses] Active ingresses:`, ingresses);

    // Test createAccessToken
    // const roomId = '67587748b799bfd4f2399cca';
    // const userId = '66f0564dd9ba5100207939e6';
    // const userId2 = '66f05657d9ba5100207939f3';
    // const permissions = {
    //   roomAdmin: true,
    // };
    // const token = await createAccessToken(roomId, userId, permissions);
    // console.log(`[createAccessToken] Token for user ${userId} in room ${roomId}: ${token}`);

    // removeParticipant
    // const participant = await removeParticipant(roomId, userId);
    // console.log(`[removeParticipant] Participant removed:`, participant);
    // // Test createRoom
    // const room = await createRoom('testRoom', { maxParticipants: 10 });
    // console.log(`[createRoom] Room created:`, room);

    // // Test listRooms
    const rooms = await listRooms();
    console.log(`[listRooms] Active rooms:`, rooms);

    // // Test listParticipants
    // const participants = await listParticipants('testRoom');
    // console.log(`[listParticipants] Participants in room 'testRoom':`, participants);

    // get room
    const room = await getRoom(roomId);
    console.log(`[getRoom] Room details:`, room);
    // // Test getParticipant
    // const participant = await getParticipant('testRoom', 'testUser');
    // console.log(`[getParticipant] Details of participant 'testUser':`, participant);

    // // Test updateRoomMetadata
    // const updatedRoom = await updateRoomMetadata(roomId, JSON.stringify({ key: 'value' }));
    // console.log(`[updateRoomMetadata] Room metadata updated:`, updatedRoom);

    // // Test removeParticipant
    // await removeParticipant('testRoom', 'testUser');
    // console.log(`[removeParticipant] Removed participant 'testUser' from room 'testRoom'.`);

    // // Test deleteRoom
    // await deleteRoom('testRoom');
    // console.log(`[deleteRoom] Room 'testRoom' deleted.`);
  } catch (error) {
    console.error('Error occurred:', error.message);
  }
};

runTests();
