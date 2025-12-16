// routes/analytics.routes.js

const express = require('express');
const analyticsController = require('../../controllers/analytics.controller');

const router = express.Router();

router.get('/user', analyticsController.getUserAnalytics);

module.exports = router;
