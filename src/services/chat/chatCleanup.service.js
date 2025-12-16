const ChatMessage = require('../../models/chat/chatMessage.model');
const { MESSAGE_TYPES, expiredContent } = require('../../config/chat.config');
const { deleteFileFromS3, deleteMultipleFilesFromS3 } = require('../../utils/aws/s3.utils');
const logger = require('../../config/logger');

/**
 * Clean up old chat messages (images and voice messages older than 30 days)
 * Deletes files from S3 and converts messages to text with deletion notice
 */
const cleanupOldChatMessages = async () => {
    try {
        logger.info('Starting cleanup of old chat messages...');

        // Calculate the date 30 days ago
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Find image and voice messages older than 30 days that haven't been converted yet
        const oldMessages = await ChatMessage.find({
            createdAt: { $lt: thirtyDaysAgo },
            messageType: { $in: [MESSAGE_TYPES.IMAGE, MESSAGE_TYPES.AUDIO] },
            isDeleted: false, // Only process non-deleted messages
        }).select('_id messageType content conversationId senderId receiverId');

        if (oldMessages.length === 0) {
            logger.info('No old chat messages found for cleanup');
            return {
                totalProcessed: 0,
                successfulDeletions: 0,
                failedDeletions: 0,
                errors: [],
            };
        }

        logger.info(`Found ${oldMessages.length} old messages to clean up`);

        let successfulDeletions = 0;
        let failedDeletions = 0;
        const errors = [];
        const filesToDelete = [];

        // Collect all file URLs that need to be deleted
        for (const message of oldMessages) {
            if (message.content && message.content.body) {
                filesToDelete.push({
                    messageId: message._id,
                    fileUrl: message.content.body,
                    messageType: message.messageType,
                });
            }
        }

        // Delete files from S3 in batches
        logger.info(`Attempting to delete ${filesToDelete.length} files from S3...`);

        for (const fileInfo of filesToDelete) {
            try {
                const deletionSuccess = await deleteFileFromS3(fileInfo.fileUrl);

                if (deletionSuccess) {
                    // Update the message in database
                    await ChatMessage.findByIdAndUpdate(fileInfo.messageId, {
                        messageType: MESSAGE_TYPES.TEXT,
                        content: {
                            body: expiredContent.body,
                            originalType: fileInfo.messageType, // Keep track of original type
                        },
                        isDeleted: true,
                    });

                    successfulDeletions++;
                    logger.info(`Successfully cleaned up message ${fileInfo.messageId}`);
                } else {
                    // Even if S3 deletion failed, update the message to prevent future attempts
                    await ChatMessage.findByIdAndUpdate(fileInfo.messageId, {
                        messageType: MESSAGE_TYPES.TEXT,
                        content: {
                            body: expiredContent.body,
                            originalType: fileInfo.messageType,
                            note: 'S3 deletion failed but message converted',
                        },
                        isDeleted: true,
                    });

                    failedDeletions++;
                    errors.push(`Failed to delete file for message ${fileInfo.messageId}: ${fileInfo.fileUrl}`);
                }
            } catch (error) {
                failedDeletions++;
                errors.push(`Error processing message ${fileInfo.messageId}: ${error.message}`);
                logger.error(`Error processing message ${fileInfo.messageId}:`, error);

                // Still update the message to prevent future attempts
                try {
                    await ChatMessage.findByIdAndUpdate(fileInfo.messageId, {
                        messageType: MESSAGE_TYPES.TEXT,
                        content: {
                            body: expiredContent.body,
                            originalType: fileInfo.messageType,
                            note: 'Error during cleanup but message converted',
                        },
                        isDeleted: true,
                    });
                } catch (updateError) {
                    logger.error(`Failed to update message ${fileInfo.messageId}:`, updateError);
                }
            }
        }

        const result = {
            totalProcessed: oldMessages.length,
            successfulDeletions,
            failedDeletions,
            errors,
        };

        logger.info(`Chat message cleanup completed:`, result);
        return result;

    } catch (error) {
        logger.error('Error during chat message cleanup:', error);
        throw error;
    }
};

/**
 * Get statistics about messages that will be cleaned up
 * @returns {Promise<Object>} Statistics about old messages
 */
const getCleanupStatistics = async () => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [imageCount, voiceCount] = await Promise.all([
            ChatMessage.countDocuments({
                createdAt: { $lt: thirtyDaysAgo },
                messageType: MESSAGE_TYPES.IMAGE,
                isDeleted: false,
            }),
            ChatMessage.countDocuments({
                createdAt: { $lt: thirtyDaysAgo },
                messageType: MESSAGE_TYPES.AUDIO,
                isDeleted: false,
            }),
        ]);

        return {
            totalOldMessages: imageCount + voiceCount,
            oldImageMessages: imageCount,
            oldVoiceMessages: voiceCount,
            cutoffDate: thirtyDaysAgo,
        };
    } catch (error) {
        logger.error('Error getting cleanup statistics:', error);
        throw error;
    }
};

module.exports = {
    cleanupOldChatMessages,
    getCleanupStatistics,
};
