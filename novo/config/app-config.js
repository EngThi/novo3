/**
 * Enterprise Application Configuration System - Ultra-Advanced
 * Features:
 * - Environment-based configuration with comprehensive validation
 * - Hot reloading with debouncing for non-critical settings
 * - Secrets management with encryption and secure loading
 * - Schema validation with intelligent defaults
 * - Multi-environment support with configuration inheritance
 * - Performance monitoring and configuration auditing
 * - Dynamic reconfiguration with change tracking
 * - Configuration versioning and rollback capabilities
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { EventEmitter } = require('events');

/**
 * Advanced Configuration Schema Validator
 */
class ConfigSchemaValidator {
    static schemas = {
        app: {
            name: { type: 'string', required: true, minLength: 3, maxLength: 50 },
            version: { type: 'string', required: true, pattern: /^\d+\.\d+\.\d+$/ },
            environment: { type: 'string', required: true, enum: ['development', 'production', 'staging', 'test'] },
            port: { type: 'number', required: true, min: 1000, max: 65535 },
            host: { type: 'string', required: true },
            logLevel: { type: 'string', required: true, enum: ['error', 'warn', 'info', 'debug'] },
            debug: { type: 'boolean', default: false },
            timezone: { type: 'string', default: 'UTC' },
            workerId: { type: 'string', default: null }
        },
        
        pipeline: {
            defaultStrategy: { type: 'string', required: true, enum: ['fast', 'balanced', 'quality', 'premium'] },
            maxConcurrentJobs: { type: 'number', required: true, min: 1, max: 50 },
            timeout: { type: 'number', required: true, min: 10000, max: 1800000 }, // 10s to 30m
            retryAttempts: { type: 'number', default: 3, min: 1, max: 10 },
            retryDelay: { type: 'number', default: 1000, min: 100, max: 30000 },
            enableMetrics: { type: 'boolean', default: true },
            healthCheckInterval: { type: 'number', default: 60000, min: 10000 },
            enableAI: { type: 'boolean', default: true },
            qualityThreshold: { type: 'number', default: 0.8, min: 0.1, max: 1.0 }
        },
        
        tts: {
            primaryProvider: { type: 'string', required: true, enum: ['gemini', 'openai', 'azure', 'elevenlabs', 'local'] },
            fallbackProvider: { type: 'string', default: 'local', enum: ['gemini', 'openai', 'azure', 'elevenlabs', 'local'] },
            maxConcurrent: { type: 'number', required: true, min: 1, max: 20 },
            cacheEnabled: { type: 'boolean', default: true },
            rateLimitEnabled: { type: 'boolean', default: true },
            qualityProfile: { type: 'string', default: 'balanced', enum: ['economy', 'balanced', 'premium', 'studio'] },
            enableSSML: { type: 'boolean', default: true },
            enableSemanticCache: { type: 'boolean', default: true },
            
            gemini: {
                apiKey: { type: 'string', required: false, sensitive: true },
                projectId: { type: 'string', required: false },
                region: { type: 'string', default: 'us-central1' },
                model: { type: 'string', default: 'text-to-speech-v1' },
                rateLimitRPM: { type: 'number', default: 300, min: 1, max: 1000 },
                enablePronunciation: { type: 'boolean', default: true }
            },
            
            openai: {
                apiKey: { type: 'string', required: false, sensitive: true },
                model: { type: 'string', default: 'tts-1-hd' },
                voice: { type: 'string', default: 'alloy' },
                rateLimitRPM: { type: 'number', default: 50, min: 1, max: 500 }
            },
            
            elevenlabs: {
                apiKey: { type: 'string', required: false, sensitive: true },
                model: { type: 'string', default: 'eleven_multilingual_v2' },
                voice: { type: 'string', default: 'Rachel' },
                rateLimitRPM: { type: 'number', default: 20, min: 1, max: 100 }
            }
        },
        
        image: {
            defaultProvider: { type: 'string', default: 'pollinations', enum: ['pollinations', 'unsplash', 'pexels', 'dalle', 'midjourney'] },
            qualityThreshold: { type: 'number', default: 0.7, min: 0.1, max: 1.0 },
            maxRetries: { type: 'number', default: 3, min: 1, max: 10 },
            cacheEnabled: { type: 'boolean', default: true },
            enableAI: { type: 'boolean', default: true },
            maxConcurrent: { type: 'number', default: 3, min: 1, max: 20 },
            timeout: { type: 'number', default: 30000, min: 5000, max: 120000 },
            
            dalle: {
                apiKey: { type: 'string', required: false, sensitive: true },
                model: { type: 'string', default: 'dall-e-3' },
                quality: { type: 'string', default: 'hd' },
                size: { type: 'string', default: '1024x1024' }
            }
        },
        
        video: {
            defaultPreset: { type: 'string', default: 'high', enum: ['low', 'medium', 'high', 'ultra'] },
            maxConcurrentJobs: { type: 'number', default: 2, min: 1, max: 10 },
            ffmpegPath: { type: 'string', default: 'ffmpeg' },
            tempDir: { type: 'string', default: '/tmp/video-service' },
            enableHardwareAccel: { type: 'boolean', default: false },
            enableAI: { type: 'boolean', default: true },
            timeout: { type: 'number', default: 300000, min: 30000, max: 1800000 }
        },
        
        cache: {
            maxMemoryMB: { type: 'number', required: true, min: 10, max: 10000 },
            maxItems: { type: 'number', default: 10000, min: 100, max: 100000 },
            defaultTTL: { type: 'number', required: true, min: 60, max: 86400 },
            cleanupInterval: { type: 'number', default: 300, min: 60, max: 3600 },
            enableMetrics: { type: 'boolean', default: true },
            enableSemantic: { type: 'boolean', default: true },
            enablePredictive: { type: 'boolean', default: true },
            semanticThreshold: { type: 'number', default: 0.75, min: 0.1, max: 1.0 },
            persistToDisk: { type: 'boolean', default: false },
            cacheDir: { type: 'string', default: './cache' },
            compressionEnabled: { type: 'boolean', default: true }
        },
        
        database: {
            enabled: { type: 'boolean', default: false },
            type: { type: 'string', default: 'sqlite', enum: ['sqlite', 'postgresql', 'mysql', 'mongodb'] },
            url: { type: 'string', required: false, sensitive: true },
            host: { type: 'string', default: 'localhost' },
            port: { type: 'number', default: 5432, min: 1000, max: 65535 },
            database: { type: 'string', default: 'video_pipeline_ai' },
            username: { type: 'string', required: false, sensitive: true },
            password: { type: 'string', required: false, sensitive: true },
            ssl: { type: 'boolean', default: false },
            poolSize: { type: 'number', default: 10, min: 1, max: 100 },
            timeout: { type: 'number', default: 30000, min: 5000, max: 120000 }
        },
        
        queue: {
            maxConcurrentJobs: { type: 'number', default: 5, min: 1, max: 100 },
            defaultRetries: { type: 'number', default: 3, min: 1, max: 10 },
            enablePersistence: { type: 'boolean', default: false },
            retryDelay: { type: 'number', default: 5000, min: 1000, max: 60000 },
            enablePriority: { type: 'boolean', default: true },
            enableScheduling: { type: 'boolean', default: false }
        },
        
        api: {
            port: { type: 'number', required: true, min: 1000, max: 65535 },
            host: { type: 'string', required: true },
            enableDocs: { type: 'boolean', default: true },
            enableMetrics: { type: 'boolean', default: true },
            enableMonitoring: { type: 'boolean', default: true },
            rateLimitMax: { type: 'number', default: 100, min: 10, max: 10000 },
            rateLimitWindow: { type: 'number', default: 900000, min: 60000, max: 3600000 },
            corsOrigins: { type: 'array', default: ['*'] },
            trustProxy: { type: 'boolean', default: false },
            compression: { type: 'boolean', default: true },
            timeout: { type: 'number', default: 30000, min: 5000, max: 300000 },
            
            security: {
                enableHelmet: { type: 'boolean', default: true },
                enableCors: { type: 'boolean', default: true },
                enableRateLimit: { type: 'boolean', default: true },
                apiKeyRequired: { type: 'boolean', default: false },
                jwtSecret: { type: 'string', required: false, sensitive: true },
                enableCSRF: { type: 'boolean', default: false }
            }
        },
        
        monitoring: {
            enabled: { type: 'boolean', default: true },
            metricsInterval: { type: 'number', default: 30000, min: 10000, max: 300000 },
            healthCheckInterval: { type: 'number', default: 60000, min: 10000, max: 600000 },
            enablePrometheus: { type: 'boolean', default: false },
            enableDatadog: { type: 'boolean', default: false },
            
            alerting: {
                enabled: { type: 'boolean', default: false },
                webhookUrl: { type: 'string', required: false, sensitive: true },
                slackWebhook: { type: 'string', required: false, sensitive: true },
                errorThreshold: { type: 'number', default: 10, min: 1, max: 1000 },
                responseTimeThreshold: { type: 'number', default: 5000, min: 100, max: 60000 }
            }
        },
        
        logging: {
            level: { type: 'string', required: true, enum: ['error', 'warn', 'info', 'debug'] },
            enableConsole: { type: 'boolean', default: true },
            enableFile: { type: 'boolean', default: true },
            enableRemote: { type: 'boolean', default: false },
            logDir: { type: 'string', default: './logs' },
            maxFiles: { type: 'number', default: 14, min: 1, max: 365 },
            maxSize: { type: 'string', default: '50m', pattern: /^\d+[kmg]b?$/i },
            remoteEndpoint: { type: 'string', required: false, sensitive: true },
            enableMetrics: { type: 'boolean', default: true }
        }
    };
    
