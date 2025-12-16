// FILE: src/admin/resources/itemResource.js

import Item from '../../../models/item.model.js';
import { Components } from '../components/component-loader.mjs';
import setFullUrl from '../utils/set-full-url.mjs';
import awsUploadFeature from '../../config/upload.mjs';
import { ValidationError } from 'adminjs';

const itemResource = {
  resource: Item,
  options: {
    isVisible: ({ currentAdmin }) => {
      return currentAdmin && (currentAdmin.role === 'superadmin' || currentAdmin.role === 'support');
    },
    isAccessible: ({ currentAdmin }) => {
      return currentAdmin && (currentAdmin.role === 'superadmin' || currentAdmin.role === 'support');
    },
    properties: {
      image: {
        type: 'string',
        isVisible: { list: true, edit: true, filter: true, show: true },
        components: {
          list: Components.CustomUploadShowComponent,
          show: Components.CustomUploadShowComponent,
        },
      },
      file: {
        type: 'string',
        isVisible: { list: false, edit: true, filter: false, show: true },
      },
      name: { type: 'string', isTitle: true, isRequired: true, unique: true },
      type: { type: 'string', isRequired: true },
      price: { type: 'number', isRequired: true },
      description: { type: 'string' },
      isTopProduct: { type: 'boolean', isVisible: true },
      isHidden: { type: 'boolean', isVisible: true },
      createdAt: { type: 'date', isVisible: { list: true, edit: false, filter: true, show: true } },
      vipLevel: { type: 'string', isVisible: true },
      vipOnly: { type: 'boolean', isVisible: false },
    },
    listProperties: ['image', 'name', 'type', 'price', 'isTopProduct', 'isHidden', 'createdAt', 'vipLevel'],
    editProperties: [
      'name',
      'type',
      'price',
      'image',
      'file',
      'description',
      'isTopProduct',
      'isHidden',
      'imageFile',
      'fileUpload',
      'vipLevel',
      'vipOnly',
    ],
    showProperties: [
      'image',
      'file',
      'name',
      'type',
      'price',
      'description',
      'isTopProduct',
      'isHidden',
      'createdAt',
      'vipLevel',
      'vipOnly',
    ],
    filterProperties: ['name', 'type', 'isTopProduct', 'isHidden', 'createdAt', 'vipLevel', 'vipOnly'],
    navigation: {
      name: 'إدارة الأصول',
      icon: 'Package',
      parent: {
        name: 'إدارة الأصول',
        icon: 'Package',
      },
    },
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) => {
          return currentAdmin && (currentAdmin.role === 'superadmin' || currentAdmin.role === 'support');
        },
      },

      new: {
        after: async (response, request, context) => {
          await setFullUrl(response, context, 'image', 'items/images');
          await setFullUrl(response, context, 'file', 'items/files');

          if (response.record.params.vipLevel !== '0') {
            response.record.params.vipOnly = true;
            context.record.save();
          }
          return response;
        },
      },
      edit: {
        after: async (response, request, context) => {
          await setFullUrl(response, context, 'image', 'items/images');
          await setFullUrl(response, context, 'file', 'items/files');
          // Set vipOnly to true if vipLevel is not 0
          if (response.record.params.vipLevel !== '0') {
            response.record.params.vipOnly = true;
            context.record.save();
          }

          if (response.record.params.vipLevel === '0') {
            response.record.params.vipOnly = false;
            context.record.save();
          }

          return response;
        },
      },
      delete: {
        before: async (request, context) => {
          const { record } = context;
          const BoughtItem = (await import('../../../models/boughtItem.model.js')).default;

          // Check if there are any bought items for this item
          const boughtCount = await BoughtItem.countDocuments({ item: record.id() });
          if (boughtCount > 0) {
            // Prevent deletion and show a message
            throw new ValidationError({}, {
              message: 'لا يمكن حذف هذا العنصر لأنه تم شراؤه من قبل المستخدمين. يمكنك إخفاؤه بدلاً من ذلك عن طريق تعيين "isHidden" إلى true.',
            });
          }

          // If no bought items, allow deletion
          return request;
        },
      },
      bulkDelete: {
        before: async (request, context) => {
          const { records } = context;
          const BoughtItem = (await import('../../../models/boughtItem.model.js')).default;

          // Check if any of the selected items have been bought
          const itemsWithBoughtItems = [];
          for (const record of records) {
            const boughtCount = await BoughtItem.countDocuments({ item: record.id() });
            if (boughtCount > 0) {
              itemsWithBoughtItems.push(record.params.name || record.id());
            }
          }

          if (itemsWithBoughtItems.length > 0) {
            // Prevent bulk deletion and show message
            throw new ValidationError({}, {
              message: `لا يمكن حذف العناصر التالية لأنها تم شراؤها من قبل المستخدمين: ${itemsWithBoughtItems.join(', ')}. يمكنك إخفاؤها بدلاً من ذلك.`,
            });
          }

          // If no items have been bought, allow bulk deletion
          await Promise.all(records.map((record) => BoughtItem.deleteByItem(record.id())));
          return request;
        },
      },
      vipItems: {
        actionType: 'resource',
        icon: 'Star',
        label: 'VIP Items',
        component: false, // Set to false as this action does not require a custom component
        handler: async (request, response, context) => {
          const { h } = context;
          const redirectUrl = h.listUrl('Item', `?filters.vipOnly=true`);
          return { redirectUrl };
        },
      },
    },
  },
  features: [
    awsUploadFeature({
      properties: {
        key: 'image',
        file: 'imageFile',
        filePath: 'imagePath',
        filesToDelete: 'imageFilesToDelete',
        mimeType: 'imageMimeType',
        size: 'imageSize',
        bucket: 'imageBucket',
      },
    }),
    awsUploadFeature({
      properties: {
        key: 'file',
        file: 'fileUpload',
        filePath: 'fileFilePath',
        filesToDelete: 'fileFilesToDelete',
        mimeType: 'fileMimeType',
        size: 'fileSize',
        bucket: 'fileBucket',
      },
    }),
  ],
};

export default itemResource;
