/**
 * AI-Powered Intelligent Cache Service - Enterprise Grade
 * Features: Semantic similarity matching, Predictive prefetching, ML-based optimization
 * Architecture: Semantic indexing + Vector similarity + Predictive algorithms
 */

const EventEmitter = require('events');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

/**
 * Semantic Vector Generator for content similarity
 */
class SemanticVectorGenerator {
    constructor() {
        // Simple TF-IDF implementation for semantic similarity
        this.vocabulary = new Map();
        this.documentFrequency = new Map();
        this.totalDocuments = 0;
    }
    
    /**
     * Generate semantic vector from text content
     * @param {string} content - Text content
     * @returns {Map} Vector representation
     */
    generateVector(content) {
        const tokens = this.tokenize(content);
        const termFrequency = this.calculateTF(tokens);
        const vector = new Map();
        
        for (const [term, tf] of termFrequency) {
            const idf = this.calculateIDF(term);
            vector.set(term, tf * idf);
        }
        
        return this.normalizeVector(vector);
    }
    
    tokenize(content) {
        return content
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(token => token.length > 2 && token.length < 20)
            .filter(token => !this.isStopWord(token));
    }
    
    calculateTF(tokens) {
        const frequency = new Map();
        const total = tokens.length;
        
        for (const token of tokens) {
            frequency.set(token, (frequency.get(token) || 0) + 1);
        }
        
        // Normalize by total tokens
        for (const [term, count] of frequency) {
            frequency.set(term, count / total);
        }
        
        return frequency;
    }
    
    calculateIDF(term) {
        const df = this.documentFrequency.get(term) || 1;
        return Math.log(this.totalDocuments / df);
    }
    
    normalizeVector(vector) {
        const magnitude = Math.sqrt(
            Array.from(vector.values())
                .reduce((sum, value) => sum + value * value, 0)
        );
        
        if (magnitude === 0) return vector;
        
        for (const [term, value] of vector) {
            vector.set(term, value / magnitude);
        }
        
        return vector;
    }
    
    cosineSimilarity(vector1, vector2) {
        let dotProduct = 0;
        const allTerms = new Set([...vector1.keys(), ...vector2.keys()]);
        
        for (const term of allTerms) {
            const v1 = vector1.get(term) || 0;
            const v2 = vector2.get(term) || 0;
            dotProduct += v1 * v2;
        }
        
        return dotProduct; // Vectors are already normalized
    }
    
    isStopWord(word) {
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
            'could', 'can', 'may', 'might', 'must', 'shall', 'this', 'that', 'these',
            'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her',
            'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their'
        ]);
        
        return stopWords.has(word.toLowerCase());
    }
    
    updateVocabulary(content) {
        const tokens = this.tokenize(content);
        this.totalDocuments++;
        
        for (const token of tokens) {
            if (!this.vocabulary.has(token)) {
                this.vocabulary.set(token, this.totalDocuments);
                this.documentFrequency.set(token, 1);
            } else {
                const df = this.documentFrequency.get(token) || 0;
                this.documentFrequency.set(token, df + 1);
            }
        }
    }
}

/**
 * Predictive Cache Manager using access patterns
 */
class PredictiveCacheManager {
    constructor() {
        this.accessPatterns = new Map();
        this.sequencePatterns = new Map();
        this.timePatterns = new Map();
        this.predictionAccuracy = 0;
        this.totalPredictions = 0;
        this.correctPredictions = 0;
    }
    
    /**
     * Record cache access for pattern learning
     * @param {string} key - Cache key
     * @param {number} timestamp - Access timestamp
     */
    recordAccess(key, timestamp = Date.now()) {
        // Update access patterns
        if (!this.accessPatterns.has(key)) {
            this.accessPatterns.set(key, {
                count: 0,
                lastAccess: timestamp,
                firstAccess: timestamp,
                intervals: []
            });
        }
        
        const pattern = this.accessPatterns.get(key);
        if (pattern.lastAccess > 0) {
            const interval = timestamp - pattern.lastAccess;
            pattern.intervals.push(interval);
            
            // Keep only last 10 intervals for pattern detection
            if (pattern.intervals.length > 10) {
                pattern.intervals.shift();
            }
        }
        
        pattern.count++;
        pattern.lastAccess = timestamp;
        
        // Record time-based patterns
        const hour = new Date(timestamp).getHours();
        if (!this.timePatterns.has(hour)) {
            this.timePatterns.set(hour, new Map());
        }
        
        const hourPatterns = this.timePatterns.get(hour);
        hourPatterns.set(key, (hourPatterns.get(key) || 0) + 1);
    }
    
