import Conversation from '../../../models/chat/conversation.model.js';
import ChatMessage from '../../../models/chat/chatMessage.model.js';
import { componentLoader, Components } from '../components/component-loader.mjs';

const conversationResource = {
  resource: Conversation,
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
        isVisible: true,
        isAccessible: ({ currentAdmin }) => {
          return currentAdmin && currentAdmin.role === 'superadmin';
        },
        // Custom list action to populate participants
        handler: async (request, response, context) => {
          const { resource } = context;

          try {
            // Get query parameters for pagination and filtering
            const page = parseInt(request.query?.page) || 1;
            const perPage = parseInt(request.query?.perPage) || 10;
            const sortBy = request.query?.sortBy || 'lastMessageAt';
            const sortDirection = request.query?.direction || 'desc';

            // Build the query with filters
            let query = {};

            // Apply filters if they exist
            if (request.query?.filters) {
              // Parse filters from request
              for (const [key, value] of Object.entries(request.query.filters)) {
                if (value && value !== '') {
                  query[key] = value;
                }
              }
            }

            // Get total count
            const total = await Conversation.countDocuments(query);

            // Get conversations with populated participants
            const conversations = await Conversation.find(query)
              .populate('participants', 'name username')
              .populate('lastMessage')
              .sort({ [sortBy]: sortDirection === 'desc' ? -1 : 1 })
              .skip((page - 1) * perPage)
              .limit(perPage);

            // Convert to AdminJS records
            const records = conversations.map(conversation => {
              // Convert to plain object but preserve populated data
              const conversationObj = conversation.toObject();

              // Create AdminJS record
              const record = resource.build(conversationObj);

              return record;
            });

            return {
              records,
              meta: {
                total,
                perPage,
                page,
                direction: sortDirection,
                sortBy,
              },
            };
          } catch (error) {
            console.error('Error in list handler:', error);
            // Fallback to default behavior
            return {};
          }
        },
      },
      // Disable create and edit actions - only allow list and show
      new: {
        isVisible: false,
        isAccessible: false,
      },
      edit: {
        isVisible: false,
        isAccessible: false,
      },
      delete: {
        isVisible: false,
        isAccessible: false,
      },

      show: {
        isVisible: true,
        isAccessible: true,
        // Custom show action to include chat messages
        handler: async (request, response, context) => {
          const { record, resource } = context;

          if (request.method === 'get') {
            try {
              // Get the conversation ID from record params
              const conversationId = record.params._id;

              // Fetch all chat messages for this conversation
              const chatMessages = await ChatMessage.find({
                conversationId: conversationId
              })
                .populate('senderId', 'name username')
                .populate('receiverId', 'name username')
                .sort({ createdAt: 1 }); // Sort by creation time ascending (oldest first)

              // Map chat messages to a simple format
              const mappedMessages = chatMessages.map(msg => ({
                _id: msg._id.toString(),
                sender: msg.senderId ? `${msg.senderId.name || msg.senderId.username || 'Unknown'}` : 'Unknown',
                receiver: msg.receiverId ? `${msg.receiverId.name || msg.receiverId.username || 'Unknown'}` : 'Unknown',
                messageType: msg.messageType || 'text',
                body: msg.content?.body || '',
                isRead: Boolean(msg.isRead),
                isDeleted: Boolean(msg.isDeleted),
                createdAt: msg.createdAt,
              }));

              // Add chat messages to the record params
              record.params.chatMessages = mappedMessages;

              return {
                record: record.toJSON(context.currentAdmin),
                resource: resource.decorate().toJSON(context.currentAdmin),
              };
            } catch (error) {
              console.error('Error fetching chat messages:', error);
              // Return without chat messages if there's an error
              return {
                record: record.toJSON(context.currentAdmin),
                resource: resource.decorate().toJSON(context.currentAdmin),
              };
            }
          }

          return {};
        },
      },
      bulkDelete: {
        isVisible: false,
        isAccessible: false,
      },
    },
    properties: {
      _id: {
        isVisible: { list: true, show: true, edit: false, filter: true },
      },
      participants: {
        type: 'reference',
        reference: 'User',
        isArray: true,
        isVisible: { list: true, show: true, edit: false, filter: true },
        components: {
          list: Components.ParticipantsDisplay,
        },
      },
      'participants.0': {
        type: 'reference',
        reference: 'User',
        isVisible: { list: false, show: true, edit: false, filter: false },
        components: {
          list: Components.UserDisplay,
        },
      },
      'participants.1': {
        type: 'reference',
        reference: 'User',
        isVisible: { list: false, show: true, edit: false, filter: false },
        components: {
          list: Components.UserDisplay,
        },
      },
      lastMessage: {
        type: 'reference',
        reference: 'ChatMessage',
        isVisible: { list: true, show: true, edit: false, filter: false },
      },
      lastMessageAt: {
        type: 'datetime',
        isVisible: { list: true, show: true, edit: false, filter: true },
      },
      unreadCount: {
        type: 'mixed',
        isVisible: { list: false, show: true, edit: false },
      },
      deletedAt: {
        type: 'mixed',
        isVisible: { list: false, show: true, edit: false },
      },
      areFriends: {
        type: 'boolean',
        isVisible: { list: true, show: true, edit: false, filter: true },
        availableValues: [
          { value: true, label: 'أصدقاء' },
          { value: false, label: 'ليسوا أصدقاء' },
        ],
      },
      isSecure: {
        type: 'boolean',
        isVisible: { list: true, show: true, edit: false, filter: true },
        availableValues: [
          { value: true, label: 'آمنة' },
          { value: false, label: 'غير آمنة' },
        ],
      },
      secureEnabledBy: {
        type: 'reference',
        reference: 'User',
        isVisible: { list: false, show: true, edit: false, filter: true },
      },
      hidden: {
        type: 'mixed',
        isVisible: { list: false, show: true, edit: false },
      },
      background: {
        type: 'mixed',
        isVisible: { list: false, show: true, edit: false },
      },
      createdAt: {
        type: 'datetime',
        isVisible: { list: true, show: true, edit: false, filter: true },
      },
      updatedAt: {
        type: 'datetime',
        isVisible: { list: false, show: true, edit: false, filter: true },
      },
      // Virtual property for chat messages
      chatMessages: {
        type: 'mixed',
        isVisible: { list: false, show: true, edit: false },
        components: {
          show: Components.ChatMessagesDisplay,
        },
      },
    },
    listProperties: [
      '_id',
      'participants',
      'lastMessage',
      'lastMessageAt',
      'areFriends',
      'isSecure',
      'createdAt',
    ],
    showProperties: [
      '_id',
      'participants',
      'lastMessage',
      'lastMessageAt',
      'unreadCount',
      'deletedAt',
      'areFriends',
      'isSecure',
      'secureEnabledBy',
      'hidden',
      'background',
      'createdAt',
      'updatedAt',
      'chatMessages',
    ],
    filterProperties: [
      'participants',
      'lastMessageAt',
      'areFriends',
      'isSecure',
      'secureEnabledBy',
      'createdAt',
      'updatedAt',
    ],
    sort: {
      sortBy: 'lastMessageAt',
      direction: 'desc',
    },
  },
};

export default conversationResource;
