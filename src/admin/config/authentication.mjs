/* eslint-disable import/extensions */

import logger from '../../config/logger.js';
import AdminSettings from '../../models/adminSettings.model.js';
import mongoose from '../../config/mongoose.js';


// Authentication function using database
const authenticate = async (loginIdentifier, password) => {
  try {
    // await mongoose.connection.collection('admin_sessions').deleteMany({});

    logger.info(`Attempting to authenticate admin with identifier: ${loginIdentifier}`);
    // Find admin settings in database by username or email
    const adminSettings = await AdminSettings.findOne({
      $or: [{ username: loginIdentifier }, { email: loginIdentifier }],
    });
    if (!adminSettings) {
      logger.warn('Admin not found in database');
      return null;
    }
    // Check password
    const isPasswordMatch = await adminSettings.isPasswordMatch(password);
    if (!isPasswordMatch) {
      logger.warn('Invalid password for admin');
      return null;
    }
    console.log('the role is ::',adminSettings.role)
    return {
      email: adminSettings.email || adminSettings.username,
      id: adminSettings._id.toString(),
      role: (adminSettings.role || '').toLowerCase(),
      title: 'Administrator',
    };
  } catch (error) {
    logger.error('Admin authentication error:', error);
    return null;
  }
};
// Export authentication configuration for AdminJS v7
const authentication = {
  authenticate,
  cookiePassword: process.env.COOKIE_SECRET || 'some-secure-cookie-secret',
  cookieName: 'adminjs',
};

export default authentication;
