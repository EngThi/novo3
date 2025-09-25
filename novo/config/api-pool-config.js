/**
 * Configuração do Pool de API Keys
 * Sistema para gerenciar múltiplas chaves Gemini e evitar rate limits
 */

module.exports = {
    // === CONFIGURAÇÃO PRINCIPAL ===
    pool: {
        // Rate limiting por key
        requestsPerMinute: 15,
        burstLimit: 3,
        
        // Timeouts e retries
        requestTimeout: 45000, // 45s (vs 60s default)
        maxRetries: 3,
        retryDelay: 2000,
        
        // Backoff strategy
        backoffMultiplier: 1.5,
        maxBackoffDelay: 30000,
        
        // Health monitoring
        healthCheckInterval: 300000, // 5 min
        autoRecovery: true
    },
    
    // === DETECÇÃO AUTOMÁTICA DE KEYS ===
    autoDetectKeys() {
        const keys = [];
        
        // Detectar todas as variáveis GEMINI_API_KEY*
        for (const [envVar, value] of Object.entries(process.env)) {
            if (envVar.startsWith('GEMINI_API_KEY') && value && value.length > 30) {
                keys.push({
                    id: envVar,
                    key: value.trim(),
                    priority: envVar === 'GEMINI_API_KEY' ? 1 : 0, // Primary key tem prioridade
                    maxConcurrency: 2,
                    description: envVar === 'GEMINI_API_KEY' ? 'Primary Key' : 'Backup Key'
                });
            }
        }
        
        console.log(`🔑 Auto-detected ${keys.length} Gemini API keys`);
        
        return keys;
    },
    
    // === CONFIGURAÇÃO MANUAL (se auto-detect falhar) ===
    manualKeys: [
        {
            id: 'primary',
            key: process.env.GEMINI_API_KEY,
            priority: 1,
            maxConcurrency: 2,
            description: 'Primary Gemini Key'
        }
        // Adicione mais keys conforme necessário:
        // {
        //     id: 'backup1',
        //     key: process.env.GEMINI_API_KEY_2,
        //     priority: 0,
        //     maxConcurrency: 2,
        //     description: 'Backup Key 1'
        // }
    ].filter(k => k.key), // Filtrar apenas keys válidas
    
    // === CONFIGURAÇÕES DE QUALIDADE ===
    qualitySettings: {
        tts: {
            // Configurações por tier de cliente
            free: {
                chunkSize: 500,
                maxDuration: 120, // 2 minutos
                voicesAllowed: ['Kore', 'Zephyr'],
                priority: 0
            },
            pro: {
                chunkSize: 800,
                maxDuration: 300, // 5 minutos
                voicesAllowed: 'all',
                priority: 1
            },
            enterprise: {
                chunkSize: 1200,
                maxDuration: -1, // Unlimited
                voicesAllowed: 'all',
                priority: 2,
                customVoices: true
            }
        }
    },
    
    // === MONITORING E ALERTAS ===
    monitoring: {
        // Limites para alertas
        errorRateThreshold: 15, // % de erro aceitável
        responseTimeThreshold: 30000, // 30s
        queueSizeThreshold: 10,
        
        // Notificações
        notifications: {
            discord: {
                enabled: !!process.env.DISCORD_WEBHOOK_URL,
                webhook: process.env.DISCORD_WEBHOOK_URL,
                alertOnError: true,
                alertOnSlowResponse: true,
                alertOnHighQueue: true
            },
            
            email: {
                enabled: false, // Implementar futuramente
                alerts: ['critical_error', 'quota_exceeded']
            }
        }
    },
    
    // === CONFIGURAÇÕES AVANÇADAS ===
    advanced: {
        // Cache de responses para requests idênticos
        enableResponseCache: true,
        responseCacheTTL: 3600000, // 1 hora
        
        // Load balancing strategy
        loadBalancing: 'round_robin', // 'round_robin' | 'least_used' | 'fastest_response'
        
        // Failover strategy
        failoverStrategy: 'immediate', // 'immediate' | 'graceful' | 'manual'
        
        // Quota management
        quotaTracking: {
            enabled: true,
            dailyQuotaLimit: 1000, // Por key
            monthlyQuotaLimit: 25000, // Por key
            alertAt: 80 // % do limite
        },
        
        // Performance optimization
        optimization: {
            preWarmConnections: true,
            connectionPooling: true,
            compressionEnabled: true,
            cacheAgressiveMode: false
        }
    },
    
    // === AMBIENTE DE DESENVOLVIMENTO ===
    development: {
        // Mock responses para testes
        enableMockMode: process.env.NODE_ENV === 'development',
        
        // Logs detalhados
        verboseLogging: process.env.DEBUG === 'true',
        
        // Rate limiting mais relaxado
        relaxedLimits: {
            requestsPerMinute: 30,
            burstLimit: 5,
            requestTimeout: 60000
        }
    },
    
    // === HELPER FUNCTIONS ===
    getActiveKeys() {
        const detected = this.autoDetectKeys();
        return detected.length > 0 ? detected : this.manualKeys;
    },
    
    validateConfiguration() {
        const activeKeys = this.getActiveKeys();
        
        const validation = {
            valid: true,
            issues: [],
            warnings: [],
            keysCount: activeKeys.length
        };
        
        if (activeKeys.length === 0) {
            validation.valid = false;
            validation.issues.push('Nenhuma API key Gemini configurada');
        }
        
        if (activeKeys.length === 1) {
            validation.warnings.push('Apenas 1 API key - risco de rate limiting');
        }
        
        // Verificar keys válidas
        activeKeys.forEach(keyConfig => {
            if (!keyConfig.key || keyConfig.key.length < 30) {
                validation.issues.push(`API key inválida: ${keyConfig.id}`);
            }
        });
        
        return validation;
    },
    
    // === CONFIGURAÇÃO DINÂMICA ===
    updatePoolConfig(newConfig) {
        Object.assign(this.pool, newConfig);
        console.log('⚙️ Pool config atualizada:', newConfig);
    },
    
    // === PRINT DE CONFIGURAÇÃO ===
    printConfig() {
        const activeKeys = this.getActiveKeys();
        const validation = this.validateConfiguration();
        
        console.log('\n🔧 API POOL CONFIGURATION');
        console.log('===========================');
        console.log(`🔑 Active Keys: ${activeKeys.length}`);
        console.log(`⏱️ Rate Limit: ${this.pool.requestsPerMinute}/min`);
        console.log(`💥 Burst Limit: ${this.pool.burstLimit}`);
        console.log(`⏰ Timeout: ${this.pool.requestTimeout}ms`);
        
        activeKeys.forEach((keyConfig, index) => {
            const keyPreview = keyConfig.key ? keyConfig.key.substring(0, 10) + '...' : 'INVALID';
            const priority = keyConfig.priority === 1 ? ' (PRIMARY)' : '';
            console.log(`   ${index + 1}. ${keyConfig.id}: ${keyPreview}${priority}`);
        });
        
        if (validation.warnings.length > 0) {
            console.log('\n⚠️  WARNINGS:');
            validation.warnings.forEach(warning => console.log(`   - ${warning}`));
        }
        
        if (validation.issues.length > 0) {
            console.log('\n❌ ISSUES:');
            validation.issues.forEach(issue => console.log(`   - ${issue}`));
        }
        
        console.log('===========================\n');
        
        return validation;
    }
};