/**
 * Prisma database client
 * Singleton pattern for database access
 */

import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Connection handling
prisma.$connect()
  .then(() => logger.info('Connected to PostgreSQL database'))
  .catch((err) => {
    logger.error('Failed to connect to database:', err);
    process.exit(1);
  });

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  logger.info('Disconnected from PostgreSQL database');
});

export default prisma;
