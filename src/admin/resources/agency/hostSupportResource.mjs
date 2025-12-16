import Host from '../../../models/agencies/host.model.js';

const hostResourceForSupport = {
    resource: Host,
    options: {
        id: 'hostSupportResource',
        navigation: {
            name: 'المضيفين',
            icon: 'User',
            parent: { name: 'إدارة الوكالات', icon: 'Building' },
        },
        isVisible: ({ currentAdmin }) => currentAdmin?.role === 'support',
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'support',

        properties: {
            _id: { isVisible: { list: false, filter: true, show: true, edit: false } },
            user: {
                position: 1,
                isTitle: true,
                isVisible: true,
                reference: 'User',
                isRequired: true,
            },
            agency: {
                position: 2,
                isVisible: true,
                reference: 'Agency',
                isRequired: true,
            },
            currentDiamonds: {
                position: 3,
                type: 'number',
                isVisible: false,
            },
            blockSalaryTransfer: { position: 3.5, type: 'boolean', isVisible: true },
            Salary: {
                position: 4,
                type: 'number',
                isVisible: true,
                components: { show: 'SalaryDisplay' },
            },
            createdAt: { isVisible: true },
            updatedAt: { isVisible: true },
            dailyDiamonds: { isVisible: false, type: 'number' },
            monthlyDiamonds: { isVisible: false, type: 'number' },
            hostStats: { isVisible: true, type: 'mixed', components: { show: 'HostStatisticsDisplay' } },
            hostPerformance: { isVisible: true, type: 'mixed', components: { list: 'HostPerformanceSummary' } },
        },

        actions: {
            new: { isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'support' },
            edit: { isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'support' },
            delete: { isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'support' },
            bulkDelete: { isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'support' },
            show: { isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'support' },
            list: { isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'support' },
        },

        listProperties: ['user', 'agency', 'Salary', 'hostPerformance', 'createdAt'],
        showProperties: ['user', 'agency', 'blockSalaryTransfer', 'Salary', 'hostStats', 'createdAt', 'updatedAt'],
        editProperties: ['user', 'agency', 'blockSalaryTransfer'],
        filterProperties: ['user', 'agency', 'blockSalaryTransfer', 'createdAt'],
    },
};

export default hostResourceForSupport;
