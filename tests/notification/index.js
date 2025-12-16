// send notification to all users
const OneSignalService = require('../../src/services/oneSignal.service');

const oneSignalService = new OneSignalService();

const receiverId = '66f0564dd9ba5100207939e6';
const message = 'Hello, world!';
oneSignalService.sendNotification(`${receiverId}`, message);
console.log('Notification sent to all users');
