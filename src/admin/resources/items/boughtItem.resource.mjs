
// FILE: src/admin/resources/items/boughtItem.resource.mjs
import BoughtItem from '../../../models/boughtItem.model.js';
import UserSpecialId from '../../../models/userSpecialId.model.js';
import Item from '../../../models/item.model.js';

const boughtItemResource = {
  resource: BoughtItem,
  options: {
    isVisible: ({ currentAdmin }) => {
      return (
        currentAdmin &&
        (currentAdmin.role === 'superadmin' ||
          currentAdmin.role === 'support' ||
          currentAdmin.role === 'manager')
      );
    },

    isAccessible: ({ currentAdmin }) => {
      return (
        currentAdmin &&
        (currentAdmin.role === 'superadmin' ||
          currentAdmin.role === 'support' ||
          currentAdmin.role === 'manager')
      );
    },

    properties: {
      user: { type: 'reference', reference: 'User', isRequired: true },
      item: { type: 'reference', reference: 'Item', isRequired: true },
      purchaseDate: {
        type: 'date',
        isVisible: { list: true, edit: false, filter: true, show: true },
      },
      expirationDate: {
        type: 'date',
        isVisible: { list: true, edit: true, filter: true, show: true },
      },
      isHidden: { type: 'boolean', isVisible: true },
      isSelected: { type: 'boolean', isVisible: true },
      'metadata.price': {
        type: 'number',
        isVisible: { list: true, edit: false, filter: false, show: true },
      },
      'metadata.discount': {
        type: 'number',
        isVisible: { list: false, edit: false, filter: false, show: true },
      },
      createdAt: {
        type: 'date',
        isVisible: { list: true, edit: false, filter: true, show: true },
      },
    },

    listProperties: [
      'user',
      'item',
      'purchaseDate',
      'expirationDate',
      'isHidden',
      'isSelected',
      'metadata.price',
      'createdAt',
    ],

    editProperties: ['user', 'item', 'expirationDate', 'isHidden', 'isSelected'],

    showProperties: [
      'user',
      'item',
      'purchaseDate',
      'expirationDate',
      'isHidden',
      'isSelected',
      'metadata.price',
      'metadata.discount',
      'createdAt',
      'updatedAt',
    ],

    filterProperties: [
      'user',
      'item',
      'purchaseDate',
      'expirationDate',
      'isHidden',
      'isSelected',
      'createdAt',
    ],

    navigation: {
      name: 'إدارة الأصول',
      icon: 'Package',
      parent: { name: 'إدارة الأصول', icon: 'Package' },
    },

    actions: {
      list: {
        isVisible: ({ currentAdmin }) => {
          return (
            currentAdmin &&
            (currentAdmin.role === 'superadmin' ||
              currentAdmin.role === 'support' ||
              currentAdmin.role === 'manager')
          );
        },

        isAccessible: ({ currentAdmin }) => {
          return (
            currentAdmin &&
            (currentAdmin.role === 'superadmin' ||
              currentAdmin.role === 'support' ||
              currentAdmin.role === 'manager')
          );
        },

      },
      new: {
        before: async (request, context) => {
          if (request.payload && request.payload.expirationDate) {
            const now = new Date();
            const maxDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
            const expiration = new Date(request.payload.expirationDate);

            if (expiration > maxDate) {
              request.payload.expirationDate = maxDate; // Limit to max 1 month
            }
          }
          return request;
        },
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'manager' || currentAdmin?.role === 'admin',
      },
      edit: {
        isVisible: ({ currentAdmin }) => {
          return currentAdmin && (currentAdmin.role === 'superadmin' || currentAdmin.role === 'support');
        },
        isAccessible: ({ currentAdmin }) => {
          return currentAdmin && (currentAdmin.role === 'superadmin' || currentAdmin.role === 'support');
        },
      },

      cleanExpired: {
        actionType: 'resource',
        icon: 'Delete',
        label: 'Clean Expired Items',
        component: false,
        handler: async () => {
          try {
            await BoughtItem.cleanUpExpiredItems();
            return {
              notice: {
                message: 'تم تنظيف العناصر المنتهية الصلاحية بنجاح',
                type: 'success',
              },
            };
          } catch (error) {
            return {
              notice: {
                message: `خطأ في تنظيف العناصر المنتهية الصلاحية: ${error.message}`,
                type: 'error',
              },
            };
          }
        },
      },

      hide: {
        actionType: 'record',
        icon: 'VisibilityOff',
        isVisible: (context) => !context.record.params.isHidden,
        component: false,
        handler: async (request, response, context) => {
          const { record } = context;
          await record.update({ isHidden: true });
          return {
            record: record.toJSON(context.currentAdmin),
            notice: {
              message: 'تم إخفاء العنصر المشتري بنجاح',
              type: 'success',
            },
          };
        },
      },

      show: {
        actionType: 'record',
        icon: 'Visibility',
        isVisible: (context) => context.record.params.isHidden,
        component: false,
        handler: async (request, response, context) => {
          const { record } = context;
          await record.update({ isHidden: false });
          return {
            record: record.toJSON(context.currentAdmin),
            notice: {
              message: 'تم إظهار العنصر المشتري بنجاح',
              type: 'success',
            },
          };
        },
      },

      delete: {
        isVisible: ({ currentAdmin }) => {
          return currentAdmin && (currentAdmin.role === 'superadmin' || currentAdmin.role === 'support');
        },
        isAccessible: ({ currentAdmin }) => {
          return currentAdmin && (currentAdmin.role === 'superadmin' || currentAdmin.role === 'support');
        },
        actionType: 'record',
        handler: async (request, response, context) => {
          const { record } = context;

          if (!record) {
            return {
              record: record?.toJSON(context.currentAdmin) || {},
              notice: { message: 'العنصر غير موجود', type: 'error' },
            };
          }

          try {
            const boughtItem = await BoughtItem.findById(record.id());
            if (!boughtItem) {
              return {
                record: record.toJSON(context.currentAdmin),
                notice: { message: 'العنصر غير موجود في قاعدة البيانات', type: 'error' },
              };
            }
            const item = await Item.findById(boughtItem.item);
            // Deactivate special ID if exists
            const configModule = await import('../../../config/stores.config.js');
            const { ITEM_TYPES } = configModule;
            if (item?.type === ITEM_TYPES.SPECIAL_ID) {
              // The BoughtItem should contain the linked special ID
              const specialIdToDelete = boughtItem.specialId;
              if (specialIdToDelete) {
                const userSpecial = await UserSpecialId.findOne({
                  _id: specialIdToDelete,
                  user: boughtItem.user,
                });
                console.log('Special ID to delete:', userSpecial);
                if (userSpecial) {
                  // Correct: delete the specific special ID
                  await UserSpecialId.deactivateForUser(boughtItem.user, specialIdToDelete);
                  await UserSpecialId.deleteOne({ _id: specialIdToDelete });
                  // Also deactivate it (if your logic requires both)
                }
              }
              // Reset item flags
              await Item.updateOne(
                { _id: boughtItem.item },
                { $set: { isHidden: false, isTopProduct: true, usedUntil: null } }
              );
            }

            // Delete BoughtItem
            await BoughtItem.deleteOne({ _id: boughtItem._id });
            return {
              record: record.toJSON(context.currentAdmin), // <- must return RecordJSON
              notice: {
                message: 'تم حذف العنصر وكل البيانات المرتبطة به بنجاح',
                type: 'success',
              },
            };
          } catch (err) {
            return {
              record: record.toJSON(context.currentAdmin),
              notice: {
                message: `حدث خطأ أثناء الحذف: ${err.message}`,
                type: 'error',
              },
            };
          }
        },
      },

      bulkDelete: {
        isVisible: ({ currentAdmin }) => {
          return currentAdmin && (currentAdmin.role === 'superadmin' || currentAdmin.role === 'support');
        },
        isAccessible: ({ currentAdmin }) => {
          return currentAdmin && (currentAdmin.role === 'superadmin' || currentAdmin.role === 'support');
        },
      },

    },
  },
};

export default boughtItemResource;
