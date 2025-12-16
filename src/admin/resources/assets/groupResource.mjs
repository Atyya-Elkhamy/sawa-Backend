import Group from '../../../models/group.model.js';
import User from '../../../models/user.model.js';
import { generateUniqueUserId } from '../../../utils/IDGen.js';

const groupResource = {
    resource: Group,
    options: {
        properties: {
            name: { type: 'string', isTitle: true, isRequired: true },
            open: { type: 'boolean', default: true },
            groupId: { type: 'string', isRequired: true },
            admin: {
                type: 'reference',
                reference: 'User',
                isRequired: true,
            },
            contributionCredits: { type: 'number', default: 0 },
            blockedUsers: {
                type: 'reference',
                reference: 'User',
                isArray: true,
            },
            groupRoom: {
                type: 'reference',
                reference: 'Room',
            },
            balance: { type: 'number', default: 0 },
            cover: { type: 'string' },
            image: { type: 'string' },
            membersCount: { type: 'number', default: 0, isVisible: { list: true, edit: false, filter: true, show: true } },
            createdAt: { type: 'datetime', isVisible: { list: true, edit: false, filter: true, show: true } },
            updatedAt: { type: 'datetime', isVisible: { list: true, edit: false, filter: true, show: true } },
        },
        listProperties: ['name', 'open', 'groupId', 'admin', 'membersCount', 'balance', 'createdAt'],
        editProperties: ['name', 'open', 'groupId', 'admin', 'contributionCredits', 'blockedUsers', 'groupRoom', 'balance', 'cover', 'image'],
        showProperties: ['name', 'open', 'groupId', 'admin', 'contributionCredits', 'blockedUsers', 'groupRoom', 'balance', 'cover', 'image', 'membersCount', 'createdAt', 'updatedAt'],
        filterProperties: ['name', 'open', 'admin', 'createdAt'],
        navigation: {
            name: 'المجموعات',
            icon: 'Group',
            parent: {
                name: 'إدارة المجموعات',
                icon: 'Group',
            },
        },
        actions: {
            new: {
                before: async (request) => {
                    if (request.payload && !request.payload.groupId) {
                        request.payload.groupId = await generateUniqueUserId();
                    }
                    return request;
                },
                after: async (response, request, context) => {
                    const { record } = context;
                    if (record && record.params.admin) {
                        // Set the admin's group to this group
                        await User.findByIdAndUpdate(record.params.admin, { group: record.params._id });
                    }
                    return response;
                },
            },
            edit: {
                after: async (response, request, context) => {
                    // Set new admin's group
                    await User.findByIdAndUpdate(request.payload.admin, { group: context.record.params._id });
                    // recalculate members count
                    const group = await Group.findById(context.record.params._id);
                    if (group) {
                        await group.updateMembersCount();
                    }
                    return response;
                },
            },
            delete: {
                before: async (request, context) => {
                    const { record } = context;
                    if (record) {
                        // Update all users associated with this group
                        await User.updateMany(
                            { group: record.id() },
                            { group: null }
                        );
                    }
                    return request;
                },
            },
            bulkDelete: {
                before: async (request, context) => {
                    const { records } = context;
                    const groupIds = records.map((record) => record.id());
                    // Update all users associated with these groups
                    await User.updateMany(
                        { group: { $in: groupIds } },
                        { group: null }
                    );
                    return request;
                },
            },
            show: {
                after: async (response, request, context) => {
                    const { record } = context;
                    if (record) {
                        // Update members count
                        const group = await Group.findById(record.id());
                        if (group) {
                            await group.updateMembersCount();
                            record.params.membersCount = group.membersCount;
                        }
                    }
                    return response;
                },
            },
            list: {
                isAccessible: ({ currentAdmin }) => {
                   
                    return currentAdmin && currentAdmin.role === 'superadmin';
                },
                after: async (response, request, context) => {
                    if (response.records) {
                        for (const record of response.records) {
                            const group = await Group.findById(record.params._id);
                            if (group) {
                                await group.updateMembersCount();
                                record.params.membersCount = group.membersCount;
                            }
                        }
                    }
                    return response;
                },
            },
        },
    },
};

export default groupResource;
