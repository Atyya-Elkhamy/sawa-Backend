const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const logger = require('../../config/logger');

// Configure S3 Client
const s3Client = new S3Client({
    region: process.env.S3_REGION,
    bucket: process.env.S3_BUCKET_NAME,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
    },
});

/**
 * Delete a file from S3 bucket
 * @param {string} fileUrl - The full URL or key of the file to delete
 * @returns {Promise<boolean>} - Returns true if deletion was successful
 */
const deleteFileFromS3 = async (fileUrl) => {
    try {
        if (!fileUrl) {
            logger.warn('No file URL provided for deletion');
            return false;
        }

        // Extract key from URL if it's a full URL
        let key = fileUrl;
        const bucketName = process.env.S3_BUCKET_NAME;

        // If it's a full URL, extract the key
        if (fileUrl.includes(bucketName)) {
            const urlParts = fileUrl.split('/');
            key = urlParts[urlParts.length - 1];
        } else if (fileUrl.startsWith('https://')) {
            // Extract key from full S3 URL
            const url = new URL(fileUrl);
            key = url.pathname.substring(1); // Remove leading slash
        }

        const deleteParams = {
            Bucket: bucketName,
            Key: key,
        };

        const command = new DeleteObjectCommand(deleteParams);
        await s3Client.send(command);

        logger.info(`Successfully deleted file from S3: ${key}`);
        return true;
    } catch (error) {
        logger.error(`Error deleting file from S3: ${fileUrl}`, error);
        return false;
    }
};

/**
 * Delete multiple files from S3 bucket
 * @param {string[]} fileUrls - Array of file URLs to delete
 * @returns {Promise<{success: number, failed: number}>} - Returns count of successful and failed deletions
 */
const deleteMultipleFilesFromS3 = async (fileUrls) => {
    let success = 0;
    let failed = 0;

    for (const fileUrl of fileUrls) {
        const result = await deleteFileFromS3(fileUrl);
        if (result) {
            success++;
        } else {
            failed++;
        }
    }

    return { success, failed };
};

module.exports = {
    deleteFileFromS3,
    deleteMultipleFilesFromS3,
};
