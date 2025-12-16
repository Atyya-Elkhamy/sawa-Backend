import Room from '../../../models/room/room.model.js';
import RoomPost from '../../../models/room/roomPost.model.js';
import User from '../../../models/user.model.js';
import { componentLoader, Components } from '../components/component-loader.mjs';
import { blockRoom } from '../../../services/room/live-kit.service.js';
import mongoose from 'mongoose';

const roomResource = {
  resource: Room,
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
      name: {
        type: 'string',
        isTitle: true,
        isRequired: true
      },
      roomCountryCode: {
        type: 'string',
        isVisible: { list: true, edit: true, filter: true, show: true },
      },
      subject: {
        type: 'string',
        isVisible: { list: true, edit: true, filter: false, show: true },
      },
      image: {
        type: 'string',
        isVisible: { list: true, edit: true, filter: false, show: true },
        components: {
          list: Components.CustomUploadShowComponent,
          show: Components.CustomUploadShowComponent,
        },
      },
      password: {
        type: 'string',
        isVisible: { list: false, edit: true, filter: false, show: true },
      },
      isPrivate: {
        type: 'boolean',
        isVisible: { list: true, edit: true, filter: true, show: true },
      },
      status: {
        type: 'string',
        availableValues: [
          { value: 'active', label: 'نشط' },
          { value: 'inactive', label: 'غير نشط' },
        ],
        isVisible: { list: true, edit: true, filter: true, show: true },
      },
      isBlocked: {
        type: 'boolean',
        isVisible: { list: true, edit: false, filter: true, show: true },
      },
      isConstant: {
        type: 'boolean',
        isVisible: { list: true, edit: true, filter: true, show: true },
      },
      constantRank: {
        type: 'number',
        isVisible: { list: true, edit: true, filter: false, show: true },
      },
      roomType: {
        type: 'string',
        isVisible: { list: true, edit: true, filter: true, show: true },
      },
      owner: {
        type: 'reference',
        reference: 'User',
        isVisible: { list: true, edit: true, filter: true, show: true },
      },
      participantsCount: {
        type: 'number',
        isVisible: { list: true, edit: false, filter: false, show: true },
      },

    },
    listProperties: ['image', 'name', 'roomCountryCode', 'roomType', 'owner', 'status', 'isBlocked', 'isConstant', 'constantRank', 'isPrivate', 'participantsCount'],
    editProperties: [
      'name',
      'roomCountryCode',
      'subject',
      'image',
      'password',
      'isPrivate',
      'status',
      'isConstant',
      'constantRank',
      'roomType',
      'owner'
    ],
    showProperties: ['name', 'roomCountryCode', 'subject', 'image', 'status', 'isBlocked', 'isConstant', 'constantRank', 'isPrivate', 'roomType', 'owner', 'participantsCount', 'createdAt', 'updatedAt'],
    filterProperties: ['name', 'roomCountryCode', 'owner', 'status', 'isBlocked', 'isConstant', 'isPrivate', 'roomType'],
    exclude: ['specialMics'],
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
          // Remove any problematic fields from the request payload
          if (request.payload) {
            delete request.payload.background;
            delete request.payload.micShape;
            delete request.payload.roomFrame;
            delete request.payload.currentState;
            delete request.payload.purchasedRoomTypes;
            delete request.payload.ingressInfo;
          }
          return request;
        },
      },

      edit: {
        isAccessible: ({ currentAdmin }) => {
          return (
            currentAdmin &&
            (currentAdmin.role === 'superadmin')
          );
        },
        before: async (request, context) => {
          console.log('Original room payload:', request.payload);

          // Remove any problematic fields from the request payload
          if (request.payload) {
            delete request.payload.background;
            delete request.payload.micShape;
            delete request.payload.roomFrame;
            delete request.payload.currentState;
            delete request.payload.purchasedRoomTypes;
            delete request.payload.ingressInfo;
          }

          console.log('Cleaned room payload:', request.payload);
          return request;
        },

        handler: async (request, response, context) => {
          const { record, currentAdmin } = context;
          const roomId = record.param('_id');
          const originalRoomData = record.params;

          try {
            // Get the cleaned payload from the before hook
            const updateData = { ...request.payload };

            // Handle special validations
            if (updateData.name && updateData.name !== originalRoomData.name) {
              // Check if room name already exists (excluding current room)
              const existingRoom = await Room.findOne({
                name: updateData.name,
                _id: { $ne: roomId }
              });

              if (existingRoom) {
                return {
                  record: record.toJSON(currentAdmin),
                  notice: {
                    message: `Room name "${updateData.name}" already exists. Please choose a different name.`,
                    type: 'error',
                  },
                };
              }
            }

            // Handle constant room rank validation
            if (updateData.isConstant === true && updateData.constantRank) {
              const existingRankRoom = await Room.findOne({
                constantRank: updateData.constantRank,
                _id: { $ne: roomId }
              });

              if (existingRankRoom) {
                return {
                  record: record.toJSON(currentAdmin),
                  notice: {
                    message: `Constant rank ${updateData.constantRank} is already taken by another room.`,
                    type: 'error',
                  },
                };
              }
            }

            // Handle constant room logic
            if (updateData.isConstant === true && !updateData.constantRank) {
              // Auto-assign next available rank if making room constant without specifying rank
              const maxRank = await Room.find({ isConstant: true }).sort({ constantRank: -1 }).limit(1);
              updateData.constantRank = maxRank.length > 0 ? maxRank[0].constantRank + 1 : 1;
            } else if (updateData.isConstant === false) {
              // Remove rank if removing constant status
              updateData.constantRank = null;
            }

            // Handle blocked room logic
            if (updateData.isBlocked === true && originalRoomData.isBlocked !== true) {
              // If blocking the room, also set status to inactive
              updateData.status = 'inactive';

              // Block the room in LiveKit
              try {
                await blockRoom(roomId, originalRoomData.name);
                console.log(`Room ${roomId} blocked in LiveKit`);
              } catch (liveKitError) {
                console.error('Error blocking room in LiveKit:', liveKitError);
                // Continue with database update even if LiveKit fails
              }
            } else if (updateData.isBlocked === false && originalRoomData.isBlocked === true) {
              // If unblocking the room, set status to active
              updateData.status = 'active';
            }

            // Validate password for private rooms
            if (updateData.isPrivate === true && !updateData.password && !originalRoomData.password) {
              return {
                record: record.toJSON(currentAdmin),
                notice: {
                  message: 'Password is required for private rooms.',
                  type: 'error',
                },
              };
            } else if (updateData.isPrivate === false) {
              // Clear password if room is made public
              updateData.password = null;
            }

            // Handle owner changes
            if (updateData.owner && updateData.owner !== originalRoomData.owner?.toString()) {
              // Validate that the new owner exists
              const ownerExists = await User.findById(updateData.owner);
              if (!ownerExists) {
                return {
                  record: record.toJSON(currentAdmin),
                  notice: {
                    message: 'Selected owner does not exist.',
                    type: 'error',
                  },
                };
              }
            }

            // Update the record
            await record.update(updateData);

            // Log the successful update
            console.log(`Room ${roomId} updated successfully:`, updateData);

            return {
              record: record.toJSON(currentAdmin),
              notice: {
                message: `Room "${updateData.name || originalRoomData.name}" updated successfully.`,
                type: 'success',
              },
            };

          } catch (error) {
            console.error('Error updating room:', error);

            return {
              record: record.toJSON(currentAdmin),
              notice: {
                message: `Failed to update room: ${error.message}`,
                type: 'error',
              },
            };
          }
        },

        after: async (response, request, context) => {
          // Optional: Handle any post-update logic here
          const { record } = context;
          const roomId = record.param('_id');

          try {
            // Log the update for audit purposes
            console.log(`Room ${roomId} update completed at ${new Date().toISOString()}`);

            // You can add additional logic here like:
            // - Notifying connected users about room changes
            // - Updating cache
            // - Sending webhooks

          } catch (error) {
            console.error('Error in edit after hook:', error);
          }

          return response;
        }
      },
      delete: {
        after: async (response, request, context) => {
          // After a room is deleted, clean up user references
          const roomId = request.params.recordId;
          if (roomId) {
            try {
              // Update users who have this room as currentRoom
              await User.updateMany(
                { currentRoom: roomId },
                { $unset: { currentRoom: 1 } }
              );

              // Update users who have this room as room reference
              await User.updateMany(
                { room: roomId },
                { $unset: { room: 1 } }
              );

              console.log(`Cleaned up user references for deleted room: ${roomId}`);
            } catch (error) {
              console.error('Error cleaning up user references after room deletion:', error);
            }
          }
          return response;
        },
      },
      deleteWithLiveKit: {
        actionType: 'record',
        icon: 'Delete',
        component: false,
        name: 'deleteWithLiveKit',
        guard: 'هل أنت متأكد أنك تريد حذف هذه الغرفة؟ سيتم حذفها نهائياً من قاعدة البيانات و LiveKit.',
        handler: async (request, response, context) => {
          const { record, currentAdmin } = context;
          const roomId = record.param('_id');
          const roomName = record.param('name');

          try {
            // Import the deleteRoom function from LiveKit service
            const { deleteRoom } = require('../../../services/room/live-kit.service.js');
            // Delete the room from LiveKit first
            await deleteRoom(roomId);
            await RoomPost.deleteMany({ room: roomId });
            // Delete the room from database (this will trigger pre-deletion hooks)
            await record.delete();

            return {
              notice: {
                message: `Room "${roomName}" has been deleted from both database and LiveKit.`,
                type: 'success',
              },
              redirectUrl: '/admin/resources/Room',
            };
          } catch (error) {
            console.error('Error deleting room:', error);
            return {
              record: record.toJSON(currentAdmin),
              notice: {
                message: `Failed to delete room: ${error.message}`,
                type: 'error',
              },
            };
          }
        },
      },
      blockRoom: {
        actionType: 'record',
        icon: 'Ban',
        component: false,
        name: 'blockRoom',
        guard: 'هل أنت متأكد أنك تريد حظر هذه الغرفة؟ سيتم حذفها من LiveKit وتمييزها كمحظورة.',
        handler: async (request, response, context) => {
          const { record, currentAdmin } = context;
          const roomId = record.param('_id');
          const roomName = record.param('name');

          try {
            // Check if room is already blocked
            if (record.param('isBlocked')) {
              return {
                record: record.toJSON(currentAdmin),
                notice: {
                  message: 'Room is already blocked.',
                  type: 'error',
                },
              };
            }

            // Mark the room as blocked
            await record.update({
              isBlocked: true,
              status: 'inactive'
            });

            // Block the room and delete from LiveKit
            await blockRoom(roomId, roomName);

            return {
              record: record.toJSON(currentAdmin),
              notice: {
                message: `Room "${roomName}" has been blocked and deleted from LiveKit.`,
                type: 'success',
              },
            };
          } catch (error) {
            console.error('Error blocking room:', error);
            return {
              record: record.toJSON(currentAdmin),
              notice: {
                message: `Failed to block room: ${error.message}`,
                type: 'error',
              },
            };
          }
        },
        isAccessible: ({ record }) => record && record.param('isBlocked') !== true, // Only show if not currently blocked
      },
      unblockRoom: {
        actionType: 'record',
        icon: 'CheckCircle',
        component: false,
        name: 'unblockRoom',
        guard: 'هل أنت متأكد أنك تريد إلغاء حظر هذه الغرفة؟ سيتم تمييزها كنشطة مرة أخرى.',
        handler: async (request, response, context) => {
          const { record, currentAdmin } = context;
          const roomName = record.param('name');

          try {
            // Check if room is not blocked
            if (!record.param('isBlocked')) {
              return {
                record: record.toJSON(currentAdmin),
                notice: {
                  message: 'Room is not currently blocked.',
                  type: 'error',
                },
              };
            }

            // Mark the room as unblocked
            await record.update({
              isBlocked: false,
              status: 'active'
            });

            return {
              record: record.toJSON(currentAdmin),
              notice: {
                message: `Room "${roomName}" has been unblocked successfully.`,
                type: 'success',
              },
            };
          } catch (error) {
            console.error('Error unblocking room:', error);
            return {
              record: record.toJSON(currentAdmin),
              notice: {
                message: `Failed to unblock room: ${error.message}`,
                type: 'error',
              },
            };
          }
        },
        isAccessible: ({ record }) => record && record.param('isBlocked') === true, // Only show if currently blocked
      },
      makeConstantRoom: {
        actionType: 'record',
        icon: 'Star',
        component: false,
        name: 'makeConstantRoom',
        guard: 'هل أنت متأكد أنك تريد جعل هذه الغرفة ثابتة؟ سيتم عرضها دائماً في قائمة الغرف الرائجة.',
        handler: async (request, response, context) => {
          const { record, currentAdmin } = context;
          const roomId = record.param('_id');
          const roomName = record.param('name');

          try {
            // Check if room is already constant
            if (record.param('isConstant')) {
              return {
                record: record.toJSON(currentAdmin),
                notice: {
                  message: 'Room is already constant.',
                  type: 'error',
                },
              };
            }

            // Get the next available rank
            const Room = mongoose.model('Room');
            const maxRank = await Room.find({ isConstant: true }).sort({ constantRank: -1 }).limit(1);
            const nextRank = maxRank.length > 0 ? maxRank[0].constantRank + 1 : 1;

            // Mark the room as constant with next available rank
            await record.update({
              isConstant: true,
              constantRank: nextRank,
              status: 'active'
            });

            return {
              record: record.toJSON(currentAdmin),
              notice: {
                message: `Room "${roomName}" has been made constant with rank ${nextRank}.`,
                type: 'success',
              },
            };
          } catch (error) {
            console.error('Error making room constant:', error);
            return {
              record: record.toJSON(currentAdmin),
              notice: {
                message: `Failed to make room constant: ${error.message}`,
                type: 'error',
              },
            };
          }
        },
        isAccessible: ({ record }) => record && record.param('isConstant') !== true, // Only show if not currently constant
      },
      removeConstantRoom: {
        actionType: 'record',
        icon: 'MinusCircle',
        component: false,
        name: 'removeConstantRoom',
        guard: 'هل أنت متأكد أنك تريد إزالة الغرفة الثابتة؟ لن تظهر بعد الآن في القائمة الثابتة.',
        handler: async (request, response, context) => {
          const { record, currentAdmin } = context;
          const roomName = record.param('name');

          try {
            // Check if room is not constant
            if (!record.param('isConstant')) {
              return {
                record: record.toJSON(currentAdmin),
                notice: {
                  message: 'Room is not constant.',
                  type: 'error',
                },
              };
            }

            // Remove constant status
            await record.update({
              isConstant: false,
              constantRank: null
            });

            return {
              record: record.toJSON(currentAdmin),
              notice: {
                message: `Room "${roomName}" is no longer constant.`,
                type: 'success',
              },
            };
          } catch (error) {
            console.error('Error removing constant room:', error);
            return {
              record: record.toJSON(currentAdmin),
              notice: {
                message: `Failed to remove constant room: ${error.message}`,
                type: 'error',
              },
            };
          }
        },
        isAccessible: ({ record }) => record && record.param('isConstant') === true, // Only show if currently constant
      },
    },
  },
};

export default roomResource;
