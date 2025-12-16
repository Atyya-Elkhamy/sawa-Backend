const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').default('development'),
    PORT: Joi.number().default(3000),
    MONGODB_URL: Joi.string().required().description('Mongo DB url'),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(30).description('minutes after which access tokens expire'),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30).description('days after which refresh tokens expire'),
    JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which reset password token expires'),
    JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which verify email token expires'),
    SMTP_HOST: Joi.string().description('server that will send the emails'),
    SMTP_PORT: Joi.number().description('port to connect to the email server'),
    SMTP_USERNAME: Joi.string().description('username for email server'),
    SMTP_PASSWORD: Joi.string().description('password for email server'),
    EMAIL_FROM: Joi.string().description('the from field in the emails sent by the app'),
    ONESIGNAL_API_KEY: Joi.string().description('OneSignal API key'),
    ONESIGNAL_APP_ID: Joi.string().description('OneSignal app ID'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.NODE_ENV === 'production' ? envVars.PORT : envVars.DEV_PORT,
  mongoose: {
    url: envVars.MONGODB_URL + (envVars.NODE_ENV === 'test' ? '-test' : ''),
    options: {},
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes: envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
    verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
  },
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD,
      },
    },
    from: envVars.EMAIL_FROM,
  },
  google: {
    clientID: '1066572701534-7q0raem4fq1960ggv80bgkp92tl7jc7g.apps.googleusercontent.com',
    clientSecret: envVars.GOOGLE_CLIENT_SECRET,
  },
  facebook: {
    clientID: envVars.FACEBOOK_CLIENT_ID,
    clientSecret: envVars.FACEBOOK_CLIENT_SECRET,
  },
  whatsapp: {
    token: envVars.WHATSAPP_TOKEN,
    instanceId: envVars.WHATSAPP_INSTANCE_ID,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || '', // Use empty string if no password
  },
  socket: {
    corsOrigin: envVars.NODE_ENV === 'production' ? 'https://your-app.com' : '*',
    testToken: envVars.TEST_SOCKET_TOKEN,
  },
  oneSignal: {
    apiKey:
      process.env.ONE_SIGNAL_API_KEY ||
      's_v2_app_jgiqnyoylzfuberhxsli5dop24mrq7xchrlurpecid34numoykefiavec5qoc2plznxxgepd465ttjtfc3zmcza2mekf7aqtfmkp7ey',
    appId: process.env.ONE_SIGNAL_APP_ID || '499106e1-d85e-4b40-9227-bc968e8dcfd7',
  },
  twilio: {
    accountSid: envVars.TWILIO_ACCOUNT_SID,
    authToken: envVars.TWILIO_AUTH_TOKEN,
    twilioPhoneNumber: envVars.TWILIO_WHATSAPP_NUMBER,
    // templateSid: envVars.TWILIO_TEMPLATE_SID,
  },

  app: {
    url: envVars.APP_URL,
    name: 'sawa',
  },
};
