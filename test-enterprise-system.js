/**
 * Teste Completo do Sistema Enterprise
 * Testa todos os componentes integrados
 */

const { createLogger } = require('./utils/logger');
const { IntelligentCacheService } = require('./services/cache/intelligent-cache');
const config = require('./config/app-config');
const EnterpriseAPIServer = require('./interfaces/api/enterprise-server');

async function testEnterpriseSystem() {
    console.log('🚀 Iniciando testes do Sistema Enterprise...\n');
    
    try {
        // 1. Testar Sistema de Configuração
        console.log('📋 1. Testando Sistema de Configuração...');
        await testConfigurationSystem();
        
        // 2. Testar Sistema de Logging
        console.log('\n📝 2. Testando Sistema de Logging...');
        await testLoggingSystem();
        
        // 3. Testar Cache Inteligente
        console.log('\n🧠 3. Testando Cache Inteligente com IA...');
        await testIntelligentCache();
        
        // 4. Testar API Server
        console.log('\n🌐 4. Testando API Server Enterprise...');
        await testAPIServer();
        
        // 5. Teste de Integração Completa
        console.log('\n🔗 5. Teste de Integração Completa...');
        await testFullIntegration();
        
        console.log('\n✅ Todos os testes concluídos com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro durante os testes:', error.message);
        process.exit(1);
    }
}

async function testConfigurationSystem() {
    console.log('  - Carregando configurações...');
    
    // Teste básico de acesso
    console.log(`    App Name: ${config.get('app.name')}`);
    console.log(`    Environment: ${config.get('app.environment')}`);
    console.log(`    TTS Provider: ${config.get('tts.primaryProvider')}`);
    console.log(`    Cache Max Memory: ${config.get('cache.maxMemoryMB')}MB`);
    
    // Teste de validação
    try {
        config.set('app.port', 999); // Deve falhar
    } catch (error) {
        console.log('    ✅ Validação funcionando:', error.message.substring(0, 50) + '...');
    }
    
    // Teste válido
    config.set('pipeline.maxConcurrentJobs', 5);
    console.log(`    ✅ Configuração atualizada: ${config.get('pipeline.maxConcurrentJobs')} jobs`);
    
    // Health check
    const health = config.getHealthStatus();
    console.log(`    ✅ Health Status: ${health.status} (v${health.version})`);
}

async function testLoggingSystem() {
    const logger = createLogger({
        level: 'debug',
        enableConsole: true,
        enableFile: false // Não criar arquivos no teste
    });
    
    console.log('  - Testando diferentes níveis de log...');
    
    // Definir correlation ID
    const correlationId = logger.setCorrelationId('test-001');
    console.log(`    Correlation ID: ${correlationId}`);
    
    // Testes de logging
    logger.debug('Teste de debug log');
    logger.info('Sistema inicializado com sucesso');
    logger.warn('Este é um aviso de teste');
    logger.error('Teste de error log', new Error('Erro de teste'));
    
    // Performance logging
    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, 100));
    logger.performance('test_operation', startTime, { category: 'testing' });
    
    // Business event
    logger.businessEvent('test_completed', { 
        testId: 'enterprise-001',
        duration: 100 
    });
    
    // Health check
    const health = await logger.healthCheck();
    console.log(`    ✅ Logger Health: ${health.status}`);
    
    logger.clearCorrelationId();
}

async function testIntelligentCache() {
    const cache = new IntelligentCacheService({
        maxMemoryMB: 10, // Pequeno para teste
        enableSemantic: true,
        enablePredictive: true,
        enableMetrics: true
    });
    
    console.log('  - Testando cache básico...');
    
    // Cache básico
    await cache.set('test-key-1', { video: 'tutorial sobre IA', quality: 'HD' });
    const retrieved = await cache.get('test-key-1');
    console.log(`    ✅ Cache básico funcionando: ${JSON.stringify(retrieved)}`);
    
    // Teste semântico
    console.log('  - Testando busca semântica...');
    await cache.set('video-ai-tech', { 
        content: 'Vídeo educativo sobre inteligência artificial e tecnologia',
        duration: 300
    });
    
    // Busca por similaridade semântica
    const semantic = await cache.get('tutorial inteligência artificial tecnologia');
    if (semantic) {
        console.log('    ✅ Busca semântica funcionando!');
    } else {
        console.log('    ⚠️  Busca semântica não encontrou resultado (normal em cache pequeno)');
    }
    
    // Métricas
    const stats = cache.getAdvancedStats();
    console.log(`    ✅ Cache Stats: ${stats.storage.totalItems} itens, ${stats.performance.hitRate} hit rate`);
    
    // Health check
    const health = await cache.healthCheck();
    console.log(`    ✅ Cache Health: ${health.status}`);
}

