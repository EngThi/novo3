/**
 * Enterprise Structured Logger - Ultra-Advanced Logging System
 * Features:
 * - Winston-based structured logging with multiple transports
 * - Correlation IDs for distributed tracing  
 * - Performance monitoring and metrics integration
 * - Different log levels per environment
 * - HTTP request tracking with detailed metadata
 * - Error reporting with stack traces and context
 * - Log rotation and archiving
 * - Structured JSON output for log aggregation
 * - Business event tracking
 * - Security event logging
 * - Real-time performance metrics
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

/**
 * Custom log format for enterprise environments
 */
const enterpriseFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf((info) => {
        const { timestamp, level, message, ...meta } = info;
        
        const logEntry = {
            '@timestamp': timestamp,
            level: level.toUpperCase(),
            message,
            service: 'video-pipeline',
            environment: process.env.NODE_ENV || 'development',
            version: process.env.SERVICE_VERSION || '2.0.0',
            ...meta
        };
        
        return JSON.stringify(logEntry);
    })
);

/**
 * Console format for development with colors
 */
const consoleFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'HH:mm:ss'
    }),
    winston.format.colorize({ all: true }),
    winston.format.printf((info) => {
        const { timestamp, level, message, correlationId, operation, duration, ...meta } = info;
        
        let output = `${timestamp} ${level} `;
        
        // Add correlation ID if present
        if (correlationId) {
            output += `[${correlationId.substring(0, 8)}] `;
        }
        
        // Add operation and duration for performance logs
        if (operation && duration) {
            output += `[${operation}:${duration}ms] `;
        }
        
        output += message;
        
        // Add metadata if present
        const metaKeys = Object.keys(meta);
        if (metaKeys.length > 0) {
            const filteredMeta = {};
            metaKeys.forEach(key => {
                if (!['timestamp', 'pid', 'memory', 'type'].includes(key)) {
                    filteredMeta[key] = meta[key];
                }
            });
            
            if (Object.keys(filteredMeta).length > 0) {
                output += ` ${JSON.stringify(filteredMeta)}`;
            }
        }
        
        return output;
    })
);

/**
 * Enterprise Logger Class with Advanced Features
 */
class EnterpriseLogger {
    constructor(config = {}) {
        this.config = {
            level: config.level || process.env.LOG_LEVEL || this.getDefaultLevel(),
            environment: config.environment || process.env.NODE_ENV || 'development',
            logDir: config.logDir || path.join(process.cwd(), 'logs'),
            enableConsole: config.enableConsole !== false,
            enableFile: config.enableFile !== false,
            enableRemote: config.enableRemote || false,
            maxFiles: config.maxFiles || 14, // 2 weeks
            maxSize: config.maxSize || '50m',
            serviceName: config.serviceName || 'video-pipeline-ai',
            remoteEndpoint: config.remoteEndpoint,
            enableMetrics: config.enableMetrics !== false,
            enableHealthCheck: config.enableHealthCheck !== false,
            ...config
        };
        
        // Instance state
        this.correlationId = null;
        this.contextData = {};
        this.performanceMetrics = new Map();
        this.requestMetrics = new Map();
        this.errorMetrics = new Map();
        this.healthStatus = { status: 'initializing', lastCheck: Date.now() };
        
        // Initialize logger
        this.initializeAsync();
    }
    
    async initializeAsync() {
        await this.setupLogger();
        this.setupPerformanceTracking();
        this.setupHealthChecks();
        
        this.healthStatus = { status: 'healthy', lastCheck: Date.now() };
        this.info('Enterprise Logger initialized', {
            level: this.config.level,
            environment: this.config.environment,
            features: {
                console: this.config.enableConsole,
                file: this.config.enableFile,
                remote: this.config.enableRemote,
                metrics: this.config.enableMetrics
            }
        });
    }
    