    /**
     * Predict keys likely to be accessed soon
     * @param {number} count - Number of predictions to return
     * @returns {Array} Predicted keys with confidence scores
     */
    predictNextAccess(count = 5) {
        const predictions = [];
        const currentTime = Date.now();
        const currentHour = new Date(currentTime).getHours();
        
        // Time-based predictions
        const hourPatterns = this.timePatterns.get(currentHour);
        if (hourPatterns) {
            for (const [key, frequency] of hourPatterns) {
                predictions.push({
                    key,
                    confidence: frequency / Math.max(...hourPatterns.values()),
                    reason: 'time_pattern'
                });
            }
        }
        
        // Frequency-based predictions
        for (const [key, pattern] of this.accessPatterns) {
            if (pattern.intervals.length >= 3) {
                const avgInterval = pattern.intervals.reduce((sum, i) => sum + i, 0) / pattern.intervals.length;
                const timeSinceLastAccess = currentTime - pattern.lastAccess;
                
                if (timeSinceLastAccess >= avgInterval * 0.8) {
                    predictions.push({
                        key,
                        confidence: Math.min(pattern.count / 100, 1),
                        reason: 'frequency_pattern',
                        expectedIn: Math.max(0, avgInterval - timeSinceLastAccess)
                    });
                }
            }
        }
        
        // Sort by confidence and return top predictions
        return predictions
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, count);
    }
    
    /**
     * Update prediction accuracy metrics
     * @param {string} predictedKey - Key that was predicted
     * @param {boolean} wasAccessed - Whether the prediction was correct
     */
    updatePredictionAccuracy(predictedKey, wasAccessed) {
        this.totalPredictions++;
        if (wasAccessed) {
            this.correctPredictions++;
        }
        
        this.predictionAccuracy = this.correctPredictions / this.totalPredictions;
    }
    
    getPatternStats() {
        return {
            totalKeys: this.accessPatterns.size,
            predictionAccuracy: this.predictionAccuracy,
            totalPredictions: this.totalPredictions,
            timePatterns: this.timePatterns.size,
            avgAccessesPerKey: Array.from(this.accessPatterns.values())
                .reduce((sum, pattern) => sum + pattern.count, 0) / this.accessPatterns.size || 0
        };
    }
}

/**
 * AI-Powered Intelligent Cache Service
 */
