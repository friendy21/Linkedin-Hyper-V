/**
 * Winston logger configuration
 * Structured logging for production observability
 */

import winston from 'winston';

const { combine, timestamp, json, errors, printf, colorize } = winston.format;

// Custom format for development
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

const isDevelopment = process.env.NODE_ENV !== 'production';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: {
    service: 'linkedin-worker',
    pid: process.pid,
  },
  format: isDevelopment
    ? combine(
        timestamp(),
        colorize(),
        devFormat
      )
    : combine(
        timestamp(),
        json(),
        errors({ stack: true })
      ),
  transports: [
    new winston.transports.Console(),
  ],
});

// Add file transports in production
if (!isDevelopment) {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }));
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
  }));
}

export default logger;
