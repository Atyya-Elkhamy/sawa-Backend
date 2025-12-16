// FILE: src/admin/resources/creditAgencyResource.mjs
import CreditAgency from '../../../models/agencies/creditAgency.model.js';
import User from '../../../models/user.model.js';

const creditAgencyResource = {
  resource: CreditAgency,
  options: {
    isVisible: ({ currentAdmin }) => {
      return currentAdmin && currentAdmin.role === 'superadmin';
    },
    isAccessible: ({ currentAdmin }) => {
      return currentAdmin && currentAdmin.role === 'superadmin';
    },
    navigation: ({ currentAdmin }) =>
      currentAdmin.role === 'manager' ? null : { name: 'إدارة الوكالات', icon: 'Building' },

    properties: {
      user: { reference: 'User', isVisible: { list: true, edit: true, show: true } },
      name: { isRequired: true },
      balance: { isVisible: { list: true, edit: false, show: true } },
      createdAt: { isVisible: { list: true, show: true, edit: false } },
      banned: { isVisible: { list: true, show: true, edit: true } },
    },
    listProperties: ['name', 'user', 'balance', 'createdAt', 'banned'],
    showProperties: ['name', 'user', 'balance', 'createdAt', 'updatedAt', 'banned'],
    filterProperties: ['name', 'user', 'createdAt', 'banned'],
    editProperties: ['name', 'balance', 'banned', 'user'],
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) => {
          return currentAdmin && currentAdmin.role === 'superadmin';
        }
      },
      new: {
        before: async (request) => {
          console.log('New Credit Agency Request:', request);
          if (request.payload) {
            const AgencyExists = await CreditAgency.findOne({ user: request.payload.user });
            if (AgencyExists) {
              request.payload.user = null;
            }
          }
          return request;
        },
        after: async (response, request, context) => {
          const { record } = context;
          if (record && record.params.user) {
            // Update user with credit agency reference
            await User.updateMany({ creditAgency: record.params._id }, { creditAgency: null });

            await User.findByIdAndUpdate(record.params.user, {
              creditAgency: record.params._id,
            });
          }
          return response;
        },
      },
      edit: {
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'superadmin',
        before: async (request, context) => {
          if (request.payload && request.payload.user && request.payload.user !== context.record.params.user) {
            const AgencyExists = await CreditAgency.findOne({ user: request.payload.user });
            console.log('AgencyExists:', AgencyExists);
            if (AgencyExists) {
              request.payload.user = null;
            }
          }
          return request;
        },
        after: async (response, request) => {
          if (request.payload && request.payload.user) {
            // Update previous users
            await User.updateMany({ creditAgency: request.payload._id }, { creditAgency: null });

            // Update the new user
            await User.findByIdAndUpdate(request.payload.user, {
              creditAgency: request.payload._id,
            });
          }
          return response;
        },
      },
      delete: {
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'superadmin',
        before: async (request, context) => {
          const { record } = context;
          if (record) {
            await User.updateMany({ creditAgency: record.params._id }, { creditAgency: null });
          }
          return request;
        },
      },
      bulkDelete: {
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'superadmin',
        before: async (request, context) => {
          const { records } = context;
          const agencyIds = records.map((record) => record.params._id);

          await User.updateMany({ creditAgency: { $in: agencyIds } }, { creditAgency: null });

          return request;
        },
      },
      banAgency: {
        actionType: 'record',
        icon: 'Ban',
        label: 'Ban Agency',
        handler: async (request, response, context) => {
          const { record, currentAdmin } = context;
          await record.update({ banned: true });
          return {
            record: record.toJSON(currentAdmin),
            notice: { message: 'تم حظر الوكالة بنجاح', type: 'success' },
          };
        },
        isAccessible: ({ record }) => record && record.param('banned') === false,
        component: false,
      },
      unbanAgency: {
        actionType: 'record',
        icon: 'Unlock',
        label: 'Unban Agency',
        handler: async (request, response, context) => {
          const { record, currentAdmin } = context;
          await record.update({ banned: false });
          return {
            record: record.toJSON(currentAdmin),
            notice: { message: 'تم إلغاء حظر الوكالة بنجاح', type: 'success' },
          };
        },
        isAccessible: ({ record }) => record && record.param('banned') === true,
        component: false,
      },
    },
  },
};

export default creditAgencyResource;
