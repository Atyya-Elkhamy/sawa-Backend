const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Profile = require('../models/profile.model');
const { generateUniqueUserId } = require('../utils/IDGen');

dotenv.config();
const { MONGODB_URL } = process.env;
const seedUsersAndProfiles = async () => {
  await mongoose.connect(MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('Database connected');
  // Clear existing data
  await User.deleteMany({});
  await Profile.deleteMany({});

  // Create sample users
  const users = [
    {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123',
      userId: await generateUniqueUserId(),
    },
    {
      name: 'Jane Smith',
      email: 'jane@example.com',
      password: 'Password123',
      userId: await generateUniqueUserId(),
    },
    {
      name: 'Alice Johnson',
      email: 'alice@example.com',
      password: 'Password123',
      userId: await generateUniqueUserId(),
    },
  ];

  // Insert users into the database
  const createdUsers = await User.insertMany(users);
  console.log('Users seeded:', createdUsers);

  // Create corresponding profiles
  const profiles = createdUsers.map((user) => ({
    userId: user._id,
    vipLevel: Math.floor(Math.random() * 5) + 1, // Random VIP level between 1 and 5
    proExpirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    storeSections: [
      {
        sectionName: 'Frames',
        products: [
          {
            id: 'sword_01',
            image: 'sword.png',
            name: 'Excalibur',
            price: 100,
          },
        ],
      },
    ],
  }));

  // Insert profiles into the database
  const createdProfiles = await Profile.insertMany(profiles);
  console.log('Profiles seeded:', createdProfiles);

  // Close the database connection
  mongoose.connection.close();
  console.log('Database connection closed');
};

seedUsersAndProfiles().catch((error) => {
  console.error('Error seeding data:', error);
  mongoose.connection.close();
});
