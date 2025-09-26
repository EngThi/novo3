/**
 * Cache Service - Multi-Backend Implementation
 * @fileoverview Intelligent caching with Redis, SQLite, and memory backends
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Cache Service with multiple backend support
 * Supports: Memory, File system, Redis, SQLite
 */
class CacheService {
    constructor(config = {}, logger = console) {
        this.config = {
            backend: config.backend || 'memory',
            ttl: config.ttl || 3600, // 1 hour default
            maxSize: config.maxSize || 1024 * 1024 * 100, // 100MB
            cacheDir: config.cacheDir || './cache',
            compression: config.compression !== false,
            persistOnExit: config.persistOnExit !== false,
            ...config
        };
        
        this.logger = logger;
        this.backends = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0,
            currentSize: 0
        };
        
        this._initializeBackends();
        this._setupCleanup();
    }
    
    /**
     * Initialize cache backends
     * @private
     */
    _initializeBackends() {
        // Memory backend (always available)
        this.backends.set('memory', new MemoryBackend(this.config, this.logger));
        
        // File system backend
        this.backends.set('filesystem', new FileSystemBackend(this.config, this.logger));
        
        // Redis backend (if available)
        if (this.config.redis?.host) {
            this.backends.set('redis', new RedisBackend(this.config, this.logger));
        }
        
        // SQLite backend
        if (this.config.sqlite?.path) {
            this.backends.set('sqlite', new SQLiteBackend(this.config, this.logger));
        }
        
        this.currentBackend = this.backends.get(this.config.backend) || this.backends.get('memory');
        this.logger.info(`Cache initialized with ${this.config.backend} backend`);
    }
    
    /**
     * Get value from cache
     * @param {string} key - Cache key
     * @returns {Promise<any>} Cached value or null
     */
    async get(key) {
        try {
            const hashedKey = this._hashKey(key);
            const result = await this.currentBackend.get(hashedKey);
            
            if (result !== null) {
                this.stats.hits++;
                this.logger.debug(`Cache hit for key: ${key}`);
                
                // Check TTL
                if (result.expiresAt && Date.now() > result.expiresAt) {
                    await this.delete(key);
                    this.stats.misses++;
                    return null;
                }
                
                return result.data;
            }
            
            this.stats.misses++;
            this.logger.debug(`Cache miss for key: ${key}`);
            return null;
            
        } catch (error) {
            this.logger.error('Cache get error:', error);
            return null;
        }
    }
    
    /**
     * Set value in cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} [ttl] - Time to live in seconds
     * @returns {Promise<boolean>} Success status
     */
    async set(key, value, ttl) {
        try {
            const hashedKey = this._hashKey(key);
            const expiresAt = ttl ? Date.now() + (ttl * 1000) : null;
            
            const cacheItem = {
                data: value,
                createdAt: Date.now(),
                expiresAt,
                size: this._calculateSize(value)
            };
            
            // Check size limits
            if (cacheItem.size > this.config.maxSize) {
                this.logger.warn(`Item too large for cache: ${key}`);
                return false;
            }
            
            const success = await this.currentBackend.set(hashedKey, cacheItem);
            
            if (success) {
                this.stats.sets++;
                this.stats.currentSize += cacheItem.size;
                this.logger.debug(`Cache set for key: ${key}`);
                
                // Trigger cleanup if needed
                await this._checkSizeLimit();
            }
            
            return success;
            
        } catch (error) {
            this.logger.error('Cache set error:', error);
            return false;
        }
    }
    
    /**
     * Delete value from cache
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} Success status
     */
    async delete(key) {
        try {
            const hashedKey = this._hashKey(key);
            const success = await this.currentBackend.delete(hashedKey);
            
            if (success) {
                this.stats.deletes++;
                this.logger.debug(`Cache deleted for key: ${key}`);
            }
            
            return success;
            
        } catch (error) {
            this.logger.error('Cache delete error:', error);
            return false;
        }
    }
    
    /**
     * Check if key exists in cache
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} Existence status
     */
    async has(key) {
        const value = await this.get(key);
        return value !== null;
    }
    
    /**
     * Clear all cache
     * @returns {Promise<boolean>} Success status
     */
    async clear() {
        try {
            const success = await this.currentBackend.clear();
            if (success) {
                this.stats.currentSize = 0;
                this.logger.info('Cache cleared');
            }
            return success;
        } catch (error) {
            this.logger.error('Cache clear error:', error);
            return false;
        }
    }
    
    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getStats() {
        const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) || 0;
        
        return {
            ...this.stats,
            hitRate: Math.round(hitRate * 100) / 100,
            backend: this.config.backend,
            sizeMB: Math.round(this.stats.currentSize / (1024 * 1024) * 100) / 100
        };
    }
    
    /**
     * Health check
     * @returns {Promise<Object>} Health status
     */
    async healthCheck() {
        try {
            const testKey = '_health_check_';
            const testValue = { timestamp: Date.now() };
            
            await this.set(testKey, testValue, 60);
            const retrieved = await this.get(testKey);
            await this.delete(testKey);
            
            const isHealthy = retrieved && retrieved.timestamp === testValue.timestamp;
            
            return {
                status: isHealthy ? 'healthy' : 'degraded',
                service: 'Cache',
                backend: this.config.backend,
                stats: this.getStats()
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                service: 'Cache',
                error: error.message
            };
        }
    }
    
    /**
     * Switch cache backend
     * @param {string} backendName - Backend to switch to
     * @returns {Promise<boolean>} Success status
     */
    async switchBackend(backendName) {
        if (!this.backends.has(backendName)) {
            throw new Error(`Unknown backend: ${backendName}`);
        }
        
        const oldBackend = this.currentBackend;
        this.currentBackend = this.backends.get(backendName);
        this.config.backend = backendName;
        
        this.logger.info(`Switched to ${backendName} backend`);
        return true;
    }
    
    /**
     * Hash cache key for consistent storage
     * @private
     */
    _hashKey(key) {
        return crypto.createHash('sha256').update(key).digest('hex');
    }
    
    /**
     * Calculate size of cached item
     * @private
     */
    _calculateSize(value) {
        try {
            return Buffer.byteLength(JSON.stringify(value), 'utf8');
        } catch {
            return 1024; // Default size estimate
        }
    }
    
    /**
     * Check and enforce size limits
     * @private
     */
    async _checkSizeLimit() {
        if (this.stats.currentSize > this.config.maxSize) {
            await this._evictOldest();
        }
    }
    
    /**
     * Evict oldest items to free space
     * @private
     */
    async _evictOldest() {
        // Implementation depends on backend capabilities
        if (this.currentBackend.evictOldest) {
            await this.currentBackend.evictOldest();
            this.stats.evictions++;
        }
    }
    
    /**
     * Setup cleanup on process exit
     * @private
     */
    _setupCleanup() {
        if (this.config.persistOnExit) {
            process.on('beforeExit', async () => {
                await this._persistCache();
            });
        }
    }
    
    /**
     * Persist cache to storage
     * @private
     */
    async _persistCache() {
        if (this.currentBackend.persist) {
            await this.currentBackend.persist();
        }
    }
    
    /**
     * Cleanup resources
     */
    async cleanup() {
        for (const backend of this.backends.values()) {
            if (backend.cleanup) {
                await backend.cleanup();
            }
        }
        this.backends.clear();
    }
}

