import DeviceToken, { deviceTokenTypes } from '../../../models/auth/deviceToken.model.js';
import Token from '../../../models/auth/token.model.js';
import messageSender from '../../../services/chat/messageSender.js';

const deviceTokenResource = {
  resource: DeviceToken,
  options: {
    isVisible: ({ currentAdmin }) => {
      return (
        currentAdmin &&
        ['superadmin', 'support', 'manager'].includes(currentAdmin.role)
      );
    },

    isAccessible: ({ currentAdmin }) => {
      return (
        currentAdmin &&
        ['superadmin', 'support', 'manager'].includes(currentAdmin.role)
      );
    },

    navigation: {
      name: 'إدارة المستخدمين',
      icon: 'Users',
    },

    properties: {
      attributes: { isVisible: false },
      user: {
        reference: 'User',
        isVisible: { list: true, filter: true, show: true, edit: true },
      },
      // token: { isVisible: { list: true, filter: true, show: true, edit: false } },
      blacklisted: {
        type: 'boolean',
        isVisible: { list: true, filter: true, show: true, edit: true },
      },
      blackListExpires: {
        type: 'date',
        isVisible: { list: true, filter: true, show: true, edit: true },
      },
      type: {
        availableValues: [
          { value: deviceTokenTypes.PHONE, label: 'Phone' },
          { value: deviceTokenTypes.GOOGLE, label: 'Google' },
          { value: deviceTokenTypes.FACEBOOK, label: 'Facebook' },
        ],
        isVisible: { list: true, filter: true, show: true, edit: false },
      },
    },
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) => {
          return (
            currentAdmin &&
            ['superadmin', 'support', 'manager'].includes(currentAdmin.role)
          );
        },

      },
      blacklistUser: {
        actionType: 'record',
        icon: 'Block',
        label: 'Blacklist User',
        handler: async (request, response, context) => {
          const { record, currentAdmin } = context;

          // Identify all users connected to the same device token
          const tokenValue = record.param('token');

          // Blacklist all device token records with this token
          // Permanent blacklist by default (no expiry) unless a date is provided
          const blackListExpires = request?.payload?.blackListExpires || null;
          await DeviceToken.updateMany(
            { token: tokenValue },
            { $set: { blacklisted: true, blackListExpires } }
          );

          // Fetch all users tied to this token
          const devices = await DeviceToken.find({ token: tokenValue }).select('user').lean();
          const userIds = Array.from(new Set(devices.map((d) => String(d.user)).filter(Boolean)));

          // Delete all access tokens associated with these users (logs them out)
          if (userIds.length) {
            await Token.deleteMany({ user: { $in: userIds } });
          }

          // Notify all affected users via socket
          await Promise.all(
            userIds.map((uid) =>
              messageSender
                .sendToUser(
                  'userBlacklisted',
                  {
                    userId: uid,
                    message: 'Your account has been banned',
                    messageAr: 'تم حظر حسابك',
                    expiresAt: blackListExpires,
                  },
                  uid,
                  false
                )
                .catch(() => { })
            )
          );

          // Ensure the returned record reflects the latest state in AdminJS UI
          await record.update({ blacklisted: true, blackListExpires });

          return {
            record: record.toJSON(currentAdmin),
            notice: {
              message: `تم إدراج ${userIds.length || 1} مستخدم(ين) والرموز المرتبطة في القائمة السوداء بنجاح.`,
              type: 'success',
            },
          };
        },
        component: false, // Use default AdminJS component for action
      },
      blacklistUser1Week: {
        actionType: 'record',
        icon: 'Block',
        label: 'Blacklist 1 Week',
        handler: async (request, response, context) => {
          const { record, currentAdmin } = context;

          const tokenValue = record.param('token');
          const blackListExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

          await DeviceToken.updateMany(
            { token: tokenValue },
            { $set: { blacklisted: true, blackListExpires } }
          );

          const devices = await DeviceToken.find({ token: tokenValue }).select('user').lean();
          const userIds = Array.from(new Set(devices.map((d) => String(d.user)).filter(Boolean)));

          if (userIds.length) {
            await Token.deleteMany({ user: { $in: userIds } });
          }

          await Promise.all(
            userIds.map((uid) =>
              messageSender
                .sendToUser(
                  'userBlacklisted',
                  {
                    userId: uid,
                    message: 'Your account has been banned for 1 week',
                    messageAr: 'تم حظر حسابك لمدة أسبوع',
                    expiresAt: blackListExpires,
                  },
                  uid,
                  false
                )
                .catch(() => { })
            )
          );

          await record.update({ blacklisted: true, blackListExpires });

          return {
            record: record.toJSON(currentAdmin),
            notice: {
              message: `تم حظر ${userIds.length || 1} مستخدم(ين) لمدة أسبوع.`,
              type: 'success',
            },
          };
        },
        component: false,
      },
      blacklistUser1Month: {
        actionType: 'record',
        icon: 'Block',
        label: 'Blacklist 1 Month',
        handler: async (request, response, context) => {
          const { record, currentAdmin } = context;

          const tokenValue = record.param('token');
          const blackListExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

          await DeviceToken.updateMany(
            { token: tokenValue },
            { $set: { blacklisted: true, blackListExpires } }
          );

          const devices = await DeviceToken.find({ token: tokenValue }).select('user').lean();
          const userIds = Array.from(new Set(devices.map((d) => String(d.user)).filter(Boolean)));

          if (userIds.length) {
            await Token.deleteMany({ user: { $in: userIds } });
          }

          await Promise.all(
            userIds.map((uid) =>
              messageSender
                .sendToUser(
                  'userBlacklisted',
                  {
                    userId: uid,
                    message: 'Your account has been banned for 1 month',
                    messageAr: 'تم حظر حسابك لمدة شهر',
                    expiresAt: blackListExpires,
                  },
                  uid,
                  false
                )
                .catch(() => { })
            )
          );

          await record.update({ blacklisted: true, blackListExpires });

          return {
            record: record.toJSON(currentAdmin),
            notice: {
              message: `تم حظر ${userIds.length || 1} مستخدم(ين) لمدة شهر.`,
              type: 'success',
            },
          };
        },
        component: false,
      },
      unblacklistUser: {
        actionType: 'record',
        icon: 'CheckCircle',
        label: 'Unblacklist User',
        handler: async (request, response, context) => {
          const { record, currentAdmin } = context;

          // Identify the device token value
          const tokenValue = record.param('token');

          // Unmark all device token records with this token as not blacklisted
          await DeviceToken.updateMany(
            { token: tokenValue },
            { $set: { blacklisted: false, blackListExpires: null } }
          );

          // Fetch all users tied to this token
          const devices = await DeviceToken.find({ token: tokenValue }).select('user').lean();
          const userIds = Array.from(new Set(devices.map((d) => String(d.user)).filter(Boolean)));

          // Update the single record so AdminJS reflects cleared state
          await record.update({ blacklisted: false, blackListExpires: null });

          return {
            record: record.toJSON(currentAdmin),
            notice: {
              message: `تمت إزالة ${userIds.length || 1} مستخدم(ين) من القائمة السوداء بنجاح.`,
              type: 'success',
            },
          };
        },
        component: false, // Use default AdminJS component for action
        isAccessible: ({ record }) => record && record.param('blacklisted') === true, // Only show if currently blacklisted
      },
    },
  },
};

