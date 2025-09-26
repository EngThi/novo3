/**
 * Main Application - Enterprise Video Pipeline
 * @fileoverview Application orchestrator with dependency injection and clean architecture
 * @version 2.0.0
 */

const EventEmitter = require('events');
const path = require('path');

// Core imports
const PipelineCore = require('./core/pipeline');
const config = require('./config');

// Service imports
const TTSService = require('./services/tts');
const ImageService = require('./services/image');
const VideoService = require('./services/video');
const CacheService = require('./services/cache');

// Infrastructure imports
const DatabaseInfrastructure = require('./infrastructure/database');

// Interface imports
const APIInterface = require('./interfaces/api');

/**
 * Main Application Class
 * Orchestrates all services using dependency injection and clean architecture
 */
class VideoProcessingApplication extends EventEmitter {
    constructor() {
        super();
        
        this.config = config;
        this.logger = this._createLogger();
        this.services = {};
        this.infrastructure = {};
        this.interfaces = {};
        this.isInitialized = false;
        this.isRunning = false;
        
        this._setupProcessHandlers();
    }
    
    /**
     * Initialize the application
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            this.logger.info('Initializing Video Processing Application...', {
                version: this.config.get('app.version'),
                environment: this.config.getEnvironment()
            });
            
            // Log configuration summary
            this.logger.info('Configuration Summary:', this.config.getSummary());
            
            // Initialize infrastructure
            await this._initializeInfrastructure();
            
            // Initialize services
            await this._initializeServices();
            
            // Initialize core pipeline
            await this._initializePipeline();
            
            // Initialize interfaces
            await this._initializeInterfaces();
            
            this.isInitialized = true;
            this.emit('initialized');
            
            this.logger.info('Application initialized successfully');
            
        } catch (error) {
            this.logger.error('Application initialization failed:', error);
            this.emit('error', error);
            throw error;
        }
    }
    
    /**
     * Start the application
     * @returns {Promise<void>}
     */
    async start() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        try {
            this.logger.info('Starting Video Processing Application...');
            
            // Connect to infrastructure
            await this._connectInfrastructure();
            
            // Start interfaces
            await this._startInterfaces();
            
            this.isRunning = true;
            this.emit('started');
            
            this.logger.info('Application started successfully', {
                port: this.config.get('api.port'),
                host: this.config.get('api.host')
            });
            
        } catch (error) {
            this.logger.error('Application start failed:', error);
            this.emit('error', error);
            throw error;
        }
    }
    
    /**
     * Stop the application gracefully
     * @returns {Promise<void>}
     */
    async stop() {
        try {
            this.logger.info('Stopping Video Processing Application...');
            
            // Stop interfaces
            await this._stopInterfaces();
            
            // Disconnect infrastructure
            await this._disconnectInfrastructure();
            
            // Cleanup services
            await this._cleanupServices();
            
            this.isRunning = false;
            this.emit('stopped');
            
            this.logger.info('Application stopped successfully');
            
        } catch (error) {
            this.logger.error('Application stop failed:', error);
            this.emit('error', error);
        }
    }
    
    /**
     * Initialize infrastructure components
     * @private
     */
    async _initializeInfrastructure() {
        this.logger.debug('Initializing infrastructure...');
        
        // Initialize database
        this.infrastructure.database = new DatabaseInfrastructure(
            this.config.get('infrastructure.database'),
            this.logger
        );
        
        this.logger.debug('Infrastructure initialized');
    }
    
    /**
     * Initialize services with dependency injection
     * @private
     */
    async _initializeServices() {
        this.logger.debug('Initializing services...');
        
        // Cache Service (foundational)
        this.services.cache = new CacheService(
            this.config.get('services.cache'),
            this.logger
        );
        
        // TTS Service
        this.services.tts = new TTSService(
            this.config.get('services.tts'),
            this.logger
        );
        
        // Image Service
        this.services.image = new ImageService(
            this.config.get('services.image'),
            this.logger
        );
        
        // Video Service
        this.services.video = new VideoService(
            this.config.get('services.video'),
            this.logger
        );
        
        this.logger.debug('Services initialized');
    }
    
    /**
     * Initialize core pipeline with dependency injection
     * @private
     */
    async _initializePipeline() {
        this.logger.debug('Initializing pipeline core...');
        
        // Create dependencies object for pipeline
        const dependencies = {
            config: this.config.getAll(),
            logger: this.logger,
            ttsService: this.services.tts,
            imageService: this.services.image,
            videoService: this.services.video,
            cacheService: this.services.cache
        };
        
        // Initialize pipeline core
        this.services.pipeline = new PipelineCore(dependencies);
        
        // Setup pipeline event listeners
        this._setupPipelineEventListeners();
        
        this.logger.debug('Pipeline core initialized');
    }
    
    /**
     * Initialize interfaces
     * @private
     */
    async _initializeInterfaces() {
        this.logger.debug('Initializing interfaces...');
        
        // REST API Interface
        this.interfaces.api = new APIInterface(
            this.services.pipeline,
            this.config.get('api'),
            this.logger
        );
        
        this.logger.debug('Interfaces initialized');
    }
    
    /**
     * Connect to infrastructure services
     * @private
     */
    async _connectInfrastructure() {
        this.logger.debug('Connecting to infrastructure...');
        
        if (this.infrastructure.database) {
            const connected = await this.infrastructure.database.connect();
            if (!connected) {
                this.logger.warn('Database connection failed, continuing without database');
            }
        }
        
        this.logger.debug('Infrastructure connection complete');
    }
    
    /**
     * Start interface services
     * @private
     */
    async _startInterfaces() {
        this.logger.debug('Starting interfaces...');
        
        if (this.interfaces.api) {
            await this.interfaces.api.start();
        }
        
        this.logger.debug('Interfaces started');
    }
    
    /**
     * Stop interface services
     * @private
     */
    async _stopInterfaces() {
        this.logger.debug('Stopping interfaces...');
        
        if (this.interfaces.api) {
            await this.interfaces.api.stop();
        }
        
        this.logger.debug('Interfaces stopped');
    }
    
    /**
     * Disconnect from infrastructure services
     * @private
     */
    async _disconnectInfrastructure() {
        this.logger.debug('Disconnecting from infrastructure...');
        
        if (this.infrastructure.database) {
            await this.infrastructure.database.disconnect();
        }
        
        this.logger.debug('Infrastructure disconnected');
    }
    
    /**
     * Cleanup services
     * @private
     */
    async _cleanupServices() {
        this.logger.debug('Cleaning up services...');
        
        const cleanupPromises = [];
        
        // Cleanup each service that supports it
        for (const [name, service] of Object.entries(this.services)) {
            if (service && typeof service.cleanup === 'function') {
                cleanupPromises.push(
                    service.cleanup().catch(error => 
                        this.logger.warn(`Service ${name} cleanup failed:`, error)
                    )
                );
            }
        }
        
        await Promise.all(cleanupPromises);
        
        this.logger.debug('Services cleaned up');
    }
    
    /**
     * Setup pipeline event listeners
     * @private
     */
    _setupPipelineEventListeners() {
        const pipeline = this.services.pipeline;
        
        pipeline.on('initialized', (data) => {
            this.logger.info('Pipeline initialized:', data);
        });
        
        pipeline.on('jobProgress', (data) => {
            this.logger.debug('Job progress:', data);
        });
        
        pipeline.on('jobCompleted', (job) => {
            this.logger.info('Job completed:', {
                jobId: job.id,
                strategy: job.strategy,
                duration: job.duration
            });
        });
        
        pipeline.on('jobFailed', (data) => {
            this.logger.error('Job failed:', data);
        });
    }
    
    /**
     * Setup process signal handlers
     * @private
     */
    _setupProcessHandlers() {
        // Graceful shutdown on SIGTERM
        process.on('SIGTERM', async () => {
            this.logger.info('Received SIGTERM, shutting down gracefully...');
            await this.stop();
            process.exit(0);
        });
        
        // Graceful shutdown on SIGINT (Ctrl+C)
        process.on('SIGINT', async () => {
            this.logger.info('Received SIGINT, shutting down gracefully...');
            await this.stop();
            process.exit(0);
        });
        
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            this.logger.error('Uncaught exception:', error);
            this.stop().finally(() => process.exit(1));
        });
        
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            this.logger.error('Unhandled rejection at:', promise, 'reason:', reason);
            this.stop().finally(() => process.exit(1));
        });
    }
    
    /**
     * Create logger instance
     * @private
     */
    _createLogger() {
        // Simple console logger for now
        // In production, this would be replaced with a proper logging library
        return {
            debug: (message, meta = {}) => {
                if (this.config?.get('app.debug')) {
                    console.debug(`[DEBUG] ${message}`, meta);
                }
            },
            info: (message, meta = {}) => {
                console.info(`[INFO] ${message}`, meta);
            },
            warn: (message, meta = {}) => {
                console.warn(`[WARN] ${message}`, meta);
            },
            error: (message, meta = {}) => {
                console.error(`[ERROR] ${message}`, meta);
            }
        };
    }
    
    /**
     * Get application status
     * @returns {Object} Application status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            running: this.isRunning,
            environment: this.config.getEnvironment(),
            version: this.config.get('app.version'),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            services: Object.keys(this.services),
            infrastructure: Object.keys(this.infrastructure),
            interfaces: Object.keys(this.interfaces)
        };
    }
    
    /**
     * Get comprehensive health check
     * @returns {Promise<Object>} Health status
     */
    async getHealth() {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            application: this.getStatus(),
            services: {},
            infrastructure: {}
        };
        
        // Check service health
        for (const [name, service] of Object.entries(this.services)) {
            if (service && typeof service.healthCheck === 'function') {
                try {
                    health.services[name] = await service.healthCheck();
                } catch (error) {
                    health.services[name] = {
                        status: 'unhealthy',
                        error: error.message
                    };
                    health.status = 'degraded';
                }
            }
        }
        
        // Check infrastructure health
        for (const [name, component] of Object.entries(this.infrastructure)) {
            if (component && typeof component.healthCheck === 'function') {
                try {
                    health.infrastructure[name] = await component.healthCheck();
                } catch (error) {
                    health.infrastructure[name] = {
                        status: 'unhealthy',
                        error: error.message
                    };
                    health.status = 'degraded';
                }
            }
        }
        
        return health;
    }
    
    /**
     * Execute pipeline directly (for programmatic usage)
     * @param {Object} params - Pipeline parameters
     * @returns {Promise<Object>} Execution result
     */
    async execute(params) {
        if (!this.isRunning) {
            throw new Error('Application is not running');
        }
        
        return await this.services.pipeline.execute(params);
    }
}

// Export the application class and create singleton instance
module.exports = VideoProcessingApplication;

// If this file is run directly, start the application
if (require.main === module) {
    const app = new VideoProcessingApplication();
    
    // Start the application
    app.start().catch(error => {
        console.error('Failed to start application:', error);
        process.exit(1);
    });
    
    // Log when application is ready
    app.once('started', () => {
        console.log('\n🚀 Video Processing Application is running!');
        console.log(`\n📊 Dashboard: http://localhost:${app.config.get('api.port')}`);
        console.log(`🔗 API Docs: http://localhost:${app.config.get('api.port')}/api`);
        console.log(`🏥 Health: http://localhost:${app.config.get('api.port')}/health`);
        console.log('\n📝 Press Ctrl+C to stop\n');
    });
}