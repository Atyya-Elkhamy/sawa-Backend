# Database Records Deletion Scripts

This directory contains scripts to delete all records from your MongoDB database collections while preserving essential data.

## ⚠️ WARNING
**These scripts will permanently delete data from your database. Always backup your database before running any deletion scripts.**

## Files

### `delete-all-records.js`
Main script that deletes all records from collections except those specified in `COLLECTIONS_TO_PRESERVE`.

### `preview-deletion.js`
Preview script that shows you exactly what will be deleted without actually deleting anything.

## Usage

### Step 1: Preview What Will Be Deleted
Before running the deletion, always preview first:

```bash
node preview-deletion.js
```

This will show you:
- All collections in your database
- How many records each contains
- Which collections will be preserved vs deleted
- Total counts

### Step 2: Run the Deletion (if you proceed)
```bash
node delete-all-records.js
```

Or run with preview flag:
```bash
node delete-all-records.js --preview
```

## Configuration

### Collections to Preserve
In `delete-all-records.js`, modify the `COLLECTIONS_TO_PRESERVE` array to specify which collections you want to keep:

```javascript
const COLLECTIONS_TO_PRESERVE = [
  'User',           // Keep user accounts
  'Profile',        // Keep user profiles
  'Token',          // Keep authentication tokens
  'DeviceToken',    // Keep device tokens for push notifications
  // Add any other collections you want to preserve
];
```

### Current Preserved Collections
By default, the script preserves:
- **User** - User accounts (essential)
- **Profile** - User profiles (essential)
- **Token** - Authentication tokens (needed for login)
- **DeviceToken** - Push notification tokens (needed for notifications)

## What Gets Deleted

The script will delete records from ALL collections except those in `COLLECTIONS_TO_PRESERVE`, including:

### User Data (Will be deleted)
- BoughtItem, BoughtGift - Purchase history
- PointAnalytics - User activity analytics
- ChatMessage, Conversation - Chat history
- Achievement, Activity - User achievements and activities
- GiftTransaction, StrangerGift - Gift transactions
- ProfileVisitor - Profile visit history
- FriendshipLogs - Friendship activity logs

### Game Data (Will be deleted)
- Game, GameGiftTransaction, GameUserTransaction - Game sessions
- Challenge - Game challenges
- BaishunToken - Game tokens

### Social Data (Will be deleted)
- Follow, FollowRequest, Friendship - Social connections
- Block - Blocked users
- Group, GroupContribution - Group data
- GroupRelation - Group relationships

### Business Data (Will be deleted)
- Host, HostAgency, HostDailyRecord - Host/agency data
- CreditAgency, CreditTransaction - Credit transactions
- ProSubscription, VipSubscription - Subscription data
- Gift, GiftCategory, Item - Store items

### System Data (Will be deleted)
- ForbiddenWord - Content moderation
- UserSpecialId - Special user IDs
- Room* collections - Room data
- SystemMessage* - System messages

## Safety Features

1. **Confirmation Required**: The script asks for explicit confirmation before deleting
2. **Preview Mode**: Use `--preview` flag to see what would be deleted
3. **Detailed Logging**: Shows exactly what was deleted from each collection
4. **Error Handling**: Continues processing even if individual collections fail

## Backup Recommendation

Before running any deletion script:

```bash
# Create a backup
npm run backup:mongo
```

Or manually:
```bash
mongodump --db your_database_name --out /path/to/backup
```

## Recovery

If you need to restore data after deletion:
```bash
mongorestore /path/to/backup
```

## Customization

To preserve additional collections, add them to the `COLLECTIONS_TO_PRESERVE` array:

```javascript
const COLLECTIONS_TO_PRESERVE = [
  'User',
  'Profile',
  'Token',
  'DeviceToken',
  'Gift',           // Keep gifts
  'Item',           // Keep items
  // Add more collections here
];
```

## Example Output

```
✅ Connected to MongoDB

📊 Found 45 collections in database

🛡️  Preserving 4 collections: User, Profile, Token, DeviceToken

🗑️  Will delete records from 41 collections: BoughtItem, Gift, ChatMessage, ...

⚠️  WARNING: This will delete ALL records from the above collections. Are you sure? (type "yes" to continue): yes

✅ BoughtItem: Deleted 15420 records (had 15420)
✅ Gift: Deleted 45 records (had 45)
✅ ChatMessage: Deleted 89234 records (had 89234)
...

📈 SUMMARY:
Total records deleted: 245680
Collections processed: 41
Collections preserved: 4
```
