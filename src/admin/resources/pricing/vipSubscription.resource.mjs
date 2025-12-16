import VipSubscription from '../../../models/pricing/vipSubscription.model.js';

const vipSubscriptionResource = {
  resource: VipSubscription,
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
      vipLevel: {
        type: 'number',
        isRequired: true,
        description: 'VIP Level (1-7)',
        availableValues: [
          { value: 1, label: 'مستوى VIP 1' },
          { value: 2, label: 'مستوى VIP 2' },
          { value: 3, label: 'مستوى VIP 3' },
          { value: 4, label: 'مستوى VIP 4' },
          { value: 5, label: 'مستوى VIP 5' },
          { value: 6, label: 'مستوى VIP 6' },
          { value: 7, label: 'مستوى VIP 7' },
        ],
      },
      days: {
        type: 'number',
        isRequired: true,
        description: 'Duration in days',
        availableValues: [
          { value: 7, label: '7 Days' },
          { value: 15, label: '15 Days' },
          { value: 30, label: '30 Days' },
        ],
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
    listProperties: ['vipLevel', 'days', 'price', 'isActive', 'description', 'createdAt'],
    editProperties: ['price', 'isActive'],
    showProperties: ['vipLevel', 'days', 'price', 'isActive', 'description', 'createdAt', 'updatedAt'],
    filterProperties: ['vipLevel', 'days', 'price', 'isActive', 'createdAt'],
    sort: {
      sortBy: 'vipLevel',
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

export default vipSubscriptionResource;
