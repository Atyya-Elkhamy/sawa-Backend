const mongoose = require('mongoose');
const config = require('./config'); // Adjust the path as necessary

mongoose
  .connect(config.mongoose.url, config.mongoose.options)
  .then(() => {
    console.log('Successfully connected to MongoDB');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB', err);
  });

module.exports = mongoose;