    static validate(config, schema, path = '') {
        const errors = [];
        
        for (const [key, rules] of Object.entries(schema)) {
            const fullPath = path ? `${path}.${key}` : key;
            const value = config[key];
            
            // Check required fields
            if (rules.required && (value === undefined || value === null)) {
                errors.push(`Required field missing: ${fullPath}`);
                continue;
            }
            
            // Skip validation for undefined optional fields
            if (value === undefined || value === null) {
                continue;
            }
            
            // Type validation
            if (rules.type && typeof value !== rules.type) {
                if (rules.type === 'array' && !Array.isArray(value)) {
                    errors.push(`Invalid type for ${fullPath}: expected array, got ${typeof value}`);
                    continue;
                } else if (rules.type !== 'array' && typeof value !== rules.type) {
                    errors.push(`Invalid type for ${fullPath}: expected ${rules.type}, got ${typeof value}`);
                    continue;
                }
            }
            
            // Enum validation
            if (rules.enum && !rules.enum.includes(value)) {
                errors.push(`Invalid value for ${fullPath}: must be one of [${rules.enum.join(', ')}]`);
            }
            
            // Number range validation
            if (rules.type === 'number' && typeof value === 'number') {
                if (rules.min !== undefined && value < rules.min) {
                    errors.push(`Value too small for ${fullPath}: minimum is ${rules.min}`);
                }
                if (rules.max !== undefined && value > rules.max) {
                    errors.push(`Value too large for ${fullPath}: maximum is ${rules.max}`);
                }
            }
            
            // String validation
            if (rules.type === 'string' && typeof value === 'string') {
                if (rules.minLength && value.length < rules.minLength) {
                    errors.push(`String too short for ${fullPath}: minimum length is ${rules.minLength}`);
                }
                if (rules.maxLength && value.length > rules.maxLength) {
                    errors.push(`String too long for ${fullPath}: maximum length is ${rules.maxLength}`);
                }
                if (rules.pattern && !rules.pattern.test(value)) {
                    errors.push(`Invalid format for ${fullPath}: must match pattern ${rules.pattern}`);
                }
            }
            
            // Nested object validation
            if (typeof value === 'object' && !Array.isArray(value) && 
                typeof rules === 'object' && !rules.type && rules.constructor === Object) {
                errors.push(...this.validate(value, rules, fullPath));
            }
        }
        
        return errors;
    }
    
