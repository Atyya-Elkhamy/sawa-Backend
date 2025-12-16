# Chat Message Cleanup System

This document describes the automated chat message cleanup system that removes old images and voice messages from the database and AWS S3 storage.

## Overview

The chat cleanup system automatically processes chat messages that are older than 30 days and performs the following actions:

1. **Identifies old messages**: Finds image and voice messages older than 30 days
2. **Deletes files from S3**: Removes the actual image and audio files from AWS S3 storage
3. **Converts messages**: Changes the message type to text with an Arabic deletion notice
4. **Preserves conversation flow**: Maintains the conversation structure while freeing up storage space

## Features

### Automated Cleanup
- **Schedule**: Runs daily at 2:00 AM server time
- **Target Messages**: Image and voice messages older than 30 days
- **Deletion Notice**: "رساله محذوفه منذ اكتر من 30 يوم" (Message deleted after more than 30 days)

### Manual Administration
- **Statistics Endpoint**: Get information about messages eligible for cleanup
- **Manual Trigger**: Force cleanup to run immediately (admin only)

## API Endpoints

### Get Cleanup Statistics
```
GET /api/v1/chat/admin/cleanup/statistics
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "message": "Cleanup statistics retrieved successfully",
  "messageAr": "تم جلب إحصائيات التنظيف بنجاح",
  "data": {
    "totalOldMessages": 150,
    "oldImageMessages": 100,
    "oldVoiceMessages": 50,
    "cutoffDate": "2024-12-26T02:00:00.000Z"
  }
}
```

### Trigger Manual Cleanup
```
POST /api/v1/chat/admin/cleanup/trigger
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "message": "Cleanup completed successfully",
  "messageAr": "تم إكمال التنظيف بنجاح",
  "data": {
    "totalProcessed": 150,
    "successfulDeletions": 145,
    "failedDeletions": 5,
    "errors": [
      "Failed to delete file for message 60d5ec49f95b8a001f123456: file-not-found.jpg"
    ]
  }
}
```

## Technical Implementation

### Files Created
1. **`src/utils/aws/s3.utils.js`** - AWS S3 file deletion utilities
2. **`src/services/chat/chatCleanup.service.js`** - Main cleanup service
3. **`src/scheduler.js`** - Updated with new cron job

### Database Changes
When a message is cleaned up, it is modified as follows:
- `messageType`: Changed to `'text'`
- `content.body`: Set to deletion notice in Arabic
- `content.originalType`: Preserves the original message type
- `isDeleted`: Set to `true`

### Scheduler Configuration
The cleanup runs daily at 2:00 AM using node-cron:
```javascript
cron.schedule('0 2 * * *', async () => {
  // Cleanup logic
});
```

## Environment Variables Required

Ensure these AWS S3 environment variables are configured:
- `S3_REGION` - AWS region for S3 bucket
- `S3_ACCESS_KEY` - AWS access key
- `S3_SECRET_KEY` - AWS secret key
- `S3_BUCKET_NAME` - S3 bucket name

## Error Handling

- **S3 Deletion Failures**: If file deletion from S3 fails, the message is still converted to prevent future attempts
- **Database Errors**: Individual message failures don't stop the entire cleanup process
- **Logging**: All operations are logged with appropriate levels (info, warn, error)

## Testing

Use the test script to verify functionality:
```bash
node test-chat-cleanup.js
```

This script will:
1. Connect to the database
2. Show statistics about messages eligible for cleanup
3. Allow manual testing (uncomment the cleanup call)

## Security

- Admin endpoints require `adminRole` permission
- Only authenticated admin users can access cleanup functions
- Regular users cannot trigger cleanup or view statistics

## Performance Considerations

- Processes messages in batches to avoid memory issues
- Uses database indexes on `createdAt`, `messageType`, and `isDeleted` fields
- Cleanup runs during low-traffic hours (2:00 AM)
- Failed operations are logged but don't halt the entire process
