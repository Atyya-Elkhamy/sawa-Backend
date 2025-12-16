import ChatMessage from '../../../models/chat/chatMessage.model.js';
import { componentLoader, Components } from '../components/component-loader.mjs';

const chatMessageResource = {
  resource: ChatMessage,
  options: {
    isVisible: ({ currentAdmin }) => {
      return currentAdmin && currentAdmin.role === 'superadmin';
    },
    isAccessible: ({ currentAdmin }) => {
      return currentAdmin && currentAdmin.role === 'superadmin';
    },
    navigation: ({ currentAdmin }) =>
      currentAdmin?.role === 'superadmin' ? { name: 'إدارة الرسائل', icon: 'MessageSquare' } : null,
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) => {
          return currentAdmin && currentAdmin.role === 'superadmin';
        }
      },
      // Disable create and edit actions - only allow list, show, and delete
      new: {
        isVisible: false,
        isAccessible: false,
      },
      edit: {
        isVisible: false,
        isAccessible: false,
      },

      show: {
        isVisible: true,
        isAccessible: true,
      },
      delete: {
        isVisible: true,
        isAccessible: true,
      },
      bulkDelete: {
        isVisible: true,
        isAccessible: true,
      },
    },
    properties: {
      _id: {
        isVisible: { list: true, show: true, edit: false, filter: true },
      },
      conversationId: {
        isVisible: { list: true, show: true, edit: false, filter: true },
        type: 'reference',
        reference: 'Conversation',
      },
      senderId: {
        reference: 'User',
        isVisible: { list: true, show: true, edit: false, filter: true },
        type: 'reference',
      },
      receiverId: {
        reference: 'User',
        isVisible: { list: true, show: true, edit: false, filter: true },
        type: 'reference',
      },
      messageType: {
        type: 'string',
        isVisible: { list: true, show: true, edit: false, filter: true },
        availableValues: [
          { value: 'text', label: 'نص' },
          { value: 'image', label: 'صورة' },
          { value: 'voice', label: 'صوت' },
          { value: 'gift', label: 'هدية' },
          { value: 'emoji', label: 'ملصق' },
          { value: 'invitation', label: 'دعوة' },
        ],
      },
      content: {
        type: 'mixed',
        isVisible: { list: false, show: true, edit: false },
      },
      'content.body': {
        isVisible: { list: true, show: true, edit: false },
        type: 'textarea',
      },
      'content.duration': {
        isVisible: { list: false, show: true, edit: false },
        type: 'number',
      },
      'content.invitationType': {
        isVisible: { list: false, show: true, edit: false },
        type: 'string',
        availableValues: [
          { value: 'room', label: 'غرفة' },
          { value: 'group', label: 'مجموعة' },
          { value: 'agency', label: 'وكالة' },
        ],
      },
      'content.invitationId': {
        isVisible: { list: false, show: true, edit: false },
        type: 'string',
      },
      isRead: {
        type: 'boolean',
        isVisible: { list: true, show: true, edit: false, filter: true },
        availableValues: [
          { value: true, label: 'مقروء' },
          { value: false, label: 'غير مقروء' },
        ],
      },
      isDeleted: {
        type: 'boolean',
        isVisible: { list: true, show: true, edit: false, filter: true },
        availableValues: [
          { value: true, label: 'محذوف' },
          { value: false, label: 'غير محذوف' },
        ],
      },
      createdAt: {
        type: 'datetime',
        isVisible: { list: true, show: true, edit: false, filter: true },
      },
      updatedAt: {
        type: 'datetime',
        isVisible: { list: false, show: true, edit: false, filter: true },
      },
    },
    listProperties: [
      '_id',
      'senderId',
      'receiverId',
      'messageType',
      'content.body',
      'isRead',
      'isDeleted',
      'createdAt',
    ],
    showProperties: [
      '_id',
      'conversationId',
      'senderId',
      'receiverId',
      'messageType',
      'content',
      'content.body',
      'content.duration',
      'content.invitationType',
      'content.invitationId',
      'isRead',
      'isDeleted',
      'createdAt',
      'updatedAt',
    ],
    filterProperties: [
      'senderId',
      'receiverId',
      'messageType',
      'isRead',
      'isDeleted',
      'createdAt',
      'updatedAt',
    ],
    sort: {
      sortBy: 'createdAt',
      direction: 'desc',
    },
  },
};

export default chatMessageResource;
