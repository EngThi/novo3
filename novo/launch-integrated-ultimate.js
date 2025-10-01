require('dotenv').config();
const DashboardUltimateIntegrated = require('./interfaces/web/dashboard-ultimate-integrated');

console.log('🚀 INICIANDO PIPELINE ULTIMATE V5.0 INTEGRADO');
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

const dashboard = new DashboardUltimateIntegrated();
dashboard.start();
