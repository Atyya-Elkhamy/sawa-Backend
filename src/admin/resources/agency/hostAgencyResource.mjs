import Agency from '../../../models/agencies/hostAgency.model.js';
import User from '../../../models/user.model.js';
import Host from '../../../models/agencies/host.model.js';
import HostDailyRecord from '../../../models/agencies/hostDailyRecord.model.js';
import { generateUniqueUserId } from '../../../utils/IDGen.js';
import hostConfig from '../../../config/levels/hostTargets.js';
import mongoose from 'mongoose';
import { hostAgencyService } from '../../../services/index.js';

const hostAgencyResource = {
  resource: Agency,
  options: {
    navigation: {
      name: 'وكالات المضيفين',
      icon: 'Building',
      parent: {
        name: 'إدارة الوكالات',
        icon: 'Building',
      },
    },
    properties: {
      _id: {
        isVisible: { list: false, filter: true, show: true, edit: false },
      },
      name: {
        isTitle: true,
        position: 1,
      },
      agencyId: {
        isVisible: { list: true, filter: true, show: true, edit: false },
      },
      admin: {
        position: 2,
        isVisible: { list: true, filter: true, show: true, edit: true },
        reference: 'User',
        isRequired: true,
        // unique: true,
      },
      currentDiamonds: {
        position: 3,
        type: 'number',
        components: {
          show: 'DiamondDisplay',
          list: 'DiamondDisplay',
        },
      },
      blockSalaryTransfer: {
        type: 'boolean',
        isVisible: { list: true, filter: true, show: true, edit: true },
      },
      createdAt: {
        isVisible: { list: true, filter: true, show: true, edit: false },
      },
      updatedAt: {
        isVisible: { list: true, filter: true, show: true, edit: false },
      },
      Salary: {
        isVisible: { list: true, filter: false, show: true, edit: true },
        position: 4,
        type: 'number',
        components: {
          show: 'SalaryDisplay',
          list: 'SalaryDisplay',
        },
      },
      // Additional statistics properties
      totalHosts: {
        isVisible: { list: true, filter: false, show: true, edit: false },
        position: 5,
        type: 'number',
      },
      monthlyDiamonds: {
        isVisible: { list: false, filter: false, show: true, edit: false },
        position: 6,
        type: 'number',
      },
      dailyDiamonds: {
        isVisible: { list: false, filter: false, show: true, edit: false },
        position: 7,
        type: 'number',
      },
      agencyRank: {
        isVisible: { list: false, filter: false, show: true, edit: false },
        position: 8,
        type: 'number',
      },
      avgHostDiamonds: {
        isVisible: { list: false, filter: false, show: true, edit: false },
        position: 9,
        type: 'number',
      },
      // Virtual field for enhanced statistics display
      enhancedStats: {
        isVisible: { list: false, filter: false, show: true, edit: false },
        position: 10,
        type: 'mixed',
        components: {
          show: 'AgencyStatisticsDisplay',
        },
      },
      // Performance summary for list view
      performanceSummary: {
        isVisible: { list: true, filter: false, show: false, edit: false },
        position: 11,
        type: 'mixed',
        components: {
          list: 'PerformanceSummary',
        },
      },
    },
    actions: {
      new: {
        before: async (request) => {
          if (request.payload) {
            // Generate agency ID
            // check if admin is already has a host agency
            const AgencyExists = await Agency.findOne({ admin: request.payload.admin });
            if (AgencyExists) {
              request.payload.admin = null;
            }
            request.payload.agencyId = await generateUniqueUserId();
          }
          return request;
        },
        after: async (response, request, context) => {
          const { record } = context;
          if (record && record.params.admin) {
            console.log('record.params.admin', record.params.admin);
            // Update the admin user with agency reference
            // delete admin as host if exists
            await Host.deleteOne({ user: record.params.admin });
            // Create a new host for the admin user
            const adminHost = await Host.create({
              user: record.params.admin,
              agency: record.params._id,
            });
            await User.findByIdAndUpdate(record.params.admin, {
              hostAgency: record.params._id,
              isAgencyHost: true,
              host: adminHost._id,
            });
          }
          return response;
        },
      },
      edit: {
        isAccessible: ({ currentAdmin }) => {
          return currentAdmin && (currentAdmin.role === 'superadmin');
        },
        before: async (request, context) => {
          if (request.payload && request.payload.admin && request.payload.admin !== context.record.params.admin) {
            // check if admin is already has a host agency
            const AgencyExists = await Agency.findOne({ admin: request.payload.admin });
            if (AgencyExists) {
              request.payload.admin = null;
            }
          }
          return request;
        },
        after: async (response, request, context) => {
          if (request.payload && request.payload.admin) {
            // First, remove agency reference from previous admin if exists
            await User.updateMany(
              {
                hostAgency: context.record.params._id,
              },
              {
                isAgencyHost: false,
              }
            );
            // find host  and update if it exist to new agency or create new

            // Create a new host for the new admin user
            const adminHost = await Host.findOneAndUpdate({
              user: request.payload.admin,
            }, {
              agency: context.record.params._id,
            }, {
              new: true,
              upsert: true,
            });

            // Update the new admin
            await User.findByIdAndUpdate(request.payload.admin, {
              hostAgency: context.record.params._id,
              host: adminHost._id,
              isAgencyHost: true,
            });
          }
          return response;
        },
      },
      delete: {
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'superadmin',
        guard: 'doYouReallyWantToDoThis',

        before: async (request, context) => {
          const { record } = context;
          if (record) {
            // Get all host IDs for this agency before deleting hosts
            const hosts = await Host.find({ agency: record.params._id }).select('_id');
            const hostIds = hosts.map(h => h._id);

            // Update all users associated with this agency
            await User.updateMany(
              { hostAgency: record.params._id },
              {
                hostAgency: null,
                host: null,
                isAgencyHost: false,
              }
            );
            await Host.deleteMany({ agency: record.params._id });

            // Delete all daily records for these hosts
            await HostDailyRecord.deleteMany({ host: { $in: hostIds } });
          }
          return request;
        },
      },
      bulkDelete: {
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'superadmin',
        guard: 'doYouReallyWantToDoThis',

        before: async (request, context) => {
          const { records } = context;
          const agencyIds = records.map((record) => record.params._id);

          // Get all host IDs for these agencies before deleting hosts
          const hosts = await Host.find({ agency: { $in: agencyIds } }).select('_id');
          const hostIds = hosts.map(h => h._id);

          // Update all users associated with these agencies
          await User.updateMany(
            { hostAgency: { $in: agencyIds } },
            {
              hostAgency: null,
              isAgencyHost: false,
              host: null,
            }
          );
          await Host.deleteMany({ agency: { $in: agencyIds } });

          // Delete all daily records for these hosts
          await HostDailyRecord.deleteMany({ host: { $in: hostIds } });

          return request;
        },
      },
      show: {
        after: async (response, request, context) => {
          const { record } = context;
          if (record) {
            const agencyId = record.params._id;

            // Get total hosts count
            const totalHosts = await Host.countDocuments({ agency: agencyId });

            // Get today's date range
            const today = new Date();
            const startOfDay = new Date(today.setHours(0, 0, 0, 0));
            const endOfDay = new Date(today.setHours(23, 59, 59, 999));

            // Get current month range
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

            // Get hosts for this agency
            const hosts = await Host.find({ agency: agencyId }).select('_id currentDiamonds');
            const hostIds = hosts.map(h => h._id);

            // Get daily diamonds for today (agency total)
            const dailyRecords = await HostDailyRecord.aggregate([
              {
                $match: {
                  host: { $in: hostIds },
                  day: { $gte: startOfDay, $lte: endOfDay }
                }
              },
              {
                $group: {
                  _id: null,
                  totalDailyDiamonds: { $sum: '$diamondsCollected' }
                }
              }
            ]);
            console.log('dailyRecords', dailyRecords);

            // Get monthly diamonds (agency total)
            const monthlyRecords = await HostDailyRecord.aggregate([
              {
                $match: {
                  host: { $in: hostIds },
                  day: { $gte: startOfMonth, $lte: endOfMonth }
                }
              },
              {
                $group: {
                  _id: null,
                  totalMonthlyDiamonds: { $sum: '$diamondsCollected' }
                }
              }
            ]);

            const agencyRank = await hostAgencyService.getAgencyMonthlyRank(new mongoose.Types.ObjectId(agencyId));

            console.log('agencyRank', agencyRank);
            // Calculate average host diamonds
            const avgHostDiamonds = totalHosts > 0 ?
              Math.round(hosts.reduce((sum, host) => sum + (host.currentDiamonds || 0), 0) / totalHosts) : 0;

            // Add statistics to the record
            record.params.totalHosts = totalHosts;
            record.params.dailyDiamonds = dailyRecords.length > 0 ? dailyRecords[0].totalDailyDiamonds : 0;
            record.params.monthlyDiamonds = monthlyRecords.length > 0 ? monthlyRecords[0].totalMonthlyDiamonds : 0;
            record.params.agencyRank = agencyRank.rank;
            record.params.avgHostDiamonds = avgHostDiamonds;

            // Ensure salary is calculated properly using the correct conversion rate
            record.params.Salary = Math.floor((record.params.currentDiamonds || 0) * hostConfig.salaryConversionRates.agencyDiamondToUSD) || 0;
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
            // Add performance data for each agency in the list
            for (const record of response.records) {
              const agencyId = record.params._id;

              // Get basic host count
              const totalHosts = await Host.countDocuments({ agency: agencyId });

              // Calculate salary properly
              const salary = Math.floor((record.params.currentDiamonds || 0) * hostConfig.salaryConversionRates.agencyDiamondToUSD) || 0;

              // Add data to record
              record.params.totalHosts = totalHosts;
              record.params.Salary = salary;
            }
          }
          return response;
        },
      },
    },
    filterProperties: ['name', 'agencyId', 'admin', 'currentDiamonds', 'totalHosts', 'createdAt', 'blockSalaryTransfer'],
    listProperties: ['name', 'agencyId', 'admin', 'currentDiamonds', 'totalHosts', 'Salary', 'performanceSummary', 'createdAt'],
    showProperties: [
      'name',
      'agencyId',
      'admin',
      'currentDiamonds',
      'blockSalaryTransfer',
      'Salary',
      'totalHosts',
      'monthlyDiamonds',
      'dailyDiamonds',
      'agencyRank',
      'avgHostDiamonds',
      'enhancedStats',
      'createdAt',
      'updatedAt'
    ],
    editProperties: ['name', 'admin', 'currentDiamonds', 'blockSalaryTransfer'],
  },
};

export default hostAgencyResource;
