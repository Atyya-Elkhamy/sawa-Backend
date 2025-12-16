#!/usr/bin/env node
'use strict';

/**
 * Usage:
 *   node scripts/generate-access-token.js <userId>
 *
 * This script will generate an access token for the specified user ID.
 * It requires DB connectivity.
 */

const path = require('path');
const mongoose = require('mongoose');

// Ensure project root is in require path for local modules
const tokenService = require(path.join(__dirname, '..', 'src', 'services', 'token.service.js'));
const config = require(path.join(__dirname, '..', 'src', 'config', 'config.js'));

async function main() {
    const argv = process.argv.slice(2);
    const userId = argv[0];

    if (!userId) {
        console.error('Usage: node scripts/generate-access-token.js <userId>');
        process.exit(1);
    }

    // Connect to MongoDB using project config
    try {
        await mongoose.connect(config.mongoose.url, config.mongoose.options);
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err && err.message ? err.message : err);
        process.exit(4);
    }

    try {
        const tokenData = await tokenService.generateAccessToken(userId);
        console.log(`Access token for user ${userId}:`);
        console.log(`Token: ${tokenData.token}`);
        console.log(`Expires: ${tokenData.expires}`);
    } catch (err) {
        console.error('Failed to generate access token:', err && err.message ? err.message : err);
        process.exit(2);
    } finally {
        // Close mongoose connection
        try {
            await mongoose.connection.close();
        } catch (e) {
            // ignore
        }
        process.exit(0);
    }
}

main();
