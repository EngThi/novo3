const EnterpriseAPIServer = require('./interfaces/api/enterprise-server');
const { IntelligentCacheService } = require('./services/cache/intelligent-cache');
const { createLogger } = require('./utils/logger');

async function startTestServer() {
    const logger = createLogger();
    const cache = new IntelligentCacheService({ maxMemoryMB: 100 });
    
    const mockTTSService = {
        generateAudio: async (text, options) => ({
            file: '/tmp/test.mp3',
            duration: 5000,
            provider: 'gemini'
        }),
        healthCheck: async () => ({ status: 'healthy' })
    };
    
    const server = new EnterpriseAPIServer({
        dependencies: {
            ttsService: mockTTSService,
            cacheService: cache,
            logger: logger
        }
    });
    
    await server.start();
    console.log('🌐 API Server rodando em http://localhost:3000');
    console.log('📚 Documentação: http://localhost:3000/api/v2/docs');
    console.log('❤️  Health Check: http://localhost:3000/health');
}

startTestServer().catch(console.error);
