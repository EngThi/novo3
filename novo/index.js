/**
 * Main Application Entry Point
 * Bootstrap system with dependency injection and clean architecture
 */

const PipelineCore = require('./core/pipeline.js');
const { TTSService } = require('./services/tts/tts-service.js');
const ImageService = require('./services/image/image-service.js');
const VideoService = require('./services/video/video-service.js');
const CacheService = require('./services/cache/cache-service.js');
const DatabaseService = require('./infrastructure/database/database.js');
const JobQueueService = require('./infrastructure/queue/job-queue.js');
const APIServer = require('./interfaces/api/server.js');
const Logger = require('./utils/logger.js');
const config = require('./config/app-config.js');

class Application {
    constructor() {
        this.services = {};
        this.isInitialized = false;
    }
    
    async initialize() {
        try {
            console.log('🚀 Initializing novo3 Enterprise Pipeline...');
            
            // Initialize Logger first
            this.services.logger = new Logger(config.get('app'));
            this.services.logger.info('Logger initialized');
            
            // Initialize Cache Service
            this.services.cache = new CacheService({
                ...config.get('cache'),
                logger: this.services.logger
            });
            this.services.logger.info('Cache service initialized');
            
            // Initialize Database Service
            this.services.database = new DatabaseService({
                ...config.get('database'),
                logger: this.services.logger
            });
            this.services.logger.info('Database service initialized');
            
            // Initialize Job Queue Service
            this.services.jobQueue = new JobQueueService({
                databaseService: this.services.database,
                logger: this.services.logger,
                config: config.getAll()
            });
            this.services.logger.info('Job queue service initialized');
            
            // Initialize TTS Service
            this.services.tts = new TTSService({
                ...config.get('tts'),
                cacheService: this.services.cache,
                logger: this.services.logger
            });
            this.services.logger.info('TTS service initialized');
            
            // Initialize Image Service
            this.services.image = new ImageService({
                cacheService: this.services.cache,
                logger: this.services.logger,
                config: config.getAll()
            });
            this.services.logger.info('Image service initialized');
            
            // Initialize Video Service
            this.services.video = new VideoService({
                cacheService: this.services.cache,
                logger: this.services.logger,
                config: config.getAll()
            });
            this.services.logger.info('Video service initialized');
            
            // Initialize Pipeline Core with all dependencies
            this.services.pipeline = new PipelineCore({
                ttsService: this.services.tts,
                imageService: this.services.image,
                videoService: this.services.video,
                cacheService: this.services.cache,
                logger: this.services.logger,
                jobProcessor: this.services.jobQueue
            });
            this.services.logger.info('Pipeline core initialized');
            
            // Initialize API Server
            this.services.api = new APIServer({
                pipelineCore: this.services.pipeline,
                ttsService: this.services.tts,
                imageService: this.services.image,
                videoService: this.services.video,
                cacheService: this.services.cache,
                jobQueue: this.services.jobQueue,
                logger: this.services.logger,
                config: config.getAll()
            });
            this.services.logger.info('API server initialized');
            
            // Register job processors
            this.registerJobProcessors();
            
            this.isInitialized = true;
            this.services.logger.info('✅ All services initialized successfully');
            
        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            throw error;
        }
    }
    
    registerJobProcessors() {
        // Register pipeline processor
        this.services.jobQueue.registerProcessor('pipeline', async (data, job) => {
            return await this.services.pipeline.execute(data, {
                jobId: job.id,
                onProgress: (progress) => {
                    job.progress = progress;
                }
            });
        });
        
        // Register TTS processor
        this.services.jobQueue.registerProcessor('tts', async (data) => {
            return await this.services.tts.generateAudio(data.text, data.options);
        });
        
        // Register image processor
        this.services.jobQueue.registerProcessor('image', async (data) => {
            return await this.services.image.generateImage(data.prompt, data.options);
        });
        
        // Register video processor
        this.services.jobQueue.registerProcessor('video', async (data) => {
            return await this.services.video.assembleVideo(data.components, data.options);
        });
        
        this.services.logger.info('Job processors registered');
    }
    
    async start() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        try {
            // Start API server
            await this.services.api.start();
            
            this.services.logger.info(`🎉 novo3 Enterprise Pipeline started successfully!`);
            this.services.logger.info(`📡 API: http://${config.get('api.host')}:${config.get('api.port')}`);
            this.services.logger.info(`🔧 Environment: ${config.get('app.environment')}`);
            this.services.logger.info(`📊 Health: http://${config.get('api.host')}:${config.get('api.port')}/api/v1/health`);
            
            // Setup graceful shutdown
            this.setupGracefulShutdown();
            
        } catch (error) {
            this.services.logger.error('Failed to start application:', error);
            throw error;
        }
    }
    
    async stop() {
        this.services.logger.info('🛑 Shutting down application...');
        
        try {
            if (this.services.api) {
                await this.services.api.stop();
            }
            
            if (this.services.database) {
                await this.services.database.close();
            }
            
            if (this.services.pipeline) {
                this.services.pipeline.cleanup();
            }
            
            this.services.logger.info('✅ Application shutdown complete');
            
        } catch (error) {
            this.services.logger.error('Error during shutdown:', error);
        }
    }
    
    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            this.services.logger.info(`Received ${signal}, starting graceful shutdown...`);
            await this.stop();
            process.exit(0);
        };
        
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
        process.on('SIGUSR2', shutdown); // For nodemon
    }
    
    // Getter methods for accessing services
    getPipeline() { return this.services.pipeline; }
    getTTS() { return this.services.tts; }
    getImage() { return this.services.image; }
    getVideo() { return this.services.video; }
    getCache() { return this.services.cache; }
    getAPI() { return this.services.api; }
    getLogger() { return this.services.logger; }
    
    // Health check for all services
    async getHealthStatus() {
        const health = {
            status: 'healthy',
            services: {},
            timestamp: new Date().toISOString()
        };
        
        try {
            if (this.services.tts?.healthCheck) {
                health.services.tts = await this.services.tts.healthCheck();
            }
            
            if (this.services.cache?.getStats) {
                health.services.cache = this.services.cache.getStats();
            }
            
            if (this.services.jobQueue?.getQueueStats) {
                health.services.queue = this.services.jobQueue.getQueueStats();
            }
            
        } catch (error) {
            health.status = 'degraded';
            health.error = error.message;
        }
        
        return health;
    }
}

// Export singleton
const app = new Application();

// Auto-start if run directly
if (require.main === module) {
    app.start().catch(error => {
        console.error('Failed to start application:', error);
        process.exit(1);
    });
}

module.exports = app;