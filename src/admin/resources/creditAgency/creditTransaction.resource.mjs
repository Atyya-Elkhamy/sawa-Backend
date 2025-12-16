// FILE: src/admin/resources/creditTransactionResource.mjs
import CreditTransaction from '../../../models/agencies/creditTransaction.model.js';

const creditTransactionResource = {
  resource: CreditTransaction,
  options: {
    isVisible: ({ currentAdmin }) => {
      return currentAdmin && currentAdmin.role === 'superadmin';
    },
    isAccessible: ({ currentAdmin }) => {
      return currentAdmin && currentAdmin.role === 'superadmin';
    },
    navigation: ({ currentAdmin }) =>
      currentAdmin.role === 'manager' ? null : { name: 'إدارة الوكالات', icon: 'Building' },

    properties: {
      creditAgency: { reference: 'CreditAgency', isVisible: { list: true, edit: true, show: true } },
      amount: { type: 'number', isRequired: true, isVisible: { list: true, edit: true, show: true } },
      type: {
        type: 'string',
        availableValues: [
          { value: 'credit', label: 'Credit' },
          { value: 'debit', label: 'Debit' },
        ],
        isVisible: { list: true, edit: true, show: true },
      },
      relatedUser: { reference: 'User', isVisible: { list: true, show: true, edit: true } },
      createdAt: { isVisible: { list: true, filter: true, show: true, edit: false } },
    },
    listProperties: ['creditAgency', 'amount', 'type', 'relatedUser', 'createdAt'],
    filterProperties: ['creditAgency', 'type', 'relatedUser', 'createdAt'],
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) => {
          return currentAdmin && currentAdmin.role === 'superadmin';
        }
      },
      viewTransactions: {
        actionType: 'resource',
        icon: 'List',
        label: 'View Transactions',
        handler: async (request, response, context) => {
          const { h } = context;
          const redirectUrl = h.listUrl('CreditTransaction', `?filters.creditAgency=${request.params.recordId}`);
          return { redirectUrl };
        },
      },
    },
  },
};

export default creditTransactionResource;
