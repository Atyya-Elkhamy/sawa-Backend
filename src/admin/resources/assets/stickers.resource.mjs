// FILE: src/admin/resources/stickerResource.js

import Sticker from '../../../models/chat/sticker.model.js';
import { componentLoader, Components } from '../components/component-loader.mjs';
import setFullUrl from '../utils/set-full-url.mjs';
import awsUploadFeature from '../../config/upload.mjs';
const stickerResource = {
  resource: Sticker,
  options: {
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
        isVisible: { list: true, edit: true, filter: true, show: true },
        components: {
          list: Components.CustomUploadShowComponent,
          show: Components.CustomUploadShowComponent,
        },
      },
      name: { type: 'string', isTitle: true, isRequired: true },
      category: { type: 'string', isRequired: true },
      type: {
        type: 'string',
        availableValues: [
          { value: 'free', label: 'مجاني' },
          { value: 'pro', label: 'محترف' },
          { value: 'vip', label: 'VIP' },
        ],
        isRequired: true,
      },
      duration: { type: 'number', isRequired: false },
      createdAt: { type: 'date', isVisible: { list: true, edit: false, filter: true, show: true } },
    },
    listProperties: ['image', 'name', 'category', 'type', 'duration', 'createdAt'],
    editProperties: ['image', 'imageFile', 'name', 'category', 'type', 'duration', 'file', 'fileUpload'],
    showProperties: ['image', 'name', 'file', 'category', 'type', 'duration', 'createdAt'],
    filterProperties: ['name', 'category', 'type', 'duration', 'createdAt'],
    navigation: {
      name: 'إدارة الأصول',
      icon: 'Package',
    },
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) => {
          return currentAdmin && (currentAdmin.role === 'superadmin' || currentAdmin.role === 'support');
        },
      },
      new: {
        after: async (response, request, context) => {
          await setFullUrl(response, context, 'image', 'stickers/images');
          await setFullUrl(response, context, 'file', 'stickers/files');
          return response;
        },
      },
      edit: {
        after: async (response, request, context) => {
          await setFullUrl(response, context, 'image', 'stickers/images');
          await setFullUrl(response, context, 'file', 'stickers/files');
          return response;
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

export default stickerResource;
