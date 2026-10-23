import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/budget_monitoring',
  jwtSecret: process.env.JWT_SECRET || 'budget_monitoring_secret',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
};
