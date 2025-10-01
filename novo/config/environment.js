class EnvironmentConfig {
    constructor() {
        this.loadConfiguration();
    }
    
    loadConfiguration() {
        this.geminiKeys = [
            process.env.GEMINI_API_KEY,
            process.env.GEMINI_API_KEY_2,
            process.env.GEMINI_API_KEY_3
        ].filter(key => key);
        
        this.rateLimiting = {
            requestsPerMinute: 15,
            maxConcurrentVideos: 3
        };
        
        this.quality = {
            threshold: 8.5,
            autoRetry: true,
            maxRetries: 3
        };
        
        this.monitoring = {
            metricsEnabled: true,
            dashboardPort: 3001
        };
        
        this.notifications = {
            discord: process.env.DISCORD_WEBHOOK_URL
        };
        
        this.monetization = {
            commercialMode: false
        };
    }
    
    validate() {
        const errors = [];
        const warnings = [];
        
        if (this.geminiKeys.length === 0) {
            errors.push('❌ Pelo menos uma GEMINI_API_KEY deve ser configurada');
        }
        
        if (this.geminiKeys.length < 3) {
            warnings.push('💡 Recomendado ter pelo menos 3 chaves Gemini para rate limiting');
        }
        
        if (!process.env.YOUTUBE_CLIENT_ID) {
            warnings.push('📺 YouTube integration não configurada');
        }
        
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    getStatus() {
        return {
            service: 'Pipeline Ultimate V5.0 Configuration',
            apis: {
                gemini: this.geminiKeys.length
            },
            features: {
                monitoring: this.monitoring.metricsEnabled,
                commercialMode: this.monetization.commercialMode
            }
        };
    }
}

module.exports = EnvironmentConfig;
