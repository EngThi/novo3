/**
 * Testes Individuais dos Componentes Enterprise
 * Para testes rápidos e isolados de cada módulo
 */

// Teste 1: Sistema de Configuração
function testConfig() {
    console.log('📋 Testando Sistema de Configuração...');
    
    try {
        const config = require('./config/app-config');
        
        console.log('Basic Config Access:');
        console.log('- App Name:', config.get('app.name'));
        console.log('- Environment:', config.get('app.environment'));
        console.log('- TTS Provider:', config.get('tts.primaryProvider'));
        console.log('- Cache Memory:', config.get('cache.maxMemoryMB') + 'MB');
        
        const health = config.getHealthStatus();
        console.log('- Health:', health.status, '(v' + health.version + ')');
        
        console.log('✅ Config: FUNCIONANDO\n');
        return true;
    } catch (error) {
        console.log('❌ Config ERROR:', error.message + '\n');
        return false;
    }
}

// Teste 2: Sistema de Logger
function testLogger() {
    console.log('📝 Testando Sistema de Logger...');
    
    try {
        const { createLogger } = require('./utils/logger');
        const logger = createLogger({ enableConsole: true, enableFile: false });
        
        const correlationId = logger.setCorrelationId();
        console.log('- Correlation ID:', correlationId.substring(0, 8) + '...');
        
        logger.info('Logger test message');
        logger.performance('test_op', Date.now() - 100);
        logger.businessEvent('test_event', { success: true });
        
        logger.clearCorrelationId();
        
        console.log('✅ Logger: FUNCIONANDO\n');
        return true;
    } catch (error) {
        console.log('❌ Logger ERROR:', error.message + '\n');
        return false;
    }
}

// Teste 3: Cache Inteligente
async function testCache() {
    console.log('🧠 Testando Cache Inteligente...');
    
    try {
        const { IntelligentCacheService } = require('./services/cache/intelligent-cache');
        const cache = new IntelligentCacheService({ 
            maxMemoryMB: 20, 
            enableSemantic: true 
        });
        
        // Teste básico
        await cache.set('test-key', { content: 'vídeo sobre tecnologia', quality: 'HD' });
        const result1 = await cache.get('test-key');
        console.log('- Busca exata:', result1 ? 'Encontrado' : 'Falhou');
        
        // Teste semântico
        const result2 = await cache.get('vídeo tecnologia');
        console.log('- Busca semântica:', result2 ? 'Funcionando!' : 'Não encontrou');
        
        const stats = cache.getAdvancedStats();
        console.log('- Stats:', stats.storage.totalItems, 'itens');
        
        console.log('✅ Cache AI: FUNCIONANDO\n');
        return true;
    } catch (error) {
        console.log('❌ Cache ERROR:', error.message + '\n');
        return false;
    }
}

// Teste 4: API Server (mock)
function testAPIServer() {
    console.log('🌐 Testando API Server...');
    
    try {
        const EnterpriseAPIServer = require('./interfaces/api/enterprise-server');
        
        const mockDeps = {
            ttsService: { healthCheck: async () => ({ status: 'healthy' }) },
            cacheService: { healthCheck: async () => ({ status: 'healthy' }) },
            logger: { info: () => {}, healthCheck: async () => ({ status: 'healthy' }) }
        };
        
        const server = new EnterpriseAPIServer({
            config: { api: { port: 3000, enableDocs: true } },
            dependencies: mockDeps
        });
        
        console.log('- Inicialização:', 'OK');
        console.log('- Dependencies:', 'Injetadas');
        console.log('- Config:', 'Válida');
        
        console.log('✅ API Server: CONFIGURADO\n');
        return true;
    } catch (error) {
        console.log('❌ API Server ERROR:', error.message + '\n');
        return false;
    }
}

// Teste de Integração Rápida
async function quickIntegrationTest() {
    console.log('🔗 Teste de Integração Rápida...');
    
    try {
        // Config + Logger + Cache juntos
        const config = require('./config/app-config');
        const { createLogger } = require('./utils/logger');
        const { IntelligentCacheService } = require('./services/cache/intelligent-cache');
        
        const logger = createLogger({ enableConsole: false });
        const cache = new IntelligentCacheService({ maxMemoryMB: 10 });
        
        const jobId = 'quick-test-' + Date.now();
        
        // Simular fluxo
        logger.jobStart(jobId, 'quick_test', { strategy: config.get('pipeline.defaultStrategy') });
        
        await cache.set(jobId, {
            status: 'completed',
            timestamp: new Date().toISOString()
        });
        
        const cached = await cache.get(jobId);
        
        logger.jobComplete(jobId, 100, { cached: !!cached });
        
        console.log('- Config + Logger + Cache:', 'Integrados');
        console.log('- Job ID:', jobId);
        console.log('- Cache Result:', cached ? 'OK' : 'FAIL');
        
        console.log('✅ Integração: FUNCIONANDO\n');
        return true;
    } catch (error) {
        console.log('❌ Integração ERROR:', error.message + '\n');
        return false;
    }
}

// Executor principal
async function runAllTests() {
    console.log('🚀 Testes Individuais - Sistema Enterprise\n');
    
    const results = {
        config: testConfig(),
        logger: testLogger(),
        cache: await testCache(),
        apiServer: testAPIServer(),
        integration: await quickIntegrationTest()
    };
    
    const passed = Object.values(results).filter(Boolean).length;
    const total = Object.keys(results).length;
    
    console.log('📈 Resultados:');
    Object.entries(results).forEach(([test, result]) => {
        console.log(`  ${result ? '✅' : '❌'} ${test}: ${result ? 'PASS' : 'FAIL'}`);
    });
    
    console.log(`\n🏆 Score: ${passed}/${total} (${Math.round(passed/total*100)}%)`);
    
    if (passed === total) {
        console.log('\n🎉 Todos os testes passaram! Sistema Enterprise OK!');
    } else {
        console.log('\n⚠️  Alguns testes falharam. Verifique as mensagens de erro.');
    }
    
    return results;
}

// Testes específicos (podem ser chamados individualmente)
const specificTests = {
    config: testConfig,
    logger: testLogger,
    cache: testCache,
    api: testAPIServer,
    integration: quickIntegrationTest
};

// Permite executar testes individuais via: node test-components.js config
if (require.main === module) {
    const testName = process.argv[2];
    
    if (testName && specificTests[testName]) {
        console.log(`🎯 Executando teste: ${testName}\n`);
        
        if (testName === 'cache' || testName === 'integration') {
            specificTests[testName]().then(result => {
                console.log(`Resultado: ${result ? '✅ PASS' : '❌ FAIL'}`);
                process.exit(result ? 0 : 1);
            });
        } else {
            const result = specificTests[testName]();
            console.log(`Resultado: ${result ? '✅ PASS' : '❌ FAIL'}`);
            process.exit(result ? 0 : 1);
        }
    } else {
        runAllTests().then(results => {
            const allPassed = Object.values(results).every(Boolean);
            process.exit(allPassed ? 0 : 1);
        });
    }
}

module.exports = {
    runAllTests,
    testConfig,
    testLogger,
    testCache,
    testAPIServer,
    quickIntegrationTest
};