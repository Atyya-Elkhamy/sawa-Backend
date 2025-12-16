// FILE: src/admin/resources/gameResource.mjs
import Game from '../../../models/games/game.model.js';
import { componentLoader, Components } from '../components/component-loader.mjs';
import setFullUrl from '../utils/set-full-url.mjs';
import awsUploadFeature from '../../config/upload.mjs';
const gameResource = {
  resource: Game,
  options: {
    isVisible: ({ currentAdmin }) => {
      return currentAdmin && currentAdmin.role === 'superadmin';
    },
    isAccessible: ({ currentAdmin }) => {
      return currentAdmin && currentAdmin.role === 'superadmin';
    },
    navigation: {
      name: 'إدارة الألعاب',
      icon: 'Gamepad2',
    },
    properties: {
      name: { isRequired: true, isTitle: true },
      image: {
        type: 'string',
        isVisible: { list: true, edit: true, filter: true, show: true },
        components: {
          list: Components.CustomUploadShowComponent,
          show: Components.CustomUploadShowComponent,
        },
      },
      link: { type: 'string', isVisible: { list: true, edit: true, show: true, filter: true } },
      description: { type: 'textarea', isVisible: { list: false, edit: true, show: true } },
      active: { type: 'boolean', isVisible: { list: true, edit: true, filter: true, show: true } },
      rateMultiplier: {
        type: 'number',
        isVisible: { list: true, edit: true, filter: true, show: true },
        position: 4,
      },
      screen_width: {
        type: 'number',
        isVisible: { list: true, edit: true, filter: true, show: true },
        position: 5,
      },
      screen_height: {
        type: 'number',
        isVisible: { list: true, edit: true, filter: true, show: true },
        position: 6,
      },
      gifts: { reference: 'Gift', isArray: true, isVisible: { list: false, edit: true, show: true } },
      storeItems: { reference: 'Item', isArray: true, isVisible: { list: false, edit: true, show: true } },
      gameBoxCredits: { type: 'number', isVisible: { list: true, edit: true, filter: true, show: true } },
      createdAt: { isVisible: { list: true, filter: true, show: true, edit: false } },
      updatedAt: { isVisible: { list: true, filter: true, show: true, edit: false } },
    },
    listProperties: ['name', 'image', 'link', 'active', 'rateMultiplier', 'screen_width', 'screen_height', 'gameBoxCredits', 'createdAt'],
    editProperties: [
      'name',
      'image',
      'fileUpload',
      'link',
      'description',
      'active',
      'rateMultiplier',
      'screen_width',
      'screen_height',
      'gifts',
      'storeItems',
      'gameBoxCredits',
    ],
    showProperties: [
      'name',
      'image',
      'link',
      'description',
      'active',
      'rateMultiplier',
      'screen_width',
      'screen_height',
      'gifts',
      'storeItems',
      'gameBoxCredits',
      'createdAt',
      'updatedAt',
    ],
    filterProperties: ['name', 'active', 'rateMultiplier', 'screen_width', 'screen_height', 'createdAt'],
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) => {
          return currentAdmin && currentAdmin.role === 'superadmin';
        }
      },
      new: {
        after: async (response, request, context) => {

          await setFullUrl(response, context, 'image', 'games/images');
          return response;
        },
      },
      edit: {
        after: async (response, request, context) => {
          await setFullUrl(response, context, 'image', 'games/images');
          return response;
        },
      },
      // delete: {
      //   isVisible: false, // Optionally disable 'delete' action to prevent user deletion
      // },
      toggleActiveStatus: {
        actionType: 'record',
        icon: 'Switch',
        label: 'تبديل حالة التفعيل',
        component: false, // Set to false as this action does not require a custom component
        handler: async (request, response, context) => {
          const { record } = context;
          const newStatus = !record.param('active');
          await record.update({ active: newStatus });
          return {
            record: record.toJSON(context.currentAdmin),
            notice: {
              message: `تم ${newStatus ? 'تفعيل' : 'إلغاء تفعيل'} اللعبة بنجاح.`,
              type: 'success',
            },
          };
        },
      },
      resetGameBoxCredits: {
        actionType: 'record',
        icon: 'Reset',
        label: 'إعادة تعيين رصيد صندوق اللعبة',
        component: false,
        handler: async (request, response, context) => {
          const { record } = context;
          await record.update({ gameBoxCredits: 0 });
          return {
            record: record.toJSON(context.currentAdmin),
            notice: {
              message: 'تم إعادة تعيين رصيد صندوق اللعبة بنجاح.',
              type: 'success',
            },
          };
        },
        isAccessible: true,
      },
    },
  },
  features: [
    awsUploadFeature({
      componentLoader,

      properties: {
        key: 'image', // Field in the database to store image path
        file: 'fileUpload', // Virtual field to handle file input
      },
    }),
  ],
};

export default gameResource;