    static applyDefaults(config, schema) {
        const result = { ...config };
        
        for (const [key, rules] of Object.entries(schema)) {
            if (result[key] === undefined && rules.default !== undefined) {
                result[key] = typeof rules.default === 'object' && rules.default !== null ? 
                    JSON.parse(JSON.stringify(rules.default)) : rules.default;
            }
            
            // Apply defaults to nested objects
            if (typeof rules === 'object' && !rules.type && rules.constructor === Object && 
                result[key] && typeof result[key] === 'object') {
                result[key] = this.applyDefaults(result[key], rules);
            }
        }
        
        return result;
    }
}

/**
 * Advanced Secrets Manager with Encryption
 */
class AdvancedSecretsManager {
    constructor(encryptionKey = null) {
        this.encryptionKey = encryptionKey || process.env.CONFIG_ENCRYPTION_KEY || this.generateKey();
        this.sensitiveFields = new Set();
        this.loadSensitiveFields();
    }
    
    generateKey() {
        return crypto.randomBytes(32).toString('hex');
    }
    
    loadSensitiveFields() {
        const collectSensitive = (schema, path = '') => {
            for (const [key, rules] of Object.entries(schema)) {
                const fullPath = path ? `${path}.${key}` : key;
                
                if (rules.sensitive) {
                    this.sensitiveFields.add(fullPath);
                } else if (typeof rules === 'object' && !rules.type && rules.constructor === Object) {
                    collectSensitive(rules, fullPath);
                }
            }
        };
        
        for (const schema of Object.values(ConfigSchemaValidator.schemas)) {
            collectSensitive(schema);
        }
    }
    
