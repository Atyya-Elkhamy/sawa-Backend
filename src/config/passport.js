const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const config = require('./config');
const { tokenTypes } = require('./tokens');
const { User } = require('../models');
const DeviceToken = require('../models/auth/deviceToken.model');

// JWT Strategy
const jwtOptions = {
  secretOrKey: config.jwt.secret,
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
};

const jwtVerify = async (payload, done) => {
  try {
    if (payload.type !== tokenTypes.ACCESS) {
      throw new Error('Invalid token type');
    }
    
    const user = await User.findById(payload.sub);
    if (!user) {
      return done(null, false);
    }
    
    // Check if user is blacklisted via their device token
    const deviceToken = await DeviceToken.findOne({ user: user._id });
    if (deviceToken && deviceToken.blacklisted) {
      if (deviceToken.blackListExpires && deviceToken.blackListExpires < new Date()) {
        // If the blacklisted token has expired, reset it
        deviceToken.blacklisted = false;
        deviceToken.blackListExpires = null;
        await deviceToken.save();
      }else {
        return done(null, false, { message: 'Token is blacklisted' });
      }
    }
    
    done(null, user);
  } catch (error) {
    done(error, false);
  }
};

const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);

// Facebook Strategy
const facebookStrategy = new FacebookStrategy(
  {
    clientID: config.facebook.clientID,
    clientSecret: config.facebook.clientSecret,
    callbackURL: '/auth/facebook/callback',
    profileFields: ['id', 'emails', 'name', 'photos'],
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await User.findOneAndUpdate(
        { facebookId: profile.id },
        {
          facebookId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
          avatar: profile.photos[0].value,
        },
        { new: true, upsert: true }
      );
      done(null, user);
    } catch (error) {
      done(error, false);
    }
  }
);

// Google Strategy
const googleStrategy = new GoogleStrategy(
  {
    clientID: config.google.clientID,
    clientSecret: config.google.clientSecret,
    callbackURL: '/auth/google/callback',
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await User.findOneAndUpdate(
        { googleId: profile.id },
        {
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
          avatar: profile.photos[0].value,
        },
        { new: true, upsert: true }
      );
      done(null, user);
    } catch (error) {
      done(error, false);
    }
  }
);

module.exports = {
  jwtStrategy,
  facebookStrategy,
  googleStrategy,
};