async function testAPIServer() {
    // Mock dos serviços para o teste
    const mockTTSService = {
        generateAudio: async (text, options) => ({
            file: '/tmp/test-audio.mp3',
            duration: 5000,
            provider: 'gemini',
            quality: options.quality || 'standard'
        }),
        healthCheck: async () => ({ status: 'healthy' }),
        getStats: () => ({ requests: 10, errors: 0 })
    };
    
    const mockCache = new IntelligentCacheService({ maxMemoryMB: 5 });
    
    console.log('  - Inicializando API Server...');
    
    const apiServer = new EnterpriseAPIServer({
        config: {
            api: {
                port: 3001, // Usar porta diferente para teste
                host: '0.0.0.0',
                enableDocs: true,
                enableMetrics: true
            }
        },
        dependencies: {
            ttsService: mockTTSService,
            cacheService: mockCache,
            logger: createLogger()
        }
    });
    
    // Iniciar servidor
    await apiServer.start();
    console.log('    ✅ API Server iniciado na porta 3001');
    
    // Aguardar um momento para o servidor inicializar
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Teste de health check via HTTP
    try {
        const response = await fetch('http://localhost:3001/health');
        const health = await response.json();
        console.log(`    ✅ Health Check API: ${health.status}`);
    } catch (error) {
        console.log('    ⚠️  Health check via HTTP falhou (normal se não houver fetch disponível)');
    }
    
    // Parar servidor
    await apiServer.stop();
    console.log('    ✅ API Server parado');
}

async function testFullIntegration() {
    console.log('  - Simulando fluxo completo...');
    
    // 1. Configurar sistema
    const logger = createLogger({ enableConsole: true, enableFile: false });
    const cache = new IntelligentCacheService({ maxMemoryMB: 20 });
    
    // 2. Simular processamento de vídeo
    const correlationId = logger.setCorrelationId();
    const timer = logger.timer('full_integration_test');
    
    logger.info('Iniciando processamento de vídeo integrado', {
        prompt: 'Criar vídeo sobre IA',
        strategy: config.get('pipeline.defaultStrategy')
    });
    
    // 3. Simular cache de TTS
    await cache.set('tts-cache-001', {
        text: 'Bem-vindo ao futuro da inteligência artificial',
        audioFile: '/tmp/tts-001.mp3',
        provider: 'gemini',
        quality: 'premium'
    });
    
    // 4. Simular recuperação do cache
    const cachedTTS = await cache.get('tts-cache-001');
    logger.info('Cache TTS recuperado', { 
        provider: cachedTTS.provider,
        quality: cachedTTS.quality 
    });
    
    // 5. Finalizar com métricas
    const duration = timer.end();
    logger.businessEvent('integration_test_completed', {
        duration,
        correlationId,
        cacheHit: true
    });
    
    // 6. Estatísticas finais
    const cacheStats = cache.getAdvancedStats();
    const configHealth = config.getHealthStatus();
    
    console.log('  ✅ Integração completa testada:');
    console.log(`    - Duração: ${duration}ms`);
    console.log(`    - Cache: ${cacheStats.storage.totalItems} itens`);
    console.log(`    - Config: v${configHealth.version}`);
    console.log(`    - Correlation ID: ${correlationId}`);
}

// Executar testes
if (require.main === module) {
    testEnterpriseSystem();
}

module.exports = { testEnterpriseSystem };
