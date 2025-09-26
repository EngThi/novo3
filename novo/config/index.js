/**
 * Configuration Management - Enterprise Grade
 * @fileoverview Centralized configuration with environment-specific settings
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

/**
 * Configuration Manager
 * Handles environment-specific configurations and validation
 */
class ConfigurationManager {
    constructor(environment = process.env.NODE_ENV || 'development') {
        this.environment = environment;
        this.config = {};
        this.schema = {};
        
        this._loadConfiguration();
        this._validateConfiguration();
    }
    
    /**
     * Load configuration from files and environment
     * @private
     */
    _loadConfiguration() {
        // Base configuration
        const baseConfig = {
            // Application settings
            app: {
                name: 'Video Pipeline Enterprise',
                version: '2.0.0',
                environment: this.environment,
                debug: process.env.DEBUG === 'true' || this.environment === 'development'
            },
            
            // Pipeline configuration
            pipeline: {
                defaultStrategy: process.env.PIPELINE_STRATEGY || 'balanced',
                maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS) || 3,
                timeout: parseInt(process.env.PIPELINE_TIMEOUT) || 600000, // 10 minutes
                retryAttempts: parseInt(process.env.RETRY_ATTEMPTS) || 3,
                enableMetrics: process.env.ENABLE_METRICS !== 'false'
            },
            
            // API configuration
            api: {
                port: parseInt(process.env.PORT) || 3000,
                host: process.env.HOST || '0.0.0.0',
                cors: process.env.ENABLE_CORS !== 'false',
                helmet: process.env.ENABLE_HELMET !== 'false',
                rateLimit: process.env.ENABLE_RATE_LIMIT !== 'false',
                apiKey: process.env.API_KEY,
                corsOrigins: (process.env.CORS_ORIGINS || '*').split(','),
                webhooks: this._parseWebhooks(process.env.WEBHOOKS)
            },
            
            // Service configurations
            services: {
                // TTS Service
                tts: {
                    provider: process.env.TTS_PROVIDER || 'elevenlabs',
                    caching: process.env.TTS_CACHING !== 'false',
                    fallbackToLocal: process.env.TTS_FALLBACK_LOCAL !== 'false',
                    
                    // ElevenLabs
                    elevenlabs: {
                        apiKey: process.env.ELEVENLABS_API_KEY,
                        voice: process.env.ELEVENLABS_VOICE || 'pNInz6obpgDQGcFmaJgB'
                    },
                    
                    // Azure TTS
                    azure: {
                        apiKey: process.env.AZURE_TTS_API_KEY,
                        region: process.env.AZURE_TTS_REGION || 'eastus'
                    },
                    
                    // OpenAI TTS
                    openai: {
                        apiKey: process.env.OPENAI_API_KEY
                    }
                },
                
                // Image Service
                image: {
                    provider: process.env.IMAGE_PROVIDER || 'stability',
                    caching: process.env.IMAGE_CACHING !== 'false',
                    fallbackToLocal: process.env.IMAGE_FALLBACK_LOCAL !== 'false',
                    defaultStyle: process.env.IMAGE_DEFAULT_STYLE || 'realistic',
                    defaultSize: process.env.IMAGE_DEFAULT_SIZE || '1024x1024',
                    
                    // Stability AI
                    stability: {
                        apiKey: process.env.STABILITY_API_KEY
                    },
                    
                    // OpenAI DALL-E
                    openai: {
                        apiKey: process.env.OPENAI_API_KEY
                    },
                    
                    // Hugging Face
                    huggingface: {
                        apiKey: process.env.HUGGINGFACE_API_KEY
                    }
                },
                
                // Video Service
                video: {
                    provider: process.env.VIDEO_PROVIDER || 'shotstack',
                    caching: process.env.VIDEO_CACHING !== 'false',
                    fallbackToLocal: process.env.VIDEO_FALLBACK_LOCAL !== 'false',
                    defaultFormat: process.env.VIDEO_DEFAULT_FORMAT || 'mp4',
                    defaultQuality: process.env.VIDEO_DEFAULT_QUALITY || 'hd',
                    defaultFrameRate: parseInt(process.env.VIDEO_DEFAULT_FPS) || 30,
                    
                    // Shotstack
                    shotstack: {
                        apiKey: process.env.SHOTSTACK_API_KEY,
                        stage: process.env.SHOTSTACK_STAGE || 'v1'
                    },
                    
                    // Bannerbear
                    bannerbear: {
                        apiKey: process.env.BANNERBEAR_API_KEY
                    },
                    
                    // Canva
                    canva: {
                        apiKey: process.env.CANVA_API_KEY
                    }
                },
                
                // Cache Service
                cache: {
                    backend: process.env.CACHE_BACKEND || 'memory',
                    ttl: parseInt(process.env.CACHE_TTL) || 3600,
                    maxSize: parseInt(process.env.CACHE_MAX_SIZE) || 1024 * 1024 * 100, // 100MB
                    cacheDir: process.env.CACHE_DIR || './cache',
                    compression: process.env.CACHE_COMPRESSION !== 'false',
                    persistOnExit: process.env.CACHE_PERSIST_ON_EXIT !== 'false',
                    
                    // Redis configuration
                    redis: {
                        host: process.env.REDIS_HOST,
                        port: parseInt(process.env.REDIS_PORT) || 6379,
                        password: process.env.REDIS_PASSWORD,
                        db: parseInt(process.env.REDIS_DB) || 0
                    },
                    
                    // SQLite configuration
                    sqlite: {
                        path: process.env.SQLITE_CACHE_PATH || './cache/cache.sqlite'
                    }
                }
            },
            
            // Infrastructure configuration
            infrastructure: {
                // Database
                database: {
                    provider: process.env.DB_PROVIDER || 'supabase',
                    connectionPoolSize: parseInt(process.env.DB_POOL_SIZE) || 10,
                    maxRetries: parseInt(process.env.DB_MAX_RETRIES) || 3,
                    retryDelay: parseInt(process.env.DB_RETRY_DELAY) || 1000,
                    enableMigrations: process.env.DB_ENABLE_MIGRATIONS !== 'false',
                    enableBackups: process.env.DB_ENABLE_BACKUPS !== 'false',
                    backupInterval: parseInt(process.env.DB_BACKUP_INTERVAL) || 3600000,
                    
                    // Supabase
                    supabase: {
                        url: process.env.SUPABASE_URL,
                        key: process.env.SUPABASE_ANON_KEY,
                        serviceKey: process.env.SUPABASE_SERVICE_KEY
                    },
                    
                    // PostgreSQL
                    postgresql: {
                        host: process.env.POSTGRES_HOST,
                        port: parseInt(process.env.POSTGRES_PORT) || 5432,
                        database: process.env.POSTGRES_DB,
                        username: process.env.POSTGRES_USER,
                        password: process.env.POSTGRES_PASSWORD,
                        ssl: process.env.POSTGRES_SSL === 'true'
                    },
                    
                    // SQLite
                    sqlite: {
                        path: process.env.SQLITE_PATH || './data/database.sqlite'
                    },
                    
                    // MongoDB
                    mongodb: {
                        uri: process.env.MONGODB_URI,
                        database: process.env.MONGODB_DATABASE
                    }
                },
                
                // Queue system
                queue: {
                    provider: process.env.QUEUE_PROVIDER || 'memory',
                    maxJobs: parseInt(process.env.QUEUE_MAX_JOBS) || 100,
                    maxWorkers: parseInt(process.env.QUEUE_MAX_WORKERS) || 5,
                    
                    // Redis Queue
                    redis: {
                        host: process.env.REDIS_HOST,
                        port: parseInt(process.env.REDIS_PORT) || 6379,
                        password: process.env.REDIS_PASSWORD
                    }
                }
            },
            
            // Logging configuration
            logging: {
                level: process.env.LOG_LEVEL || 'info',
                format: process.env.LOG_FORMAT || 'json',
                file: process.env.LOG_FILE,
                maxSize: process.env.LOG_MAX_SIZE || '10mb',
                maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
                console: process.env.LOG_CONSOLE !== 'false'
            },
            
            // Security configuration
            security: {
                encryptionKey: process.env.ENCRYPTION_KEY || this._generateEncryptionKey(),
                jwtSecret: process.env.JWT_SECRET || this._generateJwtSecret(),
                sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 86400000, // 24 hours
                maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
                lockoutDuration: parseInt(process.env.LOCKOUT_DURATION) || 900000 // 15 minutes
            }
        };
        
