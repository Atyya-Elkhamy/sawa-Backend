import { v4 as uuidv4 } from 'uuid';
import SystemMessage from '../../../models/chat/systemMessages.model.js';
import awsUploadFeature from '../../config/upload.mjs';
import { componentLoader, Components } from '../components/component-loader.mjs';
import setFullUrl from '../utils/set-full-url.mjs';

const systemMessageResource = {
  resource: SystemMessage,
  options: {
    isVisible: ({ currentAdmin }) => {
      return currentAdmin && currentAdmin.role === 'superadmin';
    },
    isAccessible: ({ currentAdmin }) => {
      return currentAdmin && currentAdmin.role === 'superadmin';
    },
    navigation: ({ currentAdmin }) =>
      currentAdmin?.role === 'superadmin' ? { name: 'إدارة الرسائل', icon: 'MessageSquare' } : null,
    // individual only filter
    // href: '/admin/resources/SystemMessage?page=1&filters.senderType=individual',
    properties: {
      senderType: {
        type: 'string',
        isVisible: { list: true, filter: true, show: true, edit: true },
        availableValues: [
          { value: 'individual', label: 'فردي' },
          { value: 'broadcast', label: 'بث' },
          { value: 'broadcastOnScreen', label: 'بث على الشاشة' },
        ],
      },
      receiverId: {
        reference: 'User',
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: (context) => context.record?.param('senderType') === 'individual',
        },
        custom: {
          isRequired: (context) => context.record?.param('senderType') === 'individual',
        },
      },
      'content.text': { isVisible: { list: true, show: true, edit: true } },
      'content.textAr': { isVisible: { list: false, show: true, edit: true } },
      'content.image': {
        type: 'string',
        isVisible: { list: true, edit: true, filter: true, show: true },
        components: {
          list: Components.CustomUploadShowComponent,
          show: Components.CustomUploadShowComponent,
        },
      },
      'content.imageUrl': {
        type: 'string',
        isVisible: { list: true, edit: true, filter: true, show: true },
        components: {
          list: Components.CustomUploadShowComponent,
          show: Components.CustomUploadShowComponent,
        },
      },
      'content.link': { isVisible: { list: false, show: true, edit: true } },
      isRead: {
        type: 'boolean',
        isVisible: { list: false, filter: false, show: false, edit: false },
      },
      createdAt: { isVisible: { list: true, filter: true, show: true, edit: false } },
    },
    listProperties: ['senderType', 'receiverId', 'content.text', 'createdAt'],
    showProperties: [
      'senderType',
      'receiverId',
      'content.text',
      'content.textAr',
      'content.image',
      'content.imageUrl',
      'content.link',
      'createdAt',
    ],
    editProperties: [
      'senderType',
      'receiverId',
      'content.text',
      'content.textAr',
      'content.image',
      'content.imageUrl',
      'content.link',
      'fileUpload',
    ],
    filterProperties: ['senderType', 'receiverId'],
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) => {
          return currentAdmin && currentAdmin.role === 'superadmin';
        }
      },
      new: {
        after: async (response, request, context) => {
          const { record } = context;
          await setFullUrl(response, context, 'image', 'systemMessages');

          console.log('image', record.param('image'))
          // Update content.imageUrl with the processed image URL
          if (record.param('image')) {
            await context.record.update({ 'content.imageUrl': record.param('image') });
            const message = await SystemMessage.findByIdAndUpdate(record.id(), { 'content.imageUrl': record.param('image') });
            console.log('Updated message:', message);
          }

          // Check if it's a broadcast message
          if (record.param('senderType') === 'broadcast') {
            const broadCastId = uuidv4();

            // Create the broadcast message using the new system
            await SystemMessage.broadcastMessage({
              content: {
                text: record.param('content.text'),
                textAr: record.param('content.textAr'),
                imageUrl: record.param('content.imageUrl'),
                link: record.param('content.link'),
              },
              broadCastId,
              messageId: record.id ? record.id : record._id,
            });

            return {
              ...response,
              notice: {
                message: 'تم إرسال رسالة البث بنجاح.',
                type: 'success',
              },
            };
          }

          if (record.param('senderType') === 'broadcastOnScreen') {
            // Send broadcast on screen to all users
            await SystemMessage.broadcastOnScreen({
              content: {
                text: record.param('content.text'),
                textAr: record.param('content.textAr'),
                imageUrl: record.param('content.imageUrl'),
                link: record.param('content.link'),
              },
            });

            return {
              ...response,
              notice: {
                message: 'تم إرسال رسالة البث على الشاشة بنجاح.',
                type: 'success',
              },
            };
          }
          if (record.param('senderType') === 'individual') {
            await SystemMessage.sendMessage({
              content: {
                text: record.param('content.text'),
                textAr: record.param('content.textAr'),
                imageUrl: record.param('content.imageUrl'),
                link: record.param('content.link'),
              },
              receiverId: record.param('receiverId'),
            });
          }

          return response;
        },
      },
      edit: {
        after: async (response, request, context) => {
          const { record } = context;
          await setFullUrl(response, context, 'image', 'systemMessages');

          // Update content.imageUrl with the processed image URL
          if (record.param('image')) {
            await context.record.update({ 'content.imageUrl': record.param('image') });
            await SystemMessage.findByIdAndUpdate(record.id(), { 'content.imageUrl': record.param('image') });
          }

          return response;
        },
      },
    },
  },
  features: [
    awsUploadFeature({
      componentLoader,
      properties: {
        key: 'image',
        file: 'fileUpload',
        filePath: 'imagePath',
        filesToDelete: 'imageFilesToDelete',
        mimeType: 'imageMimeType',
        size: 'imageSize',
        bucket: 'imageBucket',
      },
    }),
  ],
};


export const broadCastSystemMessageResource = {
  resource: SystemMessage,
  options: {
    id: 'Broadcast',
    isVisible: ({ currentAdmin }) => currentAdmin?.role === 'superadmin',
    isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'superadmin',

    navigation: ({ currentAdmin }) =>
      currentAdmin?.role === 'superadmin' ? { name: 'إدارة الرسائل', icon: 'MessageSquare' } : null,

    // href: '/admin/resources/SystemMessage?page=1&filters.broadCastMain=true',

    actions: {
      list: {
        isAccessible: ({ currentAdmin }) => {
          return currentAdmin && currentAdmin.role === 'superadmin';
        }
      },
    },
  },
};


export default systemMessageResource;
