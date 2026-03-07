import Redis from 'ioredis';
import winston from 'winston';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
});

const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
});

redis.on('error', (err) => {
    logger.error({ msg: 'Redis connection error', error: err.message });
});

redis.on('connect', () => {
    logger.info({ msg: '[redis] Connected' });
});

export default redis;
