/* eslint-disable import/extensions */
import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import * as AdminJSMongoose from '@adminjs/mongoose';
import { dark, light, noSidebar } from '@adminjs/themes';
import MongoStore from 'connect-mongo';
import config from '../config/config.js';
import mongoose from '../config/mongoose.js';
import logger from '../config/logger.js';
import { componentLoader, Components } from './resources/components/component-loader.mjs';
// Import custom AdminJS configurations
import branding from './config/branding.mjs';
import authentication from './config/authentication.mjs';
import locale from './config/locale.mjs';
import dashboard from './config/dashboard.mjs';
import giftResource from './resources/assets/giftResource.mjs';
import stickersResource from './resources/assets/stickers.resource.mjs';
import itemsResource from './resources/items/items.resource.mjs';
import boughtItemResource from './resources/items/boughtItem.resource.mjs';
import userResource from './resources/users/userResource.mjs';
// import vipManagementResource from './resources/users/vipManagementResource.mjs';
import proManagementResource from './resources/users/proManagementResource.mjs';
import messagingResource, { broadCastSystemMessageResource } from './resources/messaging/systemMessage.resource.mjs';
import chatMessageResource from './resources/chat/chatMessage.resource.mjs';
import conversationResource from './resources/chat/conversation.resource.mjs';
import deviceTokenResource, { blacklistedDeviceTokenResource } from './resources/users/deviceTokens.resource.mjs';
import activityResource from './resources/assets/activities.resource.mjs';
import gameResource from './resources/games/game.resource.mjs';
import gameApiKeyResource from './resources/games/game.apikey.resource.mjs';
import creditAgencyResource from './resources/creditAgency/creditAgancy.resource.mjs';
import creditTransactionResource from './resources/creditAgency/creditTransaction.resource.mjs';
import chargePrizeResource from './resources/prizes/chargePrizeResource.mjs';
import categoryResource from './resources/assets/categoryResource.mjs';
import roomResource from './resources/assets/room.resource.mjs';
import roomAssetResource from './resources/assets/roomAsset.resource.mjs';
import uploadHandler from './pages/upload.handler.mjs';
import forbiddenWordResource from './resources/forbiddenWords/forbiddenWord.resource.mjs';
import hostAgencyResource from './resources/agency/hostAgencyResource.mjs';
import hostResource from './resources/agency/hostResource.mjs';
import proSubscriptionResource from './resources/pricing/proSubscription.resource.mjs';
import vipSubscriptionResource from './resources/pricing/vipSubscription.resource.mjs';
import groupResource from './resources/assets/groupResource.mjs';
import adminSettingsResource from './resources/adminSettings.resource.mjs';
import UserSpecialId from '../models/userSpecialId.model.js';
import userLimitedResource from './resources/users/userLimitedResource.mjs';
import hostAgencyLimitedResource from './resources/agency/hostAgencyLimitedResource.mjs';
import hostResourceForSupport from './resources/agency/hostSupportResource.mjs'

// Register the Mongoose adapter for AdminJS
AdminJS.registerAdapter({
  Resource: AdminJSMongoose.Resource,
  Database: AdminJSMongoose.Database,
});

const setupAdminPanel = () => {
  // AdminJS options configuration
  const adminOptions = {
    // databases: [mongoose],
    rootPath: '/admin',
    defaultTheme: dark.id,
    availableThemes: [dark, light, noSidebar],
    locale,
    componentLoader,
    // Add proper direction for Arabic layout
    branding: {
      ...branding,
      direction: 'rtl',
      language: 'ar',
    },
    assets: { scripts: [], styles: [] },

    resources: [
      userResource,
      userLimitedResource,
      {
        resource: UserSpecialId,
        options: {
          navigation: false, // Hides resource from sidebar
          actions: {
            list: { isVisible: false },
            show: { isVisible: false },
            edit: { isVisible: false },
            delete: { isVisible: false },
            new: { isVisible: false },
          }
        },
      },
      proManagementResource,
      giftResource,
      groupResource,
      stickersResource,
      itemsResource,
      boughtItemResource,
      deviceTokenResource,
      blacklistedDeviceTokenResource,
      messagingResource,
      broadCastSystemMessageResource,
      chatMessageResource,
      conversationResource,
      activityResource,
      gameResource,
      gameApiKeyResource,
      creditAgencyResource,
      creditTransactionResource,
      chargePrizeResource,
      categoryResource,
      roomResource,
      roomAssetResource,
      forbiddenWordResource,
      hostAgencyLimitedResource,
      hostAgencyResource,
      hostResource,
      hostResourceForSupport,
      proSubscriptionResource,
      vipSubscriptionResource,
      adminSettingsResource,
    ],
    logo: 'https://app.sawalive.live/public/logo.png',
    pages: {
      AdminMessage: {
        name: 'رسائل الإدارة',
        icon: 'MessageSquare',
        component: Components.BroadCastPage,
        handler: async (request) => {
          const { event, text, image, data } = request.query;
          // Log broadcast parameters for debugging
          if (event) logger.info('Broadcast event:', event);
          if (text) logger.info('Broadcast text:', text);
          if (image) logger.info('Broadcast image:', image);
          if (data) logger.info('Broadcast data:', data);
          return {
            notice: {
              message: 'Broadcast sent successfully',
              type: 'success',
            },
          };
        },
      },
      upload: {
        handler: uploadHandler,
      },
    },
    dashboard,
  };

  // Create AdminJS instance
  const adminJs = new AdminJS(adminOptions);

  // if env process is not production build unauth
  if (process.env.NODE_ENV !== 'production') {
    // Build unauthenticated router
    const router = AdminJSExpress.buildRouter(adminJs);
    return router;
  } else {

    const router = AdminJSExpress.buildAuthenticatedRouter(adminJs, authentication, null, {
      resave: false,
      saveUninitialized: false,
      secret: config.jwt.secret || 'your-session-secret',
      store: MongoStore.create({
        client: mongoose.connection.getClient(),
        collectionName: 'admin_sessions',
        ttl: 24 * 60 * 60, // 1 day
      }),
      cookie: {
        httpOnly: true,
        secure: false,
      },
      name: 'sawalive',
    });
    logger.info(`AdminJS started successfully at ${adminJs.options.rootPath}`);
    return router;
  }

};

export default setupAdminPanel;



