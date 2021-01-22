module.exports = {
  PORT: process.env.PORT || 8000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://logging_admin@localhost/logging',
  TEST_DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://logging_admin@localhost/logging-test',
  CLIENT_ORIGIN: 'https://logging-app.vercel.app',
  JWT_SECRET: process.env.JWT_SECRET || 'change-this-secret',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '3h'
};