const axios = require('axios');

const OLD_YOUTUBE_API_KEYS = [
  'AIzaSyAd3C10dUQ27tE2zkyoSS9tHoD8_PEVea8',
  'AIzaSyD6yHZLGuy5vdAwqxupTXBW4XCj66k1RUg',
  'AIzaSyBu5O6uuksgViU22Mpk01ix5CE5dlnCTxI',
  'AIzaSyAnlniUEgnxfnYQBRKmDO_M2gpkFPEBuEQ',
  'AIzaSyCLD_DE0ZDAeRa7USpjFMKy68OGSjNNAdw',
];

const YOUTUBE_API_KEYS = [
  'AIzaSyDhBoyEFDMf1aBaJhEoQGTecs6hCgdEGtQ',
  'AIzaSyA4oJ3tNhylKW0jf3SkF1p6fTMACtvNuwQ',
  'AIzaSyB9-KtzEz5xtXEmMjqQ0HNgJRpp5nic6gw',
  'AIzaSyCdF7QbrfBEeCkNmtj4pPDSrD9SBt-wWXg',
  'AIzaSyChmIWYaSyoZUaoihT2L514TPDNyodA6EI',
  'AIzaSyCdF7QbrfBEeCkNmtj4pPDSrD9SBt-wWXg',
  'AIzaSyD58JwTbeOQg3jQiJ48VTKmpjWsJ4PKetc',
  'AIzaSyA-dErfbJQZMqC4eD8QUsqU-pUNZWGuKmw',
];

// Test video ID - replace this with any valid YouTube video ID
const VIDEO_ID = 'kMx7ceJ35mE';

// Function to test a single API key
const testApiKey = async (apiKey) => {
  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        id: VIDEO_ID,
        part: 'statistics',
        key: apiKey,
      },
    });

    // Check if video exists
    if (response.data.items && response.data.items.length > 0) {
      console.log(`API Key ${apiKey} is valid`);
      console.log('Video Statistics:', response.data.items[0].statistics);
    } else {
      console.log(`API Key ${apiKey} is invalid or quota exceeded`);
    }
  } catch (error) {
    console.error(`Error with API Key ${apiKey}:`, error.response ? error.response.data.error.message : error.message);
  }
};

// Function to test all API keys
const testAllApiKeys = async () => {
  console.log('Testing OLD_YOUTUBE_API_KEYS...');
  for (const apiKey of OLD_YOUTUBE_API_KEYS) {
    await testApiKey(apiKey);
  }

  console.log('Testing YOUTUBE_API_KEYS...');
  for (const apiKey of YOUTUBE_API_KEYS) {
    await testApiKey(apiKey);
  }
};

// Run the test
testAllApiKeys();
