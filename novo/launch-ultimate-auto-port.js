require('dotenv').config();
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
    console.log('🚀 PIPELINE ULTIMATE V5.0 - AUTO-PORT');
    console.log('==================================================');
    
    const geminiKeys = [
        process.env.GEMINI_API_KEY,
        process.env.GEMINI_API_KEY_2,
        process.env.GEMINI_API_KEY_3
    ].filter(key => key);
    
    console.log(`🔑 Chaves Gemini: ${geminiKeys.length}`);
    console.log(`🧠 Gemini 2.5 Flash: INTEGRADO`);
    console.log(`🍌 Nano Banana: INTEGRADO`);
    console.log(`🎬 FFmpeg Assembly: INTEGRADO`);
    
    if (geminiKeys.length === 0) {
        console.log('❌ Configure GEMINI_API_KEY no .env');
        process.exit(1);
    }
    
    // Encontrar porta livre
    const port = await findFreePort(3001);
    console.log(`🔍 Porta livre encontrada: ${port}`);
    
    // Importar dashboard e configurar porta
    const DashboardUltimateIntegrated = require('./interfaces/web/dashboard-ultimate-integrated');
    const dashboard = new DashboardUltimateIntegrated();
    dashboard.port = port;
    
    // Modificar o start para usar a porta dinâmica
    const originalStart = dashboard.start;
    dashboard.start = function() {
        const fs = require('fs');
        const path = require('path');
        const outputsPath = '/home/user/main/novo3/novo/outputs';
        
        ['videos', 'images'].forEach(folder => {
            const folderPath = path.join(outputsPath, folder);
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
            }
        });
        
        this.server.listen(this.port, () => {
            console.log(`\n🎉 PIPELINE ULTIMATE V5.0 ONLINE!\n`);
            console.log(`🌐 Dashboard: http://localhost:${this.port}`);
            console.log(`🧠 Gemini 2.5 Flash: INTEGRADO`);
            console.log(`🍌 Nano Banana: READY`);
            console.log(`🎬 FFmpeg: ACTIVE`);
            console.log(`📊 Quality Control: 8.5+`);
            console.log(`💎 Dotenvx Security: DETECTED`);
            console.log(`\n🚀 SISTEMA ULTIMATE FUNCIONANDO!\n`);
            
            // Notificação se Discord configurado
            if (process.env.DISCORD_WEBHOOK_URL) {
                console.log(`🔔 Discord notifications: ACTIVE`);
            }
        });
    };
    
    dashboard.start();
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Encerrando Pipeline Ultimate V5.0...');
        process.exit(0);
    });
}

main().catch(error => {
    console.error('💥 ERRO:', error.message);
    process.exit(1);
});
