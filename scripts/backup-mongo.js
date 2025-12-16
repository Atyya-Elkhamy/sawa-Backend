#!/usr/bin/env node
const logger = require('../src/config/logger');
const { runMongoBackup } = require('../src/utils/backups/mongoBackup');

(async () => {
    try {
        const result = await runMongoBackup({ scheduleTag: 'manual' });
        logger.info(`Backup complete: ${JSON.stringify(result)}`);
        console.log('Backup complete:', result);
        process.exit(0);
    } catch (err) {
        logger.error(`Backup failed: ${err.message}`);
        console.error('Backup failed:', err.message);
        process.exit(1);
    }
})();
