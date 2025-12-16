import ChargePrize from '../../../models/accumulatedCharge/prizes.charge.model.js';

const chargePrizeResource = {
  resource: ChargePrize,
  options: {
    isVisible: ({ currentAdmin }) => {
      return currentAdmin && currentAdmin.role === 'superadmin';
    },
    isAccessible: ({ currentAdmin }) => {
      return currentAdmin && currentAdmin.role === 'superadmin';
    },
    properties: {
      name: {
        type: 'string',
        isRequired: true,
        isTitle: true,
      },
      description: {
        type: 'string',
      },
      category: {
        type: 'string',
        availableValues: [
          { value: 'weekly', label: 'أسبوعي' },
          { value: 'monthly', label: 'شهري' },
        ],
        isRequired: true,
      },
      requiredPoints: {
        type: 'number',
        isRequired: true,
        minimum: 0,
      },
      items: {
        type: 'mixed',
        isArray: true,
      },
      'items.item': {
        type: 'reference',
        reference: 'Item', // Reference to the Item model
        isRequired: true,
      },
      'items.days': {
        type: 'number',
        default: 1,
        minimum: 1,
      },
      'items.displayName': {
        type: 'string',
        isVisible: true,
      },
      gifts: {
        type: 'mixed',
        isArray: true,
      },
      'gifts.gift': {
        type: 'reference',
        reference: 'Gift', // Reference to the Gift model
        isRequired: true,
      },
      'gifts.quantity': {
        type: 'number',
        default: 1,
        minimum: 1,
      },
      'gifts.displayName': {
        type: 'string',
        isVisible: true,
      },
      vipLevel: {
        type: 'number',
        default: 0,
        minimum: 0,
        maximum: 7,
      },
      vipDays: {
        type: 'number',
        default: 0,
        minimum: 0,
      },
      proMonths: {
        type: 'number',
        default: 0,
        minimum: 0,
      },
      isActive: {
        type: 'boolean',
        defaultValue: true,
      },

      createdAt: {
        type: 'date',
        isVisible: { list: true, edit: false, filter: true, show: true },
      },
      updatedAt: {
        type: 'date',
        isVisible: { list: false, edit: false, filter: true, show: true },
      },
    },
    listProperties: ['name', 'category', 'requiredPoints', 'isActive', 'createdAt'],
    editProperties: ['name', 'description', 'category', 'requiredPoints', 'items', 'gifts', 'isActive', 'vipLevel', 'vipDays', 'proMonths'],
    showProperties: [
      'name',
      'description',
      'category',
      'requiredPoints',
      'items',
      'gifts',
      'proMonths',
      'isActive',
      'createdAt',
      'updatedAt',
    ],
    filterProperties: ['name', 'category', 'isActive', 'createdAt'],
    navigation: {
      name: 'إدارة الأسعار',
      icon: 'DollarSign',
    },

    actions: {
      list: {
        isAccessible: ({ currentAdmin }) => {
         
          return currentAdmin && currentAdmin.role === 'superadmin';
        }
      },
    }

  },
};

export default chargePrizeResource;
