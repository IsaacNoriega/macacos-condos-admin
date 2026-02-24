const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../logs');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logger = {
  log: (action, userId, tenantId, details = {}) => {
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

  error: (action, userId, tenantId, error) => {
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

module.exports = logger;
