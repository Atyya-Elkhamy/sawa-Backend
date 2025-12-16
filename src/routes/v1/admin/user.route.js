const express = require('express');
const { chatController } = require('../../../controllers');
const chatValidation = require('../../../validations/chat.validation');
const validate = require('../../../middlewares/validate');
const auth = require('../../../middlewares/auth');

const router = express.Router();
router.post(
  '/system-messages/send',
  auth('adminRole'),
  validate(chatValidation.sendSystemMessage),
  chatController.sendSystemMessage
);

module.exports = router;
