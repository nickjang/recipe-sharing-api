module.exports = {
  CLIENT_ORIGIN: 'https://recipe-sharing-app.vercel.app' || 'http://localhost:3000',
  PORT: process.env.PORT || 8000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL
    || 'postgresql://recipe_sharing_admin@localhost/recipe_sharing',
  JWT_SECRET: process.env.JWT_SECRET || 'change-this-secret',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '3h',
};