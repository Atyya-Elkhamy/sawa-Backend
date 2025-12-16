const request = require('supertest');
const app = require('../src/app');
const { User } = require('../src/models');
const BaishunToken = require('../src/models/games/baishun.token.model');
const { generateRequestSignature } = require('../src/middlewares/baishunAuth');

describe('BAISHUN Change Balance - Enhanced Implementation', () => {
  let testUser;
  let ssToken;
  let app_id = 8519456384;
  let user_id = 'test_user_123';
  
  beforeEach(async () => {
    // Create test user
    testUser = await User.create({
      name: 'Test User',
      phone: '+1234567890',
      userId: user_id,
      credits: 1000,
      isActive: true
    });

    // Generate SS Token
    const tokenData = await BaishunToken.generateSsToken(
      user_id,
      testUser._id,
      'test_code_123',
      app_id
    );
    ssToken = tokenData.ss_token;
  });

  afterEach(async () => {
    await User.deleteMany({});
    await BaishunToken.deleteMany({});
  });

  const createSignedRequest = (body) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature_nonce = Math.random().toString(36).substring(2, 18);
    
    const requestData = {
      ...body,
      timestamp,
      signature_nonce,
    };
    
    const signature = generateRequestSignature(requestData);
    
    return {
      ...requestData,
      signature
    };
  };

  describe('Duplicate Order Handling', () => {
    test('should handle duplicate bet orders correctly', async () => {
      const orderData = {
        app_id,
        user_id,
        ss_token: ssToken,
        currency_diff: -100,
        diff_msg: 'bet',
        game_id: 1006,
        room_id: 'room_123',
        order_id: 'unique_bet_order_123',
        change_time_at: Math.floor(Date.now() / 1000)
      };

      const signedRequest = createSignedRequest(orderData);

      // First request - should process normally
      const response1 = await request(app)
        .post('/v1/baishun-games/change-balance')
        .send(signedRequest)
        .expect(200);

      expect(response1.body.code).toBe(0);
      expect(response1.body.data.currency_balance).toBe(900);

      // Second request with same order_id - should return duplicate
      const response2 = await request(app)
        .post('/v1/baishun-games/change-balance')
        .send(signedRequest)
        .expect(200);

      expect(response2.body.code).toBe(0);
      expect(response2.body.data.currency_balance).toBe(900); // Same balance, no double deduction

      // Verify user balance hasn't been double-deducted
      const user = await User.findById(testUser._id);
      expect(user.credits).toBe(900);
    });

    test('should handle duplicate settlement orders correctly', async () => {
      const orderData = {
        app_id,
        user_id,
        ss_token: ssToken,
        currency_diff: 200,
        diff_msg: 'result',
        game_id: 1006,
        room_id: 'room_123',
        order_id: 'unique_settlement_order_123',
        change_time_at: Math.floor(Date.now() / 1000)
      };

      const signedRequest = createSignedRequest(orderData);

      // First settlement request
      const response1 = await request(app)
        .post('/v1/baishun-games/change-balance')
        .send(signedRequest)
        .expect(200);

      expect(response1.body.code).toBe(0);
      expect(response1.body.data.currency_balance).toBe(1200);

      // Settlement retry with same order_id - should return same balance
      const response2 = await request(app)
        .post('/v1/baishun-games/change-balance')
        .send(signedRequest)
        .expect(200);

      expect(response2.body.code).toBe(0);
      expect(response2.body.data.currency_balance).toBe(1200); // Same balance, no double credit

      // Verify user balance hasn't been double-credited
      const user = await User.findById(testUser._id);
      expect(user.credits).toBe(1200);
    });
  });

  describe('Error Code Handling', () => {
    test('should return error code 1008 for insufficient balance', async () => {
      const orderData = {
        app_id,
        user_id,
        ss_token: ssToken,
        currency_diff: -2000, // More than user has
        diff_msg: 'bet',
        game_id: 1006,
        room_id: 'room_123',
        order_id: 'insufficient_balance_order',
        change_time_at: Math.floor(Date.now() / 1000)
      };

      const signedRequest = createSignedRequest(orderData);

      const response = await request(app)
        .post('/v1/baishun-games/change-balance')
        .send(signedRequest)
        .expect(200);

      expect(response.body.code).toBe(1008);
      expect(response.body.message).toBe('Insufficient balance');
      expect(response.body.data).toBe(null);
    });

    test('should return non-zero error code for invalid token', async () => {
      const orderData = {
        app_id,
        user_id,
        ss_token: 'invalid_token',
        currency_diff: -100,
        diff_msg: 'bet',
        game_id: 1006,
        room_id: 'room_123',
        order_id: 'invalid_token_order',
        change_time_at: Math.floor(Date.now() / 1000)
      };

      const signedRequest = createSignedRequest(orderData);

      const response = await request(app)
        .post('/v1/baishun-games/change-balance')
        .send(signedRequest)
        .expect(200);

      expect(response.body.code).toBe(401);
      expect(response.body.message).toBe('Invalid token');
      expect(response.body.data).toBe(null);
    });

    test('should never return error code 0 for failures', async () => {
      // Test various failure scenarios
      const testCases = [
        {
          name: 'missing ss_token',
          data: { app_id, user_id, currency_diff: -100, diff_msg: 'bet', game_id: 1006, order_id: 'test' }
        },
        {
          name: 'wrong app_id',
          data: { app_id: 999999, user_id, ss_token: ssToken, currency_diff: -100, diff_msg: 'bet', game_id: 1006, order_id: 'test2' }
        }
      ];

      for (const testCase of testCases) {
        const signedRequest = createSignedRequest(testCase.data);
        
        const response = await request(app)
          .post('/v1/baishun-games/change-balance')
          .send(signedRequest)
          .expect(200);

        expect(response.body.code).not.toBe(0); // Error code should never be 0
        expect(response.body.code).toBeGreaterThan(0);
      }
    });
  });

  describe('Balance Operations', () => {
    test('should handle bet (deduction) correctly', async () => {
      const orderData = {
        app_id,
        user_id,
        ss_token: ssToken,
        currency_diff: -150,
        diff_msg: 'bet',
        game_id: 1006,
        room_id: 'room_123',
        order_id: 'bet_order_150',
        change_time_at: Math.floor(Date.now() / 1000)
      };

      const signedRequest = createSignedRequest(orderData);

      const response = await request(app)
        .post('/v1/baishun-games/change-balance')
        .send(signedRequest)
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.currency_balance).toBe(850);

      const user = await User.findById(testUser._id);
      expect(user.credits).toBe(850);
    });

    test('should handle win (addition) correctly', async () => {
      const orderData = {
        app_id,
        user_id,
        ss_token: ssToken,
        currency_diff: 300,
        diff_msg: 'result',
        game_id: 1006,
        room_id: 'room_123',
        order_id: 'win_order_300',
        change_time_at: Math.floor(Date.now() / 1000)
      };

      const signedRequest = createSignedRequest(orderData);

      const response = await request(app)
        .post('/v1/baishun-games/change-balance')
        .send(signedRequest)
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.currency_balance).toBe(1300);

      const user = await User.findById(testUser._id);
      expect(user.credits).toBe(1300);
    });

    test('should handle refund correctly', async () => {
      const orderData = {
        app_id,
        user_id,
        ss_token: ssToken,
        currency_diff: 50,
        diff_msg: 'refund',
        game_id: 1006,
        room_id: 'room_123',
        order_id: 'refund_order_50',
        change_time_at: Math.floor(Date.now() / 1000)
      };

      const signedRequest = createSignedRequest(orderData);

      const response = await request(app)
        .post('/v1/baishun-games/change-balance')
        .send(signedRequest)
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.currency_balance).toBe(1050);

      const user = await User.findById(testUser._id);
      expect(user.credits).toBe(1050);
    });
  });

  describe('Transaction Recording', () => {
    test('should record transaction details in token document', async () => {
      const orderData = {
        app_id,
        user_id,
        ss_token: ssToken,
        currency_diff: -75,
        diff_msg: 'bet',
        game_id: 1006,
        room_id: 'room_123',
        order_id: 'record_test_order',
        change_time_at: Math.floor(Date.now() / 1000)
      };

      const signedRequest = createSignedRequest(orderData);

      await request(app)
        .post('/v1/baishun-games/change-balance')
        .send(signedRequest)
        .expect(200);

      // Check if transaction was recorded
      const tokenDoc = await BaishunToken.findOne({ ss_token: ssToken });
      expect(tokenDoc.gameTransactions).toHaveLength(1);
      
      const transaction = tokenDoc.gameTransactions[0];
      expect(transaction.order_id).toBe('record_test_order');
      expect(transaction.currency_diff).toBe(-75);
      expect(transaction.diff_msg).toBe('bet');
      expect(transaction.resulting_balance).toBe(925);
      expect(transaction.processed).toBe(true);
    });
  });
});

module.exports = {};