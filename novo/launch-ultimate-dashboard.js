/**
 * Pipeline Ultimate V5.0 Launcher
 */

const path = require('path');

// Verificar se .env existe
const envPath = path.join(__dirname, '.env');
const fs = require('fs');

if (!fs.existsSync(envPath)) {
    console.log('❌ ERRO: Arquivo .env não encontrado!');
    console.log('💡 Copie .env.example para .env e configure suas chaves Gemini');
    process.exit(1);
}

// Carregar .env
require('dotenv').config();

const EnvironmentConfig = require('./config/environment');
const net = require('net');

async function findFreePort(startPort = 3001) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(startPort, () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        server.on('error', () => {
            resolve(findFreePort(startPort + 1));
        });
    });
}

async function main() {
    console.log('🚀 PIPELINE ULTIMATE V5.0 - ENTERPRISE EDITION');
    console.log('==================================================');
    
    try {
        // Carregar configuração
        const config = new EnvironmentConfig();
        const validation = config.validate();
        
        // Mostrar status da configuração
        console.log('📋 CONFIGURAÇÃO:');
        console.log(`   🔑 Chaves Gemini: ${config.geminiKeys.length}`);
        console.log(`   ⚡ Rate Limit: ${config.rateLimiting.requestsPerMinute}/min`);
        console.log(`   🎯 Quality Threshold: ${config.quality.threshold}/10`);
        console.log(`   💰 Modo Comercial: ${config.monetization.commercialMode ? 'ON' : 'OFF'}`);
        console.log(`   📊 Monitoring: ${config.monitoring.metricsEnabled ? 'ON' : 'OFF'}`);
        console.log(`   🔔 Discord: ${config.notifications.discord ? 'ON' : 'OFF'}`);
        
        if (!validation.valid) {
            console.log('\n❌ ERROS DE CONFIGURAÇÃO:');
            validation.errors.forEach(error => console.log(`   ${error}`));
            process.exit(1);
        }
        
        if (validation.warnings.length > 0) {
            console.log('\n⚠️ AVISOS:');
            validation.warnings.forEach(warning => console.log(`   ${warning}`));
        }
        
        console.log('\n✅ CONFIGURAÇÃO VÁLIDA!');
        
        // Importar sistema ultimate
        const GeminiUltimateGenerator = require('./services/ai/gemini-ultimate-generator');
        const AdvancedVideoAssembler = require('./services/video/advanced-video-assembler');
        
        // Inicializar serviços
        console.log('\n🧠 Inicializando Gemini Ultimate Generator...');
        const ultimateGenerator = new GeminiUltimateGenerator({
            logger: console,
            cache: { set: async () => true, get: async () => null }
        });
        
        const health = await ultimateGenerator.healthCheck();
        
        if (health.status === 'healthy') {
            console.log('   ✅ Gemini Ultimate: OK');
            console.log(`   📊 Features: ${Object.entries(health.features).filter(([k,v]) => v).map(([k,v]) => k).join(', ')}`);
        } else {
            console.log('   ⚠️ Gemini Ultimate: Warnings');
        }
        
        // Inicializar dashboard
        console.log('\n🌐 Inicializando Dashboard Ultimate...');
        const DashboardServer = require('./interfaces/web/dashboard-server');
        const dashboard = new DashboardServer();
        
        // Injetar sistema ultimate no dashboard
        dashboard.ultimateGenerator = ultimateGenerator;
        dashboard.config = config;
        
        // Override do método de geração de vídeo para usar Ultimate
        const originalGenerateVideo = dashboard.app._router.stack.find(
            layer => layer.route?.path === '/api/content/video'
        );
        
        // Encontrar porta livre
        const port = await findFreePort(config.monitoring.dashboardPort);
        dashboard.port = port;
        
        // Iniciar servidor
        dashboard.server.listen(port, () => {
            console.log(`\n🎉 PIPELINE ULTIMATE V5.0 ONLINE!\n`);
            console.log(`🌐 Dashboard: http://localhost:${port}`);
            console.log(`🔑 APIs Gemini: ${config.geminiKeys.length} configuradas`);
            console.log(`📊 Quality Control: ${config.quality.threshold}/10`);
            console.log(`⚡ Rate Limit: ${config.rateLimiting.requestsPerMinute} req/min`);
            console.log(`�� Modo: ${config.monetization.commercialMode ? 'COMERCIAL' : 'DESENVOLVIMENTO'}`);
            console.log(`🎬 Vídeos: ${config.video.defaultQuality} | Assembly: ${config.video.enableAssembly}`);
            
            if (config.notifications.discord) {
                console.log(`🔔 Notificações: Discord configurado`);
            }
            
            console.log(`\n🚀 PRONTO PARA PRODUÇÃO ENTERPRISE!\n`);
        });
        
        // Teste inicial das APIs
        console.log('\n�� TESTANDO APIS...');
        try {
            const testResult = await ultimateGenerator.generateScript({
                topic: 'Teste Pipeline Ultimate V5.0',
                style: 'educativo',
                duration: 'short'
            });
            
            if (testResult.success) {
                console.log('✅ Teste de API: SUCESSO');
                console.log(`   📊 Qualidade: ${ultimateGenerator.calculateQualityScore(testResult.data)}/10`);
            }
        } catch (testError) {
            console.log(`❌ Teste de API falhou: ${testError.message}`);
            console.log('💡 Verifique suas chaves Gemini no .env');
        }
        
    } catch (error) {
        console.error('\n❌ ERRO FATAL:', error.message);
        console.error('🔧 Verifique configurações e tente novamente');
        process.exit(1);
    }
}

process.on('SIGINT', () => {
    console.log('\n🛑 Encerrando Pipeline Ultimate...');
    process.exit(0);
});

main().catch(error => {
    console.error('💥 ERRO CRÍTICO:', error.message);
    process.exit(1);
});
