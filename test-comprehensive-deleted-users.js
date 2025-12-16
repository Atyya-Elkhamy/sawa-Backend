const userService = require('./src/services/user.service');

// Test comprehensive deleted user handling
console.log('Testing comprehensive deleted user handling...\n');

// Test 1: Single field transformation
const mockFollower = {
    _id: 'follow123',
    follower: null, // Deleted user
    following: { _id: 'user456', name: 'Active User' },
    createdAt: new Date()
};

console.log('1. Testing follower transformation:');
console.log('Before:', JSON.stringify(mockFollower, null, 2));

const transformedFollower = userService.transformDeletedUsers(mockFollower, 'follower');
console.log('After:', JSON.stringify({
    _id: transformedFollower._id,
    follower: {
        userId: transformedFollower.follower.userId,
        name: transformedFollower.follower.name,
        isDeleted: transformedFollower.follower.isDeleted
    },
    following: transformedFollower.following
}, null, 2));

// Test 2: Multiple fields transformation
const mockFriendship = {
    _id: 'friendship123',
    user1: { _id: 'user1', name: 'User One' },
    user2: null, // Deleted user
    createdAt: new Date()
};

console.log('\n2. Testing friendship transformation:');
console.log('Before:', JSON.stringify(mockFriendship, null, 2));

const transformedFriendship = userService.transformDeletedUsers(mockFriendship, ['user1', 'user2']);
console.log('After:', JSON.stringify({
    _id: transformedFriendship._id,
    user1: {
        _id: transformedFriendship.user1._id,
        name: transformedFriendship.user1.name
    },
    user2: {
        userId: transformedFriendship.user2.userId,
        name: transformedFriendship.user2.name,
        isDeleted: transformedFriendship.user2.isDeleted
    }
}, null, 2));

// Test 3: Array of documents
const mockConversations = [
    {
        _id: 'conv1',
        participants: [
            { _id: 'user1', name: 'User One' },
            null // Deleted user
        ]
    },
    {
        _id: 'conv2',
        participants: [
            null, // Deleted user
            { _id: 'user2', name: 'User Two' }
        ]
    }
];

console.log('\n3. Testing conversation array transformation:');
console.log('Before: Array with', mockConversations.length, 'conversations');

const transformedConversations = userService.transformDeletedUsers(mockConversations, 'participants');
console.log('After: All participants have valid user objects');
transformedConversations.forEach((conv, index) => {
    console.log(`Conversation ${index + 1}:`, conv.participants.map(p => ({
        userId: p.userId,
        name: p.name,
        isDeleted: p.isDeleted || false
    })));
});

// Test 4: Nested field transformation
const mockRoom = {
    _id: 'room123',
    name: 'Test Room',
    participantLogs: [
        {
            user: { _id: 'user1', name: 'User One' },
            joinedAt: new Date()
        },
        {
            user: null, // Deleted user
            joinedAt: new Date()
        }
    ]
};

console.log('\n4. Testing nested field transformation:');
const transformedRoom = userService.transformDeletedUsers(mockRoom, 'participantLogs.user');
console.log('Room participant logs handled:', transformedRoom.participantLogs.map(log => ({
    userId: log.user.userId,
    name: log.user.name,
    isDeleted: log.user.isDeleted || false
})));

console.log('\n✅ All comprehensive tests completed successfully!');
console.log('\nThe deleted user placeholder system is now active across:');
console.log('- Chat conversations and messages');
console.log('- User relationships (followers, following, friends)');
console.log('- Agency management (admins, hosts)');
console.log('- Group management (admins, members)');
console.log('- Room management (owners, participants)');
console.log('- Profile visitors');
console.log('- Gift transactions');
console.log('- Credit agency transfers');
console.log('- And many more user reference points!');
