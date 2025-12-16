import Gift from '../../../models/gift.model.js';
import { Components } from '../components/component-loader.mjs';
import setFullUrl from '../utils/set-full-url.mjs';
import awsUploadFeature from '../../config/upload.mjs';

const giftResource = {
  resource: Gift,
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
        isVisible: { list: false, edit: true, filter: false, show: true },
      },
      name: { type: 'string', isTitle: true, isRequired: true },
      price: { type: 'number', isRequired: true },
      category: {
        type: 'reference',
        reference: 'GiftCategory',
        isRequired: true,
      },
      gameMultiplier: { type: 'number', default: 1 },
      duration: { type: 'number', isRequired: false },
      type: {
        type: 'string',
        availableValues: [
          { value: 'free', label: 'مجاني' },
          { value: 'pro', label: 'محترف' },
          { value: 'vip', label: 'VIP' },
        ],
      },
      hidden: { type: 'boolean', default: false },
    },
    listProperties: ['image', 'name', 'price', 'category', 'type', 'duration', 'hidden'],
    editProperties: [
      'name',
      'price',
      'category',
      'type',
      'gameMultiplier',
      'duration',
      'image',
      'file',
      'hidden',
      'imageFile',
      'fileUpload',
    ],
    showProperties: ['image', 'file', 'name', 'price', 'category', 'type', 'gameMultiplier', 'duration', 'hidden'],
    filterProperties: ['name', 'category', 'type', 'duration', 'hidden'],
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
      new: {
        after: async (response, request, context) => {
          await setFullUrl(response, context, 'image', 'gifts/images');
          await setFullUrl(response, context, 'file', 'gifts/files');
          return response;
        },
      },
      edit: {
        after: async (response, request, context) => {
          await setFullUrl(response, context, 'image', 'gifts/images');
          await setFullUrl(response, context, 'file', 'gifts/files');
          console.log('response', response);
          return response;
        },
      },
      hide: {
        actionType: 'record',
        icon: 'VisibilityOff',
        isVisible: (context) => !context.record.params.hidden,
        component: false,
        handler: async (request, response, context) => {
          const { record } = context;
          await record.update({ hidden: true });
          return {
            record: record.toJSON(context.currentAdmin),
            notice: {
              message: 'تم إخفاء الهدية بنجاح',
              type: 'success',
            },
          };
        },
      },
      show: {
        actionType: 'record',
        icon: 'Visibility',
        isVisible: (context) => context.record.params.hidden,
        component: false,
        handler: async (request, response, context) => {
          const { record } = context;
          await record.update({ hidden: false });
          return {
            record: record.toJSON(context.currentAdmin),
            notice: {
              message: 'تم إظهار الهدية بنجاح',
              type: 'success',
            },
          };
        },
      },
      delete: {
        before: async (request, context) => {
          // This will ensure the pre-delete hooks are triggered
          const { record } = context;
          const BoughtGift = (await import('../../../models/boughtGifts.model.js')).default;
          const GameGiftTransaction = (await import('../../../models/games/game.gift.transaction.model.js')).default;
          const StrangerGift = (await import('../../../models/extra/strangerGift.model.js')).default;
          const Achievement = (await import('../../../models/extra/achievement.model.js')).default;
          const Game = (await import('../../../models/games/game.model.js')).default;
          const ChargePrize = (await import('../../../models/accumulatedCharge/prizes.charge.model.js')).default;

          await Promise.all([
            BoughtGift.deleteByGift(record.id()),
            GameGiftTransaction.deleteByGift(record.id()),
            StrangerGift.deleteByGift(record.id()),
            Achievement.deleteByGift(record.id()),
            Game.removeGiftReference(record.id()),
            ChargePrize.removeGiftReference(record.id()),
          ]);
          return request;
        },
      },
      bulkDelete: {
        before: async (request, context) => {
          // Handle bulk delete to ensure related documents are deleted
          const { records } = context;
          const BoughtGift = (await import('../../../models/boughtGifts.model.js')).default;
          const GameGiftTransaction = (await import('../../../models/games/game.gift.transaction.model.js')).default;
          const StrangerGift = (await import('../../../models/extra/strangerGift.model.js')).default;
          const Achievement = (await import('../../../models/extra/achievement.model.js')).default;
          const Game = (await import('../../../models/games/game.model.js')).default;
          const ChargePrize = (await import('../../../models/accumulatedCharge/prizes.charge.model.js')).default;

          await Promise.all(
            records.map((record) =>
              Promise.all([
                BoughtGift.deleteByGift(record.id()),
                GameGiftTransaction.deleteByGift(record.id()),
                StrangerGift.deleteByGift(record.id()),
                Achievement.deleteByGift(record.id()),
                Game.removeGiftReference(record.id()),
                ChargePrize.removeGiftReference(record.id()),
              ])
            )
          );
          return request;
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

export default giftResource;
