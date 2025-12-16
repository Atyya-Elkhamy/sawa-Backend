const express = require('express');
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const agencyRoute = require('./agency.route');
const roomRoute = require('./room.route');
const groupRoute = require('./group.route');
const docsRoute = require('./docs.route');
const profileRoute = require('./profile.route');
const giftRoute = require('./gift.route');
const gameRoute = require('./game.route');
const homeRoute = require('./home.route');
const chatRoute = require('./chat.route');
const storeRoute = require('./store.route');
const adminRoute = require('./admin/index');
const roomPostRoute = require('./roomPost.route');
const challengeRoute = require('./challenge.route');
const baishunRoute = require('./baishun.route');
const micRoute = require('./room.mics');

const config = require('../../config/config');

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/profile',
    route: profileRoute,
  },
  {
    path: '/hostAgency',
    route: agencyRoute,
  },
  {
    path: '/room',
    route: roomRoute,
  },
  {
    path: '/group',
    route: groupRoute,
  },
  {
    path: '/admin',
    route: adminRoute,
  },
  {
    path: '/gift',
    route: giftRoute,
  },
  {
    path: '/games',
    route: gameRoute,
  },
  {
    path: '/home',
    route: homeRoute,
  },
  {
    path: '/chat',
    route: chatRoute,
  },
  {
    path: '/store',
    route: storeRoute,
  },
  {
    path: '/room-posts',
    route: roomPostRoute,
  },
  {
    path: '/challenges',
    route: challengeRoute,
  },
  {
    path: '/baishun-games',
    route: baishunRoute,
  },
  {
    path: '/mic',
    route: micRoute,
  }
];

const devRoutes = [
  // routes available only in development mode
  {
    path: '/docs',
    route: docsRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

/* istanbul ignore next */
if (config.env === 'development') {
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });
}

module.exports = router;
