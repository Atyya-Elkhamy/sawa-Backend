// admin routes
const express = require('express');
// const auth = require('../../../middlewares/auth');
const storeRoute = require('./store.route');
const creditAgency = require('./agencies.route');
const gameRoute = require('./game.route');
const settingsRoute = require('./settings.route');
const userRoute = require('./user.route');

const router = express.Router();
// use auth middleware to protect the routes
// router.use(auth('admin'));

const defaultRoutes = [
  {
    path: '/store',
    route: storeRoute,
  },
  {
    path: '/agencies',
    route: creditAgency,
  },
  {
    path: '/games',
    route: gameRoute,
  },
  {
    path: '/settings',
    route: settingsRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
