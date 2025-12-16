import GiftCategory from '../../../models/giftCategory.model.js';
import Gift from '../../../models/gift.model.js';
import { ValidationError } from 'adminjs';
const categoryResource = {
  resource: GiftCategory,
  options: {
    isVisible: ({ currentAdmin }) => {
      return (
        currentAdmin &&
        (currentAdmin.role === 'superadmin' ||
          currentAdmin.role === 'support')
      );
    },

    isAccessible: ({ currentAdmin }) => {
      return (
        currentAdmin &&
        (currentAdmin.role === 'superadmin' ||
          currentAdmin.role === 'support')
      );
    },

    properties: {
      name: { type: 'string', isTitle: true, isRequired: true },
      nameAr: { type: 'string', isRequired: true },
    },
    listProperties: ['name', 'nameAr'],
    editProperties: ['name', 'nameAr'],
    showProperties: ['name', 'nameAr'],
    filterProperties: ['name', 'nameAr'],
    navigation: {
      name: 'إدارة الأصول',
      icon: 'Package',
    },
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) => {
          return (
            currentAdmin &&
            (currentAdmin.role === 'superadmin' ||
              currentAdmin.role === 'support')
          );
        },
      },
      delete: {
        before: async (request, context) => {
          const { record, currentAdmin } = context;
          const giftCount = await Gift.countDocuments({ category: record.params._id });
          console.log(`Gift count for category ${record.params._id}: ${giftCount}`);
          if (giftCount > 0) {
            throw new ValidationError({}, {
              message: 'لا يمكن حذف هذا التصنيف لأنه يحتوي على هدايا مرتبطة به.',
            });
          }
          return request;
        },
      },
      bulkDelete: {
        before: async (request, context) => {
          const { records } = context;
          const recordsWithGifts = [];
          for (const record of records) {
            const giftCount = await Gift.countDocuments({ category: record.params._id });
            if (giftCount > 0) {
              recordsWithGifts.push(record.params.name);
            }
          }
          if (recordsWithGifts.length > 0) {
            throw new ValidationError({}, {
              message: `لا يمكن حذف هذه الفئات: ${recordsWithGifts.join(', ')} لأنها تحتوي على هدايا مرتبطة بها.`,
            });
          }
          return request;
        },
      },
    },
  },
};

export default categoryResource;
