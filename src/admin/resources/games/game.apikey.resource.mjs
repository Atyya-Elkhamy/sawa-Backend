// FILE: src/admin/resources/apiKeyResource.mjs
import crypto from 'crypto';
import ApiKey from '../../../models/games/game.apiKey.model.js';

const apiKeyResource = {
  resource: ApiKey,
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
      key: {
        type: 'string',
        isVisible: { list: false, edit: false, show: true },
      },
      game: {
        reference: 'Game',
        isVisible: { list: true, edit: true, show: true },
      },
      createdAt: {
        type: 'date',
        isVisible: { list: true, edit: false, show: true },
      },
      expiresAt: {
        type: 'date',
        isVisible: { list: true, edit: true, show: true },
      },
      active: {
        type: 'boolean',
        isVisible: { list: true, edit: true, show: true },
      },
    },
    listProperties: ['game', 'active', 'createdAt', 'expiresAt'],
    editProperties: ['game', 'expiresAt', 'active'],
    showProperties: ['key', 'game', 'createdAt', 'expiresAt', 'active'],
    filterProperties: ['game', 'active', 'expiresAt', 'createdAt'],
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) => {
         
          return currentAdmin && currentAdmin.role === 'superadmin';
        }
      },
      new: {
        // Generate a new API key when creating a new record
        before: async (request, response, context) => {
          const key = crypto.randomBytes(32).toString('hex');
          // add the new key to the request payload
          return {
            ...request,
            payload: {
              ...request.payload,
              key,
            },
          };
        },
      },
      regenerateApiKey: {
        actionType: 'record',
        icon: 'Key',
        label: 'توليد مفتاح API جديد',
        // add a guard to tell admin to make sure they want to generate a new key
        guard: 'هل أنت متأكد أنك تريد توليد مفتاح API جديد؟',
        variant: 'danger',
        handler: async (request, response, context) => {
          const { record, currentAdmin } = context;

          const key = crypto.randomBytes(32).toString('hex');
          await record.update({ key, active: true, createdAt: new Date() });

          return {
            record: record.toJSON(currentAdmin),
            notice: {
              message: 'تم توليد مفتاح API جديد بنجاح.',
              type: 'success',
            },
          };
        },
        component: false, // Use the default AdminJS component
        // isAccessible: ({ record }) => record && !record.param('key'), // Only show if the API key does not exist
      },
      deactivateApiKey: {
        actionType: 'record',
        icon: 'Block',
        variant: 'secondary',
        label: 'إلغاء تفعيل مفتاح API',
        handler: async (request, response, context) => {
          const { record, currentAdmin } = context;
          await record.update({ active: false });

          return {
            record: record.toJSON(currentAdmin),
            notice: {
              message: 'تم إلغاء تفعيل مفتاح API بنجاح.',
              type: 'success',
            },
          };
        },
        component: false,
        isAccessible: ({ record }) => record && record.param('active'), // Only show if the key is active
      },
      extendExpiration: {
        actionType: 'record',
        icon: 'Calendar',
        label: 'تمديد انتهاء الصلاحية',
        variant: 'primary',
        handler: async (request, response, context) => {
          const { record, currentAdmin } = context;

          await record.update({ expiresAt: null });

          return {
            record: record.toJSON(currentAdmin),
            notice: {
              message: 'تم تمديد انتهاء صلاحية مفتاح API بـ 6 أشهر.',
              type: 'success',
            },
          };
        },
        component: false,
        isAccessible: ({ record }) => record && record.param('expiresAt') && record.param('active'),
      },
    },
  },
};

export default apiKeyResource;
