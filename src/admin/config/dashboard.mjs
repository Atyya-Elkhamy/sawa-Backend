
import mongoose from 'mongoose';
import User from '../../models/user.model.js';
import Gift from '../../models/gift.model.js';
import { Components } from '../resources/components/component-loader.mjs';

const dashboard = {
  handler: async (request, response, context) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect('mongodb://localhost:27017/start_sawa');
      }

      const [usersCount, giftsCount] = await Promise.all([
        User.countDocuments(),
        Gift.countDocuments(),
      ]);

      return {
        data: {
          usersCount,
          giftsCount,
        },
      };
    } catch (error) {
      console.log("Dashboard handler error:", error.message);
      return {
        data: {
          usersCount: 0,
          giftsCount: 0,
        },
        error: error.message,
      };
    }
  },

  component: Components.Dashboard,
};

export default dashboard;
