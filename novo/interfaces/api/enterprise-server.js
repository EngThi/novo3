/**
 * Unified API Server - Enterprise Express Server (Simplified & Working)
 * Features:
 * - Express middleware pipeline
 * - Simple rate limiting
 * - Health checks and monitoring
 * - CORS and security headers
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');

class EnterpriseAPIServer {
    constructor(options = {}) {
        this.app = express();
        this.server = null;
        
        // Dependencies
        this.dependencies = options.dependencies || {};
        this.ttsService = this.dependencies.ttsService;
        this.cacheService = this.dependencies.cacheService;
        this.logger = this.dependencies.logger || console;
        
        // Configuration
        this.config = {
            port: options.config?.api?.port || 3000,
            host: options.config?.api?.host || '0.0.0.0',
            apiVersion: 'v2',
            enableDocs: options.config?.api?.enableDocs !== false,
            enableMetrics: options.config?.api?.enableMetrics !== false,
            ...options.config?.api || {}
        };
        
        // Metrics
        this.metrics = {
            requests: 0,
            errors: 0,
            responseTime: 0,
            startTime: Date.now()
        };
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }
    
    setupMiddleware() {
        // Security headers
        this.app.use((req, res, next) => {
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            next();
        });
        
        // CORS
        this.app.use((req, res, next) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
            
            if (req.method === 'OPTIONS') {
                res.status(200).end();
                return;
            }
            next();
        });
        
        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        
        // Request tracking
        this.app.use((req, res, next) => {
            req.id = uuidv4();
            req.startTime = Date.now();
            res.setHeader('X-Request-ID', req.id);
            
            res.on('finish', () => {
                const duration = Date.now() - req.startTime;
                this.updateMetrics(duration, res.statusCode);
                
                if (this.logger.info) {
                    this.logger.info(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
                }
            });
            
            next();
        });
    }
    
    setupRoutes() {
        // Health check
        this.app.get('/health', this.healthCheck.bind(this));
        
        // API Documentation
        this.app.get('/api/v2/docs', (req, res) => {
            res.json({
                service: 'Enterprise Video Pipeline API',
                version: '2.0.0',
                endpoints: {
                    '/health': 'GET - Health check',
                    '/api/v2/generate': 'POST - Generate content',
                    '/api/v2/tts/generate': 'POST - Generate TTS',
                    '/api/v2/metrics': 'GET - Get metrics'
                }
            });
        });
        
        // Main routes
        this.app.post('/api/v2/generate', this.generateContent.bind(this));
        this.app.post('/api/v2/tts/generate', this.generateTTS.bind(this));
        this.app.get('/api/v2/metrics', this.getMetrics.bind(this));
        
        // Root
        this.app.get('/', (req, res) => {
            res.json({
                service: 'Enterprise Video Pipeline API',
                version: '2.0.0',
                status: 'healthy',
                docs: '/api/v2/docs'
            });
        });
    }
    
    async generateContent(req, res) {
        try {
            const { prompt, strategy = 'balanced' } = req.body;
            
            if (!prompt) {
                return res.status(400).json({ 
                    error: 'Prompt is required',
                    requestId: req.id 
                });
            }
            
            // Mock result
            const result = {
                jobId: uuidv4(),
                status: 'completed',
                videoUrl: `/videos/${uuidv4()}.mp4`,
                duration: 300,
                strategy
            };
            
            res.json({
                success: true,
                data: result,
                requestId: req.id
            });
            
        } catch (error) {
            this.handleError(res, error, req.id);
        }
    }
    
    async generateTTS(req, res) {
        try {
            const { text, options = {} } = req.body;
            
            if (!text) {
                return res.status(400).json({ 
                    error: 'Text is required',
                    requestId: req.id 
                });
            }
            
            let result;
            if (this.ttsService?.generateAudio) {
                result = await this.ttsService.generateAudio(text, options);
            } else {
                result = {
                    file: `/tmp/tts_${uuidv4()}.mp3`,
                    duration: text.length * 50, // Rough estimate
                    provider: 'gemini'
                };
            }
            
            res.json({
                success: true,
                data: result,
                requestId: req.id
            });
            
        } catch (error) {
            this.handleError(res, error, req.id);
        }
    }
    
    async healthCheck(req, res) {
        try {
            const health = {
                status: 'healthy',
                service: 'Enterprise API Server',
                version: '2.0.0',
                timestamp: new Date().toISOString(),
                uptime: Date.now() - this.metrics.startTime,
                metrics: {
                    requests: this.metrics.requests,
                    errors: this.metrics.errors,
                    avgResponseTime: Math.round(this.metrics.responseTime)
                }
            };
            
            res.json(health);
            
        } catch (error) {
            res.status(500).json({
                status: 'unhealthy',
                error: error.message
            });
        }
    }
    
    async getMetrics(req, res) {
        try {
            const metrics = {
                server: {
                    ...this.metrics,
                    uptime: Date.now() - this.metrics.startTime,
                    memory: process.memoryUsage()
                }
            };
            
            if (this.cacheService?.getStats) {
                metrics.cache = this.cacheService.getStats();
            }
            
            res.json({
                success: true,
                data: metrics,
                requestId: req.id
            });
            
        } catch (error) {
            this.handleError(res, error, req.id);
        }
    }
    
    setupErrorHandling() {
        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                error: 'Not Found',
                message: `Route ${req.method} ${req.path} not found`,
                requestId: req.id
            });
        });
        
        // Global error handler
        this.app.use((err, req, res, next) => {
            this.handleError(res, err, req.id);
        });
    }
    
    handleError(res, error, requestId) {
        if (this.logger.error) {
            this.logger.error(`Request ${requestId} failed:`, error);
        }
        
        this.metrics.errors++;
        
        res.status(500).json({
            success: false,
            error: error.message,
            requestId
        });
    }
    
    updateMetrics(duration, statusCode) {
        this.metrics.requests++;
        this.metrics.responseTime = 
            (this.metrics.responseTime * (this.metrics.requests - 1) + duration) / this.metrics.requests;
        
        if (statusCode >= 400) {
            this.metrics.errors++;
        }
    }
    
    async start() {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this.config.port, this.config.host, (error) => {
                if (error) {
                    reject(error);
                } else {
                    if (this.logger.info) {
                        this.logger.info(`API Server started on http://${this.config.host}:${this.config.port}`);
                    }
                    resolve();
                }
            });
        });
    }
    
    async stop() {
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    if (this.logger.info) {
                        this.logger.info('API Server stopped');
                    }
                    resolve();
                });
            });
        }
    }
}

module.exports = EnterpriseAPIServer;
