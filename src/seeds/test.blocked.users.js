const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const User = require('../models/user.model'); // Adjust the path as needed
const { generateUniqueUserId } = require('../utils/IDGen'); // Adjust the path as needed

dotenv.config();
const { MONGODB_URL } = process.env;

const generateValidPassword = () => {
  const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const allChars = letters + numbers;
  let password = '';

  // Ensure at least one letter and one number
  password += letters.charAt(Math.floor(Math.random() * letters.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));

  // Fill the rest of the password with random characters
  for (let i = 2; i < 12; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }

  return password;
};

const seedUsersAndUpdateBlockedArray = async () => {
  await mongoose.connect(MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Create 50 sample users
  const users = [];
  for (let i = 0; i < 50; i++) {
    const user = new User({
      name: faker.person.fullName(),
      phone: `2010205572${i.toString().padStart(2, '0')}`,
      email: faker.internet.email(),
      password: generateValidPassword(), // Use the new password generation function
      avatar: faker.image.avatar(),
      countryCode: faker.location.countryCode(),
      dateOfBirth: faker.date.past({ years: 30 }),
      isMale: faker.datatype.boolean(),
      userId: await generateUniqueUserId(), // Use the imported function
      deviceToken: new mongoose.Types.ObjectId(), // Generate a new ObjectId for deviceToken
    });
    users.push(user);
  }

  // Insert users into the database
  const createdUsers = await User.insertMany(users);

  // Find the user with ID 66f05657d9ba5100207939f3
  const targetUser = await User.findById('66f4b986ca19aa7cf0cb1529');

  if (!targetUser) {
    console.error('Target user not found');
    return;
  }

  // Add the new users to the target user's blocked array
  targetUser.blockedUsers = targetUser.blockedUsers.concat(createdUsers.map((user) => user._id));

  // Save the updated target user
  await targetUser.save();

  console.log(`Added ${createdUsers.length} users to the blocked array of user ${targetUser._id}`);

  // Close the database connection
  await mongoose.connection.close();
  console.log('Database connection closed');
};

seedUsersAndUpdateBlockedArray().catch((error) => {
  console.error('Error seeding data:', error);
  mongoose.connection.close();
});
