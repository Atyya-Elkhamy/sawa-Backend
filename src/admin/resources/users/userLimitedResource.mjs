
import User from '../../../models/user.model.js';
import { canAccessLimited } from '../utils/accessRoles.mjs';

/**
 * Fields allowed to be edited by manager/support/pd
 */
const allowed = [
    'vip.level',
    'vip.expirationDate',
    'pro.expirationDate',
    'specialId.expirationDate',
    'levelPoints',
];

/**
 * Build visibility rules
 */
const allProps = Object.keys(User.schema.paths);
const properties = {};

allProps.forEach((prop) => {
    properties[prop] = {
        isVisible: allowed.includes(prop) || ['userId', 'name'].includes(prop),
    };
});

// Ensure nested fields work
[...allowed, 'userId', 'name'].forEach((prop) => {
    if (!properties[prop]) {
        properties[prop] = { isVisible: true };
    }
});

const userLimitedResource = {
    resource: User,
    options: {
        id: 'UserLimited',

        navigation: {
            name: 'تعديل المستخدمين (محدود)',
            icon: 'Edit',
        },

        isVisible: canAccessLimited,
        isAccessible: canAccessLimited,

        properties,

        editProperties: allowed,

        listProperties: [
            'userId',
            'name',
            'vip.level',
            'vip.expirationDate',
            'pro.expirationDate',
        ],

        actions: {
            list: { isAccessible: canAccessLimited },
            show: { isAccessible: canAccessLimited },
            /**
             * CUSTOM EDIT ACTION WITH VALIDATION
             */
            edit: {
                isAccessible: canAccessLimited,
                before: async (request, context) => {
                    const admin = context.currentAdmin;
                    if (admin.role === 'manager') {
                        // VIP Level limit
                        const newVipLevel = request.payload?.['vip.level'];
                        if (newVipLevel !== undefined && Number(newVipLevel) > 5) {
                            throw new Error(
                                'Managers are not allowed to set VIP level above 5.'
                            );
                        }
                        // Level Points limit
                        const lp = Number(request.payload?.levelPoints);
                        if (!isNaN(lp) && lp > 507000) {
                            throw new Error(
                                'Managers cannot set levelPoints above 507000.'
                            );
                        }
                        // Date limits (1 month max)
                        const maxDate = new Date();
                        maxDate.setMonth(maxDate.getMonth() + 1);
                        const dateFields = [
                            'vip.expirationDate',
                            'pro.expirationDate',
                            'specialId.expirationDate',
                        ];
                        dateFields.forEach((field) => {
                            const newDate = request.payload?.[field];
                            if (newDate) {
                                const parsedDate = new Date(newDate);
                                if (parsedDate > maxDate) {
                                    throw new Error(
                                        `Managers cannot set ${field} beyond one month from today.`
                                    );
                                }
                            }
                        });
                    }
                    return request;
                },
            },
            new: { isAccessible: false, isVisible: false },
            delete: { isAccessible: false, isVisible: false },
        },
    },
};

export default userLimitedResource;
