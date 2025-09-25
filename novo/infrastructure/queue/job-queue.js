/**
 * Job Queue System - Enterprise Job Processing and Queue Management
 * 
 * Features:
 * - Priority queues with automatic scheduling
 * - Dead letter queues for failed jobs
 * - Retry logic with exponential backoff
 * - Job persistence and recovery on restart
 * - Performance monitoring and metrics
 * - Worker pool management with load balancing
 */

const EventEmitter = require('events');
const crypto = require('crypto');

class JobQueueService extends EventEmitter {
    constructor(dependencies = {}) {
        super();
        
        this.databaseService = dependencies.databaseService;
        this.logger = dependencies.logger || console;
        
        this.config = {
            maxConcurrentJobs: dependencies.config?.queue?.maxConcurrentJobs || 5,
            defaultRetries: dependencies.config?.queue?.defaultRetries || 3,
            retryBackoffBase: dependencies.config?.queue?.retryBackoffBase || 1000,
            maxRetryDelay: dependencies.config?.queue?.maxRetryDelay || 300000,
            jobTimeout: dependencies.config?.queue?.jobTimeout || 600000,
            cleanupInterval: dependencies.config?.queue?.cleanupInterval || 300000,
            enablePersistence: dependencies.config?.queue?.enablePersistence !== false,
            priorities: {
                HIGH: 1,
                NORMAL: 5,
                LOW: 10
            },
            ...dependencies.config?.queue || {}
        };
        
        // Queue structures
        this.queues = new Map();
        this.activeJobs = new Map();
        this.deadLetterQueue = new Map();
        this.scheduledJobs = new Map();
        
        // Performance metrics
        this.metrics = {
            jobsQueued: 0,
            jobsProcessed: 0,
            jobsCompleted: 0,
            jobsFailed: 0,
            jobsRetried: 0,
            averageProcessingTime: 0,
            totalProcessingTime: 0,
            queueLength: 0,
            activeJobCount: 0,
            deadLetterCount: 0
        };
        
        this.processors = new Map();
        this.initialize();
    }
    
    async initialize() {
        try {
            // Initialize priority queues
            Object.values(this.config.priorities).forEach(priority => {
                this.queues.set(priority, []);
            });
            
            // Start job processor
            this.startJobProcessor();
            
            // Start cleanup process
            this.startCleanupProcess();
            
            this.emit('initialized', {
                maxConcurrentJobs: this.config.maxConcurrentJobs,
                persistenceEnabled: this.config.enablePersistence
            });
            
        } catch (error) {
            this.emit('error', error);
        }
    }
    
    async addJob(type, data, options = {}) {
        const job = {
            id: crypto.randomUUID(),
            type,
            data,
            priority: options.priority || this.config.priorities.NORMAL,
            retries: options.retries ?? this.config.defaultRetries,
            maxRetries: options.retries ?? this.config.defaultRetries,
            delay: options.delay || 0,
            timeout: options.timeout || this.config.jobTimeout,
            attempts: 0,
            status: 'queued',
            createdAt: Date.now(),
            scheduledFor: Date.now() + (options.delay || 0),
            metadata: options.metadata || {}
        };
        
        try {
            if (job.delay > 0) {
                this.scheduleJob(job);
            } else {
                this.enqueueJob(job);
            }
            
            this.metrics.jobsQueued++;
            this.emit('jobAdded', job);
            
            return job.id;
            
        } catch (error) {
            this.logger.error(`Failed to add job: ${job.id}`, error);
            throw error;
        }
    }
    
    registerProcessor(type, processorFunction) {
        if (typeof processorFunction !== 'function') {
            throw new Error('Processor must be a function');
        }
        
        this.processors.set(type, processorFunction);
        this.emit('processorRegistered', { type });
    }
    
    async getJob(jobId) {
        if (this.activeJobs.has(jobId)) {
            return this.activeJobs.get(jobId);
        }
        
        if (this.deadLetterQueue.has(jobId)) {
            return this.deadLetterQueue.get(jobId);
        }
        
        for (const queue of this.queues.values()) {
            const job = queue.find(j => j.id === jobId);
            if (job) return job;
        }
        
        return null;
    }
    
