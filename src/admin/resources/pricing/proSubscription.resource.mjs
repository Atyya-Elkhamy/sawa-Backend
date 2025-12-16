import ProSubscription from '../../../models/pricing/proSubscription.model.js';

const proSubscriptionResource = {
  resource: ProSubscription,
  options: {
    isVisible: ({ currentAdmin }) => {
      return currentAdmin && (currentAdmin.role === 'superadmin' || currentAdmin.role === 'support');
    },
    isAccessible: ({ currentAdmin }) => {
      return currentAdmin && (currentAdmin.role === 'superadmin' || currentAdmin.role === 'support');
    },
    navigation: {
      name: 'إدارة الأسعار',
      icon: 'DollarSign',
    },
    properties: {
      months: {
        type: 'number',
        isRequired: true,
        isTitle: true,
        description: 'Duration in months (1, 2, 3, etc.)',
      },
      price: {
        type: 'number',
        isRequired: true,
        description: 'Price in your currency unit',
      },
      isActive: {
        type: 'boolean',
        description: 'Whether this subscription plan is active',
      },
      description: {
        type: 'string',
        description: 'Optional description for this plan',
      },
      createdAt: {
        isVisible: { list: true, show: true, edit: false, filter: true },
      },
      updatedAt: {
        isVisible: { list: true, show: true, edit: false, filter: true },
      },
    },
    listProperties: ['months', 'price', 'isActive', 'description', 'createdAt'],
    editProperties: ['months', 'price', 'isActive', 'description'],
    showProperties: ['months', 'price', 'isActive', 'description', 'createdAt', 'updatedAt'],
    filterProperties: ['months', 'price', 'isActive', 'createdAt'],
    sort: {
      sortBy: 'months',
      direction: 'asc',
    },
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) => {
          return currentAdmin && (currentAdmin.role === 'superadmin' || currentAdmin.role === 'support');
        },
      },
      new: {
        isVisible: false, // Hide create action since data is pre-seeded
      },
      delete: {
        isVisible: false, // Hide delete action to prevent removing pre-seeded data
      },
      bulkDelete: {
        isVisible: false, // Hide bulk delete action
      },
    },
  },
};

export default proSubscriptionResource;
