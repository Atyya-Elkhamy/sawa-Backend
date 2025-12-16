const dotenv = require('dotenv');
const mongoose = require('mongoose');
const faker = require('faker');
const User = require('../models/user.model');
const { Follow } = require('../models/relations');

dotenv.config();
const { MONGODB_URL } = process.env;

// Register a dummy Room model if it hasn't been registered yet.
if (!mongoose.models.Room) {
  mongoose.model('Room', new mongoose.Schema({}));
}

const seedFollowRelationships = async () => {
  await mongoose.connect(MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('Database connected');

  // Clear existing Follow relations if any
  await Follow.deleteMany({});
  console.log('Cleared existing follow relations');

  // Ensure the target user exists (with a fixed _id or userId "TARGET_USER")
  let targetUser = await User.findOne({ _id: '66f0564dd9ba5100207939e6' });
  if (!targetUser) {
    targetUser = await User.create({
      name: 'Target User',
      email: faker.internet.email(),
      password: 'Password123',
      userId: 'TARGET_USER',
      phone: '+201020557285',
      dateOfBirth: new Date(1990, 0, 1),
    });
    console.log('Created target user:', targetUser.userId);
  } else {
    console.log('Target user exists:', targetUser.userId);
  }

  // Create sample users with phone formatted as "+2010205570{i}"
  const users = [];
  for (let i = 10; i < 100; i++) {
    const newUser = await User.create({
      name: `User ${i + 1}`,
      email: faker.internet.email(),

      password: 'Password123',
      phone: `+2010205570${i}`,
      dateOfBirth: new Date(1990, 0, 1),
    });
    users.push(newUser);
    console.log('Created user:', newUser.userId);
  }

  // Create bilateral follow relationships:
  // 1. Each created user follows the target user.
  // 2. The target user follows each created user.
  const followDocs = [];
  users.forEach((user) => {
    followDocs.push({
      follower: user._id,
      following: targetUser._id,
      viewed: false,
    });
    followDocs.push({
      follower: targetUser._id,
      following: user._id,
      viewed: false,
    });
  });
  await Follow.insertMany(followDocs);
  console.log('Created bilateral follow relations for 100 users.');

  mongoose.connection.close();
  console.log('Database connection closed');
};

seedFollowRelationships().catch((error) => {
  console.error('Error during seeding:', error);
  mongoose.connection.close();
});