/**
 * Memory Cache Backend
 */
class MemoryBackend {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.cache = new Map();
    }
    
    async get(key) {
        return this.cache.get(key) || null;
    }
    
    async set(key, value) {
        this.cache.set(key, value);
        return true;
    }
    
    async delete(key) {
        return this.cache.delete(key);
    }
    
    async clear() {
        this.cache.clear();
        return true;
    }
    
    async evictOldest() {
        const oldest = this.cache.keys().next().value;
        if (oldest) {
            this.cache.delete(oldest);
        }
    }
}

/**
 * File System Cache Backend
 */
class FileSystemBackend {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.cacheDir = path.join(config.cacheDir, 'filesystem');
    }
    
    async get(key) {
        try {
            const filePath = path.join(this.cacheDir, `${key}.json`);
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch {
            return null;
        }
    }
    
    async set(key, value) {
        try {
            await fs.mkdir(this.cacheDir, { recursive: true });
            const filePath = path.join(this.cacheDir, `${key}.json`);
            await fs.writeFile(filePath, JSON.stringify(value));
            return true;
        } catch (error) {
            this.logger.error('FS cache set error:', error);
            return false;
        }
    }
    
    async delete(key) {
        try {
            const filePath = path.join(this.cacheDir, `${key}.json`);
            await fs.unlink(filePath);
            return true;
        } catch {
            return false;
        }
    }
    
    async clear() {
        try {
            const files = await fs.readdir(this.cacheDir);
            await Promise.all(files.map(file => 
                fs.unlink(path.join(this.cacheDir, file))
            ));
            return true;
        } catch {
            return false;
        }
    }
}

/**
 * Redis Cache Backend (Mock implementation)
 */
class RedisBackend {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        // Mock Redis client
        this.client = {
            connected: true,
            data: new Map()
        };
    }
    
    async get(key) {
        if (!this.client.connected) return null;
        
        const data = this.client.data.get(key);
        return data ? JSON.parse(data) : null;
    }
    
    async set(key, value) {
        if (!this.client.connected) return false;
        
        this.client.data.set(key, JSON.stringify(value));
        return true;
    }
    
    async delete(key) {
        if (!this.client.connected) return false;
        
        return this.client.data.delete(key);
    }
    
    async clear() {
        if (!this.client.connected) return false;
        
        this.client.data.clear();
        return true;
    }
}

/**
 * SQLite Cache Backend (Mock implementation)
 */
class SQLiteBackend {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        // Mock SQLite database
        this.db = {
            connected: true,
            data: new Map()
        };
    }
    
    async get(key) {
        if (!this.db.connected) return null;
        
        const row = this.db.data.get(key);
        return row ? JSON.parse(row.value) : null;
    }
    
    async set(key, value) {
        if (!this.db.connected) return false;
        
        this.db.data.set(key, {
            value: JSON.stringify(value),
            created_at: Date.now()
        });
        return true;
    }
    
    async delete(key) {
        if (!this.db.connected) return false;
        
        return this.db.data.delete(key);
    }
    
    async clear() {
        if (!this.db.connected) return false;
        
        this.db.data.clear();
        return true;
    }
}

module.exports = CacheService;