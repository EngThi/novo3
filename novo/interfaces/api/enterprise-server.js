/**
 * Enterprise API Server - Advanced Express Implementation
 * Features: OpenAPI documentation, Advanced middleware pipeline, Monitoring, Metrics
 * Architecture: Express.js + Swagger + Prometheus + Winston + Security middleware
 */

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;

/**
 * Advanced API Server with Enterprise Features
 */
class EnterpriseAPIServer {
    constructor(dependencies = {}) {
        this.app = express();
        this.server = null;
        
        // Service dependencies
        this.pipelineCore = dependencies.pipelineCore;
        this.ttsService = dependencies.ttsService;
        this.imageService = dependencies.imageService;
        this.videoService = dependencies.videoService;
        this.cacheService = dependencies.cacheService;
        this.jobQueue = dependencies.jobQueue;
        this.logger = dependencies.logger || this.createDefaultLogger();
        
        this.config = {
            port: dependencies.config?.api?.port || 3000,
            host: dependencies.config?.api?.host || '0.0.0.0',
            apiVersion: 'v2',
            title: 'Enterprise Video Pipeline API',
            description: 'Advanced video generation pipeline with multiple providers and strategies',
            enableDocs: dependencies.config?.api?.enableDocs !== false,
            enableMetrics: dependencies.config?.api?.enableMetrics !== false,
            enableMonitoring: dependencies.config?.api?.enableMonitoring !== false,
            rateLimitWindow: 15 * 60 * 1000, // 15 minutes
            rateLimitMax: 200, // requests per window
            slowDownThreshold: 100, // Start slowing down after 100 requests
            trustProxy: dependencies.config?.api?.trustProxy || false,
            ...dependencies.config?.api || {}
        };
        
        // Performance metrics
        this.metrics = {
            requests: 0,
            errors: 0,
            responseTime: 0,
            activeConnections: 0,
            totalDataProcessed: 0,
            endpointStats: new Map(),
            errorTypes: new Map()
        };
        
        // Active jobs tracking
        this.activeJobs = new Map();
        this.jobResults = new Map();
        
        this.setupSwagger();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
        this.setupMetricsCollection();
    }
    
    /**
     * Setup Swagger/OpenAPI documentation
     */
    setupSwagger() {
        const swaggerOptions = {
            definition: {
                openapi: '3.0.0',
                info: {
                    title: this.config.title,
                    version: this.config.apiVersion,
                    description: this.config.description,
                    contact: {
                        name: 'API Support',
                        email: 'support@videopipeline.com'
                    }
                },
                servers: [{
                    url: `http://localhost:${this.config.port}/api/${this.config.apiVersion}`,
                    description: 'Development server'
                }],
                components: {
                    securitySchemes: {
                        ApiKeyAuth: {
                            type: 'apiKey',
                            in: 'header',
                            name: 'X-API-Key'
                        },
                        BearerAuth: {
                            type: 'http',
                            scheme: 'bearer'
                        }
                    },
                    schemas: {
                        PipelineRequest: {
                            type: 'object',
                            required: ['prompt'],
                            properties: {
                                prompt: {
                                    type: 'string',
                                    minLength: 10,
                                    maxLength: 5000,
                                    description: 'Text prompt for video generation'
                                },
                                strategy: {
                                    type: 'string',
                                    enum: ['fast', 'balanced', 'quality', 'premium'],
                                    default: 'balanced',
                                    description: 'Execution strategy'
                                },
                                options: {
                                    type: 'object',
                                    properties: {
                                        voice: { type: 'string' },
                                        quality: { type: 'string' },
                                        style: { type: 'string' },
                                        format: { type: 'string' }
                                    }
                                }
                            }
                        },
                        JobResponse: {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean' },
                                jobId: { type: 'string' },
                                status: { type: 'string' },
                                progress: { type: 'number', minimum: 0, maximum: 100 },
                                result: { type: 'object' },
                                requestId: { type: 'string' }
                            }
                        }
                    }
                }
            },
            apis: [path.join(__dirname, '*.js')] // Path to API docs
        };
        
