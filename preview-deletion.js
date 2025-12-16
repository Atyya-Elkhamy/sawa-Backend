const mongoose = require('mongoose');
const config = require('./src/config/config');

// Collections to preserve (KEEP these - they will NOT be deleted)
const COLLECTIONS_TO_PRESERVE = [
    'User',           // Keep user accounts
    'Profile',        // Keep user profiles
    'Token',          // Keep authentication tokens
    'DeviceToken',    // Keep device tokens for push notifications
];

// Quick preview of what will be deleted
async function previewDeletion() {
    try {
        await mongoose.connect(config.mongoose.url, config.mongoose.options);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();

        console.log(`\n📊 DATABASE COLLECTIONS OVERVIEW:`);
        console.log('='.repeat(60));

        let totalRecords = 0;
        let recordsToDelete = 0;

        for (const col of collections) {
            const collection = db.collection(col.name);
            const count = await collection.countDocuments();
            totalRecords += count;

            const willDelete = !COLLECTIONS_TO_PRESERVE.includes(col.name);
            if (willDelete) {
                recordsToDelete += count;
            }

            const status = willDelete ? '🗑️ DELETE' : '🛡️ KEEP';
            console.log(`${col.name.padEnd(25)} | ${count.toString().padStart(8)} records | ${status}`);
        }

        console.log('='.repeat(60));
        console.log(`\n📈 SUMMARY:`);
        console.log(`Total records in database: ${totalRecords}`);
        console.log(`Records that will be deleted: ${recordsToDelete}`);
        console.log(`Records that will be preserved: ${totalRecords - recordsToDelete}`);
        console.log(`Collections to preserve: ${COLLECTIONS_TO_PRESERVE.length}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

// Run preview
previewDeletion();
