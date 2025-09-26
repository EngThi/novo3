/**
 * REST API Interface - Enterprise Implementation
 * @fileoverview Express.js API with middleware, validation, and monitoring
 * @version 1.0.0
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');

/**
 * API Interface Service
 * Provides REST endpoints for pipeline operations
 */
class APIInterface {
    constructor(pipelineCore, config = {}, logger = console) {
        this.pipelineCore = pipelineCore;
        this.config = {
            port: config.port || 3000,
            host: config.host || '0.0.0.0',
            cors: config.cors !== false,
            helmet: config.helmet !== false,
            rateLimit: config.rateLimit !== false,
            apiKey: config.apiKey,
            webhooks: config.webhooks || [],
            ...config
        };
        
        this.logger = logger;
        this.app = express();
        this.server = null;
        this.activeJobs = new Map();
        
        this._setupMiddleware();
        this._setupRoutes();
        this._setupErrorHandling();
    }
    
    /**
     * Setup Express middleware
     * @private
     */
    _setupMiddleware() {
        // Security middleware
        if (this.config.helmet) {
            this.app.use(helmet());
        }
        
        // CORS middleware
        if (this.config.cors) {
            this.app.use(cors({
                origin: this.config.corsOrigins || '*',
                methods: ['GET', 'POST', 'PUT', 'DELETE'],
                allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
            }));
        }
        
        // Rate limiting
        if (this.config.rateLimit) {
            const limiter = rateLimit({
                windowMs: 15 * 60 * 1000, // 15 minutes
                max: 100, // limit each IP to 100 requests per windowMs
                message: {
                    error: 'Too many requests from this IP',
                    retryAfter: '15 minutes'
                }
            });
            this.app.use(limiter);
        }
        
        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        
        // Request logging
        this.app.use((req, res, next) => {
            const requestId = crypto.randomUUID();
            req.requestId = requestId;
            
            this.logger.info(`${req.method} ${req.path}`, {
                requestId,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            next();
        });
        
        // API Key authentication (if enabled)
        if (this.config.apiKey) {
            this.app.use('/api', this._authenticateApiKey.bind(this));
        }
    }
    
    /**
     * Setup API routes
     * @private
     */
    _setupRoutes() {
        // Health check endpoint
        this.app.get('/health', async (req, res) => {
            try {
                const health = await this._getHealthStatus();
                res.status(health.status === 'healthy' ? 200 : 503).json(health);
            } catch (error) {
                res.status(500).json({ error: 'Health check failed' });
            }
        });
        
        // Pipeline execution endpoint
        this.app.post('/api/pipeline/execute', 
            this._validateExecuteRequest(),
            async (req, res) => {
                try {
                    const { prompt, strategy, options } = req.body;
                    
                    const result = await this.pipelineCore.execute({
                        prompt,
                        strategy,
                        options,
                        requestId: req.requestId
                    });
                    
                    // Store job for status tracking
                    this.activeJobs.set(result.jobId, {
                        ...result,
                        requestId: req.requestId,
                        startedAt: new Date().toISOString()
                    });
                    
                    // Send webhook if configured
                    this._sendWebhook('job.started', result);
                    
                    res.status(202).json({
                        success: true,
                        jobId: result.jobId,
                        status: 'processing',
                        message: 'Pipeline execution started'
                    });
                    
                } catch (error) {
                    this.logger.error('Pipeline execution failed:', error);
                    res.status(500).json({
                        success: false,
                        error: error.message,
                        requestId: req.requestId
                    });
                }
            }
        );
        
        // Job status endpoint
        this.app.get('/api/pipeline/status/:jobId', (req, res) => {
            const { jobId } = req.params;
            
            const job = this.pipelineCore.getJob(jobId) || this.activeJobs.get(jobId);
            
            if (!job) {
                return res.status(404).json({
                    success: false,
                    error: 'Job not found'
                });
            }
            
            res.json({
                success: true,
                jobId,
                status: job.status,
                progress: job.progress,
                duration: job.duration,
                result: job.result
            });
        });
        
        // Pipeline statistics
        this.app.get('/api/pipeline/stats', (req, res) => {
            const stats = this.pipelineCore.getStats();
            res.json({
                success: true,
                stats
            });
        });
        
        // Available strategies
        this.app.get('/api/pipeline/strategies', (req, res) => {
            res.json({
                success: true,
                strategies: Object.keys(this.pipelineCore.strategies)
            });
        });
        
        // Service providers info
        this.app.get('/api/services/providers', async (req, res) => {
            try {
                const providers = await this._getProvidersInfo();
                res.json({
                    success: true,
                    providers
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
        
        // Webhook endpoints
        this.app.post('/api/webhooks/:service', (req, res) => {
            const { service } = req.params;
            const payload = req.body;
            
            this.logger.info(`Webhook received from ${service}:`, payload);
            
            // Process webhook based on service
            this._processWebhook(service, payload);
            
            res.json({ success: true, received: true });
        });
        
        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                name: 'Video Pipeline API',
                version: '2.0.0',
                status: 'operational',
                endpoints: {
                    health: '/health',
                    execute: 'POST /api/pipeline/execute',
                    status: 'GET /api/pipeline/status/:jobId',
                    stats: 'GET /api/pipeline/stats',
                    strategies: 'GET /api/pipeline/strategies',
                    providers: 'GET /api/services/providers'
                }
            });
        });
    }
    
    /**
     * Setup error handling
     * @private
     */
    _setupErrorHandling() {
        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint not found',
                path: req.path
            });
        });
        
