/**
 * Centralized Application Configuration
 * Environment-based configuration with validation and hot reloading
 */

const fs = require('fs');
const path = require('path');

class AppConfig {
    constructor() {
        this.env = process.env.NODE_ENV || 'development';
        this.config = {};
        this.watchers = new Map();
        
        this.loadConfiguration();
    }
    
    loadConfiguration() {
        const baseConfig = {
            app: {
                name: 'novo3-pipeline',
                version: '2.0.0',
                environment: this.env,
                port: parseInt(process.env.PORT) || 3000,
                host: process.env.HOST || '0.0.0.0',
                logLevel: process.env.LOG_LEVEL || (this.env === 'production' ? 'info' : 'debug')
            },
            
            pipeline: {
                defaultStrategy: process.env.PIPELINE_STRATEGY || 'balanced',
                maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS) || 3,
                timeout: parseInt(process.env.PIPELINE_TIMEOUT) || 600000
            },
            
            tts: {
                primaryProvider: process.env.TTS_PROVIDER || 'gemini',
                maxConcurrent: parseInt(process.env.TTS_CONCURRENT) || 2,
                cacheEnabled: process.env.TTS_CACHE !== 'false',
                gemini: {
                    apiKey: process.env.GEMINI_API_KEY,
                    model: process.env.GEMINI_TTS_MODEL || 'text-to-speech'
                }
            },
            
            image: {
                defaultProvider: process.env.IMAGE_PROVIDER || 'pollinations',
                qualityThreshold: parseFloat(process.env.IMAGE_QUALITY_THRESHOLD) || 0.7,
                maxRetries: parseInt(process.env.IMAGE_MAX_RETRIES) || 3,
                cacheEnabled: process.env.IMAGE_CACHE !== 'false'
            },
            
            video: {
                defaultPreset: process.env.VIDEO_PRESET || 'high',
                maxConcurrentJobs: parseInt(process.env.VIDEO_CONCURRENT) || 2,
                ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
                tempDir: process.env.VIDEO_TEMP_DIR || '/tmp/video-service'
            },
            
            cache: {
                maxMemoryMB: parseInt(process.env.CACHE_MEMORY_MB) || 50,
                defaultTTL: parseInt(process.env.CACHE_TTL) || 3600,
                enableMetrics: process.env.CACHE_METRICS !== 'false'
            },
            
            database: {
                type: process.env.DB_TYPE || 'sqlite',
                filename: process.env.DB_FILE || path.join(process.cwd(), 'data', 'novo3.db')
            },
            
            queue: {
                maxConcurrentJobs: parseInt(process.env.QUEUE_CONCURRENT) || 5,
                defaultRetries: parseInt(process.env.QUEUE_RETRIES) || 3,
                enablePersistence: process.env.QUEUE_PERSISTENCE !== 'false'
            },
            
            api: {
                port: parseInt(process.env.API_PORT) || 3000,
                host: process.env.API_HOST || '0.0.0.0',
                enableDocs: process.env.API_DOCS !== 'false',
                enableMetrics: process.env.API_METRICS !== 'false',
                rateLimitMax: parseInt(process.env.API_RATE_LIMIT) || 100
            }
        };
        
        const envConfig = this.loadEnvironmentConfig();
        this.config = this.deepMerge(baseConfig, envConfig);
        this.validateConfiguration();
    }
    
    loadEnvironmentConfig() {
        const envConfigs = {
            development: {
                app: { logLevel: 'debug' },
                pipeline: { defaultStrategy: 'fast' },
                cache: { maxMemoryMB: 100 }
            },
            production: {
                app: { logLevel: 'info' },
                pipeline: { defaultStrategy: 'quality', maxConcurrentJobs: 5 },
                cache: { maxMemoryMB: 200 }
            },
            test: {
                app: { logLevel: 'error' },
                cache: { maxMemoryMB: 10 },
                database: { filename: ':memory:' }
            }
        };
        
        return envConfigs[this.env] || {};
    }
    
    validateConfiguration() {
        const required = ['app.name', 'app.version', 'pipeline.defaultStrategy'];
        
        for (const path of required) {
            if (!this.get(path)) {
                throw new Error(`Required configuration missing: ${path}`);
            }
        }
    }
    
    get(path, defaultValue = null) {
        return this.getNestedProperty(this.config, path) || defaultValue;
    }
    
    set(path, value) {
        this.setNestedProperty(this.config, path, value);
    }
    
    getAll() {
        return { ...this.config };
    }
    
    getNestedProperty(obj, path) {
        return path.split('.').reduce((current, key) => current && current[key], obj);
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
    
    isDevelopment() { return this.env === 'development'; }
    isProduction() { return this.env === 'production'; }
    isTest() { return this.env === 'test'; }
}

module.exports = new AppConfig();