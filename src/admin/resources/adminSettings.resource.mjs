
// FILE: src/admin/resources/adminSettingsResource.js
import AdminSettings from '../../models/adminSettings.model.js';

const adminSettingsResource = {
    resource: AdminSettings,
    options: {
        // Only superadmin can view this resource
        isVisible: ({ currentAdmin }) =>
            currentAdmin && currentAdmin.role === 'superadmin',
        isAccessible: ({ currentAdmin }) =>
            currentAdmin && currentAdmin.role === 'superadmin',

        navigation: { name: 'إعدادات النظام', icon: 'Settings' },

        properties: {
            username: { isRequired: true },
            password: {
                isRequired: true,
                type: 'password',
                isVisible: {
                    list: false,
                    edit: true,
                    show: false,
                    filter: false,
                },
            },
            role: {
                availableValues: [
                    { value: 'superadmin', label: 'Super Admin' },
                    { value: 'manager', label: 'Manager' },
                    { value: 'support', label: 'Support' },
                    { value: 'pd', label: 'PD' },
                ],
                isVisible: true,
            },
            // Hide permissions completely
            permissions: {
                isVisible: false,
            },
            // Hide timestamps
            createdAt: { isVisible: false },
            updatedAt: { isVisible: false },
        },

        actions: {
            list: {
                isAccessible: ({ currentAdmin }) =>
                    currentAdmin && currentAdmin.role === 'superadmin',
            },
            new: {
                isAccessible: ({ currentAdmin }) =>
                    currentAdmin && currentAdmin.role === 'superadmin',
            },
            edit: {
                isAccessible: ({ currentAdmin }) =>
                    currentAdmin && currentAdmin.role === 'superadmin',
                before: async (request) => {
                    if (!request.payload.password) {
                        delete request.payload.password;
                    }
                    return request;
                },
            },
            // ... inside your resource options.actions:
            delete: {
                // Allow only superadmins to reach the delete action in general
                isAccessible: ({ currentAdmin }) => !!currentAdmin && currentAdmin.role === 'superadmin',
                // Hide delete button for the current admin record in the UI
                isVisible: ({ currentAdmin, record }) => {
                    if (!currentAdmin) return false;
                    // list view (no record) -> show delete affordance (it's okay)
                    if (!record) return true;
                    const adminId = (currentAdmin._id || currentAdmin.id)?.toString();
                    const recordId = typeof record.id === 'function' ? record.id() : record.param('id');
                    return !(adminId && recordId && adminId.toString() === recordId.toString());
                },
                // Server-side protection: block delete if trying to delete yourself
                before: async (request, context) => {
                    const { currentAdmin, record } = context;
                    if (!currentAdmin) {
                        throw new Error('Unauthorized');
                    }
                    if (record) {
                        const adminId = (currentAdmin._id || currentAdmin.id)?.toString();
                        const recordId = typeof record.id === 'function' ? record.id() : record.param('id');
                        if (adminId && recordId && adminId.toString() === recordId.toString()) {
                            // Throwing stops the action. AdminJS will show the error message.
                            throw new Error('Action blocked: you cannot delete your own account.');
                        }
                    }
                    return request;
                },
            },
            bulkDelete: {
                isAccessible: ({ currentAdmin }) =>
                    currentAdmin && currentAdmin.role === 'superadmin',
            },
        },
    },
};

export default adminSettingsResource;