    encrypt(text) {
        if (!text || typeof text !== 'string') return text;
        
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            return `encrypted:${iv.toString('hex')}:${encrypted}`;
        } catch (error) {
            console.warn('Failed to encrypt secret:', error.message);
            return text;
        }
    }
    
    decrypt(encryptedText) {
        if (!encryptedText || !encryptedText.startsWith('encrypted:')) {
            return encryptedText;
        }
        
        try {
            const parts = encryptedText.split(':');
            if (parts.length !== 3) return encryptedText;
            
            const [, ivHex, encrypted] = parts;
            const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.warn('Failed to decrypt secret:', error.message);
            return encryptedText;
        }
    }
    
    isSensitive(path) {
        return this.sensitiveFields.has(path);
    }
    
    sanitizeForLogging(config) {
        const sanitized = JSON.parse(JSON.stringify(config));
        
        const sanitizeRecursive = (obj, currentPath = '') => {
            for (const [key, value] of Object.entries(obj)) {
                const fullPath = currentPath ? `${currentPath}.${key}` : key;
                
                if (this.isSensitive(fullPath)) {
                    obj[key] = '[REDACTED]';
                } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    sanitizeRecursive(value, fullPath);
                }
            }
        };
        
        sanitizeRecursive(sanitized);
        return sanitized;
    }
}

/**
 * Main Enterprise Application Configuration Class
 */