export const blacklistedDeviceTokenResource = {
  resource: DeviceToken,
  options: {
    id: 'blacklisted',
    navigation: {
      name: 'إدارة المستخدمين',
      icon: 'Users',
    },

    // -------- PROPERTIES --------
    properties: {
      // Hide raw user relation
      user: { isVisible: false },

      // Virtual populated fields from User model
      userName: {
        isVisible: { list: true, show: true },
        label: 'Name',
      },
      userPhone: {
        isVisible: { list: true, show: true },
        label: 'Phone',
      },
      userUserId: {
        isVisible: { list: true, show: true },
        label: 'User Id',
      },

      // DeviceToken fields
      token: { isVisible: { list: false, show: true } },
      type: { isVisible: { list: false, show: true } },
      blacklisted: { isVisible: true },
      blackListExpires: { isVisible: true },

      // Hide internal fields
      _id: { isVisible: false },
      attributes: { isVisible: false },
      createdAt: { isVisible: false },
      updatedAt: { isVisible: false },
    },

    // -------- LIST COLUMNS --------
    listProperties: [
      'userUserId',
      'userName',
      'userPhone',
      'blacklisted',
      'blackListExpires',
    ],

    // -------- ACTIONS --------
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) => {
          return (
            currentAdmin &&
            ['superadmin', 'support', 'manager'].includes(currentAdmin.role)
          );
        },

        // Populate user + force filter
        before: async (request, context) => {
          context.populate = true;

          request.query = {
            ...request.query,
            filters: {
              ...request.query?.filters,
              blacklisted: true, // <----- ONLY show blacklisted devices
            },
          };

          return request;
        },

        // Inject populated user values into virtual fields
        after: async (response) => {
          if (response.records) {
            response.records.forEach((record) => {
              const user = record.populated?.user;
              if (user) {
                record.params.userName = user.params.name;
                record.params.userPhone = user.params.phone;
                record.params.userUserId = user.params.userId;
              }
            });
          }
          return response;
        },
      },

      show: {
        before: async (req, ctx) => {
          ctx.populate = true;
          return req;
        },

        after: async (response) => {
          const record = response.record;
          if (record && record.populated?.user) {
            const user = record.populated.user;

            record.params.userName = user.params.name;
            record.params.userPhone = user.params.phone;
            record.params.userUserId = user.params.userId;
          }
          return response;
        }
      }
    },
  },
};

export default deviceTokenResource;
