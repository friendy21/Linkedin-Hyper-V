import { Queue } from 'bullmq';
import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
});

export const createQueue = (name) => {
    return new Queue(name, { connection: redis });
};

const defaultQueue = createQueue('linkedin-jobs');

export const addJob = async (jobName, data, opts = {}) => {
    return defaultQueue.add(jobName, data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        ...opts,
    });
};

export const getJobStatus = async (jobId) => {
    const job = await defaultQueue.getJob(jobId);
    if (!job) return null;
    const state = await job.getState();
    const progress = job.progress;
    const result = job.returnvalue;
    const error = job.failedReason;
    return { id: jobId, state, progress, result, error };
};