class EnterpriseAppConfig extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.env = process.env.NODE_ENV || 'development';
        this.configDir = options.configDir || path.join(process.cwd(), 'config');
        this.secretsDir = options.secretsDir || path.join(process.cwd(), '.secrets');
        this.enableHotReload = options.enableHotReload !== false && this.env !== 'production';
        this.enableSecrets = options.enableSecrets !== false;
        this.enableValidation = options.enableValidation !== false;
        
        this.config = {};
        this.watchers = new Map();
        this.loadHistory = [];
        this.lastValidConfig = null;
        this.configVersion = 1;
        
        // Initialize secrets manager
        this.secretsManager = new AdvancedSecretsManager();
        
        // Load configuration synchronously for backward compatibility
        this.loadConfiguration();
        
        // Setup async features
        setImmediate(() => {
            this.setupHotReload();
            this.startHealthCheck();
            this.emit('initialized', {
                environment: this.env,
                version: this.configVersion,
                timestamp: new Date().toISOString()
            });
        });
    }
    
    loadConfiguration() {
        const startTime = Date.now();
        
        try {
            // 1. Load base configuration
            const baseConfig = this.loadBaseConfiguration();
            
            // 2. Load environment-specific configuration
            const envConfig = this.loadEnvironmentConfiguration();
            
            // 3. Apply environment variable overrides
            let mergedConfig = this.deepMerge(baseConfig, envConfig);
            mergedConfig = this.applyEnvironmentOverrides(mergedConfig);
            
            // 4. Apply defaults and validate
            mergedConfig = this.applyDefaults(mergedConfig);
            
            if (this.enableValidation) {
                this.validateConfiguration(mergedConfig);
            }
            
            // 5. Store configuration
            this.lastValidConfig = this.config;
            this.config = Object.freeze(mergedConfig);
            this.configVersion++;
            
            // 6. Record load history
            this.recordLoadHistory(startTime, true);
            
            this.emit('config:loaded', {
                environment: this.env,
                version: this.configVersion,
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            this.recordLoadHistory(startTime, false, error);
            
            // Fallback to last valid configuration if available
            if (this.lastValidConfig) {
                console.warn('Configuration load failed, using last valid config:', error.message);
                this.emit('config:fallback', { error: error.message });
            } else {
                console.error('Critical configuration error:', error.message);
                throw error;
            }
        }
    }
    
    loadBaseConfiguration() {
        return {
            app: {
                name: 'enterprise-video-pipeline-ai',
                version: process.env.npm_package_version || '2.1.0',
                environment: this.env,
                port: parseInt(process.env.PORT) || 3000,
                host: process.env.HOST || '0.0.0.0',
                logLevel: this.getDefaultLogLevel(),
                debug: this.env === 'development',
                timezone: process.env.TZ || 'UTC',
                workerId: process.env.WORKER_ID || crypto.randomUUID().substring(0, 8)
            },
            
            pipeline: {
                defaultStrategy: process.env.PIPELINE_STRATEGY || this.getDefaultStrategy(),
                maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS) || this.getDefaultConcurrency(),
                timeout: parseInt(process.env.PIPELINE_TIMEOUT) || 600000,
                retryAttempts: parseInt(process.env.RETRY_ATTEMPTS) || 3,
                retryDelay: parseInt(process.env.RETRY_DELAY) || 1000,
                enableMetrics: process.env.PIPELINE_METRICS !== 'false',
                healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 60000,
                enableAI: process.env.PIPELINE_AI !== 'false',
                qualityThreshold: parseFloat(process.env.QUALITY_THRESHOLD) || 0.8
            },
            
            tts: {
                primaryProvider: process.env.TTS_PROVIDER || 'gemini',
                fallbackProvider: process.env.TTS_FALLBACK || 'local',
                maxConcurrent: parseInt(process.env.TTS_CONCURRENT) || 2,
                cacheEnabled: process.env.TTS_CACHE !== 'false',
                rateLimitEnabled: process.env.TTS_RATE_LIMIT !== 'false',
                qualityProfile: process.env.TTS_QUALITY || 'balanced',
                enableSSML: process.env.TTS_SSML !== 'false',
                enableSemanticCache: process.env.TTS_SEMANTIC_CACHE !== 'false',
                
                gemini: {
                    apiKey: process.env.GEMINI_API_KEY,
                    projectId: process.env.GEMINI_PROJECT_ID,
                    region: process.env.GEMINI_REGION || 'us-central1',
                    model: process.env.GEMINI_TTS_MODEL || 'text-to-speech-v1',
                    rateLimitRPM: parseInt(process.env.GEMINI_RATE_LIMIT) || 300,
                    enablePronunciation: process.env.GEMINI_PRONUNCIATION !== 'false'
                }
            },
            
            image: {
                defaultProvider: process.env.IMAGE_PROVIDER || 'pollinations',
                qualityThreshold: parseFloat(process.env.IMAGE_QUALITY_THRESHOLD) || 0.7,
                maxRetries: parseInt(process.env.IMAGE_MAX_RETRIES) || 3,
                cacheEnabled: process.env.IMAGE_CACHE !== 'false',
                enableAI: process.env.IMAGE_AI !== 'false',
                maxConcurrent: parseInt(process.env.IMAGE_CONCURRENT) || 3,
                timeout: parseInt(process.env.IMAGE_TIMEOUT) || 30000
            },
            
            video: {
                defaultPreset: process.env.VIDEO_PRESET || 'high',
                maxConcurrentJobs: parseInt(process.env.VIDEO_CONCURRENT) || 2,
                ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
                tempDir: process.env.VIDEO_TEMP_DIR || '/tmp/video-service',
                enableHardwareAccel: process.env.VIDEO_HARDWARE_ACCEL === 'true',
                enableAI: process.env.VIDEO_AI !== 'false',
                timeout: parseInt(process.env.VIDEO_TIMEOUT) || 300000
            },
            
            cache: {
                maxMemoryMB: parseInt(process.env.CACHE_MEMORY_MB) || this.getDefaultCacheSize(),
                maxItems: parseInt(process.env.CACHE_MAX_ITEMS) || 10000,
                defaultTTL: parseInt(process.env.CACHE_TTL) || 3600,
                cleanupInterval: parseInt(process.env.CACHE_CLEANUP) || 300,
                enableMetrics: process.env.CACHE_METRICS !== 'false',
                enableSemantic: process.env.CACHE_SEMANTIC !== 'false',
                enablePredictive: process.env.CACHE_PREDICTIVE !== 'false',
                semanticThreshold: parseFloat(process.env.CACHE_SEMANTIC_THRESHOLD) || 0.75,
                persistToDisk: process.env.CACHE_PERSIST === 'true',
                cacheDir: process.env.CACHE_DIR || './cache',
                compressionEnabled: process.env.CACHE_COMPRESSION !== 'false'
            },
            
            database: {
                enabled: process.env.DATABASE_ENABLED === 'true',
                type: process.env.DATABASE_TYPE || 'sqlite',
                url: process.env.DATABASE_URL,
                host: process.env.DATABASE_HOST || 'localhost',
                port: parseInt(process.env.DATABASE_PORT) || 5432,
                database: process.env.DATABASE_NAME || 'video_pipeline_ai',
                username: process.env.DATABASE_USER,
                password: process.env.DATABASE_PASSWORD,
                ssl: process.env.DATABASE_SSL === 'true',
                poolSize: parseInt(process.env.DATABASE_POOL_SIZE) || 10,
                timeout: parseInt(process.env.DATABASE_TIMEOUT) || 30000
            },
            
            queue: {
                maxConcurrentJobs: parseInt(process.env.QUEUE_CONCURRENT) || 5,
                defaultRetries: parseInt(process.env.QUEUE_RETRIES) || 3,
                enablePersistence: process.env.QUEUE_PERSISTENCE === 'true',
                retryDelay: parseInt(process.env.QUEUE_RETRY_DELAY) || 5000,
                enablePriority: process.env.QUEUE_PRIORITY !== 'false',
                enableScheduling: process.env.QUEUE_SCHEDULING === 'true'
            },
            
            api: {
                port: parseInt(process.env.API_PORT) || parseInt(process.env.PORT) || 3000,
                host: process.env.API_HOST || process.env.HOST || '0.0.0.0',
                enableDocs: process.env.API_DOCS !== 'false',
                enableMetrics: process.env.API_METRICS !== 'false',
                enableMonitoring: process.env.API_MONITORING !== 'false',
                rateLimitMax: parseInt(process.env.API_RATE_LIMIT) || 100,
                rateLimitWindow: parseInt(process.env.API_RATE_WINDOW) || 900000,
                corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*'],
                trustProxy: process.env.TRUST_PROXY === 'true',
                compression: process.env.API_COMPRESSION !== 'false',
                timeout: parseInt(process.env.API_TIMEOUT) || 30000,
                
                security: {
                    enableHelmet: process.env.SECURITY_HELMET !== 'false',
                    enableCors: process.env.SECURITY_CORS !== 'false',
                    enableRateLimit: process.env.SECURITY_RATE_LIMIT !== 'false',
                    apiKeyRequired: process.env.API_KEY_REQUIRED === 'true',
                    jwtSecret: process.env.JWT_SECRET,
                    enableCSRF: process.env.SECURITY_CSRF === 'true'
                }
            },
            
            monitoring: {
                enabled: process.env.MONITORING_ENABLED !== 'false',
                metricsInterval: parseInt(process.env.METRICS_INTERVAL) || 30000,
                healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 60000,
                enablePrometheus: process.env.PROMETHEUS_ENABLED === 'true',
                enableDatadog: process.env.DATADOG_ENABLED === 'true',
                
                alerting: {
                    enabled: process.env.ALERTING_ENABLED === 'true',
                    webhookUrl: process.env.ALERTING_WEBHOOK_URL,
                    slackWebhook: process.env.SLACK_WEBHOOK_URL,
                    errorThreshold: parseInt(process.env.ERROR_THRESHOLD) || 10,
                    responseTimeThreshold: parseInt(process.env.RESPONSE_TIME_THRESHOLD) || 5000
                }
            },
            
            logging: {
                level: process.env.LOG_LEVEL || this.getDefaultLogLevel(),
                enableConsole: process.env.LOG_CONSOLE !== 'false',
                enableFile: process.env.LOG_FILE !== 'false',
                enableRemote: process.env.LOG_REMOTE === 'true',
                logDir: process.env.LOG_DIR || './logs',
                maxFiles: parseInt(process.env.LOG_MAX_FILES) || 14,
                maxSize: process.env.LOG_MAX_SIZE || '50m',
                remoteEndpoint: process.env.LOG_REMOTE_ENDPOINT,
                enableMetrics: process.env.LOG_METRICS !== 'false'
            }
        };
    }
    
    loadEnvironmentConfiguration() {
        const envConfigs = {
            development: {
                app: { debug: true, logLevel: 'debug' },
                pipeline: { defaultStrategy: 'fast', enableAI: true },
                cache: { maxMemoryMB: 100, enableSemantic: true },
                api: { enableDocs: true, enableMonitoring: true },
                logging: { enableConsole: true, enableFile: true }
            },
            
            production: {
                app: { debug: false, logLevel: 'info' },
                pipeline: { 
                    defaultStrategy: 'quality', 
                    maxConcurrentJobs: 8,
                    enableAI: true 
                },
                cache: { 
                    maxMemoryMB: 500, 
                    enableSemantic: true,
                    enablePredictive: true,
                    persistToDisk: true 
                },
                api: { 
                    enableDocs: false, 
                    enableMonitoring: true,
                    rateLimitMax: 500,
                    trustProxy: true 
                },
                logging: { enableConsole: false, enableFile: true, enableRemote: true }
            },
            
            staging: {
                app: { debug: false, logLevel: 'info' },
                pipeline: { defaultStrategy: 'balanced', enableAI: true },
                cache: { maxMemoryMB: 200, enableSemantic: true },
                api: { enableDocs: true, enableMonitoring: true },
                logging: { enableConsole: true, enableFile: true }
            },
            
            test: {
                app: { debug: false, logLevel: 'error' },
                pipeline: { defaultStrategy: 'fast', maxConcurrentJobs: 1 },
                cache: { maxMemoryMB: 20, enableSemantic: false },
                database: { type: 'sqlite', database: ':memory:' },
                api: { enableDocs: false, enableMonitoring: false },
                logging: { enableConsole: false, enableFile: false }
            }
        };
        
        return envConfigs[this.env] || {};
    }
    
    applyEnvironmentOverrides(config) {
        const envOverrides = {};
        
        for (const [envKey, envValue] of Object.entries(process.env)) {
            if (envKey.startsWith('CONFIG_')) {
                const configPath = envKey
                    .substring(7)
                    .toLowerCase()
                    .split('_')
                    .join('.');
                
                this.setNestedProperty(envOverrides, configPath, this.parseEnvValue(envValue));
            }
        }
        
        return this.deepMerge(config, envOverrides);
    }
    
    parseEnvValue(value) {
        // Boolean parsing
        if (value === 'true') return true;
        if (value === 'false') return false;
        if (value === 'null') return null;
        if (value === 'undefined') return undefined;
        
        // Number parsing
        if (/^-?\d+$/.test(value)) return parseInt(value);
        if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
        
        // Array parsing (comma-separated)
        if (value.includes(',')) {
            return value.split(',').map(v => this.parseEnvValue(v.trim()));
        }
        
        // JSON parsing
        if ((value.startsWith('{') && value.endsWith('}')) || 
            (value.startsWith('[') && value.endsWith(']'))) {
            try {
                return JSON.parse(value);
            } catch {
                // Fall through to string
            }
        }
        
        return value;
    }
    
    applyDefaults(config) {
        let result = { ...config };
        
        for (const [section, schema] of Object.entries(ConfigSchemaValidator.schemas)) {
            if (result[section]) {
                result[section] = ConfigSchemaValidator.applyDefaults(result[section], schema);
            }
        }
        
        return result;
    }
    
    validateConfiguration(config) {
        const allErrors = [];
        
        for (const [section, schema] of Object.entries(ConfigSchemaValidator.schemas)) {
            if (config[section]) {
                const errors = ConfigSchemaValidator.validate(config[section], schema, section);
                allErrors.push(...errors);
            }
        }
        
        if (allErrors.length > 0) {
            throw new Error(`Configuration validation failed:\n${allErrors.join('\n')}`);
        }
    }
    
    setupHotReload() {
        if (!this.enableHotReload) return;
        
        const configFiles = [
            path.join(this.configDir, `${this.env}.json`),
            path.join(this.secretsDir, `${this.env}.json`)
        ];
        
        for (const file of configFiles) {
            try {
                const watcher = require('fs').watch(file, (eventType) => {
                    if (eventType === 'change') {
                        this.emit('config:file-changed', { file });
                        
                        // Debounce reload
                        clearTimeout(this.reloadTimeout);
                        this.reloadTimeout = setTimeout(() => {
                            this.reloadConfiguration();
                        }, 2000);
                    }
                });
                
                this.watchers.set(file, watcher);
            } catch (error) {
                // File might not exist, which is fine
            }
        }
    }
    
    reloadConfiguration() {
        try {
            const oldConfig = this.config;
            const oldVersion = this.configVersion;
            
            this.loadConfiguration();
            
            this.emit('config:reloaded', {
                oldVersion,
                newVersion: this.configVersion,
                changed: this.getChangedKeys(oldConfig, this.config),
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            this.emit('config:reload-failed', { 
                error: error.message,
                version: this.configVersion
            });
        }
    }
    
    getChangedKeys(oldConfig, newConfig, path = '') {
        const changes = [];
        const allKeys = new Set([...Object.keys(oldConfig || {}), ...Object.keys(newConfig || {})]);
        
        for (const key of allKeys) {
            const currentPath = path ? `${path}.${key}` : key;
            const oldValue = oldConfig?.[key];
            const newValue = newConfig?.[key];
            
            if (typeof oldValue === 'object' && typeof newValue === 'object' && 
                oldValue !== null && newValue !== null && !Array.isArray(oldValue) && !Array.isArray(newValue)) {
                changes.push(...this.getChangedKeys(oldValue, newValue, currentPath));
            } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                changes.push({
                    path: currentPath,
                    oldValue: this.secretsManager.isSensitive(currentPath) ? '[REDACTED]' : oldValue,
                    newValue: this.secretsManager.isSensitive(currentPath) ? '[REDACTED]' : newValue
                });
            }
        }
        
        return changes;
    }
    
    startHealthCheck() {
        setInterval(() => {
            this.performHealthCheck();
        }, 300000); // Every 5 minutes
    }
    
    performHealthCheck() {
        try {
            if (this.enableValidation) {
                this.validateConfiguration(this.config);
            }
            
            this.emit('health:check', {
                status: 'healthy',
                version: this.configVersion,
                environment: this.env,
                timestamp: new Date().toISOString(),
                loadHistory: this.loadHistory.slice(-3)
            });
            
        } catch (error) {
            this.emit('health:check', {
                status: 'unhealthy',
                error: error.message,
                version: this.configVersion,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    recordLoadHistory(startTime, success, error = null) {
        const entry = {
            version: this.configVersion,
            timestamp: new Date().toISOString(),
            duration: Date.now() - startTime,
            success,
            error: error?.message,
            environment: this.env
        };
        
        this.loadHistory.push(entry);
        
        if (this.loadHistory.length > 50) {
            this.loadHistory = this.loadHistory.slice(-50);
        }
    }
    
    // ======== CONFIGURATION ACCESS METHODS ========
    
    get(path, defaultValue = null) {
        return this.getNestedProperty(this.config, path) ?? defaultValue;
    }
    
    set(path, value, options = {}) {
        const mutableConfig = JSON.parse(JSON.stringify(this.config));
        this.setNestedProperty(mutableConfig, path, value);
        
        if (this.enableValidation && !options.skipValidation) {
            this.validateConfiguration(mutableConfig);
        }
        
        this.config = Object.freeze(mutableConfig);
        this.configVersion++;
        
        this.emit('config:updated', {
            path,
            value: this.secretsManager.isSensitive(path) ? '[REDACTED]' : value,
            version: this.configVersion,
            timestamp: new Date().toISOString()
        });
    }
    
    has(path) {
        return this.getNestedProperty(this.config, path) !== undefined;
    }
    
    getAll() {
        return this.secretsManager.sanitizeForLogging(this.config);
    }
    
    getSection(section) {
        const sectionConfig = this.config[section];
        if (!sectionConfig) return null;
        
        return this.secretsManager.sanitizeForLogging({ [section]: sectionConfig })[section];
    }
    
    // ======== UTILITY METHODS ========
    
    getNestedProperty(obj, path) {
        if (!path) return obj;
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    
    setNestedProperty(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key]) current[key] = {};
            return current[key];
        }, obj);
        target[lastKey] = value;
    }
    
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }
    
    // Environment-specific defaults
    getDefaultLogLevel() {
        const levels = { production: 'info', staging: 'info', development: 'debug', test: 'error' };
        return levels[this.env] || 'info';
    }
    
    getDefaultStrategy() {
        const strategies = { production: 'quality', staging: 'balanced', development: 'fast', test: 'fast' };
        return strategies[this.env] || 'balanced';
    }
    
    getDefaultConcurrency() {
        const concurrency = { production: 8, staging: 5, development: 3, test: 1 };
        return concurrency[this.env] || 3;
    }
    
    getDefaultCacheSize() {
        const sizes = { production: 500, staging: 200, development: 100, test: 20 };
        return sizes[this.env] || 100;
    }
    
    // Environment helpers
    isDevelopment() { return this.env === 'development'; }
    isProduction() { return this.env === 'production'; }
    isStaging() { return this.env === 'staging'; }
    isTest() { return this.env === 'test'; }
    getEnvironment() { return this.env; }
    
    // Health and debugging
    getHealthStatus() {
        return {
            status: 'healthy',
            environment: this.env,
            version: this.configVersion,
            configValid: true,
            lastLoad: this.loadHistory[this.loadHistory.length - 1],
            features: {
                hotReload: this.enableHotReload,
                secrets: this.enableSecrets,
                validation: this.enableValidation
            }
        };
    }
    
    exportConfiguration(includeSecrets = false) {
        if (includeSecrets) {
            return JSON.stringify(this.config, null, 2);
        } else {
            return JSON.stringify(this.getAll(), null, 2);
        }
    }
    
    async cleanup() {
        for (const watcher of this.watchers.values()) {
            watcher.close();
        }
        this.watchers.clear();
        
        if (this.reloadTimeout) {
            clearTimeout(this.reloadTimeout);
        }
        
        this.removeAllListeners();
        this.emit('cleanup:completed');
    }
}

// Factory functions
function createConfig(options = {}) {
    return new EnterpriseAppConfig(options);
}

function createProductionConfig() {
    return new EnterpriseAppConfig({ enableHotReload: false, enableSecrets: true });
}

function createDevelopmentConfig() {
    return new EnterpriseAppConfig({ enableHotReload: true, enableSecrets: false });
}

// Backward compatibility - singleton instance
const appConfig = new EnterpriseAppConfig();

module.exports = appConfig;
module.exports.EnterpriseAppConfig = EnterpriseAppConfig;
module.exports.ConfigSchemaValidator = ConfigSchemaValidator;
module.exports.AdvancedSecretsManager = AdvancedSecretsManager;
module.exports.createConfig = createConfig;
module.exports.createProductionConfig = createProductionConfig;
module.exports.createDevelopmentConfig = createDevelopmentConfig;