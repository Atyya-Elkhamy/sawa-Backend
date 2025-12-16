/**
 * BAISHUN Games Integration Test
 * 
 * This file demonstrates how to test the BAISHUN games integration endpoints
 * Run this after starting the server to test the implementation
 */

const crypto = require('crypto');

// Configuration from .env
const APP_ID = 8519456384;
const APP_KEY = '2VuLmFaUkrG6L3mbXtHRHlgO49ZPQtVX';
const BASE_URL = 'http://localhost:6001/v1/baishun-games';

/**
 * Generate BAISHUN signature
 * @param {string} nonce 
 * @param {string} appKey 
 * @param {number} timestamp 
 * @returns {string} signature
 */
function generateSignature(nonce, appKey, timestamp) {
  const data = `${nonce}${appKey}${timestamp}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Generate random nonce
 * @returns {string} nonce
 */
function generateNonce() {
  const tempByte = crypto.randomBytes(8);
  return tempByte.toString('hex');
}

/**
 * Test Health Check
 */
async function testHealthCheck() {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    console.log('✅ Health Check:', data);
    return true;
  } catch (error) {
    console.error('❌ Health Check failed:', error.message);
    return false;
  }
}

/**
 * Test Get SS Token
 */
async function testGetSsToken() {
  try {
    const nonce = generateNonce();
    console.log('Generated Nonce:', nonce);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateSignature(nonce, APP_KEY, timestamp);

    const payload = {
      app_id: APP_ID,
      user_id: "68c6e8e6fd06ca124136a2a2", // You might need to use a real user ID from your database
      code: "test_code_12345ssshhsss", // This should be a valid temporary code in real implementation
      signature_nonce: nonce,
      timestamp: timestamp,
      signature: signature
    };

    const response = await fetch(`${BASE_URL}/get-sstoken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('✅ Get SS Token Response:', data);
    
    if (data.code === 0 && data.data && data.data.ss_token) {
      return data.data.ss_token;
    }
    return null;
  } catch (error) {
    console.error('❌ Get SS Token failed:', error.message);
    return null;
  }
}

/**
 * Test Get User Info
 */
async function testGetUserInfo(ssToken) {
  if (!ssToken) {
    console.log('⏭️ Skipping Get User Info - no SS token');
    return;
  }

  try {
    const nonce = generateNonce();
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateSignature(nonce, APP_KEY, timestamp);

    const payload = {
      app_id: APP_ID,
      user_id: "68c6e8e6fd06ca124136a2a2", // Match the user_id from getSsToken
      ss_token: ssToken,
      client_ip: "127.0.0.1",
      game_id: 1001,
      signature_nonce: nonce,
      timestamp: timestamp,
      signature: signature
    };

    const response = await fetch(`${BASE_URL}/get-user-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('✅ Get User Info Response:', data);
  } catch (error) {
    console.error('❌ Get User Info failed:', error.message);
  }
}

/**
 * Test Change Balance
 */
async function testChangeBalance(ssToken) {
  if (!ssToken) {
    console.log('⏭️ Skipping Change Balance - no SS token');
    return;
  }

  try {
    const nonce = generateNonce();
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateSignature(nonce, APP_KEY, timestamp);

    const payload = {
      app_id: APP_ID,
      user_id: "68c6e8e6fd06ca124136a2a2", // Match the user_id from getSsToken
      ss_token: ssToken,
      currency_diff: -50, // Deduct 50 credits (bet)
      diff_msg: "bet",
      game_id: 1001,
      room_id: "test_room_123",
      change_time_at: timestamp,
      order_id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      signature_nonce: nonce,
      timestamp: timestamp,
      signature: signature
    };

    const response = await fetch(`${BASE_URL}/change-balance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('✅ Change Balance Response:', data);
  } catch (error) {
    console.error('❌ Change Balance failed:', error.message);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🧪 Starting BAISHUN Games Integration Tests...\n');

  // Test 1: Health Check
  console.log('1. Testing Health Check...');
  const healthOk = await testHealthCheck();
  console.log('');

  if (!healthOk) {
    console.log('❌ Health check failed, stopping tests');
    return;
  }

  // Test 2: Get SS Token
  console.log('2. Testing Get SS Token...');
  const ssToken = await testGetSsToken();
  console.log('');

  // Test 3: Get User Info
  console.log('3. Testing Get User Info...');
  await testGetUserInfo(ssToken);
  console.log('');

  // Test 4: Change Balance
  console.log('4. Testing Change Balance...');
  await testChangeBalance(ssToken);
  console.log('');

  console.log('🏁 Tests completed!');
}

// Export for use in other files or run directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testHealthCheck,
  testGetSsToken,
  testGetUserInfo,
  testChangeBalance,
  runTests,
  generateSignature,
  generateNonce
};
