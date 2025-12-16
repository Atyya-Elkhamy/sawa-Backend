const oneSignalService = require('../../src/services/oneSignal.service');

// Test data
const testData = {
  userId: '67c062846d31e817263d772b',
  follower: {
    followerId: '67c03025d1a5b56ee0860593',
    followerName: 'Mohamed Elsafty',
    followerAvatar: 'https://img.svga.vip/uploads/images/20241104/9639e1f9ef43f790238f63b6779837f3.png',
  },
  message: {
    senderId: '66f05657d9ba5100207939f3',
    senderName: 'آلصفتﮯ',
    senderAvatar: 'https://img.svga.vip/uploads/images/20241104/9639e1f9ef43f790238f63b6779837f3.png',
    message: 'مرحباً! كيف حالك؟',
    conversationId: '67c062fd6d31e817263d775c',
    messageType: 'text',
  },
  gift: {
    senderId: '66f05657d9ba5100207939f3',
    senderName: 'آلصفتﮯ',
    giftId: '67b02fd09a1d39e37d9f8624',
    senderAvatar: 'https://img.svga.vip/uploads/images/20241104/9639e1f9ef43f790238f63b6779837f3.png',
    giftImage: 'https://img.svga.vip/uploads/images/20241104/9639e1f9ef43f790238f63b6779837f3.png',
    roomId: '67c062fd6d31e817263d775c',
    amount: 100,
  },
  systemMessage: {
    message: 'مرحباً بك في ساوا ساوا! تم التحقق من حسابك..',
    messageAr: 'مرحباً بك في ساوا ساوا! تم التحقق من حسابك.',
    imageUrl: 'https://img.svga.vip/uploads/images/20241104/9639e1f9ef43f790238f63b6779837f3.png',
  },
  broadcast: {
    message: '🎉 New features available! Check out our latest update.ششششششششششششششش',
    messageAr: '🎉 ميزات جديدة متاحة! تحقق من أحدث تحديث لدينا.ششششششششششششششش',
    imageUrl: 'https://img.svga.vip/uploads/images/20241104/9639e1f9ef43f790238f63b6779837f3.png',
  },
};

/**
 *
 */
async function runTests() {
  try {
    console.log('🚀 Starting OneSignal Notification Tests\n');

    // Test 1: New Follower Notification
    console.log('📋 Test 1: New Follower Notification');
    try {
      const followerResult = await oneSignalService.sendNewFollowerNotification(testData.userId, testData.follower);
      console.log('✅ New Follower Notification sent successfully');
      console.log('Response:', followerResult);
    } catch (error) {
      console.error('❌ New Follower Notification failed:', error);
    }
    console.log('\n-------------------\n');

    // Test 2: New Message Notification
    console.log('📋 Test 2: New Message Notification');
    try {
      const messageResult = await oneSignalService.sendNewMessageNotification(testData.userId, testData.message);
      console.log('✅ New Message Notification sent successfully');
      console.log('Response:', messageResult);
    } catch (error) {
      console.error('❌ New Message Notification failed:', error);
    }
    console.log('\n-------------------\n');

    // Test 3: Stranger Gift Notification
    console.log('📋 Test 3: Stranger Gift Notification');
    try {
      const giftResult = await oneSignalService.sendStrangerGiftNotification(testData.userId, testData.gift);
      console.log('✅ Stranger Gift Notification sent successfully');
      console.log('Response:', giftResult);
    } catch (error) {
      console.error('❌ Stranger Gift Notification failed:', error);
    }
    console.log('\n-------------------\n');

    // Test 4: System Message Individual
    console.log('📋 Test 4: System Message Individual');
    try {
      const systemResult = await oneSignalService.sendSystemMessageIndividual(testData.userId, testData.systemMessage);
      console.log('✅ System Message Individual sent successfully');
      console.log('Response:', systemResult);
    } catch (error) {
      console.error('❌ System Message Individual failed:', error);
    }
    console.log('\n-------------------\n');

    // Test 5: System Broadcast
    console.log('📋 Test 5: System Broadcast');
    try {
      const broadcastResult = await oneSignalService.sendSystemBroadcast(testData.broadcast);
      console.log('✅ System Broadcast sent successfully');
      console.log('Response:', broadcastResult);
    } catch (error) {
      console.error('❌ System Broadcast failed:', error);
    }
    console.log('\n-------------------\n');

    console.log('🏁 All tests completed!\n');
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Run all tests
console.log('🔧 OneSignal Service Test Suite');
console.log('===============================\n');

runTests()
  .then(() => {
    console.log('Tests execution completed.');
  })
  .catch((error) => {
    console.error('Test suite encountered an error:', error);
  });

// Export the test data and function for potential reuse
module.exports = {
  testData,
  runTests,
};
