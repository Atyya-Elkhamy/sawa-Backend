const express = require('express');
const validate = require('../../middlewares/validate');
const baishunValidation = require('../../validations/baishun.validation');
const baishunController = require('../../controllers/baishun.controller');
const { validateBaishunSignature } = require('../../middlewares/baishunAuth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: BAISHUN Games
 *   description: BAISHUN Games Integration API endpoints
 */

/**
 * @swagger
 * /baishun-games/health:
 *   get:
 *     summary: Health check for BAISHUN integration
 *     tags: [BAISHUN Games]
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 service:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                 app_channel:
 *                   type: string
 *                 app_id:
 *                   type: string
 */
router.get('/health', baishunController.healthCheck);

/**
 * @swagger
 * /baishun-games/get-sstoken:
 *   post:
 *     summary: Get SS Token for BAISHUN games
 *     tags: [BAISHUN Games]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - app_id
 *               - user_id
 *               - code
 *               - signature_nonce
 *               - timestamp
 *               - signature
 *             properties:
 *               app_id:
 *                 type: integer
 *                 description: Application ID provided by BAISHUN
 *               user_id:
 *                 type: string
 *                 description: Player ID passed from app frontend
 *               code:
 *                 type: string
 *                 description: Temporary code passed from app frontend
 *               signature_nonce:
 *                 type: string
 *                 description: Random string to prevent replay attacks
 *               timestamp:
 *                 type: integer
 *                 description: Request timestamp
 *               signature:
 *                 type: string
 *                 description: Request signature
 *               provider_name:
 *                 type: string
 *                 description: Requester identity description
 *             example:
 *               app_id: 8519456384
 *               user_id: "user123"
 *               code: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ"
 *               signature_nonce: "5f0eb04d7603a9d8"
 *               timestamp: 1682674598
 *               signature: "c62d04ebdb5100e475f45f5ebe8c64ee"
 *     responses:
 *       "200":
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                 message:
 *                   type: string
 *                 unique_id:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     ss_token:
 *                       type: string
 *                     expire_date:
 *                       type: integer
 */
router.post('/get-sstoken',
  // validate(baishunValidation.getSsToken),
  validateBaishunSignature,
  baishunController.getSsToken
);

/**
 * @swagger
 * /baishun-games/get-user-info:
 *   post:
 *     summary: Get user information for BAISHUN games
 *     tags: [BAISHUN Games]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - app_id
 *               - user_id
 *               - ss_token
 *               - game_id
 *               - signature_nonce
 *               - timestamp
 *               - signature
 *             properties:
 *               app_id:
 *                 type: integer
 *               user_id:
 *                 type: string
 *               ss_token:
 *                 type: string
 *                 description: SS token returned by get-sstoken endpoint
 *               client_ip:
 *                 type: string
 *                 description: Client IP address (can be null)
 *               game_id:
 *                 type: integer
 *                 description: Game ID
 *               signature_nonce:
 *                 type: string
 *               timestamp:
 *                 type: integer
 *               signature:
 *                 type: string
 *             example:
 *               app_id: 8519456384
 *               user_id: "user123"
 *               ss_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
 *               client_ip: "110.86.1.130"
 *               game_id: 1010
 *               signature_nonce: "5f0eb04d7603a9d8"
 *               timestamp: 1682674598
 *               signature: "c62d04ebdb5100e475f45f5ebe8c64ee"
 *     responses:
 *       "200":
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                 message:
 *                   type: string
 *                 unique_id:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user_id:
 *                       type: string
 *                     user_name:
 *                       type: string
 *                     user_avatar:
 *                       type: string
 *                     balance:
 *                       type: number
 *                     user_type:
 *                       type: integer
 *                     release_cond:
 *                       type: integer
 */
router.post('/get-user-info',
  // validate(baishunValidation.getUserInfo),
  validateBaishunSignature,
  baishunController.getUserInfo
);

/**
 * @swagger
 * /baishun-games/update-sstoken:
 *   post:
 *     summary: Update/refresh SS Token for BAISHUN games
 *     tags: [BAISHUN Games]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - app_id
 *               - user_id
 *               - ss_token
 *               - signature_nonce
 *               - timestamp
 *               - signature
 *             properties:
 *               app_id:
 *                 type: integer
 *               user_id:
 *                 type: string
 *               ss_token:
 *                 type: string
 *                 description: Current SS token to be updated
 *               signature_nonce:
 *                 type: string
 *               timestamp:
 *                 type: integer
 *               signature:
 *                 type: string
 *             example:
 *               app_id: 8519456384
 *               user_id: "user123"
 *               ss_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
 *               signature_nonce: "5f0eb04d7603a9d8"
 *               timestamp: 1682674598
 *               signature: "c62d04ebdb5100e475f45f5ebe8c64ee"
 *     responses:
 *       "200":
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                 message:
 *                   type: string
 *                 unique_id:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     ss_token:
 *                       type: string
 *                     expire_date:
 *                       type: integer
 */
router.post('/update-sstoken',
  // validate(baishunValidation.updateSsToken),
  validateBaishunSignature,
  baishunController.updateSsToken
);

/**
 * @swagger
 * /baishun-games/change-balance:
 *   post:
 *     summary: Change user balance for BAISHUN games
 *     tags: [BAISHUN Games]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - app_id
 *               - user_id
 *               - ss_token
 *               - currency_diff
 *               - diff_msg
 *               - game_id
 *               - room_id
 *               - change_time_at
 *               - order_id
 *               - signature_nonce
 *               - timestamp
 *               - signature
 *             properties:
 *               app_id:
 *                 type: integer
 *               user_id:
 *                 type: string
 *               ss_token:
 *                 type: string
 *               currency_diff:
 *                 type: integer
 *                 description: Currency change amount (negative for deduction, positive for addition)
 *               diff_msg:
 *                 type: string
 *                 enum: [bet, result, refund, buyin, buyout]
 *                 description: Reason for change
 *               game_id:
 *                 type: integer
 *                 description: Game ID provided by BAISHUN
 *               game_round_id:
 *                 type: string
 *                 description: One game round ID (optional)
 *               room_id:
 *                 type: string
 *                 description: Room ID
 *               change_time_at:
 *                 type: integer
 *                 description: Change timestamp
 *               order_id:
 *                 type: string
 *                 description: Unique order ID
 *               extend:
 *                 type: string
 *                 description: Extended field (optional)
 *               msg_type:
 *                 type: string
 *                 description: Message type definition (optional)
 *               currency_type:
 *                 type: integer
 *                 description: Currency type definition (optional)
 *               signature_nonce:
 *                 type: string
 *               timestamp:
 *                 type: integer
 *               signature:
 *                 type: string
 *             example:
 *               app_id: 8519456384
 *               user_id: "user123"
 *               ss_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
 *               currency_diff: -100
 *               diff_msg: "bet"
 *               game_id: 1006
 *               room_id: "room_123"
 *               game_round_id: "rlmy01pq-cqkdd39jyrmz"
 *               order_id: "2R5PHkx43UQPQydCrmI71BVqXwH"
 *               change_time_at: 1638845715
 *               signature_nonce: "5f0eb04d7603a9d8"
 *               timestamp: 1682674598
 *               signature: "c62d04ebdb5100e475f45f5ebe8c64ee"
 *     responses:
 *       "200":
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                 message:
 *                   type: string
 *                 unique_id:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     currency_balance:
 *                       type: number
 *                       description: Total remaining balance
 */
router.post('/change-balance',
  // validate(baishunValidation.changeBalance),
  validateBaishunSignature,
  baishunController.changeBalance
);

module.exports = router;
