import redis from './redisClient.js';

export const logMessageSent = async (accountId, recipientProfileUrl, jobId) => {
    try {
        const key = `activity:${accountId}:messageSent`;
        const member = {
            profileUrl: recipientProfileUrl,
            timestamp: new Date().toISOString(),
            jobId,
            success: true
        };
        await redis.zadd(key, Date.now(), JSON.stringify(member));
        await redis.expire(key, 7776000);
    } catch (err) {
        // silently swallow
    }
};

export const logConnectionSent = async (accountId, profileUrl, jobId, note) => {
    try {
        const key = `activity:${accountId}:connectionSent`;
        const member = {
            profileUrl,
            timestamp: new Date().toISOString(),
            jobId,
            success: true,
            note: note ? note.substring(0, 100) : undefined
        };
        await redis.zadd(key, Date.now(), JSON.stringify(member));
        await redis.expire(key, 7776000);
    } catch (err) {
        // silently swallow
    }
};

export const logProfileViewed = async (accountId, profileUrl, jobId) => {
    try {
        const key = `activity:${accountId}:profileViewed`;
        const member = {
            profileUrl,
            timestamp: new Date().toISOString(),
            jobId,
            success: true
        };
        await redis.zadd(key, Date.now(), JSON.stringify(member));
        await redis.expire(key, 7776000);
    } catch (err) {
        // silently swallow
    }
};