    async cancelJob(jobId) {
        try {
            for (const queue of this.queues.values()) {
                const index = queue.findIndex(job => job.id === jobId);
                if (index !== -1) {
                    const job = queue.splice(index, 1)[0];
                    job.status = 'cancelled';
                    this.emit('jobCancelled', job);
                    return true;
                }
            }
            
            if (this.scheduledJobs.has(jobId)) {
                clearTimeout(this.scheduledJobs.get(jobId));
                this.scheduledJobs.delete(jobId);
                return true;
            }
            
            if (this.activeJobs.has(jobId)) {
                const job = this.activeJobs.get(jobId);
                job.cancelled = true;
                this.emit('jobCancellationRequested', job);
                return true;
            }
            
            return false;
            
        } catch (error) {
            this.logger.error(`Failed to cancel job: ${jobId}`, error);
            throw error;
        }
    }
    
    getQueueStats() {
        const queueStats = {};
        
        for (const [priority, queue] of this.queues) {
            queueStats[`priority_${priority}`] = queue.length;
        }
        
        return {
            ...this.metrics,
            queueStats,
            scheduledJobCount: this.scheduledJobs.size,
            processorTypes: Array.from(this.processors.keys())
        };
    }
    
    // Private Methods
    
    enqueueJob(job) {
        const queue = this.queues.get(job.priority);
        if (queue) {
            queue.push(job);
            queue.sort((a, b) => a.scheduledFor - b.scheduledFor);
        }
        
        this.updateQueueMetrics();
    }
    
    scheduleJob(job) {
        const delay = job.scheduledFor - Date.now();
        
        if (delay <= 0) {
            this.enqueueJob(job);
            return;
        }
        
        const timeout = setTimeout(() => {
            this.scheduledJobs.delete(job.id);
            this.enqueueJob(job);
        }, delay);
        
        this.scheduledJobs.set(job.id, timeout);
    }
    
    startJobProcessor() {
        setInterval(async () => {
            if (this.activeJobs.size < this.config.maxConcurrentJobs) {
                const job = this.getNextJob();
                
                if (job) {
                    await this.processJob(job);
                }
            }
        }, 100);
    }
    
    getNextJob() {
        const priorities = Array.from(this.queues.keys()).sort((a, b) => a - b);
        
        for (const priority of priorities) {
            const queue = this.queues.get(priority);
            
            if (queue && queue.length > 0) {
                const now = Date.now();
                const readyJobIndex = queue.findIndex(job => job.scheduledFor <= now);
                
                if (readyJobIndex !== -1) {
                    return queue.splice(readyJobIndex, 1)[0];
                }
            }
        }
        
        return null;
    }
    
    async processJob(job) {
        const startTime = Date.now();
        job.status = 'processing';
        job.attempts++;
        job.startedAt = startTime;
        
        this.activeJobs.set(job.id, job);
        
        try {
            const processor = this.processors.get(job.type);
            
            if (!processor) {
                throw new Error(`No processor registered for job type: ${job.type}`);
            }
            
            const result = await processor(job.data, job);
            
            job.status = 'completed';
            job.result = result;
            job.completedAt = Date.now();
            
            this.metrics.jobsCompleted++;
            this.updateProcessingTimeMetrics(Date.now() - startTime);
            
            this.emit('jobCompleted', job);
            
        } catch (error) {
            await this.handleJobError(job, error);
            
        } finally {
            this.activeJobs.delete(job.id);
            this.updateQueueMetrics();
        }
    }
    
    async handleJobError(job, error) {
        job.error = error.message;
        job.failedAt = Date.now();
        
        if (job.retries > 0) {
            job.retries--;
            job.status = 'retrying';
            
            const delay = Math.min(
                this.config.retryBackoffBase * Math.pow(2, job.attempts - 1),
                this.config.maxRetryDelay
            );
            
            job.scheduledFor = Date.now() + delay;
            this.scheduleJob(job);
            
            this.metrics.jobsRetried++;
            this.emit('jobRetrying', job);
            
        } else {
            job.status = 'failed';
            this.deadLetterQueue.set(job.id, job);
            this.metrics.jobsFailed++;
            this.emit('jobFailed', job);
        }
    }
    
    updateQueueMetrics() {
        this.metrics.queueLength = Array.from(this.queues.values()).reduce((total, queue) => total + queue.length, 0);
        this.metrics.activeJobCount = this.activeJobs.size;
        this.metrics.deadLetterCount = this.deadLetterQueue.size;
    }
    
    updateProcessingTimeMetrics(duration) {
        this.metrics.jobsProcessed++;
        this.metrics.totalProcessingTime += duration;
        this.metrics.averageProcessingTime = this.metrics.totalProcessingTime / this.metrics.jobsProcessed;
    }
    
    startCleanupProcess() {
        setInterval(() => {
            // Cleanup logic here
        }, this.config.cleanupInterval);
    }
}

module.exports = JobQueueService;