    /**
     * Setup Winston logger with multiple transports
     */
    async setupLogger() {
        const transports = [];
        
        // Console transport for development
        if (this.config.enableConsole) {
            transports.push(new winston.transports.Console({
                format: this.config.environment === 'development' ? consoleFormat : enterpriseFormat,
                level: this.config.level,
                handleExceptions: true,
                handleRejections: true
            }));
        }
        
        // File transports for production
        if (this.config.enableFile) {
            await this.ensureLogDirectory();
            
            // Combined logs
            transports.push(new winston.transports.File({
                filename: path.join(this.config.logDir, 'combined.log'),
                format: enterpriseFormat,
                level: this.config.level,
                maxsize: this.parseSize(this.config.maxSize),
                maxFiles: this.config.maxFiles,
                tailable: true,
                handleExceptions: false
            }));
            
            // Error logs (separate file)
            transports.push(new winston.transports.File({
                filename: path.join(this.config.logDir, 'error.log'),
                format: enterpriseFormat,
                level: 'error',
                maxsize: this.parseSize(this.config.maxSize),
                maxFiles: this.config.maxFiles,
                tailable: true,
                handleExceptions: false
            }));
            
            // Performance logs
            transports.push(new winston.transports.File({
                filename: path.join(this.config.logDir, 'performance.log'),
                format: enterpriseFormat,
                level: 'info',
                maxsize: this.parseSize(this.config.maxSize),
                maxFiles: this.config.maxFiles,
                tailable: true,
                filter: (info) => info.type === 'performance'
            }));
            
            // HTTP access logs
            transports.push(new winston.transports.File({
                filename: path.join(this.config.logDir, 'access.log'),
                format: enterpriseFormat,
                level: 'info',
                maxsize: this.parseSize(this.config.maxSize),
                maxFiles: this.config.maxFiles,
                tailable: true,
                filter: (info) => info.type === 'http_request'
            }));
            
            // Business event logs
            transports.push(new winston.transports.File({
                filename: path.join(this.config.logDir, 'business-events.log'),
                format: enterpriseFormat,
                level: 'info',
                maxsize: this.parseSize(this.config.maxSize),
                maxFiles: this.config.maxFiles,
                tailable: true,
                filter: (info) => info.type === 'business_event'
            }));
            
            // Security event logs
            transports.push(new winston.transports.File({
                filename: path.join(this.config.logDir, 'security.log'),
                format: enterpriseFormat,
                level: 'warn',
                maxsize: this.parseSize(this.config.maxSize),
                maxFiles: this.config.maxFiles,
                tailable: true,
                filter: (info) => info.type === 'security_event'
            }));
        }
        
        // Create Winston logger
        this.logger = winston.createLogger({
            level: this.config.level,
            format: enterpriseFormat,
            defaultMeta: {
                service: this.config.serviceName,
                environment: this.config.environment,
                version: process.env.SERVICE_VERSION || '2.0.0',
                hostname: require('os').hostname(),
                pid: process.pid
            },
            transports,
            exitOnError: false
        });
        
        // Handle uncaught exceptions
        if (this.config.enableFile) {
            this.logger.exceptions.handle(
                new winston.transports.File({ 
                    filename: path.join(this.config.logDir, 'exceptions.log'),
                    format: enterpriseFormat,
                    maxsize: this.parseSize(this.config.maxSize),
                    maxFiles: 5
                })
            );
            
            // Handle unhandled promise rejections
            this.logger.rejections.handle(
                new winston.transports.File({ 
                    filename: path.join(this.config.logDir, 'rejections.log'),
                    format: enterpriseFormat,
                    maxsize: this.parseSize(this.config.maxSize),
                    maxFiles: 5
                })
            );
        }
    }
    
    /**
     * Setup performance and metrics tracking
     */
    setupPerformanceTracking() {
        if (!this.config.enableMetrics) return;
        
        // System metrics collection every 30 seconds
        setInterval(() => {
            this.logSystemMetrics();
        }, 30000);
        
        // Performance metrics summary every 5 minutes
        setInterval(() => {
            this.logPerformanceSummary();
        }, 300000);
    }
    
