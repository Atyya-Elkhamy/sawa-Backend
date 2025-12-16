import RoomAsset from '../../../models/room/roomAsset.model.js';
import { componentLoader, Components } from '../components/component-loader.mjs';
import setFullUrl from '../utils/set-full-url.mjs';
import awsUploadFeature from '../../config/upload.mjs';
import { ItemTypesArray } from '../../../config/room/general.config.js';

const roomAssetResource = {
  resource: RoomAsset,
  options: {
    properties: {
      name: {
        type: 'string',
        isTitle: true,
        isRequired: true
      },
      roomId: {
        type: 'reference',
        reference: 'Room',
        isVisible: { list: true, edit: true, filter: true, show: true },
        description: 'Leave empty for general room assets',
      },
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
      type: {
        type: 'string',
        availableValues: ItemTypesArray.map(type => ({ value: type, label: type })),
        isRequired: true,
      },
      isPro: {
        type: 'boolean',
        default: false
      },
      isHidden: {
        type: 'boolean',
        default: false
      },
      isGeneral: {
        type: 'boolean',
        default: false
      },
    },
    listProperties: ['image', 'name', 'roomId', 'type', 'isPro', 'isHidden', 'isGeneral'],
    editProperties: [
      'name',
      'roomId',
      'type',
      'isPro',
      'isHidden',
      'isGeneral',
      'image',
      'file',
      'imageFile',
      'fileUpload',
    ],
    showProperties: ['image', 'file', 'name', 'roomId', 'type', 'isPro', 'isHidden', 'isGeneral', 'createdAt', 'updatedAt'],
    filterProperties: ['name', 'roomId', 'type', 'isPro', 'isHidden', 'isGeneral'],
    navigation: {
      name: 'إدارة الغرف',
      icon: 'Home',
    },
    sort: {
      sortBy: 'createdAt',
      direction: 'desc',
    },
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) => {
         
          return currentAdmin && currentAdmin.role === 'superadmin';
        }
      },
      showGeneralAssets: {
        actionType: 'resource',
        icon: 'Home',
        label: 'عرض أصول الغرف العامة',
        component: false,
        handler: async (request, response, context) => {
          // Redirect to list view with isGeneral filter
          return {
            redirectUrl: '/admin/resources/RoomAsset?filters.isGeneral=true',
          };
        },
      },
      new: {
        after: async (response, request, context) => {
          await setFullUrl(response, context, 'image', 'room-assets/images');
          await setFullUrl(response, context, 'file', 'room-assets/files');
          return response;
        },
      },
      edit: {
        after: async (response, request, context) => {
          await setFullUrl(response, context, 'image', 'room-assets/images');
          await setFullUrl(response, context, 'file', 'room-assets/files');
          return response;
        },
      },
      delete: {
        before: async (request, context) => {
          const { record } = context;
          const Room = (await import('../../../models/room/room.model.js')).default;
          const { defaultBackground, defaultMicShape } = await import('../../../config/room/general.config.js');

          const assetId = record.id();
          const assetType = record.params.type;

          try {
            // Find all rooms that are using this asset
            let roomsToUpdate = [];

            if (assetType === 'background') {
              // Find rooms using this asset as background
              roomsToUpdate = await Room.find({
                'background.id': assetId
              });
            } else if (assetType === 'micShape') {
              // Find rooms using this asset as mic shape
              roomsToUpdate = await Room.find({
                'micShape.id': assetId
              });
            }

            if (roomsToUpdate.length > 0) {
              // Update each room to use the default asset
              for (const room of roomsToUpdate) {
                if (assetType === 'background') {
                  room.background = defaultBackground;
                } else if (assetType === 'micShape') {
                  room.micShape = defaultMicShape;
                }
                await room.save();
              }

              console.log(`Updated ${roomsToUpdate.length} rooms to use default ${assetType} for deleted asset ${assetId}`);
            }

            // Allow deletion to proceed
            return request;
          } catch (error) {
            console.error('Error updating rooms before asset deletion:', error);
            throw new Error(`Failed to update rooms using this asset: ${error.message}`);
          }
        },
      },
      bulkDelete: {
        before: async (request, context) => {
          const { records } = context;
          const Room = (await import('../../../models/room/room.model.js')).default;
          const { defaultBackground, defaultMicShape } = await import('../../../config/room/general.config.js');

          try {
            // Process each asset being deleted
            for (const record of records) {
              const assetId = record.id();
              const assetType = record.params.type;

              // Find all rooms that are using this asset
              let roomsToUpdate = [];

              if (assetType === 'background') {
                roomsToUpdate = await Room.find({
                  'background.id': assetId
                });
              } else if (assetType === 'micShape') {
                roomsToUpdate = await Room.find({
                  'micShape.id': assetId
                });
              }

              if (roomsToUpdate.length > 0) {
                // Update each room to use the default asset
                for (const room of roomsToUpdate) {
                  if (assetType === 'background') {
                    room.background = defaultBackground;
                  } else if (assetType === 'micShape') {
                    room.micShape = defaultMicShape;
                  }
                  await room.save();
                }

                console.log(`Updated ${roomsToUpdate.length} rooms to use default ${assetType} for deleted asset ${assetId}`);
              }
            }

            // Allow bulk deletion to proceed
            return request;
          } catch (error) {
            console.error('Error updating rooms before bulk asset deletion:', error);
            throw new Error(`Failed to update rooms using these assets: ${error.message}`);
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
              message: 'تم إخفاء أصل الغرفة بنجاح',
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
              message: 'تم إظهار أصل الغرفة بنجاح',
              type: 'success',
            },
          };
        },
      },
      togglePro: {
        actionType: 'record',
        icon: 'Star',
        component: false,
        handler: async (request, response, context) => {
          const { record } = context;
          const newProStatus = !record.params.isPro;
          await record.update({ isPro: newProStatus });
          return {
            record: record.toJSON(context.currentAdmin),
            notice: {
              message: `Room asset ${newProStatus ? 'marked as Pro' : 'removed from Pro'}`,
              type: 'success',
            },
          };
        },
      },
      toggleGeneral: {
        actionType: 'record',
        icon: 'Public',
        component: false,
        handler: async (request, response, context) => {
          const { record } = context;
          const newGeneralStatus = !record.params.isGeneral;
          await record.update({ isGeneral: newGeneralStatus });
          return {
            record: record.toJSON(context.currentAdmin),
            notice: {
              message: `Room asset ${newGeneralStatus ? 'marked as General' : 'removed from General'}`,
              type: 'success',
            },
          };
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

export default roomAssetResource;
