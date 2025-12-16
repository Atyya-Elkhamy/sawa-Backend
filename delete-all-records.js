const mongoose = require('mongoose');
const config = require('./src/config/config');

// Collections to preserve (KEEP these - they will NOT be deleted)
const COLLECTIONS_TO_PRESERVE = [
    'gifts',
    'chargeprizes',
    'giftcategories',
    'baishuntokens',
    'vipsubscriptions',
    'forbiddenwords',
    'prosubscriptions',
    'adminsettings',
    'games',
    'stickers',
    'apikeys',
    'items',
    'roomassets',
    'contacts',
    'activities'
];

// Function to get all collections dynamically from the database
async function getAllCollections(db) {
    const collections = await db.listCollections().toArray();
    return collections.map(col => col.name);
}

async function deleteAllRecordsExceptPreserved() {
    try {
        // Connect to MongoDB
        await mongoose.connect(config.mongoose.url, config.mongoose.options);
        console.log('✅ Connected to MongoDB');

        // Get database instance
        const db = mongoose.connection.db;

        // Get all collections in the database dynamically
        const collectionNames = await getAllCollections(db);

        console.log(`\n📊 Found ${collectionNames.length} collections in database`);
        console.log('Collections:', collectionNames.join(', '));

        // Filter collections to delete (exclude preserved ones)
        const collectionsToDelete = collectionNames.filter(name =>
            !COLLECTIONS_TO_PRESERVE.includes(name)
        );

        console.log(`\n🛡️  Preserving ${COLLECTIONS_TO_PRESERVE.length} collections:`, COLLECTIONS_TO_PRESERVE.join(', '));
        console.log(`\n🗑️  Will delete records from ${collectionsToDelete.length} collections:`, collectionsToDelete.join(', '));

        // Ask for confirmation
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const answer = await new Promise((resolve) => {
            rl.question('\n⚠️  WARNING: This will delete ALL records from the above collections. Are you sure? (type "yes" to continue): ', resolve);
        });

        rl.close();

        if (answer.toLowerCase() !== 'yes') {
            console.log('❌ Operation cancelled by user');
            return;
        }

        // Delete records from each collection
        let totalDeleted = 0;
        const results = [];

        for (const collectionName of collectionsToDelete) {
            try {
                const collection = db.collection(collectionName);
                const countBefore = await collection.countDocuments();
                const result = await collection.deleteMany({});
                const deletedCount = result.deletedCount;

                results.push({
                    collection: collectionName,
                    before: countBefore,
                    deleted: deletedCount
                });

                totalDeleted += deletedCount;
                console.log(`✅ ${collectionName}: Deleted ${deletedCount} records (had ${countBefore})`);
            } catch (error) {
                console.error(`❌ Error deleting from ${collectionName}:`, error.message);
                results.push({
                    collection: collectionName,
                    error: error.message
                });
            }
        }

        // Summary
        console.log(`\n📈 SUMMARY:`);
        console.log(`Total records deleted: ${totalDeleted}`);
        console.log(`Collections processed: ${collectionsToDelete.length}`);
        console.log(`Collections preserved: ${COLLECTIONS_TO_PRESERVE.length}`);

        // Detailed results
        console.log(`\n📋 DETAILED RESULTS:`);
        results.forEach(result => {
            if (result.error) {
                console.log(`❌ ${result.collection}: ${result.error}`);
            } else {
                console.log(`✅ ${result.collection}: ${result.deleted} deleted (was ${result.before})`);
            }
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        // Close connection
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
}

// Function to list all collections with their current document counts
async function listAllCollections() {
    try {
        await mongoose.connect(config.mongoose.url, config.mongoose.options);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const collectionNames = await getAllCollections(db);

        console.log(`\n📋 ALL COLLECTIONS IN DATABASE (${collectionNames.length} total):`);
        console.log('='.repeat(60));

        const collectionsWithCounts = [];
        for (const collectionName of collectionNames) {
            const collection = db.collection(collectionName);
            const count = await collection.countDocuments();
            collectionsWithCounts.push({ name: collectionName, count });
        }

        // Sort by count descending
        collectionsWithCounts.sort((a, b) => b.count - a.count);

        collectionsWithCounts.forEach(({ name, count }, index) => {
            const status = COLLECTIONS_TO_PRESERVE.includes(name) ? '🛡️ PRESERVED' : '🗑️ DELETABLE';
            console.log(`${(index + 1).toString().padStart(3)}. ${name.padEnd(25)} | ${count.toString().padStart(8)} records | ${status}`);
        });

        console.log('='.repeat(60));
        console.log(`\n📊 SUMMARY:`);
        console.log(`Total collections: ${collectionNames.length}`);
        console.log(`Preserved: ${COLLECTIONS_TO_PRESERVE.length}`);
        console.log(`Deletable: ${collectionNames.length - COLLECTIONS_TO_PRESERVE.length}`);

        // Show the collections as arrays for easy copying
        console.log(`\n📝 CURRENT PRESERVED COLLECTIONS:`);
        console.log(JSON.stringify(COLLECTIONS_TO_PRESERVE, null, 2));

        console.log(`\n📝 ALL CURRENT COLLECTIONS:`);
        console.log(JSON.stringify(collectionNames.sort(), null, 2));

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

// Function to show current collection sizes without deleting
async function showCollectionSizes() {
    try {
        await mongoose.connect(config.mongoose.url, config.mongoose.options);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const collectionNames = await getAllCollections(db);

        console.log(`\n📊 COLLECTION SIZES:`);
        console.log('='.repeat(50));

        for (const collectionName of collectionNames) {
            const collection = db.collection(collectionName);
            const count = await collection.countDocuments();
            const status = COLLECTIONS_TO_PRESERVE.includes(collectionName) ? '🛡️ PRESERVED' : '🗑️ WILL DELETE';
            console.log(`${collectionName.padEnd(25)} | ${count.toString().padStart(8)} records | ${status}`);
        }

        console.log('='.repeat(50));
        console.log(`\n🛡️  Preserved collections: ${COLLECTIONS_TO_PRESERVE.length}`);
        console.log(`🗑️  Collections to clear: ${collectionNames.length - COLLECTIONS_TO_PRESERVE.length}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

// If run directly, execute the deletion
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--list') || args.includes('-l')) {
        console.log('📋 LIST MODE - Showing all collections with detailed information');
        listAllCollections();
    } else if (args.includes('--preview') || args.includes('-p')) {
        console.log('🔍 PREVIEW MODE - Showing collection sizes without deleting');
        showCollectionSizes();
    } else {
        console.log('🚨 DELETION MODE - This will delete records from collections');
        console.log('💡 Use --preview or -p to see what will be deleted first');
        console.log('💡 Use --list or -l to see detailed collection information');
        deleteAllRecordsExceptPreserved();
    }
}

module.exports = {
    deleteAllRecordsExceptPreserved,
    showCollectionSizes,
    listAllCollections,
    getAllCollections,
    COLLECTIONS_TO_PRESERVE
};
