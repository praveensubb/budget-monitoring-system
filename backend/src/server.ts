import express from 'express';
import cors from 'cors';
import { env } from './config/environment';
import { connectDatabase } from './config/database';
import { notFoundHandler, errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';

import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/users.routes';
import departmentRoutes from './modules/departments/departments.routes';
import budgetRoutes from './modules/budgets/budgets.routes';
import expenditureRoutes from './modules/expenditures/expenditures.routes';
import monitoringRoutes from './modules/monitoring/monitoring.routes';
import alertRoutes from './modules/alerts/alerts.routes';
import reportRoutes from './modules/reports/reports.routes';
import auditRoutes from './modules/audit/audit.routes';
import ruleRoutes from './modules/rules/rules.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';

const app = express();

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Budget Monitoring API is running.', data: { uptime: process.uptime() } });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/expenditures', expenditureRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  await connectDatabase();
  app.listen(env.port, () => {
    logger.info(`Server running on http://localhost:${env.port}`);
    logger.info(`Health check: http://localhost:${env.port}/api/health`);
  });
}

start();