        // Global error handler
        this.app.use((error, req, res, next) => {
            this.logger.error('API Error:', {
                error: error.message,
                stack: error.stack,
                requestId: req.requestId
            });
            
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                requestId: req.requestId
            });
        });
    }
    
    /**
     * Validate pipeline execution request
     * @private
     */
    _validateExecuteRequest() {
        return [
            body('prompt')
                .notEmpty()
                .withMessage('Prompt is required')
                .isLength({ min: 10, max: 2000 })
                .withMessage('Prompt must be between 10 and 2000 characters'),
            
            body('strategy')
                .optional()
                .isIn(['fast', 'balanced', 'quality', 'premium'])
                .withMessage('Invalid strategy'),
            
            body('options')
                .optional()
                .isObject()
                .withMessage('Options must be an object'),
            
            (req, res, next) => {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(400).json({
                        success: false,
                        error: 'Validation failed',
                        details: errors.array()
                    });
                }
                next();
            }
        ];
    }
    
    /**
     * API Key authentication middleware
     * @private
     */
    _authenticateApiKey(req, res, next) {
        const apiKey = req.headers['x-api-key'] || req.headers.authorization?.replace('Bearer ', '');
        
        if (!apiKey || apiKey !== this.config.apiKey) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or missing API key'
            });
        }
        
        next();
    }
    
    /**
     * Get comprehensive health status
     * @private
     */
    async _getHealthStatus() {
        const pipelineHealth = await this.pipelineCore.healthCheck();
        
        return {
            status: pipelineHealth.status,
            timestamp: new Date().toISOString(),
            services: {
                pipeline: pipelineHealth,
                api: {
                    status: 'healthy',
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    activeJobs: this.activeJobs.size
                }
            }
        };
    }
    
    /**
     * Get providers information
     * @private
     */
    async _getProvidersInfo() {
        const services = this.pipelineCore.services;
        const providers = {};
        
        // Get TTS providers
        if (services.tts && services.tts.getProviders) {
            providers.tts = services.tts.getProviders();
        }
        
        // Get Image providers
        if (services.image && services.image.getProviders) {
            providers.image = services.image.getProviders();
        }
        
        // Get Video providers
        if (services.video && services.video.getProviders) {
            providers.video = services.video.getProviders();
        }
        
        return providers;
    }
    
    /**
     * Send webhook notification
     * @private
     */
    async _sendWebhook(event, data) {
        if (this.config.webhooks.length === 0) return;
        
        const payload = {
            event,
            data,
            timestamp: new Date().toISOString()
        };
        
        for (const webhook of this.config.webhooks) {
            try {
                // Mock webhook sending - replace with actual HTTP request
                this.logger.info(`Webhook sent to ${webhook.url}:`, { event, jobId: data.jobId });
            } catch (error) {
                this.logger.error(`Webhook failed for ${webhook.url}:`, error);
            }
        }
    }
    
    /**
     * Process incoming webhooks
     * @private
     */
    _processWebhook(service, payload) {
        switch (service) {
            case 'shotstack':
                this._processShotstackWebhook(payload);
                break;
            case 'elevenlabs':
                this._processElevenLabsWebhook(payload);
                break;
            default:
                this.logger.warn(`Unknown webhook service: ${service}`);
        }
    }
    
    /**
     * Start the API server
     * @returns {Promise<void>}
     */
    async start() {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this.config.port, this.config.host, (error) => {
                if (error) {
                    reject(error);
                } else {
                    this.logger.info(`API server started on ${this.config.host}:${this.config.port}`);
                    resolve();
                }
            });
        });
    }
    
    /**
     * Stop the API server
     * @returns {Promise<void>}
     */
    async stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    this.logger.info('API server stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
    
    /**
     * Get server status
     * @returns {Object} Server status
     */
    getStatus() {
        return {
            running: !!this.server,
            port: this.config.port,
            host: this.config.host,
            activeJobs: this.activeJobs.size,
            uptime: process.uptime()
        };
    }
}

module.exports = APIInterface;