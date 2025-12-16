
import Agency from '../../../models/agencies/hostAgency.model.js';
import Host from '../../../models/agencies/host.model.js';
import HostDailyRecord from '../../../models/agencies/hostDailyRecord.model.js';
import hostConfig from '../../../config/levels/hostTargets.js';
import { AccessLimited } from '../utils/accessRoles.mjs';

const hostAgencyLimitedResource = {
    resource: Agency,
    options: {
        id: 'host-agency-limited',
        navigation: {
            name: 'وكالات المضيفين (تعديل محدود)',
            icon: 'Building',
            parent: { name: 'إدارة الوكالات', icon: 'Building' },
        },

        properties: {
            _id: { isVisible: { list: false, show: true, edit: false, filter: true } },
            name: { isTitle: true, position: 1, isVisible: { list: true, show: true, edit: true, filter: true } },
            admin: { position: 2, reference: 'User', isVisible: { list: true, show: true, edit: true, filter: true } },
            currentDiamonds: { isVisible: false }, // hidden
            blockSalaryTransfer: { type: 'boolean', isVisible: { list: true, show: true, edit: true, filter: true } },
            createdAt: { isVisible: { list: false, show: true, edit: false } },
            updatedAt: { isVisible: { list: false, show: true, edit: false } },
            totalHosts: { type: 'number', isVisible: { list: true, show: true, edit: false }, position: 3 },
            dailyDiamonds: { type: 'number', isVisible: { list: false, show: true, edit: false }, position: 4 },
            monthlyDiamonds: { type: 'number', isVisible: { list: false, show: true, edit: false }, position: 5 },
            avgHostDiamonds: { type: 'number', isVisible: { list: false, show: true, edit: false }, position: 6 },
            Salary: { type: 'number', isVisible: { list: true, show: true, edit: false, filter: false }, position: 7 },
        },

        actions: {
            new: { isAccessible: ({ currentAdmin }) => AccessLimited({ currentAdmin }) },
            edit: { isAccessible: ({ currentAdmin }) => AccessLimited({ currentAdmin }) },
            show: {
                isAccessible: ({ currentAdmin }) => AccessLimited({ currentAdmin }),
                after: async (response, request, context) => {
                    const { record } = context;
                    if (!record) return response;

                    const agencyId = record.params._id;
                    const hosts = await Host.find({ agency: agencyId }).select('currentDiamonds');
                    const hostIds = hosts.map(h => h._id);
                    const totalHosts = hosts.length;

                    // Daily diamonds today
                    const today = new Date();
                    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
                    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
                    const dailyRecords = await HostDailyRecord.aggregate([
                        { $match: { host: { $in: hostIds }, day: { $gte: startOfDay, $lte: endOfDay } } },
                        { $group: { _id: null, totalDailyDiamonds: { $sum: '$diamondsCollected' } } },
                    ]);

                    // Monthly diamonds
                    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
                    const monthlyRecords = await HostDailyRecord.aggregate([
                        { $match: { host: { $in: hostIds }, day: { $gte: startOfMonth, $lte: endOfMonth } } },
                        { $group: { _id: null, totalMonthlyDiamonds: { $sum: '$diamondsCollected' } } },
                    ]);

                    const avgHostDiamonds = totalHosts
                        ? Math.round(hosts.reduce((sum, h) => sum + (h.currentDiamonds || 0), 0) / totalHosts)
                        : 0;

                    // Add calculated fields to record
                    record.params.totalHosts = totalHosts;
                    record.params.dailyDiamonds = dailyRecords.length ? dailyRecords[0].totalDailyDiamonds : 0;
                    record.params.monthlyDiamonds = monthlyRecords.length ? monthlyRecords[0].totalMonthlyDiamonds : 0;
                    record.params.avgHostDiamonds = avgHostDiamonds;
                    record.params.Salary = Math.floor((record.params.currentDiamonds || 0) * hostConfig.salaryConversionRates.agencyDiamondToUSD) || 0;

                    return response;
                },
            },
            list: {
                isAccessible: ({ currentAdmin }) => AccessLimited({ currentAdmin }),
                after: async (response) => {
                    for (const record of response.records) {
                        record.params.Salary = Math.floor((record.params.currentDiamonds || 0) * hostConfig.salaryConversionRates.agencyDiamondToUSD) || 0;
                    }
                    return response;
                },
            },
            delete: { isAccessible: false },
            bulkDelete: { isAccessible: false },
        },

        listProperties: ['name', 'admin', 'totalHosts', 'Salary', 'blockSalaryTransfer'],
        filterProperties: ['name', 'admin', 'blockSalaryTransfer'],
        showProperties: ['name', 'admin', 'blockSalaryTransfer', 'Salary', 'totalHosts', 'monthlyDiamonds', 'dailyDiamonds', 'avgHostDiamonds', 'createdAt', 'updatedAt'],
        editProperties: ['name', 'admin', 'blockSalaryTransfer'],
    },
};

export default hostAgencyLimitedResource;
