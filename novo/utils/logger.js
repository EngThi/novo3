/**
 * Structured Logger - Enterprise Logging System
 * Features:
 * - Winston-based structured logging
 * - Different log levels per environment
 * - Correlation IDs for request tracking
 * - Log rotation and file management
 * - Performance monitoring integration
 * - Error reporting with stack traces
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

class Logger {
    constructor(config = {}) {
        this.config = {
            level: config.level || process.env.LOG_LEVEL || 'info',
            environment: config.environment || process.env.NODE_ENV || 'development',
            logDir: config.logDir || path.join(process.cwd(), 'logs'),
            enableConsole: config.enableConsole !== false,
            enableFile: config.enableFile !== false,
            maxFiles: config.maxFiles || 7,
            maxSize: config.maxSize || '10m',
            ...config
        };
        
        this.correlationId = null;
        this.logger = null;
        
        this.setupLogger();
    }
    
    setupLogger() {
        // Ensure log directory exists
        if (this.config.enableFile && !fs.existsSync(this.config.logDir)) {
            fs.mkdirSync(this.config.logDir, { recursive: true });
        }
        
        const formats = [];
        
        // Add timestamp
        formats.push(winston.format.timestamp());
        
        // Add correlation ID if available
        formats.push(winston.format((info) => {
            if (this.correlationId) {
                info.correlationId = this.correlationId;
            }
            return info;
        })());
        
        // Environment-specific formatting
        if (this.config.environment === 'development') {
            formats.push(
                winston.format.colorize(),
                winston.format.simple()
            );
        } else {
            formats.push(winston.format.json());
        }
        
        const transports = [];
        
        // Console transport
        if (this.config.enableConsole) {
            transports.push(new winston.transports.Console({
                level: this.config.level,
                format: winston.format.combine(...formats)
            }));
        }
        
        // File transports
        if (this.config.enableFile) {
            // Error logs
            transports.push(new winston.transports.File({
                level: 'error',
                filename: path.join(this.config.logDir, 'error.log'),
                maxFiles: this.config.maxFiles,
                maxsize: this.config.maxSize,
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.json()
                )
            }));
            
            // Combined logs
            transports.push(new winston.transports.File({
                filename: path.join(this.config.logDir, 'combined.log'),
                maxFiles: this.config.maxFiles,
                maxsize: this.config.maxSize,
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.json()
                )
            }));
        }
        
        this.logger = winston.createLogger({
            level: this.config.level,
            transports
        });
    }
    
    setCorrelationId(id) {
        this.correlationId = id;
    }
    
    clearCorrelationId() {
        this.correlationId = null;
    }
    
    // Logging methods
    debug(message, meta = {}) {
        this.logger.debug(message, this.formatMeta(meta));
    }
    
    info(message, meta = {}) {
        this.logger.info(message, this.formatMeta(meta));
    }
    
    warn(message, meta = {}) {
        this.logger.warn(message, this.formatMeta(meta));
    }
    
    error(message, error = null, meta = {}) {
        const errorMeta = { ...this.formatMeta(meta) };
        
        if (error) {
            errorMeta.error = {
                message: error.message,
                stack: error.stack,
                name: error.name
            };
        }
        
        this.logger.error(message, errorMeta);
    }
    
    // Performance logging
    performance(operation, duration, meta = {}) {
        this.logger.info(`Performance: ${operation}`, {
            ...this.formatMeta(meta),
            operation,
            duration,
            type: 'performance'
        });
    }
    
    // HTTP request logging
    httpRequest(req, res, duration) {
        this.logger.info('HTTP Request', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            correlationId: req.id || this.correlationId,
            type: 'http_request'
        });
    }
    
    // Job logging
    jobStart(jobId, type, data = {}) {
        this.logger.info('Job started', {
            jobId,
            type,
            data,
            event: 'job_start'
        });
    }
    
    jobComplete(jobId, duration, result = {}) {
        this.logger.info('Job completed', {
            jobId,
            duration,
            result,
            event: 'job_complete'
        });
    }
    
    jobError(jobId, error, attempt = 1) {
        this.logger.error('Job failed', {
            jobId,
            error: {
                message: error.message,
                stack: error.stack
            },
            attempt,
            event: 'job_error'
        });
    }
    
    // Utility methods
    formatMeta(meta) {
        return {
            ...meta,
            timestamp: new Date().toISOString(),
            pid: process.pid,
            memory: this.getMemoryUsage()
        };
    }
    
    getMemoryUsage() {
        const usage = process.memoryUsage();
        return {
            rss: Math.round(usage.rss / 1024 / 1024),
            heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(usage.heapTotal / 1024 / 1024)
        };
    }
    
    // Create child logger with additional context
    child(context) {
        const childLogger = Object.create(this);
        childLogger.defaultMeta = { ...this.defaultMeta, ...context };
        return childLogger;
    }
}

module.exports = Logger;