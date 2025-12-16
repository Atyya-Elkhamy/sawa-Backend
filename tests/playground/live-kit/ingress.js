const childProcess = require('child_process');
const path = require('path');

// Static Ingress Configuration
const ingressConfig = {
  message: 'Ingress created successfully',
  streamKey: 'W6qKoW4cGn9R',
  url: 'rtmp://realtime.sawalive.live:1935/x',
};

// Helper function to convert seconds to HH:MM:SS format
/**
 *
 * @param seconds
 */
function toHHMMSS(seconds) {
  const hrs = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, '0');
  const mins = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
}

// Function to start streaming using ffmpeg
/**
 *
 * @param seekSeconds
 */
function startStreaming(seekSeconds) {
  const inputDir = path.join(__dirname, 'songs'); // Directory with MP3 files
  const concat = 'concat:track1.mp3|track2.mp3|track3.mp3'; // Example concatenated tracks
  const rtmpUrl = ingressConfig.url;

  console.log(`Starting ffmpeg with seek: ${toHHMMSS(seekSeconds)}, URL: ${rtmpUrl}`);

  const ffmpeg = childProcess.spawn(
    `ffmpeg`,
    [
      `-re`, // Read input at native frame rate
      `-ss`,
      `${toHHMMSS(seekSeconds)}`, // Seek to specific time
      `-stream_loop`,
      `-1`, // Loop the input indefinitely
      `-i`,
      `${concat}`, // Input files
      `-c:v`,
      `libx264`, // H.264 codec for video
      `-c:a`,
      `aac`, // AAC codec for audio
      `-b:a`,
      `128k`, // Set audio bitrate
      `-bufsize`,
      `64k`, // Set buffer size
      `-f`,
      `flv`, // RTMP streaming format
      `${rtmpUrl}`, // RTMP destination
    ],
    { cwd: inputDir } // Current working directory
  );

  // Log FFmpeg output
  ffmpeg.stdout.on('data', (data) => console.log(`stdout: ${data}`));
  ffmpeg.stderr.on('data', (data) => console.error(`stderr: ${data}`));
  ffmpeg.on('close', (code) => console.log(`FFmpeg process exited with code ${code}`));
}

// Test the streaming function
startStreaming(30); // Example: Start streaming from 30 seconds