    /**
     * Setup health check monitoring
     */
    setupHealthChecks() {
        if (!this.config.enableHealthCheck) return;
        
        setInterval(async () => {
            try {
                await this.performHealthCheck();
            } catch (error) {
                this.error('Health check failed', error);
                this.healthStatus = { status: 'unhealthy', lastCheck: Date.now(), error: error.message };
            }
        }, 60000); // Every minute
    }
    
    // ======== CONTEXT MANAGEMENT ========
    
    setCorrelationId(id) {
        this.correlationId = id || uuidv4();
        return this.correlationId;
    }
    
    clearCorrelationId() {
        this.correlationId = null;
        this.contextData = {};
    }
    
    setContext(key, value) {
        if (typeof key === 'object') {
            this.contextData = { ...this.contextData, ...key };
        } else {
            this.contextData[key] = value;
        }
    }
    
    child(context = {}) {
        const childLogger = Object.create(this);
        childLogger.contextData = { ...this.contextData, ...context };
        childLogger.correlationId = this.correlationId;
        return childLogger;
    }
    
    // ======== CORE LOGGING METHODS ========
    
    debug(message, meta = {}) {
        this._log('debug', message, meta);
    }
    
    info(message, meta = {}) {
        this._log('info', message, meta);
    }
    
    warn(message, meta = {}) {
        this._log('warn', message, meta);
    }
    
    error(message, error = null, meta = {}) {
        const errorMeta = { ...this.formatMeta(meta) };
        
        if (error) {
            if (error instanceof Error) {
                errorMeta.error = {
                    message: error.message,
                    stack: error.stack,
                    name: error.name,
                    code: error.code,
                    statusCode: error.statusCode
                };
                
                // Track error metrics
                this.trackErrorMetric(error.name || 'UnknownError');
            } else if (typeof error === 'object') {
                errorMeta.error = error;
            } else {
                errorMeta.errorDetails = String(error);
            }
        }
        
        this._log('error', message, errorMeta);
    }
    
    fatal(message, error = null, meta = {}) {
        this.error(`FATAL: ${message}`, error, { ...meta, fatal: true });
        
        // Give time for logs to flush before exiting
        setTimeout(() => {
            process.exit(1);
        }, 1000);
    }
    
    // ======== SPECIALIZED LOGGING METHODS ========
    
    performance(operation, startTime, meta = {}) {
        const duration = Date.now() - startTime;
        
        this._log('info', `Performance: ${operation}`, {
            ...this.formatMeta(meta),
            operation,
            duration,
            durationType: 'milliseconds',
            type: 'performance',
            category: meta.category || 'general'
        });
        
        this.trackPerformanceMetric(operation, duration, meta.category);
        return duration;
    }
    
    httpRequest(req, res, startTime) {
        const duration = Date.now() - startTime;
        const contentLength = res.get('Content-Length') || 0;
        
        // Extract meaningful request data
        const logData = {
            ...this.formatMeta(),
            method: req.method,
            url: req.originalUrl || req.url,
            path: req.path,
            query: Object.keys(req.query || {}).length > 0 ? req.query : undefined,
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            duration,
            contentLength: parseInt(contentLength) || 0,
            userAgent: req.get('User-Agent'),
            ip: req.ip || req.connection?.remoteAddress,
            correlationId: req.id || req.correlationId || this.correlationId,
            type: 'http_request',
            httpVersion: req.httpVersion,
            referrer: req.get('Referrer'),
            responseSize: parseInt(contentLength) || 0
        };
        
        // Add API version if available
        if (req.apiVersion) {
            logData.apiVersion = req.apiVersion;
        }
        
        this._log('info', 'HTTP Request', logData);
        
        // Track HTTP metrics
        this.trackRequestMetric(req.method, res.statusCode, duration);
        
        return duration;
    }
    
    // Job/Task logging with enhanced tracking
    jobStart(jobId, type, data = {}) {
        this._log('info', 'Job started', {
            ...this.formatMeta(),
            jobId,
            jobType: type,
            jobData: this.sanitizeJobData(data),
            event: 'job_start',
            timestamp: new Date().toISOString()
        });
    }
    
