const mongoose = require('mongoose');
const { cleanupOldChatMessages, getCleanupStatistics } = require('../src/services/chat/chatCleanup.service');
const logger = require('../src/config/logger');

// Test script for chat message cleanup
async function testChatCleanup() {
    try {
        // Connect to MongoDB (make sure to use your actual connection string)
        const mongoUri = process.env.MONGODB_URL || 'mongodb://localhost:27017/sawa';
        await mongoose.connect(mongoUri);
        logger.info('Connected to MongoDB');

        // Get cleanup statistics
        console.log('Getting cleanup statistics...');
        const stats = await getCleanupStatistics();
        console.log('Cleanup Statistics:', JSON.stringify(stats, null, 2));

        // If there are messages to clean, ask for confirmation
        if (stats.totalOldMessages > 0) {
            console.log(`\n⚠️  Found ${stats.totalOldMessages} old messages that will be cleaned up:`);
            console.log(`   - Image messages: ${stats.oldImageMessages}`);
            console.log(`   - Voice messages: ${stats.oldVoiceMessages}`);
            console.log(`   - Messages older than: ${stats.cutoffDate}`);

            // Uncomment the line below to actually run the cleanup
            // console.log('\nRunning cleanup...');
            // const result = await cleanupOldChatMessages();
            // console.log('Cleanup Result:', JSON.stringify(result, null, 2));
        } else {
            console.log('✅ No old messages found for cleanup');
        }

    } catch (error) {
        logger.error('Error testing chat cleanup:', error);
    } finally {
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB');
    }
}

// Run the test
testChatCleanup();