        // Load environment-specific overrides
        const envConfig = this._loadEnvironmentConfig();
        
        // Merge configurations
        this.config = this._deepMerge(baseConfig, envConfig);
    }
    
    /**
     * Load environment-specific configuration file
     * @private
     */
    _loadEnvironmentConfig() {
        const configFile = path.join(__dirname, `${this.environment}.js`);
        
        try {
            if (fs.existsSync(configFile)) {
                const envConfig = require(configFile);
                return typeof envConfig === 'function' ? envConfig(this.environment) : envConfig;
            }
        } catch (error) {
            console.warn(`Failed to load environment config: ${error.message}`);
        }
        
        return {};
    }
    
    /**
     * Parse webhooks from environment variable
     * @private
     */
    _parseWebhooks(webhooksEnv) {
        if (!webhooksEnv) return [];
        
        try {
            return JSON.parse(webhooksEnv);
        } catch {
            // Try simple comma-separated URLs
            return webhooksEnv.split(',').map(url => ({ url: url.trim() }));
        }
    }
    
    /**
     * Validate configuration against schema
     * @private
     */
    _validateConfiguration() {
        const requiredFields = [
            'app.name',
            'app.version',
            'pipeline.defaultStrategy',
            'api.port'
        ];
        
        const warnings = [];
        const errors = [];
        
        // Check required fields
        for (const field of requiredFields) {
            if (!this._getNestedValue(this.config, field)) {
                errors.push(`Missing required configuration: ${field}`);
            }
        }
        
        // Check API key warnings for production
        if (this.environment === 'production') {
            const apiKeys = [
                'services.tts.elevenlabs.apiKey',
                'services.image.stability.apiKey',
                'services.video.shotstack.apiKey'
            ];
            
            for (const keyPath of apiKeys) {
                if (!this._getNestedValue(this.config, keyPath)) {
                    warnings.push(`Missing API key for production: ${keyPath}`);
                }
            }
        }
        
        // Log warnings and errors
        if (warnings.length > 0) {
            console.warn('Configuration warnings:', warnings);
        }
        
        if (errors.length > 0) {
            console.error('Configuration errors:', errors);
            throw new Error('Configuration validation failed');
        }
    }
    
    /**
     * Get nested configuration value
     * @private
     */
    _getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current && current[key], obj);
    }
    
    /**
     * Deep merge two objects
     * @private
     */
    _deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this._deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }
    
    /**
     * Generate encryption key
     * @private
     */
    _generateEncryptionKey() {
        const crypto = require('crypto');
        return crypto.randomBytes(32).toString('hex');
    }
    
    /**
     * Generate JWT secret
     * @private
     */
    _generateJwtSecret() {
        const crypto = require('crypto');
        return crypto.randomBytes(64).toString('hex');
    }
    
    /**
     * Get configuration value
     * @param {string} path - Dot-separated path to configuration value
     * @param {any} defaultValue - Default value if not found
     * @returns {any} Configuration value
     */
    get(path, defaultValue = null) {
        const value = this._getNestedValue(this.config, path);
        return value !== undefined ? value : defaultValue;
    }
    
    /**
     * Set configuration value
     * @param {string} path - Dot-separated path to configuration value
     * @param {any} value - Value to set
     */
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => {
            if (!obj[key]) obj[key] = {};
            return obj[key];
        }, this.config);
        
        target[lastKey] = value;
    }
    
    /**
     * Get all configuration
     * @returns {Object} Full configuration object
     */
    getAll() {
        return { ...this.config };
    }
    
    /**
     * Get environment name
     * @returns {string} Environment name
     */
    getEnvironment() {
        return this.environment;
    }
    
    /**
     * Check if running in development
     * @returns {boolean} Is development environment
     */
    isDevelopment() {
        return this.environment === 'development';
    }
    
    /**
     * Check if running in production
     * @returns {boolean} Is production environment
     */
    isProduction() {
        return this.environment === 'production';
    }
    
    /**
     * Get configuration summary for logging
     * @returns {Object} Configuration summary
     */
    getSummary() {
        return {
            environment: this.environment,
            app: this.config.app,
            pipeline: {
                strategy: this.config.pipeline.defaultStrategy,
                maxJobs: this.config.pipeline.maxConcurrentJobs
            },
            api: {
                port: this.config.api.port,
                host: this.config.api.host
            },
            services: {
                tts: this.config.services.tts.provider,
                image: this.config.services.image.provider,
                video: this.config.services.video.provider,
                cache: this.config.services.cache.backend
            },
            database: this.config.infrastructure.database.provider
        };
    }
}

// Create and export singleton instance
const configManager = new ConfigurationManager();

module.exports = configManager;
module.exports.ConfigurationManager = ConfigurationManager;