// FILE: src/admin/resources/profileResource.js

import Profile from '../../../models/profile.model.js';
import User from '../../../models/user.model.js';

const profileResource = {
  resource: Profile,
  options: {
    isVisible: ({ currentAdmin }) => {
      return currentAdmin && currentAdmin.role === 'superadmin';
    },
    isAccessible: ({ currentAdmin }) => {
      return currentAdmin && currentAdmin.role === 'superadmin';
    },
    navigation: ({ currentAdmin }) =>
      currentAdmin.role === 'manager' ? null : { name: 'إدارة المستخدمين', icon: 'Users' },

    properties: {
      attributes: { isVisible: false },
      user: {
        reference: 'User',
        isVisible: { list: true, filter: true, show: true, edit: false },
        position: 1,
        // Add custom filter for user reference
        availableValues: async (context) => {
          const users = await User.find({}, 'name _id');
          return users.map((user) => ({
            value: user._id.toString(),
            label: user.name,
          }));
        },
      },
      // Info Properties
      'info.about': {
        type: 'textarea',
        isVisible: { list: false, filter: false, show: true, edit: true },
        position: 2,
      },
      'info.album': {
        type: 'array',
        isVisible: { list: false, filter: false, show: true, edit: true },
        position: 3,
      },
      'info.interests': {
        type: 'mixed',
        isVisible: { list: false, filter: false, show: true, edit: true },
        position: 4,
      },
      // Settings Properties
      'settings.friendsMessages': {
        type: 'boolean',
        isVisible: { list: false, filter: false, show: true, edit: true },
        position: 5,
      },
      'settings.systemMessages': {
        type: 'boolean',
        isVisible: { list: false, filter: false, show: true, edit: true },
        position: 6,
      },
      'settings.giftsFromPossibleFriends': {
        type: 'boolean',
        isVisible: { list: false, filter: false, show: true, edit: true },
        position: 7,
      },
      'settings.addFollowers': {
        type: 'boolean',
        isVisible: { list: false, filter: false, show: true, edit: true },
        position: 8,
      },
    },
    listProperties: ['user'],
    editProperties: [
      'info.about',
      'info.album',
      'info.interests',
      'settings.friendsMessages',
      'settings.systemMessages',
      'settings.giftsFromPossibleFriends',
      'settings.addFollowers',
    ],
    showProperties: [
      'user',
      'info.about',
      'info.album',
      'info.interests',
      'settings.friendsMessages',
      'settings.systemMessages',
      'settings.giftsFromPossibleFriends',
      'settings.addFollowers',
    ],
    filterProperties: ['user'],
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) => {
          return currentAdmin && currentAdmin.role === 'superadmin';
        }
      },
      new: {
        isVisible: false, // Disable the 'new' action to prevent creating new profiles
      },
      delete: {
        isVisible: false, // Optionally disable 'delete' action to prevent profile deletion
      },
    },
  },
};

export default profileResource;
