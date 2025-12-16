// FILE: src/admin/resources/userResource.js

import bcrypt from 'bcryptjs';
import User from '../../../models/user.model.js';
import { componentLoader, Components } from '../components/component-loader.mjs';
import { searchHandler } from '../../utils/searchHandler.mjs';
import { deleteTokens } from '../../../services/token.service.js';
import levelService from '../../../services/extra/level.service.js';
import chargeService from '../../../services/charge.service.js';
import profileService from '../../../services/profile.service.js';


const userResource = {
  resource: User,
  options: {
    isVisible: ({ currentAdmin }) => {
      return currentAdmin && (currentAdmin.role === 'superadmin');
    },
    isAccessible: ({ currentAdmin }) => {
      return currentAdmin && (currentAdmin.role === 'superadmin');
    },
    navigation: {
      name: 'إدارة المستخدمين',
      icon: 'Users',
    },

    properties: {
      name: {
        isVisible: true,
      },
      avatar: {
        type: 'string',
        isVisible: true,
        components: {
          list: Components.CustomUploadShowComponent,
          show: Components.CustomUploadShowComponent,
        },
      },
      phone: {
        isVisible: true,
      },
      userId: {
        isVisible: true,
      },
      isSuperAdmin: {
        type: 'boolean',
        isVisible: true,
      },
      credits: {
        isVisible: true,
      },
      totalChargedAmount: {
        type: 'number',
        isVisible: true,
      },

      // Fields managers can edit
      'vip.level': {
        type: 'number',
        isVisible: true,
        isDisabled: false,
      },
      'vip.expirationDate': {
        type: 'date',
        isVisible: true,
        isDisabled: false,
      },
      'pro.expirationDate': {
        type: 'date',
        isVisible: true,
        isDisabled: false,
      },
      'specialId.expirationDate': {
        type: 'date',
        isVisible: true,
        isDisabled: false,
      },
      levelPoints: {
        type: 'number',
        isVisible: true,
        isDisabled: false,
      },
      // Hidden fields
      isEmailVerified: { isVisible: false },
      isCustomerService: { isVisible: false },
      deviceToken: { isVisible: false },
      googleId: { isVisible: false },
      facebookId: { isVisible: false },
    },

    listProperties: [
      'avatar',
      'userId',
      'name',
      'phone',
      'isSuperAdmin',
      'credits',
      'vip.level',
      'pro.expirationDate',
    ],
    editProperties: [
      'avatar',
      'userId',
      'name',
      'phone',
      'isSuperAdmin',
      'credits',
      'vip.level',
      'vip.expirationDate',
      'pro.expirationDate',
      'specialId.expirationDate',
      'levelPoints',
      'totalChargedAmount',
    ],
    showProperties: [
      'avatar',
      'userId',
      'name',
      'phone',
      'isSuperAdmin',
      'credits',
      'vip.level',
      'vip.expirationDate',
      'pro.expirationDate',
      'levelPoints',
      'totalChargedAmount',
    ],
    filterProperties: [
      'userId',
      'name',
      'phone',
      'isSuperAdmin',
      'vip.level',
      'vip.expirationDate',
      'pro.expirationDate',
      'levelPoints',
      'totalChargedAmount',
    ],
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) => {
          return currentAdmin && (currentAdmin.role === 'superadmin');
        },
      },
      new: {
        isVisible: false,
      },
      delete: {
        isAccessible: ({ currentAdmin }) =>
          currentAdmin && currentAdmin.role === 'superadmin',
        isVisible: true,
        before: async (request, context) => {
          const { record } = context;
          const userId = record.param('_id');
          console.log(`Admin initiated delete for user ${userId}`);
          try {
            // Call the cascading delete function directly from the User model
            await User.deleteUserAssociatedData(userId);
            console.log(`Cascading delete completed for user ${userId}`);
          } catch (error) {
            console.error(`Error during cascading delete for user ${userId}:`, error);
            throw new Error(`Failed to delete associated data: ${error.message}`);
          }
          return request;
        },
        after: async (response, request, context) => {
          const { record } = context;
          console.log(`Successfully deleted user and all associated data`);
          return response;
        },
      },
      edit: {
        before: async (request, context) => {

          const { record } = context;

          // Check if 'userId' is being updated and ensure it's unique
          if (request.payload && request.payload.userId && request.payload.userId !== record.params.userId) {
            const existingUser = await User.findOne({
              userId: request.payload.userId,
            });
            if (existingUser) {
              throw new Error('The userId already exists. Please choose a different userId.');
            }
          }

          // Hash the password if it's being changed
          if (request.payload && request.payload.password) {
            // If the password is changed, hash it
            if (request.payload.password !== record.params.password) {
              request.payload.password = await bcrypt.hash(request.payload.password, 8);
            }
          } else {
            // Prevent password from being set to empty string if not changed
            delete request.payload.password;
          }

          // Recalculate levels if levelPoints or totalChargedAmount are being changed
          if (request.payload && (request.payload.levelPoints !== undefined || request.payload.totalChargedAmount !== undefined)) {
            const userId = record.param('_id');
            const user = await User.findById(userId);

            if (!user) {
              throw new Error('User not found');
            }

            const oldLevel = user.level;
            const oldChargeLevel = user.chargeLevel;

            // Recalculate level if levelPoints changed
            if (request.payload.levelPoints !== undefined && request.payload.levelPoints !== user.levelPoints) {
              const newLevel = levelService.calculateLevel(request.payload.levelPoints);
              const newWeeklyGifts = Math.floor(newLevel / 40) * 10; // Calculate weekly gifts

              request.payload.level = newLevel;
              request.payload.weeklyGifts = newWeeklyGifts;

              // Check and award level items if reached new tier
              if (newLevel > oldLevel) {
                // Create a mock user object with new level for the award function
                const mockUser = { ...user.toObject(), level: newLevel };
                await levelService.checkAndAwardLevelItem(mockUser, oldLevel);
              }
            }

            // Recalculate charge level if totalChargedAmount changed
            if (request.payload.totalChargedAmount !== undefined && request.payload.totalChargedAmount !== user.totalChargedAmount) {
              const newChargeLevel = chargeService.calculateChargeLevel(request.payload.totalChargedAmount);
              request.payload.chargeLevel = newChargeLevel;
            }

          }

          // Handle VIP subscription changes
          if (request.payload && (request.payload['vip.level'] !== undefined || request.payload['vip.expirationDate'] !== undefined)) {
            const userId = record.param('_id');
            const newLevel = request.payload['vip.level'] !== undefined ? request.payload['vip.level'] : record.params['vip.level'];
            const newExpirationDate = request.payload['vip.expirationDate'] !== undefined ? request.payload['vip.expirationDate'] : record.params['vip.expirationDate'];

            await profileService.vipSubscribed(userId, newLevel, newExpirationDate, 0, true);
          }

          return request;
        },
        // component: Components.RoleBasedEdit,
      },
      search: searchHandler,
      // action to delete all tokens for a user and device tokens
      deleteTokens: {
        isAccessible: ({ currentAdmin }) =>
          currentAdmin && currentAdmin.role === 'superadmin',
        actionType: 'record',
        icon: 'Delete',
        component: false,

        label: 'تسجيل الخروج من جميع الأجهزة',
        handler: async (request, response, context) => {
          const { record } = context;
          const userId = record.param('_id');

          // Delete all tokens associated with this user
          await deleteTokens(userId, false);

          return {
            record: record.toJSON(context.currentAdmin),
            notice: {
              message: `تم حذف جميع الرموز المميزة للمستخدم.`,
              type: 'success',
            },
          };
        },
      },
      // action to delete all device tokens for a user
      deleteDeviceTokens: {
        isAccessible: ({ currentAdmin }) =>
          currentAdmin && currentAdmin.role === 'superadmin',
        actionType: 'record',
        icon: 'Delete',
        component: false,

        label: 'حذف الاجهزة المتصله',
        handler: async (request, response, context) => {
          const { record } = context;
          const userId = record.param('_id');

          // Delete all device tokens associated with this user
          await deleteTokens(userId, true);

          return {
            record: record.toJSON(context.currentAdmin),
            notice: {
              message: `تم حذف جميع رموز الأجهزة للمستخدم.`,
              type: 'success',
            },
          };
        },
      },
    },
  },
};

export default userResource;