    jobProgress(jobId, progress, message = '', meta = {}) {
        this._log('info', 'Job progress', {
            ...this.formatMeta(meta),
            jobId,
            progress,
            progressMessage: message,
            event: 'job_progress'
        });
    }
    
    jobComplete(jobId, startTime, result = {}) {
        const duration = Date.now() - startTime;
        
        this._log('info', 'Job completed', {
            ...this.formatMeta(),
            jobId,
            duration,
            result: this.sanitizeJobData(result),
            event: 'job_complete',
            success: true
        });
        
        this.trackJobMetric('completed', duration);
        return duration;
    }
    
    jobError(jobId, error, attempt = 1, maxAttempts = 3) {
        this._log('error', 'Job failed', {
            ...this.formatMeta(),
            jobId,
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name,
                code: error.code
            },
            attempt,
            maxAttempts,
            willRetry: attempt < maxAttempts,
            event: 'job_error',
            success: false
        });
        
        this.trackJobMetric('failed');
    }
    
    businessEvent(event, data = {}, severity = 'info') {
        this._log(severity, `Business Event: ${event}`, {
            ...this.formatMeta(),
            businessEvent: event,
            eventData: this.sanitizeJobData(data),
            type: 'business_event',
            severity
        });
    }
    
    securityEvent(event, severity = 'medium', data = {}) {
        this._log('warn', `Security Event: ${event}`, {
            ...this.formatMeta(),
            securityEvent: event,
            severity,
            eventData: this.sanitizeJobData(data),
            type: 'security_event',
            requiresAttention: severity === 'high' || severity === 'critical'
        });
    }
    
    cacheOperation(operation, key, hit = null, duration = 0, meta = {}) {
        this._log('debug', 'Cache Operation', {
            ...this.formatMeta(meta),
            operation,
            key: typeof key === 'string' ? key.substring(0, 100) : 'complex_key',
            hit,
            duration,
            type: 'cache_operation'
        });
    }
    
    // ======== METRICS TRACKING ========
    
    trackPerformanceMetric(operation, duration, category = 'general') {
        const key = `${category}:${operation}`;
        
        if (!this.performanceMetrics.has(key)) {
            this.performanceMetrics.set(key, {
                operation,
                category,
                count: 0,
                totalTime: 0,
                minTime: Infinity,
                maxTime: 0,
                avgTime: 0,
                lastUpdate: Date.now()
            });
        }
        
        const metric = this.performanceMetrics.get(key);
        metric.count++;
        metric.totalTime += duration;
        metric.minTime = Math.min(metric.minTime, duration);
        metric.maxTime = Math.max(metric.maxTime, duration);
        metric.avgTime = metric.totalTime / metric.count;
        metric.lastUpdate = Date.now();
    }
    
    trackRequestMetric(method, statusCode, duration) {
        const key = `${method}:${Math.floor(statusCode / 100)}xx`;
        
        if (!this.requestMetrics.has(key)) {
            this.requestMetrics.set(key, {
                method,
                statusClass: Math.floor(statusCode / 100),
                count: 0,
                totalTime: 0,
                avgTime: 0
            });
        }
        
        const metric = this.requestMetrics.get(key);
        metric.count++;
        metric.totalTime += duration;
        metric.avgTime = metric.totalTime / metric.count;
    }
    
    trackErrorMetric(errorType) {
        const count = this.errorMetrics.get(errorType) || 0;
        this.errorMetrics.set(errorType, count + 1);
    }
    
    trackJobMetric(status, duration = 0) {
        const key = `job:${status}`;
        
        if (!this.performanceMetrics.has(key)) {
            this.performanceMetrics.set(key, {
                operation: 'job',
                category: status,
                count: 0,
                totalTime: 0,
                avgTime: 0
            });
        }
        
        const metric = this.performanceMetrics.get(key);
        metric.count++;
        if (duration > 0) {
            metric.totalTime += duration;
            metric.avgTime = metric.totalTime / metric.count;
        }
    }
    
    // ======== SYSTEM MONITORING ========
    
    logSystemMetrics() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        this._log('debug', 'System Metrics', {
            ...this.formatMeta(),
            metrics: {
                memory: {
                    rss: Math.round(memUsage.rss / 1024 / 1024), // MB
                    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                    external: Math.round(memUsage.external / 1024 / 1024)
                },
                cpu: {
                    user: Math.round(cpuUsage.user / 1000), // ms
                    system: Math.round(cpuUsage.system / 1000)
                },
                uptime: Math.round(process.uptime()),
                pid: process.pid,
                nodeVersion: process.version
            },
            type: 'system_metrics'
        });
    }
    
    logPerformanceSummary() {
        const summary = {
            performanceOperations: this.performanceMetrics.size,
            requestPatterns: this.requestMetrics.size,
            errorTypes: this.errorMetrics.size,
            topOperations: this.getTopPerformanceMetrics(5),
            errorSummary: Object.fromEntries(this.errorMetrics)
        };
        
        this._log('info', 'Performance Summary', {
            ...this.formatMeta(),
            summary,
            type: 'performance_summary'
        });
    }
    
    getTopPerformanceMetrics(limit = 5) {
        return Array.from(this.performanceMetrics.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, limit)
            .map(metric => ({
                operation: metric.operation,
                category: metric.category,
                count: metric.count,
                avgTime: Math.round(metric.avgTime * 100) / 100
            }));
    }
    
    // ======== UTILITY METHODS ========
    
    _log(level, message, meta = {}) {
        if (this.logger) {
            this.logger.log(level, message, this.formatMeta(meta));
        } else {
            // Fallback logging before Winston is initialized
            const fallbackLog = {
                level: level.toUpperCase(),
                message,
                timestamp: new Date().toISOString(),
                ...this.formatMeta(meta)
            };
            console.log(JSON.stringify(fallbackLog));
        }
    }
    
    formatMeta(meta = {}) {
        return {
            ...this.contextData,
            ...meta,
            correlationId: this.correlationId,
            memory: this.getMemoryUsage(),
            processId: process.pid
        };
    }
    
    getMemoryUsage() {
        const usage = process.memoryUsage();
        return {
            rss: Math.round(usage.rss / 1024 / 1024), // MB
            heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
            external: Math.round(usage.external / 1024 / 1024)
        };
    }
    
    sanitizeJobData(data) {
        // Remove sensitive information and large objects from job data
        if (typeof data !== 'object' || data === null) return data;
        
        const sanitized = { ...data };
        
        // Remove common sensitive fields
        ['password', 'secret', 'key', 'token', 'apiKey'].forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        });
        
        // Limit string length to prevent log bloat
        Object.keys(sanitized).forEach(key => {
            if (typeof sanitized[key] === 'string' && sanitized[key].length > 1000) {
                sanitized[key] = sanitized[key].substring(0, 1000) + '... [TRUNCATED]';
            }
        });
        
        return sanitized;
    }
    
    getDefaultLevel() {
        const env = process.env.NODE_ENV || 'development';
        const levels = {
            production: 'info',
            staging: 'debug',
            development: 'debug',
            test: 'error'
        };
        return levels[env] || 'info';
    }
    
    parseSize(sizeStr) {
        const units = { b: 1, k: 1024, m: 1024 * 1024, g: 1024 * 1024 * 1024 };
        const match = sizeStr.toLowerCase().match(/^(\d+)([kmg]?)b?$/);
        if (!match) return 50 * 1024 * 1024; // Default 50MB
        const [, size, unit] = match;
        return parseInt(size) * (units[unit] || 1);
    }
    
    async ensureLogDirectory() {
        try {
            await fs.access(this.config.logDir);
        } catch {
            await fs.mkdir(this.config.logDir, { recursive: true });
        }
    }
    
    // ======== EXPRESS INTEGRATION ========
    
    requestMiddleware() {
        return (req, res, next) => {
            const startTime = Date.now();
            const correlationId = req.headers['x-correlation-id'] || 
                                req.headers['x-request-id'] || 
                                uuidv4();
            
            // Set correlation ID for this request
            const childLogger = this.child({ correlationId });
            req.logger = childLogger;
            req.correlationId = correlationId;
            req.startTime = startTime;
            
            // Log request start
            childLogger.debug('Request started', {
                method: req.method,
                url: req.originalUrl || req.url,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                type: 'request_start'
            });
            
            // Log response when finished
            res.on('finish', () => {
                childLogger.httpRequest(req, res, startTime);
            });
            
            next();
        };
    }
    
    timer(operation, category = 'general') {
        const startTime = Date.now();
        
        return {
            end: (meta = {}) => {
                return this.performance(operation, startTime, { ...meta, category });
            },
            
            lap: (lapName) => {
                const lapTime = Date.now() - startTime;
                this.debug(`Timer lap: ${operation}:${lapName}`, {
                    operation,
                    lapName,
                    lapTime,
                    type: 'timer_lap'
                });
                return lapTime;
            }
        };
    }
    
    // ======== HEALTH CHECK ========
    
    async performHealthCheck() {
        // Test basic logging functionality
        this.debug('Health check ping');
        
        // Check log directory if file logging is enabled
        if (this.config.enableFile) {
            await fs.access(this.config.logDir);
        }
        
        this.healthStatus = {
            status: 'healthy',
            lastCheck: Date.now(),
            config: {
                level: this.config.level,
                environment: this.config.environment,
                features: {
                    console: this.config.enableConsole,
                    file: this.config.enableFile,
                    metrics: this.config.enableMetrics
                }
            },
            metrics: {
                performanceOperations: this.performanceMetrics.size,
                requestPatterns: this.requestMetrics.size,
                errorTypes: this.errorMetrics.size
            }
        };
        
        return this.healthStatus;
    }
    
    async healthCheck() {
        try {
            return await this.performHealthCheck();
        } catch (error) {
            return {
                status: 'unhealthy',
                service: 'EnterpriseLogger',
                error: error.message,
                lastCheck: Date.now()
            };
        }
    }
    
    // ======== METRICS EXPORT ========
    
    getMetrics() {
        return {
            performance: Object.fromEntries(this.performanceMetrics),
            requests: Object.fromEntries(this.requestMetrics),
            errors: Object.fromEntries(this.errorMetrics),
            system: {
                uptime: process.uptime(),
                memory: this.getMemoryUsage(),
                pid: process.pid
            },
            health: this.healthStatus
        };
    }
    
    // ======== CLEANUP ========
    
    async cleanup() {
        this.info('Shutting down Enterprise Logger');
        
        if (this.logger) {
            // Close all transports gracefully
            this.logger.close();
        }
        
        // Clear metrics
        this.performanceMetrics.clear();
        this.requestMetrics.clear();
        this.errorMetrics.clear();
        
        this.clearCorrelationId();
    }
}

// ======== FACTORY FUNCTIONS ========

function createLogger(config = {}) {
    return new EnterpriseLogger(config);
}

function createProductionLogger(serviceName = 'video-pipeline') {
    return new EnterpriseLogger({
        level: 'info',
        environment: 'production',
        serviceName,
        enableConsole: false,
        enableFile: true,
        enableRemote: true,
        maxFiles: 30,
        maxSize: '100m',
        enableMetrics: true,
        enableHealthCheck: true
    });
}

function createDevelopmentLogger(serviceName = 'video-pipeline-dev') {
    return new EnterpriseLogger({
        level: 'debug',
        environment: 'development',
        serviceName,
        enableConsole: true,
        enableFile: true,
        enableRemote: false,
        maxFiles: 5,
        maxSize: '10m',
        enableMetrics: true,
        enableHealthCheck: false
    });
}

// Default export for backward compatibility
const Logger = EnterpriseLogger;

module.exports = {
    Logger,
    EnterpriseLogger,
    createLogger,
    createProductionLogger,
    createDevelopmentLogger
};