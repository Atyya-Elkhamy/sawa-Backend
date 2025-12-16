// utils/schedulers/pointDeduction.js

const User = require('../../models/user.model');
const logger = require('../../config/logger');

/**
 * Deduct 30% from famePoints and richPoints for all users
 * This function runs weekly to reduce user points over time
 */
const deductWeeklyPoints = async () => {
    try {
        logger.info('Starting weekly point deduction task...');

        // Calculate 40% deduction (multiply by 0.6 to keep 60% of original points)
        const deductionRate = 0.6;

        // Update all users' famePoints and richPoints
        const result = await User.updateMany(
            {}, // Update all users
            [
                {
                    $set: {
                        famePoints: {
                            $floor: {
                                $multiply: ['$famePoints', deductionRate]
                            }
                        },
                        richPoints: {
                            $floor: {
                                $multiply: ['$richPoints', deductionRate]
                            }
                        }
                    }
                }
            ]
        );

        logger.info(`Weekly point deduction completed. Updated ${result.modifiedCount} users.`);
        logger.info(`Matched ${result.matchedCount} users total.`);

        return {
            success: true,
            modifiedCount: result.modifiedCount,
            matchedCount: result.matchedCount
        };

    } catch (error) {
        logger.error('Error during weekly point deduction:', error);
        throw error;
    }
};

module.exports = {
    deductWeeklyPoints
};