        this.swaggerSpec = swaggerJSDoc(swaggerOptions);
    }
    
    /**
     * Setup comprehensive middleware pipeline
     */
    setupMiddleware() {
        // Trust proxy if configured
        if (this.config.trustProxy) {
            this.app.set('trust proxy', true);
        }
        
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "https:"]
                }
            }
        }));
        
        // CORS with advanced configuration
        this.app.use(cors({
            origin: this.config.corsOrigins || true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: [
                'Content-Type', 
                'Authorization', 
                'X-API-Key', 
                'X-Request-ID',
                'X-Client-Version',
                'X-Client-Platform'
            ],
            credentials: true,
            maxAge: 86400 // 24 hours
        }));
        
        // Performance middleware
        this.app.use(compression({ level: 6 }));
        
        // Body parsing with size limits
        this.app.use(express.json({ 
            limit: '50mb',
            strict: true,
            type: ['application/json', 'application/*+json']
        }));
        this.app.use(express.urlencoded({ 
            extended: true, 
            limit: '50mb',
            parameterLimit: 1000
        }));
        
        // Request tracking and logging
        this.app.use(this.requestTrackingMiddleware.bind(this));
        
        // Advanced rate limiting with different tiers
        this.setupAdvancedRateLimit();
        
        // API versioning
        this.app.use(`/api/${this.config.apiVersion}`, this.versionMiddleware.bind(this));
        
        // Authentication middleware
        this.app.use(`/api/${this.config.apiVersion}`, this.authenticationMiddleware.bind(this));
    }
    
    /**
     * Request tracking middleware
     */
    requestTrackingMiddleware(req, res, next) {
        const startTime = Date.now();
        const requestId = req.headers['x-request-id'] || uuidv4();
        
        req.id = requestId;
        req.startTime = startTime;
        
        res.setHeader('X-Request-ID', requestId);
        res.setHeader('X-API-Version', this.config.apiVersion);
        
        // Track active connections
        this.metrics.activeConnections++;
        
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            const endpoint = `${req.method} ${req.route?.path || req.path}`;
            
            // Update metrics
            this.updateRequestMetrics(endpoint, duration, res.statusCode);
            this.metrics.activeConnections--;
            
            // Log request
            this.logger.info('Request completed', {
                requestId,
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                duration,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                contentLength: res.get('Content-Length') || 0
            });
        });
        
        next();
    }
    
    /**
     * Setup advanced rate limiting
     */
    setupAdvancedRateLimit() {
        // Standard rate limit
        const standardLimiter = rateLimit({
            windowMs: this.config.rateLimitWindow,
            max: this.config.rateLimitMax,
            standardHeaders: true,
            legacyHeaders: false,
            keyGenerator: (req) => {
                // Use API key if available, otherwise IP
                return req.headers['x-api-key'] || req.ip;
            },
            handler: (req, res) => {
                this.logger.warn('Rate limit exceeded', {
                    ip: req.ip,
                    apiKey: req.headers['x-api-key'] ? 'present' : 'none',
                    path: req.path
                });
                
                res.status(429).json({
                    success: false,
                    error: 'Too many requests',
                    retryAfter: Math.ceil(this.config.rateLimitWindow / 1000),
                    requestId: req.id
                });
            }
        });
        
        // Expensive operations limiter
        const heavyOperationsLimiter = rateLimit({
            windowMs: 60 * 1000, // 1 minute
            max: 10, // Only 10 heavy operations per minute
            skip: (req) => {
                const heavyEndpoints = ['/generate', '/videos/assemble', '/images/batch'];
                return !heavyEndpoints.some(endpoint => req.path.includes(endpoint));
            }
        });
        
        this.app.use(standardLimiter);
        this.app.use(heavyOperationsLimiter);
    }
    
    /**
     * Version middleware
     */
    versionMiddleware(req, res, next) {
        req.apiVersion = this.config.apiVersion;
        next();
    }
    
    /**
     * Authentication middleware
     */
    authenticationMiddleware(req, res, next) {
        // Skip auth for public endpoints
        const publicEndpoints = ['/health', '/docs', '/metrics'];
        if (publicEndpoints.some(endpoint => req.path.includes(endpoint))) {
            return next();
        }
        
        const apiKey = req.headers['x-api-key'] || req.headers.authorization?.replace('Bearer ', '');
        
        if (!apiKey) {
            return res.status(401).json({
                success: false,
                error: 'API key required',
                requestId: req.id
            });
        }
        
        // Validate API key (implement your validation logic)
        if (!this.validateApiKey(apiKey)) {
            return res.status(401).json({
                success: false,
                error: 'Invalid API key',
                requestId: req.id
            });
        }
        
        req.apiKey = apiKey;
        next();
    }
    
    /**
     * Setup comprehensive API routes
     */
    setupRoutes() {
        const router = express.Router();
        
        // Documentation
        if (this.config.enableDocs) {
            router.use('/docs', swaggerUi.serve);
            router.get('/docs', swaggerUi.setup(this.swaggerSpec, {
                customCss: '.swagger-ui .topbar { display: none }',
                customSiteTitle: 'Video Pipeline API Docs'
            }));
            
            router.get('/openapi.json', (req, res) => {
                res.json(this.swaggerSpec);
            });
        }
        
        /**
         * @swagger
         * /health:
         *   get:
         *     summary: Health check endpoint
         *     tags: [System]
         *     responses:
         *       200:
         *         description: System is healthy
         *       503:
         *         description: System is unhealthy
         */
        router.get('/health', this.detailedHealthCheck.bind(this));
        
        /**
         * @swagger
         * /generate:
         *   post:
         *     summary: Generate complete video content
         *     tags: [Pipeline]
         *     security:
         *       - ApiKeyAuth: []
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             $ref: '#/components/schemas/PipelineRequest'
         *     responses:
         *       202:
         *         description: Job started successfully
         *         content:
         *           application/json:
         *             schema:
         *               $ref: '#/components/schemas/JobResponse'
         */
        router.post('/generate', 
            this.validatePipelineRequest(),
            this.generateContent.bind(this)
        );
        
        router.post('/generate/batch',
            this.validateBatchRequest(),
            this.generateBatch.bind(this)
        );
        
        // Enhanced TTS endpoints
        router.post('/tts/generate',
            this.validateTTSRequest(),
            this.generateTTS.bind(this)
        );
        
        router.get('/tts/voices',
            this.getAvailableVoices.bind(this)
        );
        
        router.get('/tts/providers',
            this.getTTSProviders.bind(this)
        );
        
        // Image endpoints
        router.post('/images/generate',
            this.validateImageRequest(),
            this.generateImage.bind(this)
        );
        
        router.post('/images/batch',
            this.validateImageBatchRequest(),
            this.generateImageBatch.bind(this)
        );
        
        // Video endpoints
        router.post('/videos/assemble',
            this.validateVideoRequest(),
            this.assembleVideo.bind(this)
        );
        
        // Job management
        router.get('/jobs/:id',
            param('id').isUUID().withMessage('Invalid job ID'),
            this.getJobStatus.bind(this)
        );
        
        router.post('/jobs/:id/cancel',
            param('id').isUUID(),
            this.cancelJob.bind(this)
        );
        
        router.delete('/jobs/:id',
            param('id').isUUID(),
            this.deleteJob.bind(this)
        );
        
        // Advanced analytics
        if (this.config.enableMetrics) {
            router.get('/metrics', this.getDetailedMetrics.bind(this));
            router.get('/metrics/prometheus', this.getPrometheusMetrics.bind(this));
        }
        
        // System information
        router.get('/system/info', this.getSystemInfo.bind(this));
        router.get('/system/providers', this.getAllProviders.bind(this));
        
        // Cache management
        router.post('/cache/clear', this.clearCache.bind(this));
        router.get('/cache/stats', this.getCacheStats.bind(this));
        
        this.app.use(`/api/${this.config.apiVersion}`, router);
        
        // Root endpoint with API overview
        this.app.get('/', this.getApiOverview.bind(this));
    }
    
    /**
     * Enhanced validation methods
     */
    validatePipelineRequest() {
        return [
            body('prompt')
                .notEmpty()
                .withMessage('Prompt is required')
                .isLength({ min: 10, max: 5000 })
                .withMessage('Prompt must be between 10 and 5000 characters')
                .custom(value => {
                    // Basic content filtering
                    const forbidden = ['violence', 'hate', 'adult'];
                    const lowerValue = value.toLowerCase();
                    if (forbidden.some(word => lowerValue.includes(word))) {
                        throw new Error('Content not allowed');
                    }
                    return true;
                }),
            
            body('strategy')
                .optional()
                .isIn(['fast', 'balanced', 'quality', 'premium'])
                .withMessage('Invalid strategy'),
            
            body('options')
                .optional()
                .isObject()
                .withMessage('Options must be an object'),
            
            body('options.priority')
                .optional()
                .isIn(['low', 'normal', 'high'])
                .withMessage('Invalid priority'),
            
            this.handleValidationErrors.bind(this)
        ];
    }
    
    validateTTSRequest() {
        return [
            body('text')
                .notEmpty()
                .isLength({ min: 1, max: 10000 })
                .withMessage('Text must be between 1 and 10000 characters'),
            
            body('options.voice')
                .optional()
                .isString()
                .withMessage('Voice must be a string'),
            
            body('options.quality')
                .optional()
                .isIn(['economy', 'standard', 'high', 'premium', 'studio'])
                .withMessage('Invalid quality setting'),
            
            this.handleValidationErrors.bind(this)
        ];
    }
    
    handleValidationErrors(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            this.logger.warn('Validation failed', {
                requestId: req.id,
                errors: errors.array()
            });
            
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array(),
                requestId: req.id
            });
        }
        next();
    }
    
    /**
     * Enhanced route handlers
     */
    async generateContent(req, res) {
        try {
            const { prompt, strategy, options = {} } = req.body;
            
            // Enhanced request preparation
            const enhancedOptions = {
                ...options,
                requestId: req.id,
                clientIP: req.ip,
                apiKey: req.apiKey,
                timestamp: new Date().toISOString()
            };
            
            const result = await this.pipelineCore.execute({
                prompt,
                strategy: strategy || 'balanced',
                options: enhancedOptions
            });
            
            // Store job for tracking
            this.activeJobs.set(result.jobId, {
                ...result,
                requestId: req.id,
                startedAt: new Date().toISOString(),
                clientInfo: {
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    apiKey: req.apiKey
                }
            });
            
            // Send webhook notification
            this.sendWebhookNotification('job.started', result);
            
            res.status(202).json({
                success: true,
                jobId: result.jobId,
                status: 'processing',
                message: 'Pipeline execution started',
                estimatedCompletion: this.estimateCompletion(strategy),
                requestId: req.id
            });
            
        } catch (error) {
            this.handleRouteError(res, error, req.id, 'generate_content');
        }
    }
    
    async generateTTS(req, res) {
        try {
            const { text, options = {} } = req.body;
            
            // Enhanced TTS generation with monitoring
            const startTime = Date.now();
            const result = await this.ttsService.generateAudio(text, {
                ...options,
                requestId: req.id
            });
            
            const processingTime = Date.now() - startTime;
            
            // Calculate data processed (for metrics)
            this.metrics.totalDataProcessed += Buffer.byteLength(text, 'utf8');
            
            res.json({
                success: true,
                data: {
                    audioFile: result.file,
                    duration: result.duration,
                    provider: result.provider,
                    quality: result.quality,
                    processingTime,
                    metadata: result.metadata
                },
                requestId: req.id
            });
            
        } catch (error) {
            this.handleRouteError(res, error, req.id, 'generate_tts');
        }
    }
    
    async detailedHealthCheck(req, res) {
        try {
            const health = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                version: this.config.apiVersion,
                environment: process.env.NODE_ENV || 'development',
                system: {
                    memory: process.memoryUsage(),
                    cpu: process.cpuUsage(),
                    platform: process.platform,
                    nodeVersion: process.version
                },
                api: {
                    activeConnections: this.metrics.activeConnections,
                    totalRequests: this.metrics.requests,
                    errorRate: this.metrics.errors / Math.max(this.metrics.requests, 1)
                },
                services: {}
            };
            
            // Check all services
            const services = [
                ['pipeline', this.pipelineCore],
                ['tts', this.ttsService],
                ['image', this.imageService],
                ['video', this.videoService],
                ['cache', this.cacheService]
            ];
            
            for (const [name, service] of services) {
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
            
            const statusCode = health.status === 'healthy' ? 200 : 503;
            res.status(statusCode).json(health);
            
        } catch (error) {
            res.status(500).json({
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    async getDetailedMetrics(req, res) {
        try {
            const metrics = {
                api: {
                    ...this.metrics,
                    uptime: process.uptime(),
                    endpoints: Object.fromEntries(this.metrics.endpointStats),
                    errorTypes: Object.fromEntries(this.metrics.errorTypes)
                },
                services: {}
            };
            
            // Gather service metrics
            const services = ['pipeline', 'tts', 'image', 'video', 'cache'];
            for (const serviceName of services) {
                const service = this[`${serviceName}Service`];
                if (service && typeof service.getDetailedStats === 'function') {
                    metrics.services[serviceName] = service.getDetailedStats();
                } else if (service && typeof service.getStats === 'function') {
                    metrics.services[serviceName] = service.getStats();
                }
            }
            
            res.json({
                success: true,
                data: metrics,
                timestamp: new Date().toISOString(),
                requestId: req.id
            });
            
        } catch (error) {
            this.handleRouteError(res, error, req.id, 'get_metrics');
        }
    }
    
    /**
     * Setup comprehensive error handling
     */
    setupErrorHandling() {
        // 404 handler with helpful information
        this.app.use((req, res) => {
            this.logger.warn('Endpoint not found', {
                method: req.method,
                path: req.path,
                ip: req.ip
            });
            
            res.status(404).json({
                success: false,
                error: 'Endpoint not found',
                path: req.path,
                method: req.method,
                availableEndpoints: this.getAvailableEndpoints(),
                requestId: req.id
            });
        });
        
        // Global error handler with detailed logging
        this.app.use((error, req, res, next) => {
            const errorId = uuidv4();
            
            this.logger.error('Unhandled API error', {
                errorId,
                requestId: req.id,
                error: error.message,
                stack: error.stack,
                path: req.path,
                method: req.method,
                body: req.body
            });
            
            this.metrics.errors++;
            this.updateErrorMetrics(error.name || 'UnknownError');
            
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                errorId,
                requestId: req.id
            });
        });
    }
    
    /**
     * Setup metrics collection
     */
    setupMetricsCollection() {
        if (this.config.enableMetrics) {
            setInterval(() => {
                this.collectSystemMetrics();
            }, 30000); // Every 30 seconds
        }
    }
    
    collectSystemMetrics() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        this.emit('metrics:collected', {
            memory: {
                heapUsed: memUsage.heapUsed / 1024 / 1024, // MB
                heapTotal: memUsage.heapTotal / 1024 / 1024,
                rss: memUsage.rss / 1024 / 1024
            },
            cpu: {
                user: cpuUsage.user / 1000000, // Convert to seconds
                system: cpuUsage.system / 1000000
            },
            connections: this.metrics.activeConnections
        });
    }
    
    /**
     * Utility methods
     */
    updateRequestMetrics(endpoint, duration, statusCode) {
        this.metrics.requests++;
        
        // Update response time average
        this.metrics.responseTime = 
            ((this.metrics.responseTime * (this.metrics.requests - 1)) + duration) / this.metrics.requests;
        
        // Track endpoint-specific stats
        if (!this.metrics.endpointStats.has(endpoint)) {
            this.metrics.endpointStats.set(endpoint, {
                requests: 0,
                errors: 0,
                averageResponseTime: 0,
                statusCodes: new Map()
            });
        }
        
        const endpointStats = this.metrics.endpointStats.get(endpoint);
        endpointStats.requests++;
        
        if (statusCode >= 400) {
            endpointStats.errors++;
        }
        
        // Update status code tracking
        const statusCount = endpointStats.statusCodes.get(statusCode) || 0;
        endpointStats.statusCodes.set(statusCode, statusCount + 1);
        
        // Update average response time
        endpointStats.averageResponseTime = 
            ((endpointStats.averageResponseTime * (endpointStats.requests - 1)) + duration) / endpointStats.requests;
    }
    
    updateErrorMetrics(errorType) {
        const count = this.metrics.errorTypes.get(errorType) || 0;
        this.metrics.errorTypes.set(errorType, count + 1);
    }
    
    handleRouteError(res, error, requestId, operation) {
        this.logger.error(`${operation} failed`, {
            requestId,
            error: error.message,
            stack: error.stack
        });
        
        this.metrics.errors++;
        this.updateErrorMetrics(error.name || 'APIError');
        
        const statusCode = this.getErrorStatusCode(error);
        
        res.status(statusCode).json({
            success: false,
            error: this.getSafeErrorMessage(error),
            operation,
            requestId
        });
    }
    
    getErrorStatusCode(error) {
        if (error.message.includes('validation')) return 400;
        if (error.message.includes('unauthorized')) return 401;
        if (error.message.includes('forbidden')) return 403;
        if (error.message.includes('not found')) return 404;
        if (error.message.includes('rate limit')) return 429;
        return 500;
    }
    
    getSafeErrorMessage(error) {
        // Don't expose internal error details in production
        if (process.env.NODE_ENV === 'production') {
            return 'An error occurred while processing your request';
        }
        return error.message;
    }
    
    estimateCompletion(strategy) {
        const estimates = {
            fast: 15000,
            balanced: 30000,
            quality: 60000,
            premium: 90000
        };
        
        const baseTime = estimates[strategy] || estimates.balanced;
        return new Date(Date.now() + baseTime).toISOString();
    }
    
    validateApiKey(apiKey) {
        // Implement your API key validation logic
        // This is a simplified version
        return apiKey && apiKey.length > 10;
    }
    
    createDefaultLogger() {
        return {
            debug: (msg, meta = {}) => console.debug(`[DEBUG] ${msg}`, meta),
            info: (msg, meta = {}) => console.info(`[INFO] ${msg}`, meta),
            warn: (msg, meta = {}) => console.warn(`[WARN] ${msg}`, meta),
            error: (msg, meta = {}) => console.error(`[ERROR] ${msg}`, meta)
        };
    }
    
    getAvailableEndpoints() {
        return [
            'GET /health',
            'POST /api/v2/generate',
            'POST /api/v2/tts/generate',
            'POST /api/v2/images/generate',
            'POST /api/v2/videos/assemble',
            'GET /api/v2/jobs/:id',
            'GET /api/v2/metrics'
        ];
    }
    
    async sendWebhookNotification(event, data) {
        // Implement webhook notifications
        if (this.config.webhooks && this.config.webhooks.length > 0) {
            // Mock implementation
            this.logger.info('Webhook notification sent', { event, jobId: data.jobId });
        }
    }
    
    /**
     * Start server
     */
    async start() {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this.config.port, this.config.host, (error) => {
                if (error) {
                    reject(error);
                } else {
                    this.logger.info('Enterprise API Server started', {
                        port: this.config.port,
                        host: this.config.host,
                        version: this.config.apiVersion,
                        docs: this.config.enableDocs ? `http://${this.config.host}:${this.config.port}/api/${this.config.apiVersion}/docs` : 'disabled'
                    });
                    resolve();
                }
            });
        });
    }
    
    /**
     * Stop server gracefully
     */
    async stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    this.logger.info('Enterprise API Server stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
    
    /**
     * Get server status
     */
    getStatus() {
        return {
            running: !!this.server,
            port: this.config.port,
            host: this.config.host,
            version: this.config.apiVersion,
            activeJobs: this.activeJobs.size,
            uptime: process.uptime(),
            metrics: this.metrics
        };
    }
}

module.exports = EnterpriseAPIServer;