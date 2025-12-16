const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Challenge = require('../../../src/models/challenge.model');
const User = require('../../../src/models/user.model');
const challengeService = require('../../../src/services/challenge.service');
const { ApiError } = require('../../../src/utils/ApiError');

let mongoServer;

describe('Challenge Service', () => {
    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        await Challenge.deleteMany({});
        await User.deleteMany({});
    });

    describe('createChallenge', () => {
        let testUser;
        const roomId = new mongoose.Types.ObjectId();

        beforeEach(async () => {
            testUser = await User.create({
                name: 'Test User',
                phone: '+201020557299', // Added phone number to meet validation requirements
                credits: 1000,
                avatar: 'https://example.com/avatar.jpg',
                email: 'test@example.com',
                password: 'password1@',
                isEmailVerified: true,
                userId: '12345'
            });
        });

        test('should create challenge successfully', async () => {
            const result = await challengeService.createChallenge(testUser._id, roomId, 100);

            expect(result).toHaveProperty('challengeId');
            expect(result.createdBy).toBe(testUser._id.toString());
            expect(result.prizeAmount).toBe(100);
            expect(result.status).toBe('active');

            // Check user credits were deducted
            const updatedUser = await User.findById(testUser._id);
            expect(updatedUser.credits).toBe(900);
        });

        test('should fail if prize amount is invalid', async () => {
            await expect(
                challengeService.createChallenge(testUser._id, roomId, 30)
            ).rejects.toThrow('Invalid prize amount');

            await expect(
                challengeService.createChallenge(testUser._id, roomId, 200)
            ).rejects.toThrow('Invalid prize amount');
        });

        test('should fail if user has insufficient credits', async () => {
            await User.findByIdAndUpdate(testUser._id, { credits: 40 });

            await expect(
                challengeService.createChallenge(testUser._id, roomId, 100)
            ).rejects.toThrow('Insufficient credits');
        });
    });

    describe('acceptChallenge', () => {
        let creator, acceptor, challenge;

        beforeEach(async () => {
            creator = await User.create({
                name: 'Creator',
                phone: '+201020557239',
                avatar: 'https://example.com/avatar.jpg',
                email: 'test@example.com',
                password: 'password1@',
                isEmailVerified: true,
                credits: 1000,
                userId: '12345'
            });

            acceptor = await User.create({
                name: 'Acceptor',
                phone: '+201020557229',
                avatar: 'https://example.com/avatar.jpg',
                email: 'test@example.com',
                password: 'password1@',
                isEmailVerified: true,
                credits: 1000,
                userId: '67890'
            });

            challenge = await Challenge.create({
                createdBy: creator._id,
                roomId: new mongoose.Types.ObjectId(),
                prizeAmount: 100,
                status: 'active',
                expiresAt: new Date(Date.now() + 10000)
            });
        });

        test('should accept challenge successfully', async () => {
            const result = await challengeService.acceptChallenge(challenge._id, acceptor._id);

            expect(result.status).toBe('active');
            expect(result.acceptor.id).toBe(acceptor._id.toString());
        });

        test('should not allow creator to accept their own challenge', async () => {
            await expect(
                challengeService.acceptChallenge(challenge._id, creator._id)
            ).rejects.toThrow('Cannot accept your own challenge');
        });

        test('should not accept already accepted challenge', async () => {
            await challengeService.acceptChallenge(challenge._id, acceptor._id);

            const anotherUser = await User.create({
                name: 'Another User',
                phone: '+201020557219',
                avatar: 'https://example.com/avatar.jpg',
                email: 'test@example.com',
                password: 'password1@',
                isEmailVerified: true,
                credits: 1000,
                userId: '11111'
            });

            await expect(
                challengeService.acceptChallenge(challenge._id, anotherUser._id)
            ).rejects.toThrow('Challenge already accepted');
        });
    });

    describe('submitChoice', () => {
        let creator, acceptor, challenge;

        beforeEach(async () => {
            creator = await User.create({
                name: 'Creator',
                phone: '+201020557229',
                avatar: 'https://example.com/avatar.jpg',
                email: 'test@example.com',
                password: 'password1@',
                isEmailVerified: true,
                credits: 1000,
                userId: '12345'
            });

            acceptor = await User.create({
                name: 'Acceptor',
                phone: '+201020557269',
                avatar: 'https://example.com/avatar.jpg',
                email: 'test@example.com',
                password: 'password1@',
                isEmailVerified: true,
                credits: 1000,
                userId: '67890'
            });

            challenge = await Challenge.create({
                createdBy: creator._id,
                acceptedBy: acceptor._id,
                roomId: new mongoose.Types.ObjectId(),
                prizeAmount: 100,
                status: 'active',
                expiresAt: new Date(Date.now() + 10000)
            });
        });

        test('should submit choice successfully', async () => {
            const result = await challengeService.submitChoice(challenge._id, creator._id, 'rock');

            expect(result.creator.choice).toBe('rock');
            expect(result.status).toBe('waiting_for_opponent');
        });

        test('should determine winner when both players submit', async () => {
            await challengeService.submitChoice(challenge._id, creator._id, 'rock');
            const result = await challengeService.submitChoice(challenge._id, acceptor._id, 'scissors');

            expect(result.status).toBe('completed');
            expect(result.winner).toBeDefined();
            expect(result.winner.id).toBe(creator._id.toString());
            expect(result.prizeDistribution[creator._id]).toBe(100);

            // Check credits were awarded
            const updatedCreator = await User.findById(creator._id);
            expect(updatedCreator.credits).toBe(1100);
        });

        test('should handle draw correctly', async () => {
            await challengeService.submitChoice(challenge._id, creator._id, 'rock');
            const result = await challengeService.submitChoice(challenge._id, acceptor._id, 'rock');

            expect(result.isDraw).toBe(true);
            expect(result.prizeDistribution[creator._id]).toBe(50);
            expect(result.prizeDistribution[acceptor._id]).toBe(50);

            // Check credits were split
            const updatedCreator = await User.findById(creator._id);
            const updatedAcceptor = await User.findById(acceptor._id);
            expect(updatedCreator.credits).toBe(1050);
            expect(updatedAcceptor.credits).toBe(1050);
        });
    });

    describe('checkChallengeExpiry', () => {
        let creator, challenge;

        beforeEach(async () => {
            creator = await User.create({
                name: 'Creator',
                credits: 900, // Already deducted 100 for challenge
                phone: '+201020557289',
                avatar: 'https://example.com/avatar.jpg',
                email: 'test@example.com',
                password: 'password1@',
                isEmailVerified: true,
                userId: '12345'
            });

            challenge = await Challenge.create({
                createdBy: creator._id,
                roomId: new mongoose.Types.ObjectId(),
                prizeAmount: 100,
                status: 'active',
                expiresAt: new Date(Date.now() - 1000), // Already expired
                isRefunded: false
            });
        });

        test('should refund expired challenge', async () => {
            const result = await challengeService.checkChallengeExpiry(challenge._id);

            expect(result.status).toBe('expired');
            expect(result.refundAmount).toBe(100);

            // Check credits were refunded
            const updatedCreator = await User.findById(creator._id);
            expect(updatedCreator.credits).toBe(1000);

            // Check challenge was marked as refunded
            const updatedChallenge = await Challenge.findById(challenge._id);
            expect(updatedChallenge.isRefunded).toBe(true);
        });

        test('should not refund already refunded challenge', async () => {
            await Challenge.findByIdAndUpdate(challenge._id, { isRefunded: true });

            const result = await challengeService.checkChallengeExpiry(challenge._id);
            expect(result).toBeNull();

            // Check credits weren't refunded again
            const updatedCreator = await User.findById(creator._id);
            expect(updatedCreator.credits).toBe(900);
        });

        test('should not refund accepted challenge', async () => {
            await Challenge.findByIdAndUpdate(challenge._id, {
                acceptedBy: new mongoose.Types.ObjectId()
            });

            const result = await challengeService.checkChallengeExpiry(challenge._id);
            expect(result).toBeNull();

            // Check credits weren't refunded
            const updatedCreator = await User.findById(creator._id);
            expect(updatedCreator.credits).toBe(900);
        });
    });
}); 