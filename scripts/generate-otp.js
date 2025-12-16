#!/usr/bin/env node
'use strict';

/**
 * Usage:
 *   node scripts/generate-otp.js <phone> [--send]
 *
 * By default this script will persist the OTP in the database and
 * stub the send function (it will print the OTP to console). Pass
 * `--send` to attempt a real send via Twilio/WhatsApp (requires env config).
 */

const path = require('path');
const mongoose = require('mongoose');

// Ensure project root is in require path for local modules
const tokenService = require(path.join(__dirname, '..', 'src', 'services', 'token.service.js'));
const config = require(path.join(__dirname, '..', 'src', 'config', 'config.js'));

async function main() {
    const argv = process.argv.slice(2);
    const phone = argv[0];
    const doSend = argv.includes('--send');
    const noSave = argv.includes('--no-save');
    // allow specifying an OTP explicitly: --otp 123456
    const otpIndex = argv.indexOf('--otp');
    const providedOtp = otpIndex !== -1 && argv.length > otpIndex + 1 ? argv[otpIndex + 1] : null;

    if (!phone) {
        console.error('Usage: node scripts/generate-otp.js <phone> [--send]');
        process.exit(1);
    }

    // If --no-save: just generate OTP locally and optionally send (stubbed by default)
    if (noSave) {
        const otp = providedOtp ? String(providedOtp) : String(Math.floor(100000 + Math.random() * 900000)); // 6-digit

        if (!doSend) {
            console.log(`(no-save, stubbed) OTP for ${phone}: ${otp}`);
            process.exit(0);
        }

        // do real send (may throw if Twilio not configured)
        try {
            await tokenService.sendOtpViaWhatsApp(phone, otp);
            console.log('OTP generated and sent (no DB save).');
            process.exit(0);
        } catch (err) {
            console.error('Failed to send OTP:', err && err.message ? err.message : err);
            process.exit(3);
        }
    }

    // Default: persist OTP via tokenService (this requires DB connectivity)
    // If not explicitly asked to send, stub the send function so we don't call Twilio
    if (!doSend) {
        // replace sendOtpViaWhatsApp to print the OTP instead of sending
        if (typeof tokenService.sendOtpViaWhatsApp === 'function') {
            tokenService.sendOtpViaWhatsApp = async (phoneNumber, otp) => {
                console.log(`(stubbed) OTP for ${phoneNumber}: ${otp}`);
                return { stubbed: true };
            };
        }
    }
    // Connect to MongoDB using project config
    try {
        await mongoose.connect(config.mongoose.url, config.mongoose.options);
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err && err.message ? err.message : err);
        process.exit(4);
    }

    try {
        // If user provided a specific OTP, create token and save directly
        if (providedOtp) {
            const otp = String(providedOtp);
            const expires = require('moment')().add(10, 'minutes');
            const otpToken = tokenService.generateToken(phone, expires, require('../src/config/tokens').tokenTypes.PHONE_OTP, require('../src/config/config').jwt.secret);

            // saveToken expects (token, userId, expires, type, blacklisted, otp, phone)
            await tokenService.saveToken(otpToken, null, expires, require('../src/config/tokens').tokenTypes.PHONE_OTP, false, otp, phone);

            if (doSend) {
                await tokenService.sendOtpViaWhatsApp(phone, otp);
            } else {
                // If sending is stubbed, ensure send function prints OTP
                if (typeof tokenService.sendOtpViaWhatsApp === 'function') {
                    tokenService.sendOtpViaWhatsApp = async (phoneNumber, otpToPrint) => {
                        console.log(`(stubbed) OTP for ${phoneNumber}: ${otpToPrint}`);
                        return { stubbed: true };
                    };
                    console.log(`(stubbed) OTP for ${phone}: ${otp}`);
                }
            }

            console.log('Provided OTP saved to DB.');
        } else {
            await tokenService.generatePhoneOtpToken(phone);
            console.log('OTP generation completed and saved to DB. If sending was stubbed, the OTP is printed above.');
        }
    } catch (err) {
        console.error('Failed to generate/save OTP:', err && err.message ? err.message : err);
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
