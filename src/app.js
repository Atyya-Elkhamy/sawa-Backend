const express = require('express');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const cors = require('cors');
const passport = require('passport');
const httpStatus = require('http-status');
const bodyParser = require('body-parser');
const config = require('./config/config');
const morgan = require('./config/morgan');
const { errorConverter, errorHandler } = require('./middlewares/error');
const { jwtStrategy, facebookStrategy, googleStrategy } = require('./config/passport');
const { authLimiter } = require('./middlewares/rateLimiter');
const routes = require('./routes/v1');

const ApiError = require('./utils/ApiError');
const logger = require('./config/logger');

const app = express();
// Standard middleware setup
app.set('trust proxy', 1);

if (config.env !== 'test') {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

app.use(
  helmet({
    contentSecurityPolicy: false, // This is important for AdminJS to work properly
    crossOriginEmbedderPolicy: false,
  })
);
app.use(xss());
app.use(
  mongoSanitize({
    allowDots: true, // This is important for nested parameters
    replaceWith: '_', // Replace prohibited characters instead of removing
  })
);
app.use(compression());
app.use(cors());

app.options('*', cors());

passport.use('jwt', jwtStrategy);
passport.use('facebook', facebookStrategy);
passport.use('google', googleStrategy);
// jwt authentication
app.use(passport.initialize());
// limit repeated failed requests to auth endpoints
if (config.env === 'production') {
  app.use('/v1/auth', authLimiter);
}
// Initialize AdminJS before other routes
const setupAdminPanel = async () => {
  try {
    const setupAdminJS = (await import('./admin/index.mjs')).default;
    const router = await setupAdminJS();
    logger.info(`AdminJS started successfully and available at `);
    return { router };
  } catch (error) {
    logger.error('Error setting up AdminJS:', error);
  }
};
// Initialize AdminJS
(async () => {
  try {
    if (config.env === 'production') {
      const { router } = await setupAdminPanel();
      app.use('/admin', router);
    }
    app.use(express.json());
    app.use(bodyParser.json());
    // Make sure query parameters are being properly parsed
    app.use(express.urlencoded({ extended: true }));

    app.use('/v1', routes);
    app.use('/public', express.static('public'));
    app.use('/', express.static('public'));
    app.use('/uploads', express.static('uploads'));
    app.use('/.well-known', express.static('.well-known'));

    // health check
    app.get('/health', (req, res) => {
      res.send('OK');
    });

    // use /uploads as the static path
    // Error handling should be last
    app.use((req, res, next) => {
      next(new ApiError(httpStatus.NOT_FOUND, 'Not found', 'غير موجود'));
    });
    app.use(errorConverter);
    app.use(errorHandler);
  } catch (error) {
    logger.error('Failed to initialize AdminJS:', error);
  }
})();

module.exports = app;
