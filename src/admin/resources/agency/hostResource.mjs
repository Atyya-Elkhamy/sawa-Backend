import Host from '../../../models/agencies/host.model.js';
import User from '../../../models/user.model.js';
import Agency from '../../../models/agencies/hostAgency.model.js';
import HostDailyRecord from '../../../models/agencies/hostDailyRecord.model.js';
import hostConfig from '../../../config/levels/hostTargets.js';
import mongoose from 'mongoose';

const hostResource = {
    resource: Host,
    options: {
        isVisible: ({ currentAdmin }) => {
            return currentAdmin && (currentAdmin.role === 'superadmin');
        },
        isAccessible: ({ currentAdmin }) => {
            return currentAdmin && (currentAdmin.role === 'superadmin');
        },

        navigation: {
            name: 'المضيفين',
            icon: 'User',
            parent: {
                name: 'إدارة الوكالات',
                icon: 'Building',
            },
        },
        properties: {
            _id: {
                isVisible: { list: false, filter: true, show: true, edit: false },
            },
            user: {
                position: 1,
                isTitle: true,
                isVisible: { list: true, filter: true, show: true, edit: true },
                reference: 'User',
                isRequired: true,
            },
            agency: {
                position: 2,
                isVisible: { list: true, filter: true, show: true, edit: true },
                reference: 'Agency',
                isRequired: true,
            },
            currentDiamonds: {
                position: 3,
                type: 'number',
                isVisible: { list: true, filter: true, show: true, edit: true },
                components: {
                    show: 'DiamondDisplay',
                    list: 'DiamondDisplay',
                },
            },
            blockSalaryTransfer: {
                position: 3.5,
                type: 'boolean',
                isVisible: { list: true, filter: true, show: true, edit: true },
            },
            Salary: {
                position: 4,
                type: 'number',
                isVisible: { list: true, filter: false, show: true, edit: false },
                components: {
                    show: 'SalaryDisplay',
                },
            },
            createdAt: {
                isVisible: { list: true, filter: true, show: true, edit: false },
            },
            updatedAt: {
                isVisible: { list: true, filter: true, show: true, edit: false },
            },
            // Virtual properties for statistics
            dailyDiamonds: {
                isVisible: { list: false, filter: false, show: true, edit: false },
                type: 'number',
            },
            monthlyDiamonds: {
                isVisible: { list: false, filter: false, show: true, edit: false },
                type: 'number',
            },
            // Virtual field for enhanced statistics display
            hostStats: {
                isVisible: { list: false, filter: false, show: true, edit: false },
                type: 'mixed',
                components: {
                    show: 'HostStatisticsDisplay',
                },
            },
            // Performance summary for list view
            hostPerformance: {
                isVisible: { list: true, filter: false, show: false, edit: false },
                type: 'mixed',
                components: {
                    list: 'HostPerformanceSummary',
                },
            },
        },
        actions: {
            new: {
                before: async (request) => {
                    if (request.payload) {
                        // Check if user is already a host
                        const existingHost = await Host.findOne({ user: request.payload.user });
                        if (existingHost) {
                            throw new Error('User is already a host in another agency');
                        }

                        // Check if user exists and is not already linked to an agency
                        const user = await User.findById(request.payload.user);
                        if (!user) {
                            throw new Error('User not found');
                        }

                        if (user.hostAgency || user.host) {
                            throw new Error('User is already associated with an agency');
                        }

                        // Validate agency exists
                        const agency = await Agency.findById(request.payload.agency);
                        if (!agency) {
                            throw new Error('Agency not found');
                        }

                        // Check agency host limit (1000 hosts max)
                        const hostCount = await Host.countDocuments({ agency: request.payload.agency });
                        if (hostCount >= 1000) {
                            throw new Error('Agency has reached maximum host limit (1000)');
                        }
                    }
                    return request;
                },
                after: async (response, request, context) => {
                    const { record } = context;
                    if (record && record.params.user && record.params.agency) {
                        // Update the user with host and agency references
                        await User.findByIdAndUpdate(record.params.user, {
                            host: record.params._id,
                            hostAgency: record.params.agency,
                        });
                    }
                    return response;
                },
            },
            edit: {
                before: async (request, context) => {
                    if (request.payload && request.payload.user && request.payload.user !== context.record.params.user) {
                        // Check if new user is already a host
                        const existingHost = await Host.findOne({ user: request.payload.user });
                        if (existingHost) {
                            throw new Error('User is already a host in another agency');
                        }

                        // Check if new user exists and is not already linked to an agency
                        const user = await User.findById(request.payload.user);
                        if (!user) {
                            throw new Error('User not found');
                        }

                        if (user.hostAgency || user.host) {
                            throw new Error('User is already associated with an agency');
                        }
                    }

                    if (request.payload && request.payload.agency && request.payload.agency !== context.record.params.agency) {
                        // Validate new agency exists
                        const agency = await Agency.findById(request.payload.agency);
                        if (!agency) {
                            throw new Error('Agency not found');
                        }

                        // Check new agency host limit
                        const hostCount = await Host.countDocuments({ agency: request.payload.agency });
                        if (hostCount >= 1000) {
                            throw new Error('Agency has reached maximum host limit (1000)');
                        }
                    }

                    return request;
                },
                after: async (response, request, context) => {
                    const oldRecord = context.record.params;

                    if (request.payload && request.payload.user && request.payload.user !== oldRecord.user) {
                        // Remove references from old user
                        await User.findByIdAndUpdate(oldRecord.user, {
                            host: null,
                            hostAgency: null,
                        });

                        // Add references to new user
                        await User.findByIdAndUpdate(request.payload.user, {
                            host: oldRecord._id,
                            hostAgency: request.payload.agency || oldRecord.agency,
                        });
                    }

                    if (request.payload && request.payload.agency && request.payload.agency !== oldRecord.agency) {
                        // Update user's agency reference
                        await User.findByIdAndUpdate(oldRecord.user, {
                            hostAgency: request.payload.agency,
                        });
                    }

                    return response;
                },
            },
            delete: {
                guard: 'doYouReallyWantToDoThis',
                before: async (request, context) => {
                    const { record } = context;
                    if (record) {
                        // Remove references from user
                        await User.findByIdAndUpdate(record.params.user, {
                            host: null,
                            hostAgency: null,
                        });

                        // Remove all daily records for this host
                        await HostDailyRecord.deleteMany({ host: record.params._id });
                    }
                    return request;
                },
            },
            bulkDelete: {
                guard: 'doYouReallyWantToDoThis',
                before: async (request, context) => {
                    const { records } = context;
                    const hostIds = records.map((record) => record.params._id);
                    const userIds = records.map((record) => record.params.user);

                    // Remove references from all users
                    await User.updateMany(
                        { _id: { $in: userIds } },
                        {
                            host: null,
                            hostAgency: null,
                        }
                    );

                    // Remove all daily records for these hosts
                    await HostDailyRecord.deleteMany({ host: { $in: hostIds } });

                    return request;
                },
            },
            show: {
                after: async (response, request, context) => {
                    const { record } = context;
                    if (record) {
                        const hostId = record.params._id;
                        const userId = record.params.user;

                        // Get today's date range
                        const now = new Date();

                        // Daily boundaries (from the start of today to the end of today)
                        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                        // Get current month range
                        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                        // Get daily diamonds for today
                        const dailyRecord = await HostDailyRecord.findOne({
                            host: hostId,
                            day: { $gte: dayStart, $lte: dayEnd }
                        });

                        // Get monthly diamonds
                        const monthlyRecords = await HostDailyRecord.aggregate([
                            {
                                $match: {
                                    host: new mongoose.Types.ObjectId(hostId),
                                    day: { $gte: monthStart, $lte: monthEnd }
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    totalDiamonds: { $sum: '$diamondsCollected' },
                                    totalSalary: { $sum: '$expectedDailySalary' }
                                }
                            }
                        ]);


                        // Add statistics to the record
                        record.params.dailyDiamonds = dailyRecord ? dailyRecord.diamondsCollected : 0;
                        record.params.monthlyDiamonds = monthlyRecords.length > 0 ? monthlyRecords[0].totalDiamonds : 0;
                        record.params.dailySalary = dailyRecord ? dailyRecord.expectedDailySalary : 0;
                        record.params.monthlySalary = monthlyRecords.length > 0 ? monthlyRecords[0].totalSalary : 0;

                        // Ensure salary is calculated properly using the correct conversion rate
                        record.params.Salary = Math.floor((record.params.currentDiamonds || 0) * hostConfig.salaryConversionRates.hostDiamondToUSD) || 0;
                    }
                    return response;
                },
            },
            list: {
                isAccessible: ({ currentAdmin }) => {
                    return currentAdmin && (currentAdmin.role === 'superadmin');
                },

                after: async (response, request, context) => {
                    if (response.records) {
                        // Add salary calculation for each host in the list
                        for (const record of response.records) {
                            // Calculate salary properly
                            const salary = Math.floor((record.params.currentDiamonds || 0) * hostConfig.salaryConversionRates.hostDiamondToUSD) || 0;
                            record.params.Salary = salary;
                        }
                    }
                    return response;
                },
            },
        },
        filterProperties: ['user', 'agency', 'currentDiamonds', 'createdAt', 'blockSalaryTransfer'],
        listProperties: ['user', 'agency', 'currentDiamonds', 'Salary', 'hostPerformance', 'createdAt'],
        showProperties: [
            'user',
            'agency',
            'currentDiamonds',
            'blockSalaryTransfer',
            'Salary',
            'dailyDiamonds',
            'monthlyDiamonds',
            'hostStats',
            'createdAt',
            'updatedAt'
        ],
        editProperties: ['user', 'agency', 'currentDiamonds', 'blockSalaryTransfer'],
    },
};

export default hostResource;
