/**
 * Per-account BullMQ queue system
 * Each LinkedIn account has its own isolated queue with concurrency=1
 */

import { Queue, Worker, type Job, type JobsOptions } from 'bullmq';
import IORedis from 'ioredis';
import type { JobData, JobAction } from '../types/index.js';
import logger from '../utils/logger.js';

// Redis connection for queues
const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export interface QueueManagerConfig {
  /** Default job options */
  defaultJobOptions?: JobsOptions;
  /** Delay between jobs for same account (ms) */
  interJobDelay?: number;
  /** Global concurrency limit across all accounts */
  globalConcurrency?: number;
}

export type JobHandler = (job: Job<JobData>) => Promise<unknown>;

/**
 * Per-account queue manager
 * Creates isolated queues for each LinkedIn account
 */
export class QueueManager {
  private queues: Map<string, Queue<JobData>> = new Map();
  private workers: Map<string, Worker<JobData>> = new Map();
  private handlers: Map<string, JobHandler> = new Map();
  private config: QueueManagerConfig;

  constructor(config: QueueManagerConfig = {}) {
    this.config = {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
      interJobDelay: 30000, // 30 seconds between jobs
      globalConcurrency: 5,
      ...config,
    };
  }

  /**
   * Gets or creates a queue for an account
   * 
   * @param accountId - LinkedIn account ID
   * @returns BullMQ queue instance
   */
  getQueue(accountId: string): Queue<JobData> {
    let queue = this.queues.get(accountId);
    if (!queue) {
      queue = new Queue<JobData>(`linkedin:${accountId}`, {
        connection: redisConnection,
        defaultJobOptions: this.config.defaultJobOptions,
      });
      this.queues.set(accountId, queue);
      logger.info(`Created queue for account ${accountId}`);
    }
    return queue;
  }

  /**
   * Registers a job handler for a specific action
   * 
   * @param action - Job action type
   * @param handler - Handler function
   */
  registerHandler(action: JobAction, handler: JobHandler): void {
    this.handlers.set(action, handler);
    logger.info(`Registered handler for action: ${action}`);
  }

  /**
   * Starts a worker for an account queue
   * Each account has its own worker with concurrency=1
   * 
   * @param accountId - LinkedIn account ID
   */
  async startWorker(accountId: string): Promise<void> {
    if (this.workers.has(accountId)) {
      logger.warn(`Worker already running for account ${accountId}`);
      return;
    }

    const queue = this.getQueue(accountId);
    
    const worker = new Worker<JobData>(
      queue.name,
      async (job) => this.processJob(job),
      {
        connection: redisConnection,
        concurrency: 1, // One job at a time per account
        limiter: {
          max: 1,
          duration: this.config.interJobDelay || 30000,
        },
      }
    );

    // Event handlers
    worker.on('completed', (job) => {
      logger.info(`Job ${job.id} completed for account ${accountId}`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`Job ${job?.id} failed for account ${accountId}:`, err);
    });

    worker.on('error', (err) => {
      logger.error(`Worker error for account ${accountId}:`, err);
    });

    this.workers.set(accountId, worker);
    logger.info(`Started worker for account ${accountId}`);
  }

  /**
   * Stops a worker for an account
   * 
   * @param accountId - LinkedIn account ID
   */
  async stopWorker(accountId: string): Promise<void> {
    const worker = this.workers.get(accountId);
    if (!worker) return;

    await worker.close();
    this.workers.delete(accountId);
    logger.info(`Stopped worker for account ${accountId}`);
  }

  /**
   * Processes a job by dispatching to the appropriate handler
   * 
   * @param job - BullMQ job
   * @returns Job result
   */
  private async processJob(job: Job<JobData>): Promise<unknown> {
    const { action, accountId } = job.data;
    
    logger.info(`Processing job ${job.id} - action: ${action}, account: ${accountId}`);

    const handler = this.handlers.get(action);
    if (!handler) {
      throw new Error(`No handler registered for action: ${action}`);
    }

    return await handler(job);
  }

  /**
   * Adds a job to an account's queue
   * 
   * @param accountId - LinkedIn account ID
   * @param action - Job action type
   * @param payload - Job payload
   * @param options - Job options
   * @returns Created job
   */
  async addJob(
    accountId: string,
    action: JobAction,
    payload: unknown,
    options: JobsOptions = {}
  ): Promise<Job<JobData>> {
    const queue = this.getQueue(accountId);
    
    const jobData: JobData = {
      accountId,
      action,
      payload,
      priority: options.priority,
    };

    const job = await queue.add(`${action}:${accountId}`, jobData, {
      ...this.config.defaultJobOptions,
      ...options,
    });

    logger.info(`Added job ${job.id} to queue for account ${accountId}`);
    return job;
  }

  /**
   * Gets queue statistics for an account
   * 
   * @param accountId - LinkedIn account ID
   * @returns Queue stats
   */
  async getQueueStats(accountId: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const queue = this.getQueue(accountId);
    
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Pauses a queue (prevents new jobs from being processed)
   * 
   * @param accountId - LinkedIn account ID
   */
  async pauseQueue(accountId: string): Promise<void> {
    const queue = this.getQueue(accountId);
    await queue.pause();
    logger.info(`Paused queue for account ${accountId}`);
  }

  /**
   * Resumes a paused queue
   * 
   * @param accountId - LinkedIn account ID
   */
  async resumeQueue(accountId: string): Promise<void> {
    const queue = this.getQueue(accountId);
    await queue.resume();
    logger.info(`Resumed queue for account ${accountId}`);
  }

  /**
   * Cleans completed/failed jobs from a queue
   * 
   * @param accountId - LinkedIn account ID
   * @param gracePeriod - Time in ms before jobs are removed
   */
  async cleanQueue(accountId: string, gracePeriod: number = 3600000): Promise<void> {
    const queue = this.getQueue(accountId);
    await queue.clean(gracePeriod, 100, 'completed');
    await queue.clean(gracePeriod, 100, 'failed');
    logger.info(`Cleaned queue for account ${accountId}`);
  }

  /**
   * Gets all active queues
   */
  getActiveQueues(): string[] {
    return Array.from(this.queues.keys());
  }

  /**
   * Gets all active workers
   */
  getActiveWorkers(): string[] {
    return Array.from(this.workers.keys());
  }

  /**
   * Gracefully shuts down all workers
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down queue manager...');
    
    // Stop all workers
    const workerPromises = Array.from(this.workers.entries()).map(
      ([accountId]) => this.stopWorker(accountId)
    );
    await Promise.all(workerPromises);
    
    // Close all queues
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    this.queues.clear();
    
    // Close Redis connection
    await redisConnection.quit();
    
    logger.info('Queue manager shutdown complete');
  }
}

// Singleton instance
let globalQueueManager: QueueManager | null = null;

export function getQueueManager(config?: QueueManagerConfig): QueueManager {
  if (!globalQueueManager) {
    globalQueueManager = new QueueManager(config);
  }
  return globalQueueManager;
}

export function resetQueueManager(): void {
  globalQueueManager = null;
}
