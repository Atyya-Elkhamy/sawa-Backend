const userService = require('./src/services/user.service');

// Test the deleted user placeholder functionality
console.log('Testing deleted user placeholder...');

// Test 1: Create a deleted user placeholder
const deletedUser = userService.createDeletedUserPlaceholder();
console.log('Created deleted user placeholder:', {
    _id: deletedUser._id,
    userId: deletedUser.userId,
    name: deletedUser.name,
    avatar: deletedUser.avatar,
    isDeleted: deletedUser.isDeleted
});

// Test 2: Transform a mock conversation with null participants
const mockConversation = {
    _id: 'conversation123',
    participants: [
        {
            _id: 'user123',
            name: 'John Doe',
            userId: '1234567890',
            avatar: 'https://example.com/avatar.jpg'
        },
        null, // This simulates a deleted user
        {
            _id: 'user456',
            name: 'Jane Smith',
            userId: '0987654321',
            avatar: 'https://example.com/avatar2.jpg'
        }
    ],
    lastMessage: 'Hello world'
};

console.log('\nOriginal conversation:', JSON.stringify(mockConversation, null, 2));

const transformedConversation = userService.transformDeletedUsers(mockConversation, 'participants');
console.log('\nTransformed conversation:', JSON.stringify(transformedConversation, null, 2));

// Test 3: Transform array of documents
const mockConversations = [
    {
        _id: 'conv1',
        participants: [{ _id: 'user1', name: 'User 1' }, null]
    },
    {
        _id: 'conv2',
        participants: [null, { _id: 'user2', name: 'User 2' }]
    }
];

const transformedArray = userService.transformDeletedUsers(mockConversations, 'participants');
console.log('\nTransformed array:', JSON.stringify(transformedArray, null, 2));

console.log('\nAll tests completed successfully!');
