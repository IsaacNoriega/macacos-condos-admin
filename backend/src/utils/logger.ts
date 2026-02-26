import fs from 'fs';
import path from 'path';

const logsDir = path.join(__dirname, '../logs');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export interface LoggerDetails {
  [key: string]: any;
}

const logger = {
  log: (action: string, userId: string, tenantId: string, details: LoggerDetails = {}): void => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      action,
      userId,
      tenantId,
      details,
    };

    const logFile = path.join(logsDir, `${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  },

  error: (action: string, userId: string, tenantId: string, error: Error): void => {
    const timestamp = new Date().toISOString();
    const errorEntry = {
      timestamp,
      action,
      userId,
      tenantId,
      error: error.message,
      stack: error.stack,
    };

    const logFile = path.join(logsDir, `${new Date().toISOString().split('T')[0]}-errors.log`);
    fs.appendFileSync(logFile, JSON.stringify(errorEntry) + '\n');
  },
};

export default logger;
