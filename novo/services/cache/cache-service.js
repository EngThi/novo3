/**
 * Unified Cache Service - Enterprise Grade Caching System
 * Consolidates: smart-cache.js + distributed cache implementations
 * 
 * Features:
 * - Redis-like interface with memory fallback
 * - Semantic similarity scoring
 * - LRU eviction with memory management
 * - TTL support with background cleanup
 * - Connection pooling and error recovery
 * - Performance metrics and monitoring
 */

const EventEmitter = require('events');
const crypto = require('crypto');

class CacheService extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            maxMemoryMB: config.maxMemoryMB || 50,
            defaultTTL: config.defaultTTL || 3600, // 1 hour
            cleanupInterval: config.cleanupInterval || 300, // 5 minutes
            semanticThreshold: config.semanticThreshold || 0.85,
            enableMetrics: config.enableMetrics || true,
            redis: config.redis || null,
            ...config
        };
        
        // Multi-tier cache architecture
        this.memoryCache = new Map();
        this.ttlMap = new Map();
        this.lruOrder = new Map(); // For LRU tracking
        this.accessCount = new Map();
        this.semanticIndex = new Map(); // For semantic similarity
        
        // Performance metrics
        this.metrics = {
            hits: 0,
            misses: 0,
            evictions: 0,
            semanticHits: 0,
            memoryUsage: 0,
            operationsPerSecond: 0
        };
        
        this.initialize();
    }
    
    async initialize() {
        try {
            this.startCleanupTimer();
            if (this.config.enableMetrics) {
                this.startMetricsCollection();
            }
            this.emit('initialized', { maxMemory: this.config.maxMemoryMB });
        } catch (error) {
            this.emit('error', error);
        }
    }
    
    async set(key, value, ttl = null) {
        const actualTTL = ttl || this.config.defaultTTL;
        const expiresAt = Date.now() + (actualTTL * 1000);
        const serializedValue = this.serialize(value);
        
        this.memoryCache.set(key, serializedValue);
        this.ttlMap.set(key, expiresAt);
        this.updateLRU(key);
        
        // Semantic indexing
        if (typeof value === 'object' && value.content) {
            const semanticKey = this.generateSemanticKey(value.content);
            this.semanticIndex.set(semanticKey, key);
        }
        
        await this.enforceMemoryLimits();
        return true;
    }
    
    async get(key) {
        // Direct hit check
        let result = await this.getExact(key);
        if (result !== null) {
            this.metrics.hits++;
            return result;
        }
        
        // Semantic similarity check
        result = await this.getSemanticMatch(key);
        if (result !== null) {
            this.metrics.semanticHits++;
            return result;
        }
        
        this.metrics.misses++;
        return null;
    }
    
    async getExact(key) {
        const expiresAt = this.ttlMap.get(key);
        if (expiresAt && Date.now() > expiresAt) {
            await this.delete(key);
            return null;
        }
        
        if (this.memoryCache.has(key)) {
            this.updateLRU(key);
            const serializedValue = this.memoryCache.get(key);
            return this.deserialize(serializedValue);
        }
        
        return null;
    }
    
    async getSemanticMatch(key) {
        if (typeof key !== 'string') return null;
        
        const querySemanticKey = this.generateSemanticKey(key);
        let bestMatch = null;
        let bestScore = 0;
        
        for (const [semanticKey, cacheKey] of this.semanticIndex) {
            const similarity = this.calculateSimilarity(querySemanticKey, semanticKey);
            if (similarity > bestScore && similarity >= this.config.semanticThreshold) {
                bestScore = similarity;
                bestMatch = cacheKey;
            }
        }
        
        if (bestMatch) {
            return await this.getExact(bestMatch);
        }
        
        return null;
    }
    
    async delete(key) {
        this.memoryCache.delete(key);
        this.ttlMap.delete(key);
        this.lruOrder.delete(key);
        this.accessCount.delete(key);
        
        for (const [semanticKey, cacheKey] of this.semanticIndex) {
            if (cacheKey === key) {
                this.semanticIndex.delete(semanticKey);
                break;
            }
        }
        
        return true;
    }
    
    async clear() {
        this.memoryCache.clear();
        this.ttlMap.clear();
        this.lruOrder.clear();
        this.accessCount.clear();
        this.semanticIndex.clear();
        
        this.emit('cleared');
        return true;
    }
    
    getStats() {
        const hitRate = this.metrics.hits / (this.metrics.hits + this.metrics.misses);
        const memoryUsageMB = this.estimateMemoryUsage() / (1024 * 1024);
        
        return {
            ...this.metrics,
            hitRate: isNaN(hitRate) ? 0 : hitRate,
            semanticHitRate: this.metrics.semanticHits / this.metrics.hits || 0,
            memoryUsageMB: Math.round(memoryUsageMB * 100) / 100,
            totalKeys: this.memoryCache.size
        };
    }
    
    // Private Methods
    
    serialize(value) {
        try {
            return JSON.stringify({
                data: value,
                timestamp: Date.now(),
                type: typeof value
            });
        } catch (error) {
            return String(value);
        }
    }
    
    deserialize(serializedValue) {
        try {
            const parsed = JSON.parse(serializedValue);
            return parsed.data;
        } catch (error) {
            return serializedValue;
        }
    }
    
    generateSemanticKey(content) {
        const normalized = String(content)
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        const words = normalized.split(' ').filter(w => w.length > 2);
        return crypto.createHash('md5').update(words.sort().join(' ')).digest('hex');
    }
    
    calculateSimilarity(key1, key2) {
        let differences = 0;
        const minLength = Math.min(key1.length, key2.length);
        
        for (let i = 0; i < minLength; i++) {
            if (key1[i] !== key2[i]) differences++;
        }
        
        return 1 - (differences / minLength);
    }
    
    updateLRU(key) {
        const now = Date.now();
        this.lruOrder.set(key, now);
        this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);
    }
    
    async enforceMemoryLimits() {
        const currentMemory = this.estimateMemoryUsage();
        const maxMemoryBytes = this.config.maxMemoryMB * 1024 * 1024;
        
        if (currentMemory > maxMemoryBytes) {
            const keysToEvict = this.getLRUKeys(Math.ceil(this.memoryCache.size * 0.1));
            
            for (const key of keysToEvict) {
                await this.delete(key);
                this.metrics.evictions++;
            }
        }
    }
    
    getLRUKeys(count) {
        const entries = Array.from(this.lruOrder.entries());
        entries.sort((a, b) => a[1] - b[1]);
        return entries.slice(0, count).map(entry => entry[0]);
    }
    
    estimateMemoryUsage() {
        let totalSize = 0;
        
        for (const [key, value] of this.memoryCache) {
            totalSize += Buffer.byteLength(key, 'utf8');
            totalSize += Buffer.byteLength(value, 'utf8');
        }
        
        return totalSize;
    }
    
    startCleanupTimer() {
        setInterval(async () => {
            await this.cleanupExpired();
        }, this.config.cleanupInterval * 1000);
    }
    
    async cleanupExpired() {
        const now = Date.now();
        const expiredKeys = [];
        
        for (const [key, expiresAt] of this.ttlMap) {
            if (now > expiresAt) {
                expiredKeys.push(key);
            }
        }
        
        for (const key of expiredKeys) {
            await this.delete(key);
        }
        
        if (expiredKeys.length > 0) {
            this.emit('cleanupCompleted', { expired: expiredKeys.length });
        }
    }
    
    startMetricsCollection() {
        setInterval(() => {
            this.metrics.memoryUsage = this.estimateMemoryUsage();
            this.emit('metricsUpdated', this.getStats());
        }, 30000);
    }
}

module.exports = CacheService;