class IntelligentCacheService extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            maxMemoryMB: config.maxMemoryMB || 100,
            maxItems: config.maxItems || 10000,
            defaultTTL: config.defaultTTL || 3600, // 1 hour
            cleanupInterval: config.cleanupInterval || 300, // 5 minutes
            semanticThreshold: config.semanticThreshold || 0.75,
            enablePredictive: config.enablePredictive !== false,
            enableSemantic: config.enableSemantic !== false,
            enableMetrics: config.enableMetrics !== false,
            persistToDisk: config.persistToDisk !== false,
            cacheDir: config.cacheDir || './cache/intelligent',
            ...config
        };
        
        // Core cache storage
        this.primaryCache = new Map(); // Key -> CacheItem
        this.semanticCache = new Map(); // SemanticHash -> Key
        this.ttlIndex = new Map(); // Key -> ExpirationTime
        this.lruIndex = new Map(); // Key -> LastAccessTime
        this.priorityIndex = new Map(); // Key -> Priority (0-100)
        
        // AI components
        this.vectorGenerator = new SemanticVectorGenerator();
        this.predictiveManager = new PredictiveCacheManager();
        
        // Performance tracking
        this.metrics = {
            hits: 0,
            misses: 0,
            semanticHits: 0,
            predictiveHits: 0,
            evictions: 0,
            prefetches: 0,
            memoryUsageBytes: 0,
            operationsPerSecond: 0,
            averageSemanticScore: 0,
            predictionAccuracy: 0
        };
        
        // Operation tracking
        this.operationHistory = [];
        this.lastOperation = Date.now();
        
        this.initialize();
    }
    
    async initialize() {
        try {
            // Start background processes
            this.startCleanupTimer();
            this.startMetricsCollection();
            
            if (this.config.enablePredictive) {
                this.startPredictivePreloading();
            }
            
            if (this.config.persistToDisk) {
                await this.loadPersistedCache();
                this.startPersistenceTimer();
            }
            
            this.emit('initialized', {
                maxMemory: this.config.maxMemoryMB,
                maxItems: this.config.maxItems,
                features: {
                    semantic: this.config.enableSemantic,
                    predictive: this.config.enablePredictive,
                    persistent: this.config.persistToDisk
                }
            });
            
        } catch (error) {
            this.emit('initialization:error', error);
        }
    }
    
    /**
     * Enhanced cache set with AI features
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {Object} options - Caching options
     * @returns {Promise<boolean>} Success status
     */
    async set(key, value, options = {}) {
        const startTime = Date.now();
        
        try {
            const ttl = options.ttl || this.config.defaultTTL;
            const priority = options.priority || 50; // 0-100 scale
            const tags = options.tags || [];
            
            // Create cache item
            const cacheItem = {
                key,
                value: this.serialize(value),
                createdAt: Date.now(),
                expiresAt: Date.now() + (ttl * 1000),
                priority,
                tags,
                accessCount: 0,
                lastAccessed: Date.now(),
                size: this.calculateSize(value),
                metadata: {
                    contentType: this.detectContentType(value),
                    compressed: options.compress || false,
                    encrypted: options.encrypt || false
                }
            };
            
            // Semantic indexing
            if (this.config.enableSemantic && this.isSemanticIndexable(value)) {
                const content = this.extractSemanticContent(value);
                const vector = this.vectorGenerator.generateVector(content);
                const semanticHash = this.generateSemanticHash(vector);
                
                cacheItem.semanticVector = vector;
                cacheItem.semanticHash = semanticHash;
                this.semanticCache.set(semanticHash, key);
                
                // Update vocabulary
                this.vectorGenerator.updateVocabulary(content);
            }
            
            // Store in primary cache
            this.primaryCache.set(key, cacheItem);
            this.ttlIndex.set(key, cacheItem.expiresAt);
            this.lruIndex.set(key, cacheItem.lastAccessed);
            this.priorityIndex.set(key, priority);
            
            // Update metrics
            this.metrics.memoryUsageBytes += cacheItem.size;
            
            // Enforce limits
            await this.enforceStorageLimits();
            
            // Record for predictive learning
            if (this.config.enablePredictive) {
                this.predictiveManager.recordAccess(key, Date.now());
            }
            
            const duration = Date.now() - startTime;
            this.recordOperation('set', duration);
            
            this.emit('item:cached', {
                key,
                size: cacheItem.size,
                ttl,
                semantic: !!cacheItem.semanticVector,
                priority
            });
            
            return true;
            
        } catch (error) {
            this.emit('cache:error', { operation: 'set', key, error: error.message });
            return false;
        }
    }
    
    /**
     * Enhanced cache get with semantic fallback
     * @param {string} key - Cache key or semantic content
     * @param {Object} options - Retrieval options
     * @returns {Promise<any>} Cached value or null
     */
    async get(key, options = {}) {
        const startTime = Date.now();
        
        try {
            // 1. Direct cache hit
            let result = await this.getExact(key);
            if (result !== null) {
                this.metrics.hits++;
                this.recordOperation('get_hit', Date.now() - startTime);
                
                // Record successful access for predictive learning
                if (this.config.enablePredictive) {
                    this.predictiveManager.recordAccess(key, Date.now());
                }
                
                return result;
            }
            
            // 2. Semantic similarity matching
            if (this.config.enableSemantic && options.enableSemantic !== false) {
                result = await this.getSemanticMatch(key, options.semanticThreshold);
                if (result !== null) {
                    this.metrics.semanticHits++;
                    this.recordOperation('get_semantic', Date.now() - startTime);
                    
                    this.emit('semantic:match', {
                        queryKey: key,
                        matchedKey: result.originalKey,
                        similarity: result.similarity
                    });
                    
                    return result.value;
                }
            }
            
            // 3. Predictive cache check
            if (this.config.enablePredictive && options.enablePredictive !== false) {
                result = await this.getPredictiveMatch(key);
                if (result !== null) {
                    this.metrics.predictiveHits++;
                    this.recordOperation('get_predictive', Date.now() - startTime);
                    
                    this.emit('predictive:match', {
                        queryKey: key,
                        predictedKey: result.originalKey,
                        confidence: result.confidence
                    });
                    
                    return result.value;
                }
            }
            
            this.metrics.misses++;
            this.recordOperation('get_miss', Date.now() - startTime);
            
            return null;
            
        } catch (error) {
            this.emit('cache:error', { operation: 'get', key, error: error.message });
            this.metrics.misses++;
            return null;
        }
    }
    
    /**
     * Get exact cache match
     * @private
     */
    async getExact(key) {
        const item = this.primaryCache.get(key);
        if (!item) return null;
        
        // Check TTL
        if (Date.now() > item.expiresAt) {
            await this.delete(key);
            return null;
        }
        
        // Update access info
        item.accessCount++;
        item.lastAccessed = Date.now();
        this.lruIndex.set(key, item.lastAccessed);
        
        return this.deserialize(item.value);
    }
    
    /**
     * Find semantically similar cached content
     * @private
     */
    async getSemanticMatch(queryContent, threshold) {
        if (!this.config.enableSemantic || typeof queryContent !== 'string') {
            return null;
        }
        
        const queryVector = this.vectorGenerator.generateVector(queryContent);
        let bestMatch = null;
        let bestScore = 0;
        
        // Compare with all cached items that have semantic vectors
        for (const [cacheKey, item] of this.primaryCache) {
            if (!item.semanticVector) continue;
            
            const similarity = this.vectorGenerator.cosineSimilarity(queryVector, item.semanticVector);
            
            if (similarity > bestScore && similarity >= (threshold || this.config.semanticThreshold)) {
                bestScore = similarity;
                bestMatch = {
                    originalKey: cacheKey,
                    value: this.deserialize(item.value),
                    similarity
                };
            }
        }
        
        if (bestMatch) {
            // Update average semantic score
            this.metrics.averageSemanticScore = 
                (this.metrics.averageSemanticScore * this.metrics.semanticHits + bestScore) / 
                (this.metrics.semanticHits + 1);
        }
        
        return bestMatch;
    }
    
    /**
     * Get predictive cache match
     * @private
     */
    async getPredictiveMatch(key) {
        if (!this.config.enablePredictive) return null;
        
        const predictions = this.predictiveManager.predictNextAccess(10);
        
        for (const prediction of predictions) {
            if (this.primaryCache.has(prediction.key)) {
                const item = this.primaryCache.get(prediction.key);
                
                // Check if it's a reasonable match (basic heuristic)
                if (this.isReasonablePredictiveMatch(key, prediction.key)) {
                    return {
                        originalKey: prediction.key,
                        value: this.deserialize(item.value),
                        confidence: prediction.confidence
                    };
                }
            }
        }
        
        return null;
    }
    
    /**
     * Advanced cache deletion with cleanup
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} Success status
     */
    async delete(key) {
        try {
            const item = this.primaryCache.get(key);
            if (!item) return false;
            
            // Update memory usage
            this.metrics.memoryUsageBytes -= item.size;
            
            // Remove from all indexes
            this.primaryCache.delete(key);
            this.ttlIndex.delete(key);
            this.lruIndex.delete(key);
            this.priorityIndex.delete(key);
            
            // Remove semantic indexing
            if (item.semanticHash) {
                this.semanticCache.delete(item.semanticHash);
            }
            
            this.emit('item:evicted', {
                key,
                reason: 'manual_delete',
                size: item.size
            });
            
            return true;
            
        } catch (error) {
            this.emit('cache:error', { operation: 'delete', key, error: error.message });
            return false;
        }
    }
    
    /**
     * Smart cache eviction using ML insights
     * @private
     */
    async performSmartEviction(targetCount) {
        const candidates = Array.from(this.primaryCache.entries())
            .map(([key, item]) => ({
                key,
                item,
                score: this.calculateEvictionScore(key, item)
            }))
            .sort((a, b) => a.score - b.score) // Lower score = higher eviction priority
            .slice(0, targetCount);
        
        let evictedSize = 0;
        let evictedCount = 0;
        
        for (const { key, item } of candidates) {
            await this.delete(key);
            evictedSize += item.size;
            evictedCount++;
            this.metrics.evictions++;
        }
        
        this.emit('eviction:completed', {
            evictedCount,
            evictedSize,
            remainingItems: this.primaryCache.size
        });
        
        return evictedCount;
    }
    
    /**
     * Calculate eviction score for cache item
     * @private
     */
    calculateEvictionScore(key, item) {
        const now = Date.now();
        
        // Factors for eviction scoring
        const recencyFactor = (now - item.lastAccessed) / (1000 * 3600); // Hours since last access
        const frequencyFactor = 100 - Math.min(item.accessCount * 5, 95); // Lower is better for keeping
        const sizeFactor = item.size / (1024 * 1024); // Size in MB
        const priorityFactor = 100 - item.priority; // Lower priority = higher eviction score
        const ttlFactor = Math.max(0, item.expiresAt - now) / (1000 * 3600); // Hours until expiry
        
        // Weighted score (lower = more likely to be evicted)
        return (
            recencyFactor * 0.3 +
            frequencyFactor * 0.25 +
            sizeFactor * 0.2 +
            priorityFactor * 0.15 +
            (ttlFactor > 0 ? 0 : 10) * 0.1 // Penalty for expired items
        );
    }
    
    /**
     * Start predictive preloading
     * @private
     */
    startPredictivePreloading() {
        setInterval(async () => {
            try {
                const predictions = this.predictiveManager.predictNextAccess(5);
                
                for (const prediction of predictions) {
                    if (!this.primaryCache.has(prediction.key) && prediction.confidence > 0.7) {
                        // This would trigger preloading from original source
                        this.emit('preload:suggested', prediction);
                        this.metrics.prefetches++;
                    }
                }
                
            } catch (error) {
                this.emit('predictive:error', error);
            }
        }, 60000); // Every minute
    }
    
    /**
     * Enforce storage limits with intelligent eviction
     * @private
     */
    async enforceStorageLimits() {
        const currentMemoryMB = this.metrics.memoryUsageBytes / (1024 * 1024);
        const itemCount = this.primaryCache.size;
        
        let shouldEvict = false;
        let targetEviction = 0;
        
        // Memory-based eviction
        if (currentMemoryMB > this.config.maxMemoryMB) {
            targetEviction = Math.ceil(itemCount * 0.15); // Evict 15% of items
            shouldEvict = true;
        }
        
        // Count-based eviction
        if (itemCount > this.config.maxItems) {
            targetEviction = Math.max(targetEviction, itemCount - this.config.maxItems);
            shouldEvict = true;
        }
        
        if (shouldEvict) {
            await this.performSmartEviction(targetEviction);
        }
    }
    
    /**
     * Start cleanup timer for expired items
     * @private
     */
    startCleanupTimer() {
        setInterval(async () => {
            await this.cleanupExpiredItems();
        }, this.config.cleanupInterval * 1000);
    }
    
    /**
     * Clean up expired items
     * @private
     */
    async cleanupExpiredItems() {
        const now = Date.now();
        const expiredKeys = [];
        
        for (const [key, expiresAt] of this.ttlIndex) {
            if (now > expiresAt) {
                expiredKeys.push(key);
            }
        }
        
        let cleanedSize = 0;
        for (const key of expiredKeys) {
            const item = this.primaryCache.get(key);
            if (item) {
                cleanedSize += item.size;
            }
            await this.delete(key);
        }
        
        if (expiredKeys.length > 0) {
            this.emit('cleanup:completed', {
                expiredCount: expiredKeys.length,
                freedSize: cleanedSize,
                remainingItems: this.primaryCache.size
            });
        }
    }
    
    /**
     * Start metrics collection
     * @private
     */
    startMetricsCollection() {
        if (!this.config.enableMetrics) return;
        
        setInterval(() => {
            this.updateAdvancedMetrics();
            this.emit('metrics:updated', this.getAdvancedStats());
        }, 30000); // Every 30 seconds
    }
    
    updateAdvancedMetrics() {
        // Calculate operations per second
        const recentOps = this.operationHistory.filter(
            op => Date.now() - op.timestamp < 60000
        ).length;
        this.metrics.operationsPerSecond = recentOps / 60;
        
        // Update prediction accuracy
        this.metrics.predictionAccuracy = this.predictiveManager.predictionAccuracy;
        
        // Update memory usage
        let totalSize = 0;
        for (const item of this.primaryCache.values()) {
            totalSize += item.size;
        }
        this.metrics.memoryUsageBytes = totalSize;
    }
    
    /**
     * Persist cache to disk for recovery
     * @private
     */
    async persistCache() {
        if (!this.config.persistToDisk) return;
        
        try {
            const cacheData = {
                timestamp: Date.now(),
                version: '1.0.0',
                items: Array.from(this.primaryCache.entries()),
                metadata: {
                    totalItems: this.primaryCache.size,
                    memoryUsage: this.metrics.memoryUsageBytes
                }
            };
            
            const cacheFile = path.join(this.config.cacheDir, 'cache_snapshot.json');
            await fs.mkdir(this.config.cacheDir, { recursive: true });
            await fs.writeFile(cacheFile, JSON.stringify(cacheData, null, 2));
            
            this.emit('persistence:saved', {
                itemCount: cacheData.items.length,
                file: cacheFile
            });
            
        } catch (error) {
            this.emit('persistence:error', error);
        }
    }
    
    startPersistenceTimer() {
        setInterval(async () => {
            await this.persistCache();
        }, 300000); // Every 5 minutes
    }
    
    /**
     * Utility methods
     */
    
    serialize(value) {
        try {
            return JSON.stringify({
                data: value,
                type: typeof value,
                timestamp: Date.now()
            });
        } catch {
            return String(value);
        }
    }
    
    deserialize(serializedValue) {
        try {
            const parsed = JSON.parse(serializedValue);
            return parsed.data;
        } catch {
            return serializedValue;
        }
    }
    
    calculateSize(value) {
        try {
            return Buffer.byteLength(JSON.stringify(value), 'utf8');
        } catch {
            return Buffer.byteLength(String(value), 'utf8');
        }
    }
    
    detectContentType(value) {
        if (typeof value === 'string') {
            if (value.startsWith('data:')) return 'base64';
            if (value.startsWith('http')) return 'url';
            return 'text';
        }
        
        if (Buffer.isBuffer(value)) return 'buffer';
        if (Array.isArray(value)) return 'array';
        if (typeof value === 'object') return 'object';
        
        return 'primitive';
    }
    
    isSemanticIndexable(value) {
        // Check if value contains text content suitable for semantic indexing
        if (typeof value === 'string' && value.length > 20) return true;
        if (typeof value === 'object' && value.content && typeof value.content === 'string') return true;
        if (typeof value === 'object' && value.text && typeof value.text === 'string') return true;
        
        return false;
    }
    
    extractSemanticContent(value) {
        if (typeof value === 'string') return value;
        if (typeof value === 'object') {
            return value.content || value.text || value.description || JSON.stringify(value);
        }
        return String(value);
    }
    
    generateSemanticHash(vector) {
        const vectorString = Array.from(vector.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([term, weight]) => `${term}:${weight.toFixed(4)}`)
            .join('|');
        
        return crypto.createHash('sha256').update(vectorString).digest('hex');
    }
    
    isReasonablePredictiveMatch(queryKey, predictedKey) {
        // Simple heuristic for predictive matching
        const queryWords = queryKey.toLowerCase().split(/\s+/);
        const predictedWords = predictedKey.toLowerCase().split(/\s+/);
        
        const commonWords = queryWords.filter(word => predictedWords.includes(word));
        return commonWords.length / Math.max(queryWords.length, 1) > 0.3;
    }
    
    recordOperation(type, duration) {
        this.operationHistory.push({
            type,
            duration,
            timestamp: Date.now()
        });
        
        // Keep only last 1000 operations
        if (this.operationHistory.length > 1000) {
            this.operationHistory.splice(0, 100);
        }
    }
    
    /**
     * Get comprehensive statistics
     * @returns {Object} Detailed cache statistics
     */
    getAdvancedStats() {
        const hitRate = this.metrics.hits / Math.max(this.metrics.hits + this.metrics.misses, 1);
        const semanticHitRate = this.metrics.semanticHits / Math.max(this.metrics.hits, 1);
        
        return {
            performance: {
                hitRate: Math.round(hitRate * 100) / 100,
                semanticHitRate: Math.round(semanticHitRate * 100) / 100,
                operationsPerSecond: this.metrics.operationsPerSecond,
                averageSemanticScore: this.metrics.averageSemanticScore
            },
            storage: {
                totalItems: this.primaryCache.size,
                memoryUsageMB: Math.round(this.metrics.memoryUsageBytes / (1024 * 1024) * 100) / 100,
                semanticIndexSize: this.semanticCache.size,
                averageItemSize: this.primaryCache.size > 0 
                    ? this.metrics.memoryUsageBytes / this.primaryCache.size 
                    : 0
            },
            activity: {
                hits: this.metrics.hits,
                misses: this.metrics.misses,
                semanticHits: this.metrics.semanticHits,
                predictiveHits: this.metrics.predictiveHits,
                evictions: this.metrics.evictions,
                prefetches: this.metrics.prefetches
            },
            predictive: this.predictiveManager.getPatternStats(),
            system: {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage()
            }
        };
    }
    
    /**
     * Health check for the cache service
     * @returns {Promise<Object>} Health status
     */
    async healthCheck() {
        try {
            // Test basic operations
            const testKey = '_health_check_test_';
            const testValue = { timestamp: Date.now(), test: true };
            
            await this.set(testKey, testValue, { ttl: 60 });
            const retrieved = await this.get(testKey);
            await this.delete(testKey);
            
            const isHealthy = retrieved && retrieved.timestamp === testValue.timestamp;
            
            return {
                status: isHealthy ? 'healthy' : 'degraded',
                service: 'IntelligentCache',
                features: {
                    semantic: this.config.enableSemantic,
                    predictive: this.config.enablePredictive,
                    persistent: this.config.persistToDisk
                },
                performance: {
                    hitRate: this.metrics.hits / Math.max(this.metrics.hits + this.metrics.misses, 1),
                    memoryUsageMB: this.metrics.memoryUsageBytes / (1024 * 1024)
                }
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                service: 'IntelligentCache',
                error: error.message
            };
        }
    }
    
    /**
     * Cleanup resources
     */
    async cleanup() {
        // Persist cache before cleanup
        if (this.config.persistToDisk) {
            await this.persistCache();
        }
        
        // Clear all caches
        this.primaryCache.clear();
        this.semanticCache.clear();
        this.ttlIndex.clear();
        this.lruIndex.clear();
        this.priorityIndex.clear();
        
        this.removeAllListeners();
        
        this.emit('cleanup:completed');
    }
}

module.exports = {
    IntelligentCacheService,
    SemanticVectorGenerator,
    PredictiveCacheManager
};