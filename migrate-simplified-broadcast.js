const mongoose = require('mongoose');
const SystemMessage = require('./src/models/chat/systemMessages.model');

/**
 * Migration script to convert old broadcast system to new simplified system
 */
async function migrateToSimplifiedBroadcast() {
  try {
    console.log('Starting simplified broadcast migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/sawa', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    // Find all broadcast messages grouped by broadCastId
    const broadcastMessages = await SystemMessage.find({
      senderType: 'broadcast',
      broadCastId: { $exists: true, $ne: null },
    });
    
    console.log(`Found ${broadcastMessages.length} broadcast messages`);
    
    // Group messages by broadCastId
    const groupedMessages = {};
    broadcastMessages.forEach((msg) => {
      if (!groupedMessages[msg.broadCastId]) {
        groupedMessages[msg.broadCastId] = [];
      }
      groupedMessages[msg.broadCastId].push(msg);
    });
    
    console.log(`Found ${Object.keys(groupedMessages).length} unique broadcast groups`);
    
    // For each group, keep the first message as the main broadcast and remove others
    for (const [broadCastId, messages] of Object.entries(groupedMessages)) {
      if (messages.length > 1) {
        // Sort by creation date to get the first one
        messages.sort((a, b) => a.createdAt - b.createdAt);
        
        const mainMessage = messages[0];
        const duplicateMessages = messages.slice(1);
        
        // Update the main message to be the broadcast main
        await SystemMessage.findByIdAndUpdate(mainMessage._id, {
          broadCastMain: true,
          receiverId: null,
        });
        
        // Remove duplicate messages
        const duplicateIds = duplicateMessages.map((msg) => msg._id);
        await SystemMessage.deleteMany({ _id: { $in: duplicateIds } });
        
        console.log(`Migrated broadcast group ${broadCastId}: kept 1 main message, removed ${duplicateMessages.length} duplicates`);
      } else {
        // Single message, just mark as main
        await SystemMessage.findByIdAndUpdate(messages[0]._id, {
          broadCastMain: true,
          receiverId: null,
        });
        console.log(`Marked single broadcast message ${broadCastId} as main`);
      }
    }
    
    // Remove isRead field from all system messages
    await SystemMessage.updateMany({}, { $unset: { isRead: 1 } });
    console.log('Removed isRead field from all system messages');
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateToSimplifiedBroadcast()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = migrateToSimplifiedBroadcast;
